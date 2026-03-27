# State

**Last updated:** 2026-03-27

## Current Work

### Milestone 4: Melhorias de UX — ✅ Complete

**Spec**: `.specs/features/ux-improvements/spec.md`
**Design**: `.specs/features/ux-improvements/design.md`
**Tasks**: `.specs/features/ux-improvements/tasks.md`

**Tarefas executadas:**
- T1 ✅ `runClaudeCode` — spinner com @clack/prompts (para com "Claude Code started" ou erro)
- T2 ✅ Validação de modelo fail-fast — `--model invalid` falha antes de qualquer setup
- T3 ✅ Proxy ready message — "Proxy ready at http://localhost:PORT" + "Waiting for Claude Code..."
- T4 ✅ Port in use handler — catch do Bun.serve com mensagem clara + sugestão de --port; CLI refatorada com fluxo --proxy antes do interativo

**Smoke test:** 49/49 testes, build limpo

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Refatoração Modular | ✅ Complete |
| 2 | Testes | ✅ Complete |
| 3 | Debug Logging Gated | ✅ Complete |
| 4 | Melhorias de UX | 🔄 Planning |

## Bugs/Fixes Encontrados

1. **`src/env.ts`**: `cleanupClaudeCodeVars` deletava `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` — ordem de operações corrigida.

## Milestone 3 — Completed (2026-03-27)

**Tarefas executadas:**
- T1 ✅ `src/logger.ts` — Logger class com DEBUG/INFO/WARN/ERROR
- T2 ✅ `tests/logger.test.ts` — 13 testes unitários
- T3 ✅ `src/proxy/server.ts` — todos `console.log` substituídos por logger
- T4 ✅ `src/proxy/stream-conversion.ts` — todos `console.log` substituídos por logger
- T5 ✅ Smoke test — 49/49 testes, build limpo

**Comportamento:**
- Sem `DEBUG`: INFO/WARN/ERROR aparecem, DEBUG é noop
- `DEBUG=1` ou `DEBUG=true`: todos os níveis aparecem
- Prefix aplicado em todas as linhas: `[proxy] [INFO] Starting on port 8080`

## Preferences

- Lightweight tasks (validation, state updates, session handoff): work well with faster/cheaper models.
- Heavy implementation tasks (complex design, brownfield mapping): reasoning model is appropriate.
