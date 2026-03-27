# Testes — Design

**Spec**: `.specs/features/testing/spec.md`
**Status**: ✅ Complete

---

## Architecture Overview

Framework de teste: **Bun test** (built-in, zero dependência extra).

```
tests/
├── helpers.test.ts
├── request-conversion.test.ts
├── response-conversion.test.ts
└── env.test.ts
```

**Por que Bun test em vez de Vitest/Jest:**

- Já vem com Bun — zero dependência nova
- Suporta TypeScript nativamente (sem config)
- `bun test` funciona direto
- Mais rápido que Jest/Vitest em projetos Bun

---

## Test Organization

Cada arquivo de teste corresponde a um módulo:

| Test File | Module | O que testa |
|-----------|--------|-------------|
| `tests/helpers.test.ts` | `src/proxy/helpers.ts` | 3 helpers |
| `tests/request-conversion.test.ts` | `src/proxy/request-conversion.ts` | 1 função |
| `tests/response-conversion.test.ts` | `src/proxy/response-conversion.ts` | 1 função |
| `tests/env.test.ts` | `src/env.ts` | 1 função |

**Nota**: `tests/` não é `src/` — arquivos de teste ficam separados do código de produção.

---

## Mocks Strategy

### `node:fs` em `tests/env.test.ts`

Bun test **não suporta `vi.mock`** (é API do Vitest, não disponível no Bun). Para testar sem poluir o FS, usamos `beforeEach`/`afterEach` para salvar/restaurar `process.env` e deixar `getInstallationPath` usar o path real (que é determinístico nos testes).

### Response mock em `tests/response-conversion.test.ts`

`convertOpenAIResponseToAnthropic` recebe um objeto JSON simples — não precisa de mock. Basta passar objetos no formato correto.

### Request mock em `tests/request-conversion.test.ts`

`convertAnthropicRequestToOpenAI` recebe um objeto — passa-se um JSON любым shape.

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Bun test | Zero deps | Já vem com Bun, funciona sem config |
| Testes em `tests/` | Separado de `src/` | Convenção padrão — código vs teste |
| Um arquivo por módulo | Coesão | Cada teste é claro sobre o que testa |
| vi.mock | Bun built-in mocking | Funcionalidade native do Bun test |
| Sem mock de Response real | Simplicidade | `streamOpenAIToAnthropic` não será testada nesta milestone (requer Response mockable) |

---

## Component Details

### `tests/helpers.test.ts`

**Testa**: `generateMsgId`, `mapStopReason`, `convertImageSource`

```typescript
import { describe, test, expect } from "bun:test";
import {
  generateMsgId,
  mapStopReason,
  convertImageSource,
} from "../src/proxy/helpers.js";
```

Cada helper tem seu grupo `describe()`.

### `tests/request-conversion.test.ts`

**Testa**: `convertAnthropicRequestToOpenAI`

```typescript
import { describe, test, expect } from "bun:test";
import { convertAnthropicRequestToOpenAI } from "../src/proxy/request-conversion.js";
```

Grupos organizados por tipo de conteúdo: system, user, assistant, tools.

### `tests/response-conversion.test.ts`

**Testa**: `convertOpenAIResponseToAnthropic`

```typescript
import { describe, test, expect } from "bun:test";
import { convertOpenAIResponseToAnthropic } from "../src/proxy/response-conversion.js";
```

### `tests/env.test.ts`

**Testa**: `buildClaudeEnv`

```typescript
import { describe, test, expect, beforeEach, vi } from "bun:test";
import { buildClaudeEnv } from "../src/env.js";
```

Mock de `path.ts` para isolar o teste de FS real.

---

## Error Handling Strategy

Testes de error cases (JSON.parse fail, null inputs) são cobertos nas edge cases do spec. Bun test vai falhar com throw se assertions falharem — comportamento esperado.

---

## Test Execution

```bash
# Todos os testes
bun test

# Um arquivo específico
bun test tests/helpers.test.ts

# Com coverage (futuro)
bun test --coverage
```
