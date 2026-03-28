# External Integrations

## OpenCode Go API

**Purpose:** Provedor de modelos de IA — API OpenAI-compatível para chat completions.

**Location:** `src/proxy/server.ts`, `src/proxy/request-conversion.ts`

**Endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`

**Formato:** Chat Completions API (formato tradicional OpenAI)

**Authentication:** Bearer token (API key do OpenCode Go, guardada em `~/.opencode-go-cli/config.json`).

**Conversão:** Anthropic → Chat Completions via `convertAnthropicRequestToOpenAI()`

**Modelos disponíveis (hardcoded em `src/constants.ts`):**

| ID | Nome |
|----|------|
| `minimax-m2.5` | MiniMax M2.5 |
| `minimax-m2.7` | MiniMax M2.7 |
| `kimi-k2.5` | Kimi K2.5 |
| `glm-5` | GLM-5 |

**Notas:**
- A API é OpenAI-compatível (Chat Completions) mas o proxy traduz do protocolo Anthropic
- Streaming é SSE com `data: {"choices":[...]}` (sem evento nomeado)
- Non-streaming também é suportado

---

## OpenAI / Codex Backend (Responses API)

**Purpose:** Provedor de modelos OpenAI (GPT-5.x) via OAuth — usa a Responses API, formato diferente do Chat Completions.

**Location:** `src/proxy/server.ts`, `src/proxy/request-conversion-responses.ts`

**Endpoint:** `https://chatgpt.com/backend-api/codex/responses`

**Formato:** Responses API (formato novo da OpenAI — `instructions`, `input[]` tipado, eventos SSE nomeados)

**Authentication:** Bearer token OAuth (obtido via PKCE flow com `auth.openai.com`, guardado em `config.openaiTokens`). Token refresh automático 1min antes da expiração.

**Conversão:** Anthropic → Responses API via `convertAnthropicRequestToResponses()`

**Codex stream=true:** O backend Codex sempre requer `stream: true`. Quando o Claude Code pede non-streaming, o proxy consome a stream internamente, coleta text/tool blocks, e monta uma response JSON completa antes de devolver.

**Diferenças do Chat Completions:**

| Aspecto | Chat Completions | Responses API |
|---------|-----------------|---------------|
| System prompt | `messages[0].role = "system"` | `instructions` (top-level) |
| Mensagens | `messages[]` com role/content | `input[]` com items tipados |
| Tools | `{type: "function", function: {...}}` | `{type: "function", name, parameters}` (flat) |
| Tool results | `{role: "tool", tool_call_id}` | `{type: "function_call_output", call_id}` |
| SSE streaming | `data:` sem evento nomeado | `event: response.xxx` + `data:` |
| End signal | `data: [DONE]` | `event: response.completed` |

**Modelos disponíveis (hardcoded em `src/constants.ts`):**

| ID | Nome |
|----|------|
| `gpt-5.2` | GPT-5.2 |
| `gpt-5.3` | GPT-5.3 |
| `gpt-5.4` | GPT-5.4 |
| `gpt-5.1-codex` | GPT-5.1 Codex |
| `gpt-5.2-codex` | GPT-5.2 Codex |
| `gpt-5.3-codex` | GPT-5.3 Codex |

---

## OpenAI OAuth (auth.openai.com)

**Purpose:** Autenticação OAuth2 PKCE para obter tokens de acesso ao Codex backend.

**Location:** `src/auth/oauth.ts`, `src/auth/server.ts`

**Endpoints:**
- `GET https://auth.openai.com/oauth/authorize` — Iniciar fluxo OAuth
- `POST https://auth.openai.com/oauth/token` — Trocar code por tokens / refresh

**Client ID:** `app_EMoamEEZ73f0CkXaXp7hrann` (mesmo do Codex CLI oficial)

**Callback:** `http://localhost:1455/auth/callback`

**Fluxo:**
1. Gera PKCE (challenge + verifier)
2. Sobe servidor local na porta 1455
3. Abre navegador com URL de autorização
4. Usuário loga no ChatGPT
5. Callback recebe code + state
6. Troca code por tokens (access, refresh, expiresAt)
7. Salva tokens em `config.json`

## Claude Code

**Purpose:** O cliente que consome o proxy — o Claude Code é o "cliente" que faz requisições ao proxy local.

**Location:** `src/cli.ts` (`runClaudeCode()`), `src/path.ts` (`resolveClaudePath()`)

**Como é iniciado:**

```typescript
// resolveClaudePath encontra o binário
const claudePath = resolveClaudePath(); // "where claude" ou "which claude"

// buildClaudeEnv constrói as variáveis
const env = buildClaudeEnv(config.apiKey, model, proxyUrl);
// proxyUrl = http://localhost:<porta-final> (porta preferida/configurada, com fallback automático no modo interativo)

// Spinner enquanto inicia
const spinner = p.spinner();
spinner.start(`Starting Claude Code with ${model}...`);

// Spawn com stdio inherit (Claude Code controla o terminal)
spawn(claudePath, args, { stdio: "inherit", env });
```

**Variáveis de ambiente injetadas:**

| Variável | Valor | Propósito |
|----------|-------|-----------|
| `ANTHROPIC_BASE_URL` | `http://localhost:PORT` | Proxy local |
| `ANTHROPIC_AUTH_TOKEN` | API key | Autenticação |
| `ANTHROPIC_MODEL` | modelo selecionado | Força o modelo |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` | Desabilita telemetria |
| `CLAUDE_CODE_SUBAGENT_MODEL` | modelo | Sub-agentes usam mesmo modelo |
| `ANTHROPIC_DEFAULT_MESSAGES_MODEL` | modelo | Padrão messages API |

**Variáveis removidas do ambiente (em `src/env.ts`):**

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_ACCOUNT_ID`
- `CLAUDE_ACCOUNT_ID`

