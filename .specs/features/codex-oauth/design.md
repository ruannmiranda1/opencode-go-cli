# Codex OAuth — Design

**Spec**: `.specs/features/codex-oauth/spec.md`
**Status**: ✅ Complete

---

## Architecture Overview

Adicionar provider abstraction — a CLI passa a rotear entre dois provedores:

```
CLI (--provider)
  ├── opencode: API key → proxy (Chat Completions) → OpenCode Go API
  └── openai:  OAuth → proxy (Responses API) → Codex backend (chatgpt.com/backend-api/codex)
```

Cada provider usa um formato de API diferente:
- **OpenCode Go:** Chat Completions (`/v1/chat/completions`) — formato tradicional OpenAI
- **OpenAI/Codex:** Responses API (`/responses`) — formato novo da OpenAI, com `instructions`, `input[]` tipado, e eventos SSE nomeados

O proxy roteia automaticamente para o caminho correto baseado no provider.

---

## Changes

### `src/constants.ts`

Adicionar constantes do OAuth:

```typescript
// OpenAI Codex OAuth (same as Codex CLI)
export const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const CODEX_AUTH_URL = "https://auth.openai.com/oauth/authorize";
export const CODEX_TOKEN_URL = "https://auth.openai.com/oauth/token";
export const CODEX_REDIRECT_URI = "http://localhost:1455/auth/callback";
export const CODEX_SCOPE = "openid profile email offline_access";
export const CODEX_API_URL = "https://chatgpt.com/backend-api/codex/responses";

export const PROVIDERS = ["opencode", "openai"] as const;
export type Provider = typeof PROVIDERS[number];

// OpenAI models (Codex backend)
export const OPENAI_MODELS = [
  { id: "gpt-5.2", name: "GPT-5.2", description: "Latest GPT-5 model" },
  { id: "gpt-5.3", name: "GPT-5.3", description: "High performance GPT-5" },
  { id: "gpt-5.4", name: "GPT-5.4", description: "Balanced GPT-5" },
  { id: "gpt-5.1-codex", name: "GPT-5.1 Codex", description: "Code-optimized GPT-5.1" },
  { id: "gpt-5.2-codex", name: "GPT-5.2 Codex", description: "Code-optimized GPT-5.2" },
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", description: "Code-optimized GPT-5.3" },
] as const;
```

### `src/config.ts`

```typescript
// Adicionar novo tipo de token no Config
export interface OpenAIAuthTokens {
  access: string;
  refresh: string;
  expiresAt: number;  // timestamp ms
}

export interface Config {
  apiKey?: string;
  provider?: Provider;
  openaiTokens?: OpenAIAuthTokens;
  lastModel?: string;
  proxyPort?: number;
}
```

### `src/cli.ts`

Mudanças em `main()`:

```typescript
// 1. Parse --provider
const providerArg = args.find(a => a === "--provider" || a === "-p");
if (providerArg) {
  const providerValue = args[args.indexOf(providerArg) + 1];
  if (!PROVIDERS.includes(providerValue)) {
    p.log.error(`Unknown provider: ${providerValue}. Options: ${PROVIDERS.join(", ")}`);
    process.exit(1);
  }
  config.provider = providerValue;
}

// 2. Validação de modelo por provider
const modelList = config.provider === "openai" ? OPENAI_MODELS : MODELS;
const validModel = modelList.find(m => m.id === model);
if (!validModel) {
  p.log.error(`Unknown model: ${model}`);
  p.log.info(`Run 'opencode-go --list --provider ${config.provider}' to see available models.`);
  process.exit(1);
}
```

### `src/env.ts`

```typescript
// A escolha do endpoint é baseada no provider
export function buildClaudeEnv(
  apiKey: string,
  model: string,
  baseUrl: string,
  provider: Provider = "opencode"
): Record<string, string> {
  // ...
}
```

### Novo: `src/auth/oauth.ts`

OAuth flow baseado no plugin do numman-ali:

```typescript
// PKCE generation (depende de @openauthjs/openauth)
import { generatePKCE } from "@openauthjs/openauth/pkce";

// Funções exportadas:
// - createAuthorizationFlow(): gera PKCE + URL
// - exchangeAuthorizationCode(code, verifier): troca código por tokens
// - refreshAccessToken(refreshToken): renova token
// - decodeJWT(token): extrai payload do JWT
```

### Novo: `src/auth/server.ts`

Servidor HTTP local para callback OAuth:

```typescript
// startLocalOAuthServer(state: string): Promise<OAuthServerInfo>
// Escuta em localhost:1455, recebe /auth/callback com code + state
// Retorna { port, ready, close, waitForCode }
```

### `src/proxy/server.ts`

Endpoint e formato de conversão dinâmicos baseado no provider:

