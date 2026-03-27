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
│       └── ux-improvements/
├── src/
│   ├── index.ts                     # entry point (thin, exports main)
│   ├── constants.ts                 # MODELS, ENDPOINT, CONFIG_DIR, etc.
│   ├── config.ts                   # getConfig, saveConfig, deleteConfig
│   ├── path.ts                     # resolveClaudePath
│   ├── env.ts                      # buildClaudeEnv, cleanupClaudeCodeVars
│   ├── logger.ts                   # createLogger com DEBUG/INFO/WARN/ERROR
│   ├── cli.ts                      # main(), setupApiKey(), selectModel(), runClaudeCode()
│   └── proxy/
│       ├── types.ts                 # Config, Model interfaces
│       ├── helpers.ts              # mapStopReason, generateMsgId, convertImageSource, formatDelta
│       ├── request-conversion.ts   # convertAnthropicRequestToOpenAI
│       ├── response-conversion.ts  # convertOpenAIResponseToAnthropic
│       ├── stream-conversion.ts    # streamOpenAIToAnthropic (async generator)
│       └── server.ts               # startProxy + Bun.serve
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
| Constants | Valores compartilhados | `src/constants.ts` |
| Config | Persistência + path resolution | `src/config.ts` |
| Path | Resolução do binário claude | `src/path.ts` |
| Env | Construção de variáveis de ambiente | `src/env.ts` |
| Logger | Logging com níveis DEBUG/INFO/WARN/ERROR | `src/logger.ts` |
| CLI | Orchestration + prompts | `src/cli.ts` |
| Proxy Types | Interfaces | `src/proxy/types.ts` |
| Proxy Helpers | Funções puras utilitárias | `src/proxy/helpers.ts` |
| Proxy Request | Anthropic → OpenAI | `src/proxy/request-conversion.ts` |
| Proxy Response | OpenAI → Anthropic (non-stream) | `src/proxy/response-conversion.ts` |
| Proxy Stream | OpenAI SSE → Anthropic SSE | `src/proxy/stream-conversion.ts` |
| Proxy Server | Bun.serve + roteamento | `src/proxy/server.ts` |

## Module Dependencies

```
constants.ts ───┬──> config.ts
                ├──> path.ts
                ├──> env.ts
                ├──> logger.ts
                ├──> cli.ts
                └──> proxy/types.ts

proxy/types.ts ───> helpers.ts
                    ├──> request-conversion.ts
                    ├──> response-conversion.ts
                    └──> stream-conversion.ts

proxy/server.ts ──> proxy/types.ts
                    ├──> helpers.ts
                    ├──> request-conversion.ts
                    ├──> response-conversion.ts
                    ├──> stream-conversion.ts
                    └──> logger.ts
```

## Where Things Live

**CLI entry point:**

- Entry: `src/index.ts` → chama `src/cli.ts` (`main()`)
- Prompts interativos: `src/cli.ts` (`setupApiKey()`, `selectModel()`)
- Spawn Claude Code: `src/cli.ts` (`runClaudeCode()`) com spinner @clack/prompts

**Configuration:**

- Definição: `src/constants.ts` (`CONFIG_DIR`, `CONFIG_FILE`, `MODELS`, etc.)
- Leitura/escrita: `src/config.ts` (`getConfig()`, `saveConfig()`, `deleteConfig()`)
- Resolução de binário: `src/path.ts` (`resolveClaudePath()`)

**Proxy:**

- Servidor + roteamento: `src/proxy/server.ts` (`startProxy()`)
- Todas as conversões: `src/proxy/request-conversion.ts`, `response-conversion.ts`, `stream-conversion.ts`

**Logging:**

- Implementação: `src/logger.ts` (`createLogger()`)
- Usa: `src/proxy/server.ts`, `src/proxy/stream-conversion.ts`

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
