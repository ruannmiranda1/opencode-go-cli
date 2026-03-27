# Testing Infrastructure

**Status:** Implementado — 49 testes, 0 falhas (Bun test runner)

## Test Framework

**Framework:** Bun test runner (built-in, sem dependência extra)
**Execute:** `bun test`
**Coverage:** parcial — focado em funções puras e de conversão

## Test Organization

**Location:** `tests/` — um arquivo por módulo

```
tests/
├── helpers.test.ts
├── request-conversion.test.ts
├── response-conversion.test.ts
├── env.test.ts
└── logger.test.ts
```

**Naming:** `*.test.ts` — convenção do Bun test runner

## Test Coverage

| Arquivo | Testes | O que cobre |
|---------|--------|-----------|
| `helpers.test.ts` | ~10 | mapStopReason, generateMsgId, convertImageSource, formatDelta |
| `request-conversion.test.ts` | ~10 | convertAnthropicRequestToOpenAI |
| `response-conversion.test.ts` | ~7 | convertOpenAIResponseToAnthropic |
| `env.test.ts` | ~8 | buildClaudeEnv |
| `logger.test.ts` | ~13 | Logger class, níveis DEBUG/INFO/WARN/ERROR |

**Total:** 49 testes, 73 expect() calls

## Testing Patterns

### Unit Tests

**Funções puras testadas:**

- `convertAnthropicRequestToOpenAI()` — entrada/saída JSON
- `convertOpenAIResponseToAnthropic()` — entrada/saída JSON
- `mapStopReason()` — pure function
- `generateMsgId()` — pure function (não determinística mas testável)
- `convertImageSource()` — pure function
- `formatDelta()` — pure function
- `buildClaudeEnv()` — pure function, retorna objeto
- `Logger` — testado com stdout/stderr spy

### Testes de Logger

O logger é testado com spy em `stdout.write` e `stderr.write` para verificar que:
- `logger.debug()` é noop sem `DEBUG=1`
- `logger.debug()` emite quando `DEBUG=1`
- `logger.info()`, `logger.warn()`, `logger.error()` sempre emitem no stderr
- Prefixos corretos: `[namespace] [LEVEL]`

## Testability Issues

### streamOpenAIToAnthropic()

**Status:** Não testado — adiado porque requer mock de `Response.body.getReader()`.

O streaming é crítico mas testar requer setup complexo de mock. smoke test manual é suficiente por enquanto.

### Config functions

**Status:** Não testado diretamente — depende de mock de `node:fs`.

`getConfig()`, `saveConfig()`, `deleteConfig()` leem/escrevem em `~/.opencode-go-cli/config.json`. Tests de CLI que usassem essas funções precisariam de mock de fs.

## Recommendations

1. **streamOpenAIToAnthropic():** adicionar teste quando mocking de `Response.body` estiver resolvido
2. **Config functions:** mock de `node:fs` em `tests/helpers/` se cobertura de CLI for prioridade
3. **CLI tests:** smoke test manual é suficiente para UX validation
