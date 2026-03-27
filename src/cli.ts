// ============================================================
// CLI — entry point, argument parsing, interactive prompts, spawn
// ============================================================

import { spawn } from "node:child_process";
import * as p from "@clack/prompts";
import { MODELS, DEFAULT_PROXY_PORT } from "./constants.js";
import { getConfig, saveConfig, deleteConfig } from "./config.js";
import { resolveClaudePath } from "./path.js";
import { buildClaudeEnv } from "./env.js";
import { startProxy } from "./proxy/server.js";

// ─── Helpers ───────────────────────────────────────────────

async function setupApiKey(): Promise<string> {
  p.intro("OpenCode Go CLI - Setup");

  const apiKey = await p.text({
    message: "Enter your OpenCode Go API key:",
    placeholder: "sk-opencode-...",
    validate: (value) => {
      if (!value || value.length < 10) return "Please enter a valid API key";
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const config = getConfig();
  config.apiKey = apiKey as string;
  saveConfig(config);

  p.log.success("API key saved successfully!");
  return apiKey as string;
}

async function selectModel(): Promise<string> {
  const config = getConfig();

  const model = await p.select({
    message: "Select a model:",
    options: MODELS.map((m) => ({
      value: m.id,
      label: m.name,
      hint: m.description,
    })),
    initialValue: config.lastModel,
  });

  if (p.isCancel(model)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  return model as string;
}

function printHelp(): void {
  console.log(`
OpenCode Go CLI - Manage OpenCode Go subscription and launch Claude Code

Usage: opencode-go [options] [claude-code-flags...]

Options:
  --setup         Configure your OpenCode Go API key
  --reset         Reset configuration (delete API key)
  --list          List available models
  --model <id>    Run with specific model (non-interactive)
  --proxy         Start proxy server only (for testing)
  --port <port>   Set proxy port (default: ${DEFAULT_PROXY_PORT})
  --version, -v   Show version
  --help, -h      Show this help message

Examples:
  opencode-go --setup
  opencode-go --list
  opencode-go --model minimax-m2.7
  opencode-go --model minimax-m2.7 -p "explain this code"
    `);
}

async function runClaudeCode(
  model: string,
  baseUrl: string,
  extraArgs: string[],
): Promise<number> {
  const config = getConfig();

  if (!config.apiKey) {
    p.log.error("No API key configured. Run with --setup first.");
    return 1;
  }

  const claudePath = resolveClaudePath();
  const env = buildClaudeEnv(config.apiKey, model, baseUrl);
  const args: string[] = ["--model", model, ...extraArgs];

  p.log.success(`Endpoint: ${baseUrl}`);
  p.log.success(`API Key: ${config.apiKey.slice(0, 10)}...`);
  p.log.success(`Model: ${model}`);

  const spinner = p.spinner();
  spinner.start(`Starting Claude Code with ${model}...`);

  return new Promise<number>((resolve) => {
    const child = spawn(claudePath, args, {
      stdio: "inherit",
      env,
    });

    child.on("error", (err) => {
      spinner.stop(`Failed to start Claude Code: ${err.message}`);
      resolve(1);
    });

    child.on("close", (code) => {
      if (code === 0) {
        spinner.stop("Claude Code exited");
      } else {
        spinner.stop(`Claude Code exited with code ${code}`);
      }
      resolve(code ?? 0);
    });
  });
}

// ─── Main ──────────────────────────────────────────────────

export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log("opencode-go v1.0.0");
    process.exit(0);
  }

  if (args.includes("--setup")) {
    await setupApiKey();
    process.exit(0);
  }

  if (args.includes("--reset")) {
    deleteConfig();
    p.log.success("Configuration deleted.");
    process.exit(0);
  }

  if (args.includes("--list")) {
    console.log("\nAvailable models in OpenCode Go:\n");
    for (const model of MODELS) {
      console.log(`  ${model.id.padEnd(15)} - ${model.name}`);
      console.log(`                      ${model.description}\n`);
    }
    process.exit(0);
  }

  const config = getConfig();

  const portIndex = args.indexOf("--port");
  const port =
    portIndex !== -1 && args[portIndex + 1]
      ? parseInt(args[portIndex + 1])
      : (config.proxyPort || DEFAULT_PROXY_PORT);

  // Proxy-only mode: fail fast, no interactive prompts
  if (args.includes("--proxy")) {
    if (!config.apiKey) {
      console.error("[cli] No API key configured. Run 'opencode-go --setup' first.");
      process.exit(1);
    }
    await startProxy(port, config.apiKey);
    await new Promise(() => {}) as Promise<never>; // keep alive
    return;
  }

  // Extract model: fail fast if invalid, interactive select if missing
  let model: string;
  const modelArgIndex = args.findIndex((a) => a === "--model" || a === "-m");

  if (modelArgIndex !== -1 && args[modelArgIndex + 1]) {
    model = args[modelArgIndex + 1];
    args.splice(modelArgIndex, 2);
    // Fail fast: validate model before any setup prompt
    const validModel = MODELS.find((m) => m.id === model);
    if (!validModel) {
      p.log.error(`Unknown model: ${model}`);
      p.log.info("Run 'opencode-go --list' to see available models.");
      process.exit(1);
    }
  } else {
    // No model provided: guide through setup if needed, then interactive select
    if (!config.apiKey) {
      p.intro("OpenCode Go CLI");
      p.log.warn("No API key configured. Run 'opencode-go --setup' first.");

      const shouldSetup = await p.confirm({
        message: "Would you like to set up your API key now?",
        initialValue: true,
      });

      if (p.isCancel(shouldSetup) || !shouldSetup) {
        p.cancel("Please run 'opencode-go --setup' to configure your API key.");
        process.exit(1);
      }

      await setupApiKey();
    }
    model = await selectModel();
  }

  config.lastModel = model;
  config.proxyPort = port;
  saveConfig(config);

  const extraArgs = args.filter((a) => !a.startsWith("--"));

  const proxyUrl = `http://localhost:${port}`;
  await runClaudeCode(model, proxyUrl, extraArgs);
  process.exit(0);
}
