// ============================================================
// Path — resolução de paths e localização de binários
// SRP: só descoberta, não persiste nada
// ============================================================

import { execSync } from "node:child_process";
import { join } from "node:path";
import { INSTALLATIONS_DIR, DEFAULT_INSTALLATION_ID } from "./constants.js";

export function getInstallationPath(id: string = DEFAULT_INSTALLATION_ID): string {
  return join(INSTALLATIONS_DIR, id);
}

export function resolveClaudePath(): string {
  try {
    if (process.platform === "win32") {
      return execSync("where claude", { encoding: "utf-8" }).trim().split(/\r?\n/)[0] ?? "claude";
    }
    return execSync("which claude", { encoding: "utf-8" }).trim();
  } catch {
    return "claude";
  }
}
