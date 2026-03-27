# External Integrations

## OpenCode Go API

**Purpose:** Provedor de modelos de IA — API OpenAI-compatível para chat completions.

**Location:** `src/proxy/server.ts`

```typescript
const OPENCODE_GO_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions";

const response = await fetch(OPENCODE_GO_ENDPOINT, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(openaiBody),
});
```

**Authentication:** Bearer token (API key do OpenCode Go, guardada em `~/.opencode-go-cli/config.json`).

**Endpoints usados:**

- `POST /v1/chat/completions` — único endpoint usado (chat completions, streaming e não-streaming)

**Modelos disponíveis (hardcoded em `src/constants.ts`):**

| ID | Nome |
|----|------|
| `minimax-m2.5` | MiniMax M2.5 |
| `minimax-m2.7` | MiniMax M2.7 |
| `kimi-k2.5` | Kimi K2.5 |
| `glm-5` | GLM-5 |

**Notas:**
- A API é OpenAI-compatível mas o proxy traduz do protocolo Anthropic (que o Claude Code usa) pro formato OpenAI
- Streaming é SSE (Server-Sent Events) em ambos os lados, mas com estruturas diferentes

## Claude Code

**Purpose:** O cliente que consome o proxy — o Claude Code é o "cliente" que faz requisições ao proxy local.

**Location:** `src/cli.ts` (`runClaudeCode()`), `src/path.ts` (`resolveClaudePath()`)

**Como é iniciado:**

```typescript
// resolveClaudePath encontra o binário
const claudePath = resolveClaudePath(); // "where claude" ou "which claude"

// buildClaudeEnv constrói as variáveis
const env = buildClaudeEnv(config.apiKey, model, proxyUrl);
// proxyUrl = http://localhost:8080 (ou porta configurada)

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
  "lastModel": "minimax-m2.7",
  "proxyPort": 8080
}
```

**Operações (`src/config.ts`):**

- Leitura: `getConfig()` (try/catch, retorna `{}` em caso de erro)
- Escrita: `saveConfig()` (cria dir com `mkdirSync`, escreve JSON com `writeFileSync`)
- Remoção: `deleteConfig()` (`unlinkSync`)

## Web Streams API

**Purpose:** Streaming do response do OpenAI no proxy.

**Location:** `src/proxy/stream-conversion.ts` (`streamOpenAIToAnthropic()`), `src/proxy/server.ts`

**Uso (async generator):**

```typescript
for await (const chunk of streamOpenAIToAnthropic(response)) {
  controller.enqueue(new TextEncoder().encode(chunk));
}
```

O `response` vem de `fetch()` (Bun fetch API), e `streamOpenAIToAnthropic` é um async generator que:
1. Lê chunks SSE do OpenAI via `response.body.getReader()`
2. Converte chunk por chunk pro formato Anthropic SSE
3. Mantém estado de blocos (`textBlockStarted`, `toolCallAccumulators`, `openaiToolIndexToBlockIndex`)

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

## Logger

**Purpose:** Logging configurável para o proxy.

**Location:** `src/logger.ts`

O logger é usado por `src/proxy/server.ts` e `src/proxy/stream-conversion.ts`. Todos os `console.log`/`console.error` do proxy passaram a usar o logger com `DEBUG=1` para ativação.

```typescript
import { createLogger } from "./logger.js";
const logger = createLogger("[proxy]");

logger.debug("SSE chunk #1: ..."); // só com DEBUG=1
logger.info("← status 200");
logger.error(`API error: ${body}`);
```
