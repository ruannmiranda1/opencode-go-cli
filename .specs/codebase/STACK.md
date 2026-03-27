# Tech Stack

**Analyzed:** 2026-03-27

## Core

- Runtime: Bun (single-file executable, shebang `#!/usr/bin/env bun`)
- Language: TypeScript 5.7.2 (strict mode, ESNext modules, bundler resolution)
- Package manager: bun (bun.lock, `bun install -g .` for global install)
- Build target: bun (compiles to `dist/index.js` via `bun build`)

## Frontend

N/A — CLI-only, sem interface gráfica.

## Backend / CLI

- CLI prompts: @clack/prompts 0.7.0 (spinners, select, text input, confirm)
- HTTP server: Bun.serve (built-in, não é node:http)
- HTTP client: native `fetch()` (Bun built-in)
- Child process: node:child_process (spawn, execSync)
- File system: node:fs (sync, não async)
- OS: node:os (homedir)

## Testing

- **Framework:** Bun test runner (built-in, zero extra dependency)
- **Execute:** `bun test`
- **Coverage:** 49 testes em `tests/` — funções puras e de conversão

## External Services

- OpenCode Go API: `https://opencode.ai/zen/go/v1/chat/completions` (OpenAI-compatible)
- Claude Code: binary no PATH (`where claude` / `which claude`)

## Development Tools

- TypeScript compiler: tsc (via bun tsc --noEmit)
- Bundler: bun build
- Global install: bun install -g .
