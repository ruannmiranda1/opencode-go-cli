# Architecture

**Pattern:** CLI + Proxy modular com responsabilidade única por módulo.

## High-Level Structure

O código é dividido em módulos com responsabilidade clara:

1. **CLI (`src/cli.ts`):** Menus interativos (Start/Settings), seleção de provider/model/permission mode, spawn do Claude Code
2. **Proxy (`src/proxy/server.ts`):** Bun.serve que roteia entre dois formatos de API baseado no provider + WebSearch interception
3. **Conversões Chat Completions (`src/proxy/request-conversion.ts`, `response-conversion.ts`, `stream-conversion.ts`):** Funções puras — Anthropic ↔ Chat Completions (OpenCode Go)
4. **Conversões Responses API (`src/proxy/*-responses.ts`):** Funções puras — Anthropic ↔ Responses API (OpenAI/Codex)
5. **WebSearch (`src/proxy/websearch-interceptor.ts` + `src/search/searxng.ts`):** Interceptação de server tools `web_search_*` com execução local via SearXNG Docker

## Identified Patterns

### Proxy Tradutor Dual

**Location:** `src/proxy/server.ts` + dois conjuntos de conversores
**Purpose:** Traduzir requisições Anthropic → OpenAI (Chat Completions ou Responses API) e respostas de volta
**Implementation:** Funções puras de transformação + Bun.serve como servidor HTTP. O `server.ts` decide qual caminho usar com `const isResponses = provider === "openai"`.
**Streams:** Dois async generators — `streamOpenAIToAnthropic()` (Chat Completions SSE) e `streamResponsesToAnthropic()` (Responses API SSE com eventos nomeados)

O proxy é stateless entre requisições — cada requisição é transformada e enviada ao upstream independentemente.

### Logger com Silenciamento e File Output

**Location:** `src/logger.ts`
**Purpose:** Logging com níveis + silenciamento em modo embutido + escrita em arquivo
**Implementation:** `silenceLogger()` é chamado após `startProxy()` quando o proxy roda junto com Claude Code (evita poluir o terminal interativo). No modo `--proxy` isolado, os logs aparecem normalmente. Quando silenciado + `DEBUG=1`, todos os logs vão para `~/.opencode-go-cli/proxy.log` via `appendFileSync`.

### Configuração Persistente

**Location:** `src/config.ts`
**Purpose:** Guardar API key e preferências do usuário em `~/.opencode-go-cli/config.json`
**Implementation:** Leitura/escrita JSON síncrona com node:fs

### Environment Builder

**Location:** `src/env.ts`
**Purpose:** Construir o ambiente de variáveis pro Claude Code (limpar vars do Anthropic, setar base URL, auth token)
**Implementation:** Função pura que retorna novo objeto, não muta `process.env`

### Logger Configurável

**Location:** `src/logger.ts`
**Purpose:** Logging com níveis (DEBUG, INFO, WARN, ERROR) controlado por variável `DEBUG`
**Implementation:** `DEBUG=1` ativa logs detalhados; sem `DEBUG`, só INFO/WARN/ERROR aparecem

## Data Flow

### Fluxo CLI → Claude Code

```
main()
  ├── parse flags (--provider, --model, --permission-mode, etc.)
  ├── interactiveMain() — se sem flags, mostra menu Start/Settings
  │     ├── selectProvider() → OpenCode Go / OpenAI
  │     ├── ensureProviderAuth() → verifica/solicita auth
  │     ├── selectModel() → lista de modelos do provider
  │     └── selectPermissionMode() → default/acceptEdits/auto/bypassPermissions
  ├── startFlow()
  │     ├── startProxy() — sobe Bun.serve na porta 8080 (default)
  │     ├── silenceLogger() — silencia logs pro terminal
  │     ├── buildPermissionArgs() — converte mode em flags do Claude Code
  │     └── runClaudeCode()
  │           ├── resolveClaudePath() — encontra binário claude no PATH
  │           ├── buildClaudeEnv() — constrói vars (ANTHROPIC_BASE_URL=http://localhost:PORT)
  │           └── spawn(claude, [--model, ...permArgs], { env, stdio: "inherit" })
  └── settingsMenu() — Set API key / Login OpenAI / Logout OpenAI / Reset all
```

### Fluxo Proxy (requisição única)

```
Bun.serve.fetch(req)
  ├── HEAD/GET / → 200 OK (Claude Code connectivity check)
  └── POST /v1/messages
        ├── req.json() — parsing do body Anthropic
        ├── hasWebSearchTool() → se true, handleWebSearch() via SearXNG (return)
        ├── isResponses = provider === "openai"
        ├── Se OpenCode Go (Chat Completions):
        │     ├── convertAnthropicRequestToOpenAI()
        │     ├── fetch(OPENCODE_GO_ENDPOINT) → /v1/chat/completions
        │     ├── streamOpenAIToAnthropic() ou convertOpenAIResponseToAnthropic()
        └── Se OpenAI/Codex (Responses API):
              ├── convertAnthropicRequestToResponses()
              ├── fetch(CODEX_API_URL) → /backend-api/codex/responses (sempre stream=true)
              ├── Se cliente quer streaming: streamResponsesToAnthropic() → passthrough
              └── Se cliente quer non-streaming: consome stream → monta JSON response
```

### Fluxo WebSearch Interception

