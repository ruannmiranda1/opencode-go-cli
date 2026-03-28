# Code Conventions

## Naming Conventions

**Files:**

- Arquivos de código: camelCase (ex: `request-conversion.ts`)
- Interfaces: PascalCase em arquivo próprio (ex: `src/proxy/types.ts`)
- Type aliases: PascalCase

**Functions/Methods:**

- Funções: camelCase (ex: `getConfig`, `buildClaudeEnv`, `convertAnthropicRequestToOpenAI`)
- Funções async: mesmo padrão, sem sufixo `Async` (ex: `setupApiKey`, `startProxy`)
- Async generators: sem sufixo especial (ex: `streamOpenAIToAnthropic`)

**Variables:**

- Constantes de config: SCREAMING_SNAKE_CASE (`CONFIG_FILE`, `DEFAULT_PROXY_PORT`)
- Variáveis de função: camelCase
- Interfaces/variáveis de resposta de API: camelCase ouPascalCase conforme escopo

**Constants:**

- Arrays de config: PascalCase (`MODELS: Model[]`)
- Sets: SCREAMING_SNAKE_CASE (`PRESERVED_CLAUDE_CODE_VARS`)

## Code Organization

**Import/Dependency Declaration:**

- Imports padrão primeiro (`node:*`), depois packages (`@clack/prompts`), sem grouping visual com linhas em branco entre grupos
- Sem barrel exports

**File Structure (modular):**

```
src/
├── index.ts            — thin entry point, exports main
├── constants.ts        — valores compartilhados (sem deps)
├── config.ts           — persistência (deps: constants)
├── path.ts            — resolução de binário (deps: constants)
├── env.ts             — buildClaudeEnv (deps: constants)
├── logger.ts          — logging configurável + file output (sem deps externas)
├── cli.ts             — orchestration + menus + permission modes (importa tudo)
├── auth/
│   ├── oauth.ts       — PKCE, exchange, refresh
│   └── server.ts      — callback server
├── search/
│   └── searxng.ts     — Docker SearXNG management + search
└── proxy/
    ├── types.ts        — interfaces (sem deps)
    ├── helpers.ts      — funções puras utilitárias (sem deps)
    ├── websearch-interceptor.ts — WebSearch interception via SearXNG
    ├── request-conversion.ts
    ├── response-conversion.ts
    ├── stream-conversion.ts
    ├── *-responses.ts  — Responses API conversions (OpenAI/Codex)
    └── server.ts       — Bun.serve (deps: proxy modules + logger + websearch + searxng)
```

## Type Safety

**Approach:** TypeScript com strict mode, sem JSDoc.

Interfaces definidas em `src/constants.ts`:

```typescript
export interface Config {
  apiKey?: string;
  provider?: Provider;
  openaiTokens?: OpenAIAuthTokens;
  lastModel?: string;
  proxyPort?: number;
}

export interface Model {
  id: string;
  name: string;
  description: string;
}

export interface OpenAIAuthTokens {
  access: string;
  refresh: string;
  expiresAt: number;
}
```

Type local em `src/cli.ts`:

```typescript
type PermissionMode = "default" | "acceptEdits" | "auto" | "bypassPermissions";
```

**Parâmetros de função com `any`:** Os módulos de conversão usam `any` para o body de request/response da API (tipos não estão definidos). Isso é aceitável porque a API upstream não é tipada.

## Error Handling

**Pattern:** Try/catch com `catch {}` vazio para operações que falham silenciosamente (ex: `getConfig`). Para operações críticas, retorna `Response` de erro com JSON estruturado.

```typescript
// Silent failure
function getConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

// Explicit error response
return new Response(JSON.stringify({
  type: "error",
  error: {
    type: "api_error",
    message: errorText,
  },
}), { status: response.status, headers: { "Content-Type": "application/json" } });
```

**Port in use:** `Bun.serve` é envolvido em try/catch em `startProxy()`. Se `EADDRINUSE`, loga mensagem clara e faz `process.exit(1)`.

## Comments/Documentation

**Style:** Comentários de seção em Caps Lock com linhas de igual:

```typescript
// ============================================================
// Proxy Server — Bun.serve + roteamento
// ============================================================
```

Comentários inline raros, só onde a lógica é complexa (ex: explicando por que `thinking` blocks são pulados).

## Logging

**Pattern:** Logger configurável via `src/logger.ts` (não `console.log` direto):

```typescript
import { createLogger } from "./logger.js";
const logger = createLogger("[proxy]");

logger.debug("Detalhe técnico");  // só com DEBUG=1
logger.info("Evento importante");
logger.warn("Algo não ideal");
logger.error("Falha");
```

**Níveis:**

- `DEBUG`: detalhes de desenvolvimento (só com `DEBUG=1`)
- `INFO`: eventos normais (início do proxy, requisição/response)
- `WARN`: uso de features deprecated ou config incompleta
- `ERROR`: falhas — sempre visível

**Prefixo:** Todas as linhas têm `[namespace] [LEVEL]` (ex: `[proxy] [INFO] Starting on port 8080`).
