# Refatoração Modular — Specification

## Problem Statement

O arquivo `src/index.ts` contém ~900 linhas com responsabilidades misturadas: config persistence, CLI orchestration, proxy HTTP, conversão de API (request/response/stream). Isso dificulta manutenção, teste e localização de bugs. A refatoração divide em módulos de responsabilidade única sem alterar comportamento.

## Goals

- Cada módulo tem exatamente uma razão pra mudar
- Código de conversão (pure functions) é testável sem I/O
- CLI orchestration não precisa conhecer detalhes de conversão de API
- Zero mudança de comportamento externo — todas as interações (CLI flags, output, proxy) permanecem idênticas

## Out of Scope

- Não adicionar funcionalidades novas
- Não alterar formato de dados trocados com OpenCode Go API
- Não alterar interface do CLI (flags, mensagens, prompts)
- Não implementar testes (Milestone 2)
- Não gatear logs de debug (Milestone 3)

---

## User Stories

### P1: Refatoração sem quebra ⭐ MVP

**User Story**: Como desenvolvedor, quero que o código seja dividido em módulos de responsabilidade única, para que eu possa manter e testar cada parte independentemente.

**Why P1**: É a fundação de todo trabalho futuro — sem isso, não há como testar as funções de conversão.

**Acceptance Criteria**:

1. WHEN developer runs `bun run build` THEN build SHALL complete without errors
2. WHEN developer runs `bun run src/index.ts --help` THEN output SHALL be identical to before refactor
3. WHEN developer runs `bun run src/index.ts --version` THEN output SHALL show "opencode-go v1.0.0"
4. WHEN developer runs `bun run src/index.ts --list` THEN SHALL list all 4 models
5. WHEN developer runs `bun run src/index.ts --setup` THEN SHALL prompt for API key and save to config
6. WHEN developer runs `bun run src/index.ts --proxy --port 8080` THEN proxy SHALL start and respond to HEAD/GET with 200
7. WHEN Claude Code sends POST /v1/messages to proxy THEN proxy SHALL translate and forward to OpenCode Go API
8. WHEN OpenCode Go returns streaming response THEN proxy SHALL convert SSE chunk-by-chunk to Anthropic format
9. WHEN OpenCode Go returns non-streaming response THEN proxy SHALL convert to Anthropic message format

**Independent Test**: Executar cada comando da CLI e verificar output; iniciar proxy e enviar requisição de teste.

---

## Edge Cases

- WHEN `src/index.ts` is deleted but `src/cli.ts` doesn't exist THEN TypeScript build SHALL fail (fail loud)
- WHEN proxy gets a non-POST request THEN SHALL return 405 Method Not Allowed
- WHEN proxy gets a request to non-/v1/messages path THEN SHALL return 404 Not Found
- WHEN OpenCode Go API returns error THEN proxy SHALL forward status code and error message
- WHEN streaming response ends without finish_reason in chunks THEN stream SHALL still emit message_stop

---

## Success Criteria

- [ ] `bun run build` compila sem erros e gera `dist/index.js`
- [ ] `bun run src/index.ts --help` funciona exatamente como antes
- [ ] `bun run src/index.ts --proxy` inicia o proxy que responde corretamente
- [ ] Cada arquivo criado contém código que antes estava em `src/index.ts` — nenhuma lógica nova
- [ ] Arquivos em `src/` podem ser importados independentemente (sem import circular)
