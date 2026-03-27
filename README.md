<div align="center">

# OpenCode Go CLI

**Use OpenCode Go models with Claude Code.**

Translates Claude Code's Anthropic requests into OpenAI API calls — in real time, chunk by chunk.

[![Bun](https://img.shields.io/badge/Runtime-Bun-1E2028?logo=bun&logoColor=f9f1e3)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-FF6B35?logo=claude&logoColor=white)](https://docs.anthropic.com/en/docs/claude-code)
[![Proxy](https://img.shields.io/badge/Proxy-Local_Anthropic→OpenAI-6E56CF)](#runtime-model)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

</div>

## Why OpenCode Go CLI

Claude Code uses the Anthropic API natively, but OpenCode Go offers coding models through an OpenAI-compatible API. This CLI bridges the two:

- Spawns a local HTTP proxy that translates Anthropic requests to OpenAI format
- Streams responses back in real time (no buffering)
- Spawns Claude Code with the correct environment variables pointing to the local proxy
- Persists your API key and last model between sessions

The goal is not to change how Claude Code works.
The goal is to make it work with OpenCode Go — transparently.

## Core Capabilities

- **Streaming translation** — SSE chunk-by-chunk, in real time
- **Tool call support** — `tool_use` and `tool_result` blocks are mapped correctly
- **Image support** — `image` content blocks converted to `data:` URIs
- **Model selection** — interactive or `--model` flag, 4 models available
- **Persistent config** — API key and last model stored in `~/.opencode-go-cli/`
- **Sub-agent compatibility** — all sub-agents use the same model via environment variables
- **Fail-fast validation** — invalid models caught before proxy starts
- **Configurable logging** — `DEBUG=1` for verbose proxy output

## Runtime Model

The CLI runs in two stages:

```
Stage 1: CLI (opencode-go)
  └─ Validates model
  └─ Starts proxy on localhost:PORT
  └─ Spawns Claude Code with ANTHROPIC_BASE_URL=http://localhost:PORT

Stage 2: Proxy (localhost:PORT)
  └─ Receives POST /v1/messages (Anthropic format)
  └─ Translates to OpenAI /v1/chat/completions
  └─ Calls OpenCode Go API
  └─ Translates response back (streaming or non-streaming)
  └─ Returns to Claude Code
```

### Request Flow

```
Claude Code
  └─ POST /v1/messages (Anthropic)
        └─ Proxy: convertAnthropicRequestToOpenAI()
              └─ OpenCode Go API: POST /v1/chat/completions (OpenAI)
                    └─ Response: streaming or non-streaming
                          └─ Proxy: streamOpenAIToAnthropic() or convertOpenAIResponseToAnthropic()
                                └─ Claude Code
```

### Environment Variables Injected

| Variable | Value |
|----------|-------|
| `ANTHROPIC_BASE_URL` | `http://localhost:PORT` (local proxy) |
| `ANTHROPIC_AUTH_TOKEN` | Your OpenCode Go API key |
| `ANTHROPIC_MODEL` | Selected model |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Same as selected model |
| `ANTHROPIC_DEFAULT_MESSAGES_MODEL` | Same as selected model |

## Architecture

```text
src/
├── index.ts                 Thin entry point (shebang + main export)
├── cli.ts                  Argument parsing, interactive prompts, Claude Code spawn
├── constants.ts            MODELS, ENDPOINT, CONFIG_DIR, DEFAULT_PROXY_PORT
├── config.ts               getConfig, saveConfig, deleteConfig
├── path.ts                 resolveClaudePath (claude binary in PATH)
├── env.ts                  buildClaudeEnv, cleanupClaudeCodeVars
├── logger.ts               createLogger (DEBUG/INFO/WARN/ERROR, gated by DEBUG env)
└── proxy/
    ├── types.ts             Config, Model interfaces
    ├── helpers.ts           mapStopReason, generateMsgId, convertImageSource, formatDelta
    ├── request-conversion.ts   Anthropic → OpenAI request
    ├── response-conversion.ts   OpenAI → Anthropic response (non-streaming)
    ├── stream-conversion.ts     OpenAI SSE → Anthropic SSE (async generator)
    └── server.ts               Bun.serve + routing

tests/
├── helpers.test.ts
├── request-conversion.test.ts
├── response-conversion.test.ts
├── env.test.ts
└── logger.test.ts
```

## Models Available

| ID | Name | Description |
|----|------|-------------|
| `minimax-m2.7` | MiniMax M2.7 | High performance coding model |
| `minimax-m2.5` | MiniMax M2.5 | Balanced speed and quality |
| `kimi-k2.5` | Kimi K2.5 | Strong reasoning for complex tasks |
| `glm-5` | GLM-5 | Latest generation from Zhipu AI |

## CLI

```bash
# Interactive mode (select model)
opencode-go

# Non-interactive (specify model)
opencode-go --model minimax-m2.7

# With Claude Code flags
opencode-go --model minimax-m2.7 -p "explain this code"
opencode-go --model minimax-m2.7 --verbose

# Setup
opencode-go --setup          Configure API key
opencode-go --reset          Delete config
opencode-go --list           Show available models

# Proxy-only mode (for testing)
opencode-go --proxy --port 8080

# Help
opencode-go --help
```

## Setup

**Requirements:**

- [Bun](https://bun.sh) runtime
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and in PATH
- OpenCode Go subscription with API key

**Install global command:**

```bash
bun run build && bun install -g .
```

Isso cria o comando `opencode-go` disponível em qualquer terminal (sem precisar de `bun run`).

**Quick Start:**

1. Configure your API key:
   ```bash
   opencode-go --setup
   ```

2. Run:
   ```bash
   opencode-go
   ```

3. Select a model — Claude Code starts with the proxy already running.

## Configuration

Config is stored at `~/.opencode-go-cli/config.json`:

```json
{
  "apiKey": "sk-opencode-...",
  "lastModel": "minimax-m2.7",
  "proxyPort": 8080
}
```

## Development

```bash
opencode-go                   # After global install (recommended)
bun run src/index.ts          # Without global install
bun run build                 # Build to dist/
bun run typecheck             # TypeScript check
bun test                      # Test suite (49 tests)
```

**Proxy-only testing (with API key in config):**

```bash
# Without DEBUG (quiet)
opencode-go --proxy --port 8082

# With DEBUG (verbose)
DEBUG=1 opencode-go --proxy --port 8082
```

**Test an invalid model (should fail fast):**

```bash
opencode-go --model invalid-model
# → Unknown model: invalid-model
# → Run 'opencode-go --list' to see available models.
```

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Claude Code guidance for this repository |
| [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) | Milestones and feature status |
| [.specs/codebase/ARCHITECTURE.md](.specs/codebase/ARCHITECTURE.md) | Code architecture and data flows |
| [.specs/codebase/STRUCTURE.md](.specs/codebase/STRUCTURE.md) | File structure and module organization |
| [.specs/codebase/INTEGRATIONS.md](.specs/codebase/INTEGRATIONS.md) | External integrations and APIs |

## Current State

- 49 tests passing (Bun test runner)
- Build clean (`bun build` → `dist/index.js`)
- All 4 milestones complete:
  - ✅ Modular refactoring (12 modules, ~40-220 lines each)
  - ✅ Test suite (conversion, helpers, env, logger)
  - ✅ Debug logging gated (DEBUG=1 for verbose output)
  - ✅ UX improvements (spinner, fail-fast, clear errors)

## License

MIT
