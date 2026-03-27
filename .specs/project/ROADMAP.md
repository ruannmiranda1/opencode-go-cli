# Roadmap

**Current Milestone:** Milestone 4 — UX Improvements
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

## Future Considerations

- Auto-update da CLI
- Modo daemon (proxy rodando em background)
- Testes E2E com Claude Code real
- Plugin system para providers alternativos
