# Debug Logging Gated — Specification

## Problem Statement

Os `console.log` dentro de `streamOpenAIToAnthropic` e `startProxy` disparam incondicionalmente em cada chunk de streaming e em cada requisição. Isso polui o output em produção e dificulta debugging. O objetivo é substituir por logger configurável com níveis.

## Goals

- Logger com níveis: DEBUG, INFO, WARN, ERROR
- DEBUG off por default (sem output)
- DEBUG=on ativa logs detalhados de streaming
- Sem mudança de comportamento quando DEBUG=off

## Out of Scope

- Log para arquivo (só stdout/stderr)
- Log rotation
- Structured logging (JSON)
- Métricas (timestamps, request IDs)

---

## User Stories

### P1: Logger com níveis ⭐ MVP

**User Story**: Como desenvolvedor, quero um logger configurável por nível, para que possa ativar logs de debug só quando necessário.

**Acceptance Criteria**:

1. WHEN logger.debug() is called with DEBUG=off THEN no output SHALL be produced
2. WHEN logger.debug() is called with DEBUG=1 THEN output SHALL be produced
3. WHEN logger.info() is called THEN output SHALL always be produced (INFO is default)
4. WHEN logger.warn() is called THEN output SHALL be produced with [WARN] prefix
5. WHEN logger.error() is called THEN output SHALL be produced with [ERROR] prefix
6. WHEN logger is initialized with DEBUG=1 THEN all levels SHALL output
7. WHEN logger is initialized with no args THEN INFO level SHALL be active by default

**Independent Test**: `bun test tests/logger.test.ts`

---

### P2: Aplicar logger ao proxy

**User Story**: Como desenvolvedor, quero que os console.log do proxy sejam substituídos pelo logger, para que eu possa ativar logs detalhados durante debugging.

**Acceptance Criteria**:

1. WHEN DEBUG is not set THEN startProxy SHALL NOT log request method/URL
2. WHEN DEBUG=1 THEN startProxy SHALL log all requests (method, URL, model, stream, tools count)
3. WHEN DEBUG is not set THEN streamOpenAIToAnthropic SHALL NOT log chunk counts
4. WHEN DEBUG=1 THEN streamOpenAIToAnthropic SHALL log raw chunk count and first N chunks
5. WHEN OpenAI stream ends THEN no debug output SHALL be produced by default
6. WHEN OpenAI returns error THEN error SHALL always be logged (ERROR level)

**Independent Test**: smoke test com DEBUG=1

---

## Edge Cases

- WHEN DEBUG="" (empty string) THEN logs SHALL be suppressed (falsy = off)
- WHEN DEBUG=0 THEN logs SHALL be suppressed
- WHEN logger receives non-string args THEN it SHALL stringify them
- WHEN error message contains newlines THEN each line SHALL be prefixed correctly

---

## Success Criteria

- [ ] `src/logger.ts` exporta logger com debug/info/warn/error
- [ ] `DEBUG=1 bun test` passa (logs não quebram)
- [ ] `DEBUG=1 bun run src/index.ts --proxy` mostra logs detalhados
- [ ] Sem `console.log` no código do proxy (substituídos por logger)
