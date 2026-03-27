// ============================================================
// Config — persistência de configuração do usuário
// SRP: só persistência, não resolve paths
// ============================================================

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { CONFIG_FILE, CONFIG_DIR, type Config } from "./constants.js";

export function getConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function deleteConfig(): void {
  try {
    unlinkSync(CONFIG_FILE);
  } catch {}
}
