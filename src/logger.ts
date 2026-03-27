// ============================================================
// Logger — níveis DEBUG / INFO / WARN / ERROR
// DEBUG=1 ou DEBUG=true ativa logs de debug
// Default: INFO (silencia debug em produção)
// ============================================================

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
};

function resolveLogLevel(level?: LogLevel): LogLevel {
  if (level && level in LEVEL_ORDER) return level;
  return "INFO";
}

function isDebugEnabled(): boolean {
  const v = process.env["DEBUG"];
  return v === "1" || v === "true";
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
        console.log(`${prefix}${levelTag} ${line}`);
      }
    }
  }

  debug(...args: any[]): void { this.log("DEBUG", ...args); }
  info(...args: any[]): void  { this.log("INFO",  ...args); }
  warn(...args: any[]): void  { this.log("WARN",  ...args); }
  error(...args: any[]): void { this.log("ERROR", ...args); }
}

export function createLogger(prefix?: string): Logger {
  return new Logger({ prefix });
}
