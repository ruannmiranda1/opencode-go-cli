# Debug Logging Gated — Tasks

**Design**: `.specs/features/debug-logging/design.md`
**Status**: ✅ Complete

---

## Execution Plan

### Phase 1: Logger Core (Sequential)

```
T1 (logger.ts) → T2 (logger.test.ts)
```

### Phase 2: Integration (Sequential)

```
T3 (server.ts) → T4 (stream-conversion.ts) → T5 (smoke)
```

---

## Task Breakdown

### T1: Criar `src/logger.ts`

**What**: Criar módulo logger com níveis DEBUG/INFO/WARN/ERROR
**Where**: `src/logger.ts`
**Depends on**: Nenhum
**Reuses**: Nenhum

**Interface**:
```typescript
class Logger {
  constructor(options?: { level?: "DEBUG" | "INFO" | "WARN" | "ERROR"; prefix?: string });
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
export function createLogger(prefix?: string): Logger;
```

**Rules**:
- DEBUG ativo quando `process.env.DEBUG === "1"` ou `process.env.DEBUG === "true"`
- INFO é o default (nível mais baixo sempre loga)
- Cada nível só loga se >= nível ativo
- Prefixo no constructor (ex: `[proxy]`)
- Sem output quando nível não está ativo

**Done when**:
- [ ] Logger class exportada com debug/info/warn/error
- [ ] DEBUG=1 ativa logs de debug
- [ ] Sem DEBUG setado, debug() é noop
- [ ] Prefixo aplicado a todas as linhas

**Verify**:
```bash
# Manual test:
DEBUG=1 node -e "import('./src/logger.ts').then(m => m.createLogger('test').debug('foo'))"
# Sem output se DEBUG=off
```

---

### T2: Criar `tests/logger.test.ts`

**What**: Testar Logger class
**Where**: `tests/logger.test.ts`
**Depends on**: T1
**Reuses**: `src/logger.ts`

**Done when**:
- [ ] 7 test cases do spec (P1) implementados
- [ ] debug() noop sem DEBUG=1
- [ ] info() sempre loga
- [ ] warn() com prefixo [WARN]
- [ ] error() com prefixo [ERROR]

**Verify**:
```bash
bun test tests/logger.test.ts
# Expected: 7 passed
```

---

### T3: Substituir console.log em `src/proxy/server.ts`

**What**: Trocar console.log por logger em server.ts
**Where**: `src/proxy/server.ts`
**Depends on**: T1
**Reuses**: `src/logger.ts`

**Done when**:
- [ ] `startProxy` importa `createLogger`
- [ ] Todo `console.log` substituído por `logger.info()` ou `logger.debug()`
- [ ] `console.log("[proxy] Error: ...")` → `logger.error(...)`
- [ ] Request logging (method, URL, model) em DEBUG level
- [ ] Status code logging em INFO level

**Verify**:
```bash
bun run typecheck
DEBUG=1 bun run src/index.ts --proxy --port 8081 &
sleep 1
curl -I http://localhost:8081/ 2>/dev/null
# Deve ver logs de DEBUG
kill %1 2>/dev/null
```

---

### T4: Substituir console.log em `src/proxy/stream-conversion.ts`

**What**: Trocar console.log por logger em stream-conversion.ts
**Where**: `src/proxy/stream-conversion.ts`
**Depends on**: T1
**Reuses**: `src/logger.ts`

**Done when**:
- [ ] `streamOpenAIToAnthropic` importa `createLogger`
- [ ] `console.log("[proxy] WARNING: response.body is null!")` → `logger.warn(...)`
- [ ] `console.log("[proxy] OpenAI stream ended...")` → `logger.debug(...)`
- [ ] `console.log("[proxy] Raw OpenAI chunk #N: ...")` → `logger.debug(...)`
- [ ] `console.log("[proxy] SSE chunk #N: ...")` → `logger.debug(...)`
- [ ] `console.log("[proxy] Stream complete...")` → `logger.debug(...)`
- [ ] `console.log("[proxy] Stream error: ...")` → `logger.error(...)`

**Verify**:
```bash
bun run typecheck
```

---

### T5: Smoke test

**What**: Verificar que tudo funciona com e sem DEBUG
**Where**: N/A
**Depends on**: T3, T4
**Reuses**: Nenhum

**Done when**:
- [ ] `bun run build` passa
- [ ] `bun test` passa (36+7 = 43 tests)
- [ ] `bun run src/index.ts --help` funciona
- [ ] Sem DEBUG: sem output de debug
- [ ] DEBUG=1: logs detalhados aparecem

**Verify**:
```bash
bun run build
bun test
DEBUG=1 bun run src/index.ts --help 2>&1 | grep -c "DEBUG" # deve ter output
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: logger.ts | 1 módulo novo | ✅ Granular |
| T2: logger.test.ts | 1 arquivo, 7 tests | ✅ Granular |
| T3: server.ts logging | substituição de console.log | ✅ Granular |
| T4: stream-conversion.ts logging | substituição de console.log | ✅ Granular |
| T5: smoke | 3 verificações | ✅ Granular |

---

## Dependency Matrix

| Task | Depends on |
|------|-----------|
| T1 | — |
| T2 | T1 |
| T3 | T1 |
| T4 | T1 |
| T5 | T3, T4 |
