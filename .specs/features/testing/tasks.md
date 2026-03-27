# Testes — Tasks

**Design**: `.specs/features/testing/design.md`
**Status**: ✅ Complete

---

## Execution Plan

### Phase 1: Setup + Helpers (Sequential)

T1 cria o diretório `tests/` e adiciona o script ao package.json. T2 testa os helpers.

```
T1 → T2
```

### Phase 2: Request + Response (Sequential)

T3 e T4 são independentes entre si — podem rodar em paralelo.

```
T3 (request-conversion) [P] T4 (response-conversion)
```

### Phase 3: Env (Sequential)

T5 é independente dos anteriores.

```
T5 (env) → T6 (smoke test)
```

---

## Task Breakdown

### T1: Setup do diretório de testes

**What**: Criar `tests/` directory e adicionar script de teste ao package.json
**Where**: `tests/`, `package.json`
**Depends on**: Nenhum
**Reuses**: Nenhum

**Done when**:
- [ ] `tests/` directory criado
- [ ] `package.json` tem `"test": "bun test"` em scripts
- [ ] `bun test` roda sem erro (0 tests until T2-T5)

**Verify**:
```bash
bun test
# Expected: 0 tests (pass)
```

---

### T2: Testar `tests/helpers.test.ts`

**What**: Testar `generateMsgId`, `mapStopReason`, `convertImageSource`
**Where**: `tests/helpers.test.ts`
**Depends on**: T1
**Reuses**: `src/proxy/helpers.ts`

**Done when**:
- [ ] 10 test cases do spec (P1) implementados
- [ ] `generateMsgId` retorna string com prefixo "msg_" e IDs únicos
- [ ] `mapStopReason` mapeia todos os casos do spec
- [ ] `convertImageSource` trata base64 e URL

**Verify**:
```bash
bun test tests/helpers.test.ts
# Expected: 10 passed
```

---

### T3: Testar `tests/request-conversion.test.ts`

**What**: Testar `convertAnthropicRequestToOpenAI`
**Where**: `tests/request-conversion.test.ts`
**Depends on**: T1
**Reuses**: `src/proxy/request-conversion.ts`

**Done when**:
- [ ] 10 test cases do spec (P2) implementados
- [ ] System prompt string e array tratados
- [ ] User messages com string, text block, image block tratados
- [ ] Assistant messages com tool_use tratados
- [ ] tool_choice mapeado corretamente
- [ ] max_tokens forwardeado

**Verify**:
```bash
bun test tests/request-conversion.test.ts
# Expected: 10 passed
```

---

### T4: Testar `tests/response-conversion.test.ts`

**What**: Testar `convertOpenAIResponseToAnthropic`
**Where**: `tests/response-conversion.test.ts`
**Depends on**: T1
**Reuses**: `src/proxy/response-conversion.ts`

**Done when**:
- [ ] 7 test cases do spec (P3) implementados
- [ ] content blocks criados corretamente
- [ ] tool_calls convertidos para tool_use blocks
- [ ] id mapping (chatcmpl → msg)
- [ ] stop_reason mapeado
- [ ] usage forwardeado
- [ ] generateMsgId chamado quando id ausente

**Verify**:
```bash
bun test tests/response-conversion.test.ts
# Expected: 7 passed
```

---

### T5: Testar `tests/env.test.ts`

**What**: Testar `buildClaudeEnv`
**Where**: `tests/env.test.ts`
**Depends on**: T1
**Reuses**: `src/env.ts`, `src/path.ts`

**Done when**:
- [ ] 8 test cases do spec (P4) implementados
- [ ] Variáveis corretas injetadas (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_MODEL, etc.)
- [ ] ANTHROPIC_API_KEY removida
- [ ] CLAUDE_CONFIG_DIR setada quando installationId fornecido
- [ ] CLAUDE_CONFIG_DIR omitida quando installationId é default
- [ ] Variáveis preservadas não são deletadas

**Verify**:
```bash
bun test tests/env.test.ts
# Expected: 8 passed
```

---

### T6: Smoke test completo

**What**: Verificar que todos os testes passam juntos
**Where**: N/A
**Depends on**: T2, T3, T4, T5
**Reuses**: Nenhum

**Done when**:
- [ ] `bun test` passa com todos os 35 testes
- [ ] `bun run build` continua passando
- [ ] `bun run src/index.ts --help` continua funcionando

**Verify**:
```bash
bun test
bun run build
bun run src/index.ts --help
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: Setup | 1 dir + 1 script | ✅ Granular |
| T2: helpers.test.ts | 10 tests, 1 módulo | ✅ Granular |
| T3: request-conversion.test.ts | 10 tests, 1 função | ✅ Granular |
| T4: response-conversion.test.ts | 7 tests, 1 função | ✅ Granular |
| T5: env.test.ts | 8 tests, 1 função | ✅ Granular |
| T6: smoke test | 3 comandos | ✅ Granular |

---

## Dependency Matrix

| Task | Depends on |
|------|-----------|
| T1 | — |
| T2 | T1 |
| T3 | T1 |
| T4 | T1 |
| T5 | T1 |
| T6 | T2, T3, T4, T5 |

---

## Execution Notes

- **T2, T3, T4, T5 são independentes entre si** — podem ser feitos em paralelo
- **T6 é o gate** — só passa se todos os anteriores passaram
- **Sem stream-conversion.test.ts nesta milestone** — testar `streamOpenAIToAnthropic` requer mock de `Response.body.getReader()`, mais complexo. Adiar para milestone futura se necessário.
