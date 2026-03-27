# Melhorias de UX — Specification

## Problem Statement

A CLI funciona mas a experiência tem pontos de fricção: sem feedback visual durante o spawn do Claude Code, mensagens de erro genéricas, e sem validação do modelo antes de iniciar o proxy.

## Goals

- Spinner visual durante spawn do Claude Code
- Mensagens de erro descritivas quando API key é inválida
- Validação de modelo antes de iniciar o proxy
- Feedback de conexão antes de iniciar o Claude Code

## Out of Scope

- Colorização de output (além do que @clack/prompts já faz)
- Auto-retry em caso de falha de conexão
- Configuração de timeout
- Modo verbose separado do DEBUG

---

## User Stories

### P1: Spinner durante spawn ⭐ MVP — ✅

**Acceptance Criteria**:

- [x] WHEN runClaudeCode is called THEN spinner SHALL start with message "Starting Claude Code..."
- [x] WHEN Claude Code process exits THEN spinner SHALL stop
- [x] WHEN Claude Code exits with code 0 THEN spinner stops automatically
- [x] WHEN Claude Code exits with non-zero code THEN spinner stops and error is shown

---

### P2: Validação de modelo — ✅

**Acceptance Criteria**:

- [x] WHEN --model has invalid model ID THEN CLI SHALL exit with error before starting proxy
- [x] WHEN --model is valid THEN proxy SHALL start normally
- [x] WHEN model is invalid THEN message SHALL say "Unknown model: X. Run --list to see available models."

---

### P3: Feedback de proxy pronto — ✅

**Acceptance Criteria**:

- [x] WHEN proxy starts THEN message SHALL say "Proxy ready at http://localhost:PORT"
- [x] WHEN proxy starts THEN "Waiting for Claude Code..." message SHALL appear
- [x] WHEN Claude Code connects THEN connection SHALL be logged at INFO level

---

## Edge Cases

- WHEN port is already in use THEN clear error message SHALL appear with suggestion to use --port
- WHEN API key is missing THEN error SHALL suggest running --setup
- WHEN Claude Code binary not found THEN error SHALL say "claude not found in PATH"

---

## Success Criteria

- [x] `runClaudeCode` mostra spinner com @clack/prompts spinner
- [x] Modelo inválido causa exit antes do proxy iniciar
- [x] Proxy imprime "ready" message antes de ficar pronto
- [x] Erros são descritivos e sugerem ação (--setup, --list, --port)
