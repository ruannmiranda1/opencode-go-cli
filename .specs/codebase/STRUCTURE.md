# Project Structure

**Root:** `D:/projetos/opencode-go-cli/`

## Directory Tree

```
opencode-go-cli/
├── .specs/                          # tlc-spec-driven docs
│   ├── project/
│   │   ├── PROJECT.md
│   │   ├── ROADMAP.md
│   │   └── STATE.md
│   ├── codebase/
│   │   ├── STACK.md
│   │   ├── ARCHITECTURE.md
│   │   ├── CONVENTIONS.md
│   │   ├── STRUCTURE.md (este)
│   │   ├── TESTING.md
│   │   └── INTEGRATIONS.md
│   └── features/
│       ├── refactoring-modular/
│       ├── testing/
│       ├── debug-logging/
│       ├── ux-improvements/
│       └── codex-oauth/
├── src/
│   ├── index.ts                     # entry point (thin, exports main)
│   ├── constants.ts                 # MODELS, ENDPOINT, CONFIG_DIR, etc.
│   ├── config.ts                   # getConfig, saveConfig, deleteConfig
│   ├── path.ts                     # resolveClaudePath
│   ├── env.ts                      # buildClaudeEnv, cleanupClaudeCodeVars
│   ├── logger.ts                   # createLogger com DEBUG/INFO/WARN/ERROR + file output
│   ├── cli.ts                      # main(), interactiveMain(), settingsMenu(), permission modes
│   ├── auth/
│   │   ├── oauth.ts                                # PKCE, exchange, refresh, JWT decode
│   │   └── server.ts                               # Local HTTP callback server (porta 1455)
│   ├── search/
│   │   └── searxng.ts                              # SearXNG Docker management + search queries
│   └── proxy/
│       ├── types.ts                                 # Config, Model interfaces
│       ├── helpers.ts                               # mapStopReason, generateMsgId, convertImageSource, makeSSE
│       ├── websearch-interceptor.ts                 # WebSearch server tool interception via SearXNG
│       ├── request-conversion.ts                    # Anthropic → Chat Completions (OpenCode Go)
│       ├── response-conversion.ts                   # Chat Completions → Anthropic (OpenCode Go)
│       ├── stream-conversion.ts                     # Chat Completions SSE → Anthropic SSE (OpenCode Go)
│       ├── request-conversion-responses.ts          # Anthropic → Responses API (OpenAI/Codex)
│       ├── response-conversion-responses.ts         # Responses API → Anthropic (OpenAI/Codex)
│       ├── stream-conversion-responses.ts           # Responses API SSE → Anthropic SSE (OpenAI/Codex)
│       └── server.ts                                # startProxy + Bun.serve + dual routing + WebSearch
├── tests/
│   ├── helpers.test.ts
│   ├── request-conversion.test.ts
│   ├── response-conversion.test.ts
│   ├── env.test.ts
│   └── logger.test.ts
├── dist/                           # build output (gitignored)
├── node_modules/
├── bun.lock
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md                       # guidance pra Claude Code
```

## Module Organization

| Módulo | Propósito | Arquivo |
|--------|-----------|---------|
| Constants | Valores compartilhados, providers, OAuth constants | `src/constants.ts` |
| Config | Persistência + path resolution | `src/config.ts` |
| Path | Resolução do binário claude | `src/path.ts` |
| Env | Construção de variáveis de ambiente | `src/env.ts` |
| Logger | Logging com níveis + silenciamento + file output (DEBUG=1) | `src/logger.ts` |
| CLI | Menus interativos, permission modes, orchestration | `src/cli.ts` |
| Auth OAuth | PKCE flow, token exchange, refresh | `src/auth/oauth.ts` |
| Auth Server | Servidor callback local (porta 1455) | `src/auth/server.ts` |
| Proxy Types | Interfaces | `src/proxy/types.ts` |
| Proxy Helpers | Funções puras utilitárias | `src/proxy/helpers.ts` |
| Proxy Request (CC) | Anthropic → Chat Completions (OpenCode Go) | `src/proxy/request-conversion.ts` |
| Proxy Response (CC) | Chat Completions → Anthropic (OpenCode Go) | `src/proxy/response-conversion.ts` |
| Proxy Stream (CC) | Chat Completions SSE → Anthropic SSE (OpenCode Go) | `src/proxy/stream-conversion.ts` |
| Proxy Request (RA) | Anthropic → Responses API (OpenAI/Codex) | `src/proxy/request-conversion-responses.ts` |
| Proxy Response (RA) | Responses API → Anthropic (OpenAI/Codex) | `src/proxy/response-conversion-responses.ts` |
| Proxy Stream (RA) | Responses API SSE → Anthropic SSE (OpenAI/Codex) | `src/proxy/stream-conversion-responses.ts` |
| WebSearch Interceptor | Intercepta server tool web_search via SearXNG | `src/proxy/websearch-interceptor.ts` |
| SearXNG | Docker container management + search queries | `src/search/searxng.ts` |
| Proxy Server | Bun.serve + dual routing + WebSearch interception | `src/proxy/server.ts` |