```
POST /v1/messages (com tool web_search_20250305)
  ├── hasWebSearchTool() detecta server tool
  ├── extractQuery() extrai query (padrão "for the query: ...")
  ├── search(query) → SearXNG localhost:8888/search?format=json
  ├── buildSearchResultBlocks() → server_tool_use + web_search_tool_result + text
  └── handleWebSearch() retorna Response Anthropic (streaming ou non-streaming)
```

### Fluxo SearXNG (background)

```
startProxy()
  └── ensureSearXNG() (async, background)
        ├── isContainerRunning() → docker inspect opencode-searxng
        ├── isDockerAvailable() → docker info
        ├── ensureSettings() → ~/.opencode-go-cli/searxng/settings.yml
        ├── startContainer() → docker run -d opencode-searxng (porta 8888)
        └── waitForReady() → poll /healthz até responder (max 15s)
```

### Fluxo de Conversão — Chat Completions (OpenCode Go)

```
Anthropic /v1/messages
  ├── system → role: "system"
  ├── messages[].role: "user" → role: "user"
  │     ├── type: "text" → type: "text"
  │     ├── type: "image" → type: "image_url" (data: URI)
  │     └── type: "tool_result" → role: "tool", tool_call_id
  ├── messages[].role: "assistant" → role: "assistant"
  │     └── type: "tool_use" → tool_calls: [{ function: { name, arguments }}]
  └── tools[] → [{ type: "function", function: { name, parameters }}]
→ OpenAI /v1/chat/completions
```

### Fluxo de Conversão — Responses API (OpenAI/Codex)

```
Anthropic /v1/messages
  ├── system → instructions (campo top-level)
  ├── messages[].role: "user" → input[].type: "message" (content: input_text)
  │     └── type: "tool_result" → input[].type: "function_call_output"
  ├── messages[].role: "assistant" → input[].type: "message" (content: output_text)
  │     └── type: "tool_use" → input[].type: "function_call"
  └── tools[] → [{ type: "function", name, parameters }] (flat, sem wrapper)
→ OpenAI /backend-api/codex/responses
```

### Streaming — Chat Completions SSE

```
data: {"choices": [{"delta": {"content": "..."}}]}
  → event: content_block_delta (type: "text_delta")
data: [DONE]
  → event: message_stop
```
Estado: `textBlockStarted`, `toolCallAccumulators`, `openaiToolIndexToBlockIndex`

### Streaming — Responses API SSE

```
event: response.output_text.delta → content_block_delta (text_delta)
event: response.function_call_arguments.delta → content_block_delta (input_json_delta)
event: response.output_item.added (function_call) → content_block_start (tool_use)
event: response.completed → message_delta + message_stop
```
Estado: `textBlockStarted`, `textBlockIndex`, `toolCallBlocks` (item_id → blockIndex)

## Code Organization

```
src/
├── constants.ts        # MODELS, OPENAI_MODELS, PROVIDERS, ENDPOINTS, OAuth constants
├── config.ts           # getConfig, saveConfig, deleteConfig
├── path.ts            # resolveClaudePath
├── env.ts             # buildClaudeEnv, cleanupClaudeCodeVars
├── logger.ts          # createLogger (DEBUG/INFO/WARN/ERROR) + silenceLogger() + file output
├── cli.ts             # main(), interactiveMain(), settingsMenu(), selectPermissionMode(), runClaudeCode()
├── auth/
│   ├── oauth.ts       # createAuthorizationFlow, exchangeAuthorizationCode, refreshAccessToken
│   └── server.ts      # startLocalOAuthServer (porta 1455)
├── search/
│   └── searxng.ts     # ensureSearXNG(), search() — Docker container management + queries
└── proxy/
    ├── types.ts                          # Config, Model interfaces
    ├── helpers.ts                        # mapStopReason, generateMsgId, convertImageSource, makeSSE
    ├── websearch-interceptor.ts          # hasWebSearchTool(), handleWebSearch() — interception via SearXNG
    ├── request-conversion.ts             # Anthropic → Chat Completions (OpenCode Go)
    ├── response-conversion.ts            # Chat Completions → Anthropic (OpenCode Go)
    ├── stream-conversion.ts              # Chat Completions SSE → Anthropic SSE (OpenCode Go)
    ├── request-conversion-responses.ts   # Anthropic → Responses API (OpenAI/Codex)
    ├── response-conversion-responses.ts  # Responses API → Anthropic (OpenAI/Codex)
    ├── stream-conversion-responses.ts    # Responses API SSE → Anthropic SSE (OpenAI/Codex)
    └── server.ts                         # startProxy() + Bun.serve + dual routing + WebSearch
```

**Module boundaries:**

- `constants.ts` — sem dependências
- `config.ts` — depende de constants
- `path.ts` — depende de constants
- `env.ts` — depende de constants
- `logger.ts` — sem dependências (usa node:fs, node:path, node:os)
- `auth/oauth.ts` — depende de constants
- `auth/server.ts` — sem dependências externas
- `search/searxng.ts` — depende de logger
- `cli.ts` — orchestrator (importa tudo)
- `proxy/helpers.ts` — sem dependências
- `proxy/websearch-interceptor.ts` — depende de helpers + search/searxng + logger
- `proxy/*-conversion*.ts` — dependem de helpers
- `proxy/server.ts` — imports de todos os proxy modules + logger + auth/oauth + websearch-interceptor + search/searxng