**Vars preservadas (não deletadas):**

- `CLAUDE_CODE_GIT_BASH_PATH`
- `CLAUDE_CODE_SHELL`
- `CLAUDE_CODE_TMPDIR`

## CLI Prompts (@clack/prompts)

**Purpose:** Interface interativa do CLI (setup, seleção de modelo, confirmação).

**Location:** `src/cli.ts`

**Uso:**

```typescript
import * as p from "@clack/prompts";

await p.text({ message: "...", placeholder: "...", validate: ... });
await p.select({ message: "...", options: [...], initialValue: ... });
await p.confirm({ message: "...", initialValue: ... });
p.intro("...");        // Header visual
p.log.success("...");  // Feedback
p.log.error("...");    // Erro
p.log.warn("...");     // Aviso

// Spinner
const spinner = p.spinner();
spinner.start("Starting...");
spinner.stop("Done!");
```

**Nota:** O @clack/prompts não é usado no modo proxy (`--proxy`) — só `console.error`.

## File System (Config)

**Purpose:** Persistência de configuração do usuário.

**Location:** `~/.opencode-go-cli/config.json` (definido em `src/constants.ts`)

**Formato:**

```json
{
  "apiKey": "sk-opencode-...",
  "provider": "opencode",
  "openaiTokens": {
    "access": "...",
    "refresh": "...",
    "expiresAt": 1234567890
  },
  "lastModel": "minimax-m2.7",
  "proxyPort": 8080
}

`proxyPort` representa a porta preferida do proxy local. No modo interativo, a porta efetiva pode avançar para a próxima livre quando houver conflito.
```

**Operações (`src/config.ts`):**

- Leitura: `getConfig()` (try/catch, retorna `{}` em caso de erro)
- Escrita: `saveConfig()` (cria dir com `mkdirSync`, escreve JSON com `writeFileSync`)
- Remoção: `deleteConfig()` (`unlinkSync`)

## Web Streams API

**Purpose:** Streaming do response do OpenAI no proxy.

**Location:** `src/proxy/stream-conversion.ts`, `src/proxy/stream-conversion-responses.ts`, `src/proxy/server.ts`

**Dois async generators (um por formato de API):**

```typescript
// Chat Completions (OpenCode Go)
for await (const chunk of streamOpenAIToAnthropic(response)) { ... }

// Responses API (OpenAI/Codex)
for await (const chunk of streamResponsesToAnthropic(response)) { ... }
```

Ambos lêem chunks SSE via `response.body.getReader()` e convertem pro formato Anthropic SSE.

- `streamOpenAIToAnthropic`: estado com `toolCallAccumulators`, `openaiToolIndexToBlockIndex`
- `streamResponsesToAnthropic`: estado com `toolCallBlocks` (item_id → blockIndex), eventos nomeados

**ReadableStream usado para responder ao Claude Code:**

```typescript
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of streamOpenAIToAnthropic(response)) {
      controller.enqueue(new TextEncoder().encode(chunk));
    }
    controller.close();
  },
});
```

## SearXNG (Docker)

**Purpose:** Motor de busca local para WebSearch interception — executa queries de `web_search` server tools sem depender da API Anthropic.

**Location:** `src/search/searxng.ts`

**Container:** `opencode-searxng` (imagem `searxng/searxng`)

**Porta:** 8888 (mapeada para 8080 dentro do container)

**Settings:** `~/.opencode-go-cli/searxng/settings.yml` (gerado automaticamente com JSON format habilitado)

**Fluxo:**
1. `ensureSearXNG()` verifica se container já está rodando
2. Se não, verifica se Docker está disponível
3. Tenta `docker start opencode-searxng` (container parado)
4. Se não existe, `docker run -d` com volume mount dos settings
5. Poll `/healthz` até ficar pronto (max 15s)
6. `search(query)` faz GET em `localhost:8888/search?format=json`

**Graceful degradation:** Se Docker não está disponível, WebSearch interception é desabilitado. O proxy continua funcionando normalmente.

---

## WebSearch Interception

**Purpose:** Intercepta requests de server tool `web_search` do Claude Code e executa localmente via SearXNG.

**Location:** `src/proxy/websearch-interceptor.ts`

**Detecção:** `hasWebSearchTool(body)` verifica se `body.tools` contém tools com tipo `web_search_*` ou nome `web_search` sem `input_schema`.

**Resposta:** Retorna response Anthropic-format com:
- `server_tool_use` block (web_search)
- `web_search_tool_result` block (resultados ou erro)
- `text` block (resumo legível dos resultados)

Suporta streaming e non-streaming.

---

## Logger

**Purpose:** Logging configurável para o proxy com file output.

**Location:** `src/logger.ts`

O logger é usado pelo proxy, streams, WebSearch e SearXNG. Quando o proxy roda embutido (junto com Claude Code), `silenceLogger()` é chamado após `startProxy()` para não poluir o terminal interativo. No modo `--proxy` isolado, os logs aparecem normalmente.

**File output:** Quando silenciado + `DEBUG=1`, todos os logs são escritos em `~/.opencode-go-cli/proxy.log` via `appendFileSync`.

```typescript
import { createLogger, silenceLogger } from "./logger.js";
const logger = createLogger("[proxy]");

silenceLogger();           // silencia console (modo embutido)
logger.debug("...");       // só com DEBUG=1 (vai pro arquivo se silenciado)
logger.info("...");        // silenciado no console, vai pro arquivo com DEBUG=1
logger.error("...");       // silenciado no console, vai pro arquivo com DEBUG=1
```
