# Codex OAuth — Tasks

**Design**: `.specs/features/codex-oauth/design.md`
**Status**: ✅ Complete

**Implemented:**
- T1 ✅ Constants + types (PROVIDERS, OPENAI_MODELS, CODEX_*, OpenAIAuthTokens, Config updated)
- T2 ✅ PKCE + OAuth functions (src/auth/oauth.ts)
- T3 ✅ OAuth callback server (src/auth/server.ts)
- T4 ✅ CLI OAuth login (setupOpenAIOAuth + --oauth-login)
- T5 ✅ Provider routing (--provider, model validation per provider, auth check fail-fast)
- T6 ✅ Proxy endpoint dynamic routing (endpoint + auth header based on provider)
- T7 ✅ Token refresh automatic (refresh before request if expiring within 1min)
- T8 ✅ Smoke: 49 tests, build clean

---

## Task Breakdown

### T1: OAuth constants e types

**What**: Adicionar constantes do OAuth e modelos da OpenAI
**Where**: `src/constants.ts`
**Depends on**: Nenhum

**Done when**:
- [x] OAuth constants defined in constants.ts
- [x] OPENAI_MODELS defined (GPT-5.2, 5.3, 5.4, 5.1-codex, 5.2-codex, 5.3-codex)
- [x] PROVIDERS type defined ("opencode" | "openai")
- [x] Config with openaiTokens and provider fields

**Verify**: `bun run typecheck`

---

### T2: PKCE + OAuth functions

**What**: Implementar funções de OAuth (PKCE, exchange, refresh, JWT decode)
**Where**: `src/auth/oauth.ts`
**Depends on**: T1

**Done when**:
- [x] `src/auth/oauth.ts` created
- [x] `createAuthorizationFlow()` generates URL with PKCE
- [x] `exchangeAuthorizationCode()` exchanges code for tokens
- [x] `refreshAccessToken()` renews token
- [x] `decodeJWT()` extracts JWT payload

**Verify**: `bun run typecheck`

---

### T3: OAuth callback server

**What**: Servidor HTTP local para receber callback do OAuth
**Where**: `src/auth/server.ts`
**Depends on**: T1

**Done when**:
- [x] `src/auth/server.ts` created
- [x] Server listens on 127.0.0.1:1455
- [x] Callback `/auth/callback?code=X&state=Y` works
- [x] Fallback when port in use

**Verify**: `bun run typecheck`

---

### T4: CLI OAuth login

**What**: Comando de OAuth login standalone
**Where**: `src/cli.ts` (`setupOpenAIOAuth()`)
**Depends on**: T1, T2, T3

**Done when**:
- [x] `opencode-go --oauth-login` starts OAuth flow
- [x] Browser opens automatically
- [x] Tokens saved to config.json

**Verify**: smoke test manual

---

### T5: Provider routing

**What**: Parsear `--provider`, validar modelo por provider, auth check fail-fast
**Where**: `src/cli.ts`
**Depends on**: T1

**Done when**:
- [x] `--provider opencode` uses API key (backward compatible)
- [x] `--provider openai` uses OAuth tokens
- [x] Invalid model fails with correct message per provider
- [x] `--model gpt-5.2 --provider openai` fails fast without auth
- [x] `opencode-go --provider invalid` shows clear error

**Verify**: smoke tests

---

### T6: Dynamic proxy endpoint

**What**: Proxy usa endpoint e auth header corretos baseado no provider
**Where**: `src/proxy/server.ts`
**Depends on**: T1, T5

**Done when**:
- [x] Provider opencode → uses OpenCode Go endpoint
- [x] Provider openai → uses Codex backend (backend.chatgpt.com)

**Verify**: smoke test

---

### T7: Token refresh automático

**What**: Refresh token quando expira antes de fazer request
**Where**: `src/proxy/server.ts`
**Depends on**: T2, T6

**Done when**:
- [x] Expired tokens are renewed automatically
- [x] Refreshed tokens saved to config

**Verify**: smoke test

---

### T8: Smoke test

**What**: Verificar que nada quebrou
**Where**: N/A
**Depends on**: T1-T7

**Done when**:
- [x] `bun run build` passes
- [x] `bun test` passes (49 tests)
- [x] `opencode-go --help` works with new options
- [x] `opencode-go --list --provider openai` shows GPT-5 models
- [x] `opencode-go --list --provider opencode` shows OpenCode models

**Verify**:
```bash
bun run build && bun test
opencode-go --help
opencode-go --list --provider openai
opencode-go --list --provider opencode
```