```typescript
const endpoint = provider === "openai" ? CODEX_API_URL : OPENCODE_GO_ENDPOINT;
const isResponses = provider === "openai";

// Request: escolhe conversor baseado no provider
const outBody = isResponses
  ? convertAnthropicRequestToResponses(anthropicBody)   // Responses API
  : convertAnthropicRequestToOpenAI(anthropicBody);      // Chat Completions

// Streaming: escolhe gerador baseado no provider
const streamGenerator = isResponses
  ? streamResponsesToAnthropic(response)    // Responses API SSE → Anthropic SSE
  : streamOpenAIToAnthropic(response);      // Chat Completions SSE → Anthropic SSE

// Non-streaming: escolhe conversor baseado no provider
const anthropicResponse = isResponses
  ? convertResponsesApiToAnthropic(data)     // Responses API → Anthropic
  : convertOpenAIResponseToAnthropic(data);  // Chat Completions → Anthropic
```

### Novo: `src/proxy/request-conversion-responses.ts`

Converte Anthropic → Responses API:
- `system` → `instructions` (campo top-level)
- `messages[]` → `input[]` com items tipados (`type: "message"`, `type: "function_call"`, `type: "function_call_output"`)
- `tools[]` com wrapper `function:{}` → flat `{type: "function", name, parameters}`
- Content blocks: `text` → `input_text`/`output_text`, `image` → `input_image`

### Novo: `src/proxy/response-conversion-responses.ts`

Converte Responses API → Anthropic (non-streaming):
- `output[].type: "message"` → `content[].type: "text"`
- `output[].type: "function_call"` → `content[].type: "tool_use"`

### Novo: `src/proxy/stream-conversion-responses.ts`

Converte Responses API SSE → Anthropic SSE:
- `response.created` → `message_start`
- `response.output_text.delta` → `content_block_delta` (text_delta)
- `response.function_call_arguments.delta` → `content_block_delta` (input_json_delta)
- `response.output_item.added` (function_call) → `content_block_start` (tool_use)
- `response.completed` → `message_delta` + `message_stop`

### Novo: `src/cli-oauth.ts`

Comando de OAuth standalone:

```bash
opencode-go --oauth-login
```

Fluxo completo:
1. Gera PKCE + state
2. Sobe servidor em 1455
3. Abre navegador com URL de autorização
4. Polls até receber código
5. Troca código por tokens
6. Salva no config

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| PKCE via @openauthjs | já existe no ecossistema | Sem reinventar |
| Porta 1455 | mesmo do Codex CLI | Usuário já sabe |
| Tokens no config.json | mismo local do apiKey | Simples, já existe persistence |
| Provider como flag | --provider | Explícito, não ambiguous |
| OpenAI models hardcoded | lista fixa | API não tem endpoint público sem token |

---

## Code Location

```
src/
├── auth/                                    # NOVO
│   ├── oauth.ts                             # PKCE, exchange, refresh, JWT decode
│   └── server.ts                            # Local HTTP callback server
├── cli.ts                                   # MOD — --provider, model validation, proxy auto-start, logger silencing
├── config.ts                                # MOD — novo tipo OpenAIAuthTokens
├── constants.ts                             # MOD — OAuth constants + OpenAI models
├── env.ts                                   # MOD — endpoint dinâmico
├── logger.ts                                # MOD — silenceLogger() para modo embutido
└── proxy/
    ├── server.ts                            # MOD — roteamento dual (Chat Completions / Responses API)
    ├── request-conversion-responses.ts      # NOVO — Anthropic → Responses API
    ├── response-conversion-responses.ts     # NOVO — Responses API → Anthropic (non-stream)
    └── stream-conversion-responses.ts       # NOVO — Responses API SSE → Anthropic SSE
```

---

## OAuth Flow (detalhado)

```
1. opencode-go --provider openai --oauth-login
2. generatePKCE() → { challenge, verifier }
3. Gerar URL: https://auth.openai.com/oauth/authorize
   ?client_id=app_EMoamEEZ73f0CkXaXp7hrann
   &response_type=code
   &redirect_uri=http://localhost:1455/auth/callback
   &scope=openid profile email offline_access
   &code_challenge=<pkce_challenge>
   &code_challenge_method=S256
   &state=<state>
   &codex_cli_simplified_flow=true
4. startLocalOAuthServer(state) → sobe http://127.0.0.1:1455
5. openBrowser(url) → navegador abre
6. Usuário loga no ChatGPT
7. OpenAI redireciona: http://localhost:1455/auth/callback?code=XXX&state=YYY
8. server recebe code → waitForCode() resolve
9. exchangeAuthorizationCode(code, verifier) → POST /oauth/token
10. Salvar { access, refresh, expiresAt } no config.json
```
