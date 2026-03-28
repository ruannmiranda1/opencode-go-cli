// ============================================================
// Logger — níveis DEBUG / INFO / WARN / ERROR
// DEBUG=1 ou DEBUG=true ativa logs de debug
// Quando silenciado + DEBUG=1: escreve em arquivo (~/.opencode-go-cli/proxy.log)
// Default: INFO (silencia debug em produção)
// ============================================================

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
};

function isDebugEnabled(): boolean {
  const v = process.env["DEBUG"];
  return v === "1" || v === "true";
}

let silenced = false;
let logFilePath: string | null = null;

function getLogFilePath(): string {
  if (!logFilePath) {
    const dir = join(homedir(), ".opencode-go-cli");
    mkdirSync(dir, { recursive: true });
    logFilePath = join(dir, "proxy.log");
  }
  return logFilePath;
}

export class Logger {
  private readonly level: LogLevel;
  private readonly prefix: string;

  constructor(options?: { level?: LogLevel; prefix?: string }) {
    if (options?.level) {
      if (!(options.level in LEVEL_ORDER)) {
        throw new Error(`[logger] Invalid log level: "${options.level}"`);
      }
      this.level = options.level;
    } else {
      this.level = isDebugEnabled() ? "DEBUG" : "INFO";
    }
    this.prefix = options?.prefix ?? "";
  }

  private log(level: LogLevel, ...args: any[]): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;

    const levelTag = `[${level}]`;
    const prefix = this.prefix ? `${this.prefix} ` : "";
    const parts = args.map((a) => (typeof a === "string" ? a : String(a)));

    for (const part of parts) {
      for (const line of part.split("\n")) {
        const msg = `${prefix}${levelTag} ${line}`;

        if (silenced) {
          if (isDebugEnabled()) {
            const ts = new Date().toISOString();
            appendFileSync(getLogFilePath(), `${ts} ${msg}\n`);
          }
        } else {
          console.log(msg);
        }
      }
    }
  }

  debug(...args: any[]): void { this.log("DEBUG", ...args); }
  info(...args: any[]): void  { this.log("INFO",  ...args); }
  warn(...args: any[]): void  { this.log("WARN",  ...args); }
  error(...args: any[]): void { this.log("ERROR", ...args); }
}

export function silenceLogger(): void {
  silenced = true;
}

export function isLoggerSilenced(): boolean {
  return silenced;
}

export function createLogger(prefix?: string): Logger {
  return new Logger({ prefix });
}
