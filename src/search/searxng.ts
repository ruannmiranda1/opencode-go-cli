// ============================================================
// SearXNG — Docker container management + search queries
// ============================================================

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createLogger } from "../logger.js";

const logger = createLogger("[searxng]");

const CONTAINER_NAME = "opencode-searxng";
const SEARXNG_PORT = 8888;
const SEARXNG_IMAGE = "searxng/searxng";
const SEARXNG_URL = `http://localhost:${SEARXNG_PORT}`;
const SETTINGS_DIR = join(homedir(), ".opencode-go-cli", "searxng");

function ensureSettings(): void {
  const settingsFile = join(SETTINGS_DIR, "settings.yml");
  if (existsSync(settingsFile)) return;

  mkdirSync(SETTINGS_DIR, { recursive: true });
  const secret = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  writeFileSync(
    settingsFile,
    `use_default_settings: true
search:
  formats:
    - html
    - json
server:
  secret_key: "${secret}"
  limiter: false
  image_proxy: false
`,
  );
  logger.info("Created SearXNG settings with JSON format enabled");
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["docker", "info"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const code = await proc.exited;
    return code === 0;
  } catch {
    return false;
  }
}

async function isContainerRunning(): Promise<boolean> {
  try {
    const proc = Bun.spawn(
      ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER_NAME],
      { stdout: "pipe", stderr: "ignore" },
    );
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    return output.trim() === "true";
  } catch {
    return false;
  }
}

async function startContainer(): Promise<boolean> {
  logger.info("Starting SearXNG container...");

  // Try to start existing stopped container first
  const startProc = Bun.spawn(["docker", "start", CONTAINER_NAME], {
    stdout: "ignore",
    stderr: "ignore",
  });
  if ((await startProc.exited) === 0) {
    logger.info("SearXNG container started (existing)");
    return true;
  }

  // Ensure settings file exists with JSON format enabled
  ensureSettings();

  // Create new container with settings volume mounted
  const settingsPath = SETTINGS_DIR.replace(/\\/g, "/");
  const runProc = Bun.spawn(
    [
      "docker", "run", "-d",
      "--name", CONTAINER_NAME,
      "-p", `${SEARXNG_PORT}:8080`,
      "-v", `${settingsPath}/settings.yml:/etc/searxng/settings.yml:ro`,
      "--restart", "unless-stopped",
      SEARXNG_IMAGE,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  const code = await runProc.exited;
  if (code === 0) {
    logger.info("SearXNG container created and started");
    return true;
  }

  const stderr = await new Response(runProc.stderr).text();
  logger.error(`Failed to start SearXNG: ${stderr.slice(0, 300)}`);
  return false;
}

async function waitForReady(maxWaitMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${SEARXNG_URL}/healthz`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function ensureSearXNG(): Promise<boolean> {
  if (await isContainerRunning()) {
    logger.debug("SearXNG already running");
    return true;
  }

  if (!(await isDockerAvailable())) {
    logger.warn("Docker not available — WebSearch interception disabled");
    return false;
  }

  if (!(await startContainer())) {
    return false;
  }

  logger.info("Waiting for SearXNG to be ready...");
  const ready = await waitForReady();
  if (!ready) {
    logger.error("SearXNG failed to become ready in time");
    return false;
  }

  logger.info("SearXNG ready");
  return true;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

export async function search(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      categories: "general",
    });

    const res = await fetch(`${SEARXNG_URL}/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.error(`SearXNG search failed: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as any;
    const results: SearchResult[] = [];

    for (const r of (data.results ?? []).slice(0, maxResults)) {
      results.push({
        title: r.title ?? "",
        url: r.url ?? "",
        content: r.content ?? "",
        publishedDate: r.publishedDate ?? undefined,
      });
    }

    logger.debug(`Search "${query.slice(0, 50)}": ${results.length} results`);
    return results;
  } catch (e: any) {
    logger.error(`Search error: ${e.message}`);
    return [];
  }
}
