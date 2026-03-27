# Testes — Specification

## Problem Statement

Após a refatoração modular (Milestone 1), não há testes automatizados. Qualquer mudança futura pode quebrar as funções de conversão sem ser detectada. O objetivo é cobertura de regressão para as funções críticas: conversão de request/response/stream, helpers e construção de env vars.

## Goals

- Funções de conversão (request, response, stream) têm testes com inputs variados e edge cases
- Helpers (generateMsgId, mapStopReason, convertImageSource) têm testes unitários
- buildClaudeEnv tem testes que verificam as variáveis injetadas
- Config persistence tem testes com mock de fs
- Suite pode rodar com `bun test` sem dependências extras

## Out of Scope

- Testes E2E (requeriam Claude Code real ou mock de subprocesso)
- Testes de `startProxy` (integração com Bun.serve, mais complexo)
- Testes de `streamOpenAIToAnthropic` com mock de Response real (abordado via helper de mock)
- Cobertura de 100% — foca nas funções críticas e mais testáveis

---

## User Stories

### P1: Testes de Helpers ⭐ MVP

**User Story**: Como desenvolvedor, quero testes unitários para os helpers, para garantir que generateMsgId, mapStopReason e convertImageSource funcionam corretamente.

**Acceptance Criteria**:

1. WHEN generateMsgId() is called THEN it SHALL return a string starting with "msg_"
2. WHEN generateMsgId() is called twice THEN the two IDs SHALL be different
3. WHEN mapStopReason("stop") is called THEN it SHALL return "end_turn"
4. WHEN mapStopReason("tool_calls") is called THEN it SHALL return "tool_use"
5. WHEN mapStopReason("length") is called THEN it SHALL return "max_tokens"
6. WHEN mapStopReason("unknown") is called THEN it SHALL return "end_turn" (default)
7. WHEN mapStopReason(null) is called THEN it SHALL return "end_turn"
8. WHEN convertImageSource({type:"base64", media_type:"image/png", data:"abc123"}) is called THEN it SHALL return "data:image/png;base64,abc123"
9. WHEN convertImageSource({url:"https://example.com/img.png"}) is called THEN it SHALL return "https://example.com/img.png"
10. WHEN convertImageSource(null) is called THEN it SHALL return ""

**Independent Test**: `bun test src/proxy/helpers.test.ts`

---

### P2: Testes de Conversão de Request ⭐ MVP

**User Story**: Como desenvolvedor, quero testes para convertAnthropicRequestToOpenAI, para garantir que mensagens Anthropic são traduzidas corretamente pro formato OpenAI.

**Acceptance Criteria**:

1. WHEN body has system string THEN output SHALL have role:"system" message
2. WHEN body has system array with text blocks THEN output SHALL concatenate with newlines
3. WHEN user message has string content THEN output SHALL have role:"user" with that content
4. WHEN user message has text block THEN output SHALL have type:"text" content block
5. WHEN user message has image block THEN output SHALL have type:"image_url" with data URI
6. WHEN assistant message has tool_use block THEN output SHALL have tool_calls array
7. WHEN assistant message has tool_result THEN output SHALL become role:"tool" message
8. WHEN body has tools THEN output SHALL have OpenAI tools array
9. WHEN body has tool_choice type:"any" THEN output SHALL have tool_choice:"required"
10. WHEN body has max_tokens THEN output SHALL forward it

**Independent Test**: `bun test src/proxy/request-conversion.test.ts`

---

### P3: Testes de Conversão de Response ⭐ MVP

**User Story**: Como desenvolvedor, quero testes para convertOpenAIResponseToAnthropic, para garantir que respostas OpenAI são traduzidas pro formato Anthropic.

**Acceptance Criteria**:

1. WHEN OpenAI response has message.content THEN Anthropic response SHALL have type:"text" block
2. WHEN OpenAI response has tool_calls THEN Anthropic response SHALL have type:"tool_use" blocks
3. WHEN OpenAI id is "chatcmpl-xxx" THEN Anthropic id SHALL be "msg_xxx"
4. WHEN OpenAI finish_reason is "stop" THEN Anthropic stop_reason SHALL be "end_turn"
5. WHEN OpenAI finish_reason is "tool_calls" THEN Anthropic stop_reason SHALL be "tool_use"
6. WHEN OpenAI response has usage THEN Anthropic response SHALL forward token counts
7. WHEN OpenAI id is missing THEN generateMsgId SHALL be called

**Independent Test**: `bun test src/proxy/response-conversion.test.ts`

---

### P4: Testes de buildClaudeEnv

**User Story**: Como desenvolvedor, quero testes para buildClaudeEnv, para garantir que as variáveis de ambiente são construídas corretamente pro Claude Code.

**Acceptance Criteria**:

1. WHEN buildClaudeEnv is called THEN output SHALL include ANTHROPIC_BASE_URL with correct baseUrl
2. WHEN buildClaudeEnv is called THEN output SHALL include ANTHROPIC_AUTH_TOKEN with apiKey
3. WHEN buildClaudeEnv is called THEN output SHALL include ANTHROPIC_MODEL with model
4. WHEN buildClaudeEnv is called THEN output SHALL NOT include ANTHROPIC_API_KEY
5. WHEN buildClaudeEnv is called THEN output SHALL include CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
6. WHEN installationId is provided THEN output SHALL include CLAUDE_CONFIG_DIR pointing to installation path
7. WHEN installationId is default THEN output SHALL NOT include CLAUDE_CONFIG_DIR
8. WHEN preserved env var exists THEN it SHALL be preserved in output

**Independent Test**: `bun test src/env.test.ts`

---

## Edge Cases

- WHEN OpenAI response has message with no content AND no tool_calls THEN Anthropic response SHALL have empty content array
- WHEN user message has empty content array THEN it SHALL be skipped (no message emitted)
- WHEN body.messages is empty THEN output messages array SHALL be empty
- WHEN body.system is empty string THEN no system message SHALL be added
- WHEN tool has no description THEN empty string SHALL be used
- WHEN OpenAI tool function.arguments is invalid JSON THEN empty object SHALL be used

---

## Bug Found During Testing

**Bug em `src/env.ts`**: `cleanupClaudeCodeVars(env)` era chamada *depois* de setar `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, o que a deletava. Corrigido para limpar ANTES de setar as novas variáveis.

**Arquivos alterados**:
- `src/env.ts` — ordem: cleanup → delete → set new vars

## Success Criteria

- [x] `bun test` roda sem erros — 36 tests, 0 failures
- [x] Cada função exportada tem pelo menos um teste
- [x] Testes são determinísticos (sem flakiness)
- [x] Testes podem rodar isoladamente (`bun test tests/helpers.test.ts`)
- [x] Mocks de node:fs não poluem o filesystem real (teste de env usa beforeEach/afterEach)
