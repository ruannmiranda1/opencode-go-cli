// ============================================================
// Constants — valores compartilhados por todos os módulos
// ============================================================

import { homedir } from "node:os";
import { join } from "node:path";

export const MODELS: Model[] = [
  { id: "minimax-m2.5", name: "MiniMax M2.5", description: "Balanced speed and quality" },
  { id: "minimax-m2.7", name: "MiniMax M2.7", description: "High performance coding model" },
  { id: "kimi-k2.5", name: "Kimi K2.5", description: "Strong reasoning for complex tasks" },
  { id: "glm-5", name: "GLM-5", description: "Latest generation from Zhipu AI" },
];

export const OPENCODE_GO_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions";

export const CONFIG_DIR = join(homedir(), ".opencode-go-cli");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const INSTALLATIONS_DIR = join(CONFIG_DIR, "installations");
export const DEFAULT_INSTALLATION_ID = "default";
export const DEFAULT_PROXY_PORT = 8080;

export const PRESERVED_CLAUDE_CODE_VARS = new Set([
  "CLAUDE_CODE_GIT_BASH_PATH",
  "CLAUDE_CODE_SHELL",
  "CLAUDE_CODE_TMPDIR",
]);

export interface Config {
  apiKey?: string;
  lastModel?: string;
  proxyPort?: number;
}

export interface Model {
  id: string;
  name: string;
  description: string;
}
