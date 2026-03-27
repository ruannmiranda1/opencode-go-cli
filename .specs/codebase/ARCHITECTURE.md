# Architecture

**Pattern:** CLI + Proxy modular com responsabilidade única por módulo.

## High-Level Structure

O código é dividido em módulos com responsabilidade clara:

1. **CLI (`src/cli.ts`):** Parseia argumentos, prompts interativos, spawn do Claude Code
2. **Proxy (`src/proxy/server.ts`):** Bun.serve que traduz requisições Anthropic ↔ OpenAI
3. **Conversões (`src/proxy/request-conversion.ts`, `response-conversion.ts`, `stream-conversion.ts`):** Funções puras de transformação

## Identified Patterns

### Proxy Tradutor

**Location:** `src/proxy/request-conversion.ts`, `response-conversion.ts`, `stream-conversion.ts`
**Purpose:** Traduzir requisições Anthropic → OpenAI e respostas OpenAI → Anthropic
**Implementation:** Funções puras de transformação + Bun.serve como servidor HTTP
**Streams:** `streamOpenAIToAnthropic()` é um async generator que converte SSE chunk por chunk

O proxy é stateless entre requisições — cada requisição é transformada e enviada ao upstream OpenCode Go independentemente.

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
  ├── getConfig() — lê ~/.opencode-go-cli/config.json
  ├── setupApiKey() / selectModel() — prompts interativos (se necessário)
  ├── startProxy() — sobe Bun.serve na porta 8080 (default)
  └── runClaudeCode()
        ├── resolveClaudePath() — encontra binário claude no PATH
        ├── buildClaudeEnv() — constrói vars (ANTHROPIC_BASE_URL=http://localhost:PORT)
        └── spawn(claude, args, { env, stdio: "inherit" })
              └── spinner (clack/prompts) enquanto Claude Code inicia
```

### Fluxo Proxy (requisição única)

```
Bun.serve.fetch(req)
  ├── HEAD/GET / → 200 OK (Claude Code connectivity check)
  └── POST /v1/messages
        ├── req.json() — parsing do body Anthropic
        ├── convertAnthropicRequestToOpenAI() — transforma request
        ├── fetch(OPENCODE_GO_ENDPOINT) — POST pro OpenCode Go API
        ├── Se streaming:
        │     └── streamOpenAIToAnthropic() — async generator, chunk por chunk
        └── Se não-streaming:
              └── convertOpenAIResponseToAnthropic() — transforma resposta completa
```

### Fluxo de Conversão (Request)

```
Anthropic /v1/messages
  ├── system: string | ContentBlock[] → role: "system"
  ├── messages[].role: "user"
  │     ├── content: string → role: "user", content: string
  │     └── content: ContentBlock[]
  │           ├── type: "text" → type: "text", text: string
  │           ├── type: "image" → type: "image_url", image_url: { url: data:... }
  │           └── type: "tool_result" → role: "tool", tool_call_id, content
  ├── messages[].role: "assistant"
  │     ├── content: string → role: "assistant", content: string
  │     └── content: ContentBlock[]
  │           ├── type: "text" → text
  │           └── type: "tool_use" → tool_calls: [{ id, function: { name, arguments }}]
  ├── tools[] → tools: [{ type: "function", function: { name, description, parameters }}]
  └── tool_choice → tool_choice (required | auto | { type: "function", function: { name }})

→ OpenAI /v1/chat/completions
```

### Fluxo de Conversão (Response Streaming)

```
OpenAI SSE
  └── data: {"choices": [{"delta": {"content": "..."}}]}
        └── event: content_block_start (type: "text")
        └── event: content_block_delta (type: "text_delta", text: "...")
        └── event: content_block_stop (index: N)
        └── event: message_delta (stop_reason: "end_turn")
        └── event: message_stop
```

Estado interno do stream: mantém `textBlockStarted`, `toolCallAccumulators`, `openaiToolIndexToBlockIndex` para mapear índices OpenAI → Anthropic.

## Code Organization

```
src/
├── constants.ts        # MODELS, ENDPOINT, CONFIG_DIR, CONFIG_FILE, DEFAULT_PROXY_PORT
├── config.ts           # getConfig, saveConfig, deleteConfig
├── path.ts            # resolveClaudePath
├── env.ts             # buildClaudeEnv, cleanupClaudeCodeVars
├── logger.ts          # createLogger (DEBUG/INFO/WARN/ERROR)
├── cli.ts             # main(), setupApiKey(), selectModel(), runClaudeCode()
└── proxy/
    ├── types.ts        # Config, Model interfaces
    ├── helpers.ts      # mapStopReason, generateMsgId, convertImageSource, formatDelta
    ├── request-conversion.ts
    ├── response-conversion.ts
    ├── stream-conversion.ts
    └── server.ts       # startProxy() + Bun.serve
```

**Module boundaries:**

- `constants.ts` — sem dependências
- `config.ts` — depende de constants
- `path.ts` — depende de constants
- `env.ts` — depende de constants
- `logger.ts` — depende de constants
- `cli.ts` — orchestrator (importa tudo)
- `proxy/types.ts` — sem dependências
- `proxy/helpers.ts` — sem dependências
- `proxy/*.ts` — dependem de types e helpers
- `proxy/server.ts` — imports de proxy modules + logger