## Module Dependencies

```
constants.ts ───┬──> config.ts
                ├──> path.ts
                ├──> env.ts
                ├──> logger.ts
                ├──> cli.ts
                └──> proxy/types.ts

proxy/helpers.ts ──> (sem dependências)
                    ├──> request-conversion.ts
                    ├──> response-conversion.ts
                    ├──> stream-conversion.ts
                    ├──> request-conversion-responses.ts
                    ├──> response-conversion-responses.ts
                    └──> stream-conversion-responses.ts

search/searxng.ts ──> logger.ts

proxy/websearch-interceptor.ts ──> logger.ts
                                   ├──> proxy/helpers.ts
                                   └──> search/searxng.ts

proxy/server.ts ──> proxy/types.ts
                    ├──> helpers.ts
                    ├──> websearch-interceptor.ts
                    ├──> search/searxng.ts
                    ├──> request-conversion.ts (Chat Completions)
                    ├──> response-conversion.ts (Chat Completions)
                    ├──> stream-conversion.ts (Chat Completions)
                    ├──> request-conversion-responses.ts (Responses API)
                    ├──> response-conversion-responses.ts (Responses API)
                    ├──> stream-conversion-responses.ts (Responses API)
                    ├──> logger.ts
                    └──> auth/oauth.ts (token refresh)
```

## Where Things Live

**CLI entry point:**

- Entry: `src/index.ts` → chama `src/cli.ts` (`main()`)
- Menus interativos: `src/cli.ts` (`interactiveMain()`, `settingsMenu()`, `selectProvider()`, `selectModel()`, `selectPermissionMode()`)
- Spawn Claude Code: `src/cli.ts` (`runClaudeCode()`) com spinner @clack/prompts

**Configuration:**

- Definição: `src/constants.ts` (`CONFIG_DIR`, `CONFIG_FILE`, `MODELS`, etc.)
- Leitura/escrita: `src/config.ts` (`getConfig()`, `saveConfig()`, `deleteConfig()`)
- Resolução de binário: `src/path.ts` (`resolveClaudePath()`)

**Auth:**

- OAuth PKCE flow: `src/auth/oauth.ts`
- Callback server: `src/auth/server.ts`

**Proxy:**

- Servidor + roteamento dual: `src/proxy/server.ts` (`startProxy()`)
- WebSearch interception: `src/proxy/websearch-interceptor.ts` (`hasWebSearchTool()`, `handleWebSearch()`)
- Conversões Chat Completions (OpenCode Go): `request-conversion.ts`, `response-conversion.ts`, `stream-conversion.ts`
- Conversões Responses API (OpenAI/Codex): `request-conversion-responses.ts`, `response-conversion-responses.ts`, `stream-conversion-responses.ts`

**Search:**

- SearXNG Docker management: `src/search/searxng.ts` (`ensureSearXNG()`, `search()`)

**Logging:**

- Implementação: `src/logger.ts` (`createLogger()`, `silenceLogger()`)
- File output: `~/.opencode-go-cli/proxy.log` (quando silenciado + `DEBUG=1`)
- Usa: `src/proxy/server.ts`, `src/proxy/stream-conversion.ts`, `src/proxy/stream-conversion-responses.ts`, `src/proxy/websearch-interceptor.ts`, `src/search/searxng.ts`

**Tests:**

- Local: `tests/` — usa Bun test runner (`bun test`)
- 49 testes, 0 falhas

## Special Directories

**dist/:**

- Propósito: output do build (`bun build src/index.ts --outdir dist --target bun`)
- Contém: `index.js` (binário bun compilado)
- É referenciado em `package.json` como bin: `opencode-go`

**tests/:**

- Propósito: testes de regressão com Bun test runner
- Padrão: `tests/*.test.ts`
- Execute: `bun test`
