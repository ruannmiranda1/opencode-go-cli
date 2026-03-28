# Roadmap

**Current Milestone:** Milestone 7 — Interactive CLI & Permission Modes
**Status:** Complete

---

## Milestone 1: Refatoração Modular — ✅ COMPLETE

**Goal:** Quebrar o arquivo único src/index.ts (~900 linhas) em módulos com responsabilidade única, seguindo SOLID e DRY.

**Resultado:** 12 arquivos de ~40 a ~220 linhas cada. 0 mudança de comportamento.

---

## Milestone 2: Testes — ✅ COMPLETE

**Goal:** Cobertura de regressão para as funções de conversão e CLI.

**Resultado:** 36 testes, 0 falhas. Bun test runner.

### Features

**Testes de Conversão** - COMPLETE

- ✅ Testes para convertAnthropicRequestToOpenAI (10 tests)
- ✅ Testes para convertOpenAIResponseToAnthropic (7 tests)
- ✅ Testes para helpers (10 tests)
- ⏸️ streamOpenAIToAnthropic — adiado (precisa mock de Response.body.getReader())

**Testes de CLI** - COMPLETE

- ✅ Testes para buildClaudeEnv (8 tests)
- ⏸️ Testes para config (mock do fs) — não crítico, adiado

**Bug encontrado durante testes:**
- `src/env.ts`: `cleanupClaudeCodeVars` era chamada depois de setar variáveis, deletando `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`. Corrigido.

---

## Milestone 3: Debug Logging Gated

**Goal:** Substituir console.logs incondcionais no stream por logger configurável.

**Target:** PR merged

### Features

**Logger configurável** - ✅ IMPLEMENTED

- `src/logger.ts` — logger com níveis (DEBUG, INFO, WARN, ERROR)
- Variável DEBUG=noop por default
- Log detalhado só quando DEBUG=true
- Aplicar a streamOpenAIToAnthropic e startProxy

---

## Milestone 4: Melhorias de UX — ✅ COMPLETE

**Goal:** Qualidade de vida sem mudança de comportamento.

**Resultado:**
- Spinner em runClaudeCode via @clack/prompts
- Validação de modelo fail-fast (antes do setup interativo)
- Mensagens "Proxy ready" e "Waiting for Claude Code..."
- Handler de porta em uso com sugestão de --port
- Fluxo --proxy isolado antes do fluxo interativo

---

## Milestone 5: Codex OAuth Provider — ✅ COMPLETE

**Goal:** Adicionar OpenAI como provedor via OAuth (ChatGPT Plus/Pro).

**Resultado:**
- Provider routing: `--provider opencode` (default) ou `--provider openai`
- OAuth PKCE flow via @openauthjs/openauth (mesmo client_id do Codex CLI)
- Servidor local em 1455 para callback OAuth
- Token refresh automático (1min buffer)
- 6 modelos GPT-5: gpt-5.2, 5.3, 5.4, 5.1-codex, 5.2-codex, 5.3-codex
- Backward compatible: sem --provider, usa opencode como hoje
- **Responses API**: OpenAI/Codex usa formato diferente do Chat Completions — 3 novos módulos de conversão (`*-responses.ts`) adicionados ao proxy, roteados automaticamente pelo provider
- **Endpoint correto**: `chatgpt.com/backend-api/codex/responses` (não `backend.chatgpt.com`)
- **Logger silenciado**: proxy logs não poluem terminal quando roda embutido com Claude Code
- **Proxy auto-start**: proxy inicia automaticamente antes do Claude Code no fluxo normal

---

## Milestone 6: WebSearch Interception via SearXNG — ✅ COMPLETE

**Goal:** Interceptar requests de `web_search` server tool e executar localmente via SearXNG Docker container.

**Resultado:**
- `src/search/searxng.ts`: gerenciamento do container Docker (start, health check, search queries)
- `src/proxy/websearch-interceptor.ts`: detecção de server tools `web_search_*`, execução via SearXNG, response Anthropic-format
- Container `opencode-searxng` na porta 8888, auto-iniciado em background
- Settings gerados em `~/.opencode-go-cli/searxng/settings.yml`
- Graceful degradation: se Docker não disponível, interception desabilitado
- Suporta streaming e non-streaming responses

---

## Milestone 7: Interactive CLI & Permission Modes — ✅ COMPLETE

**Goal:** Menu interativo completo com seleção de provider, modelo, e modo de permissão.

**Resultado:**
- Menu Start/Settings com `@clack/prompts`
- Settings: Set API key, Login/Logout OpenAI, Reset all
- 4 permission modes: default, acceptEdits, auto, bypassPermissions
- `--permission-mode` flag e `--dangerously-skip-permissions` shortcut
- `--oauth-logout` flag para remover tokens OpenAI
- Flags CLI pulam o menu interativo quando especificadas

---

## Future Considerations

- Auto-update da CLI
- Modo daemon (proxy rodando em background)
- Testes E2E com Claude Code real
- Testes para WebSearch/SearXNG/permission modes (known gap)
