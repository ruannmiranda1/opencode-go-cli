# Debug Logging Gated — Design

**Spec**: `.specs/features/debug-logging/spec.md`
**Status**: ✅ Complete

---

## Architecture Overview

Módulo singleton de logging com níveis. Não tem estado global — cada chamada cria/retorna uma instância configurável.

```
src/
└── logger.ts       ← logger com níveis DEBUG/INFO/WARN/ERROR
```

O logger é importado nos módulos que precisam (proxy/server.ts, proxy/stream-conversion.ts).

---

## API Design

```typescript
// src/logger.ts

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

class Logger {
  constructor(options?: { level?: LogLevel; prefix?: string });
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

// Nível default: INFO
// Nível ativo quando DEBUG=1 ou DEBUG=true
```

**Dessaques:**
- `prefix?: string` — permite `[proxy]` como prefixo sem duplicar lógica
- Lê `process.env.DEBUG` na inicialização — não precisa de configuração manual em cada call
- `debug()` é noop quando `DEBUG` não está setado — zero custo em produção

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Singleton Logger class | Classe com método estático ou instância exportada | Permite prefixo por contexto |
| Lê `process.env.DEBUG` | Na construção, não no call | Custo de ler env só uma vez |
| `debug()` noop por default | early return | Zero overhead em produção |
| Prefixo como constructor arg | `logger("proxy")` | Cada contexto pode ter seu prefixo |

---

## Code Location

```
src/
└── logger.ts       — Logger class com debug/info/warn/error
```

Consumido por:
- `src/proxy/server.ts` — request logging
- `src/proxy/stream-conversion.ts` — chunk logging
