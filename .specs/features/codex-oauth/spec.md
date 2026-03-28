# Codex OAuth — Specification

## Problem Statement

A CLI atual usa apenas OpenCode Go como provedor via API key. O Claude Code só funciona com API Anthropic — o proxy traduz Anthropic → OpenAI. Para usar modelos da OpenAI (GPT-5.x family via Codex backend), precisa de OAuth com a conta do ChatGPT Plus/Pro.

## Goals

- Suportar dois provedores: OpenCode Go (API key) e OpenAI (OAuth)
- OAuth via device authorization flow (mesmo que o Codex CLI)
- Tokens salvos no config com refresh automático
- Provider selecionável via `--provider` (default: opencode)
- Sem quebra de backward compatibility

## Out of Scope

- Refresh manual de lista de modelos
- Multi-conta OpenAI simultânea
- Logout explícito (deletar tokens do config)

---

## User Stories

### P1: OAuth login com ChatGPT ⭐

**User Story**: Como usuário, quero fazer login com minha conta ChatGPT Plus/Pro via OAuth, para usar modelos GPT-5.x no Claude Code.

**Acceptance Criteria**:

1. WHEN `opencode-go --provider openai` is called with no token THEN OAuth flow starts
2. WHEN OAuth flow starts THEN local server starts on port 1455
3. WHEN OAuth flow starts THEN browser opens with device authorization URL
4. WHEN user completes login THEN access and refresh tokens are saved to config
5. WHEN tokens are expired THEN automatic refresh happens on next request
6. WHEN OAuth fails THEN clear error message is shown

### P2: Provider routing

**User Story**: Como usuário, quero escolher qual provedor usar via `--provider`, mantendo OpenCode Go como default.

**Acceptance Criteria**:

1. WHEN `--provider opencode` (default) THEN uses API key auth as today
2. WHEN `--provider openai` THEN uses OAuth tokens
3. WHEN no `--provider` specified THEN defaults to OpenCode Go (backward compatible)

### P3: Model validation

**User Story**: Como usuário, quero que o modelo seja validado antes de iniciar o proxy, com a lista correta de modelos por provedor.

**Acceptance Criteria**:

1. WHEN `--model` is not in the current provider's model list THEN exit with clear error
2. WHEN `--provider openai --model gpt-4o` THEN accepted if gpt-4o is in OpenAI model list

---

## Edge Cases

- WHEN OAuth server port 1455 is in use THEN fall back to manual code paste
- WHEN refresh token is expired THEN prompt for re-authentication
- WHEN access token expires during streaming THEN stream continues (check before start)
- WHEN both providers configured but provider not specified THEN default to opencode

---

## Success Criteria

- [x] `opencode-go --provider openai` triggers OAuth flow
- [x] OAuth completes and tokens are saved to config
- [x] `--provider opencode` works exactly as today (backward compatible)
- [x] Models validated against correct provider list
- [x] Token refresh works automatically
