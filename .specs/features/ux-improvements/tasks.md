# Melhorias de UX — Tasks

**Design**: `.specs/features/ux-improvements/design.md`
**Status**: ✅ Complete

**Implemented:**
- T1 ✅ Spinner em runClaudeCode (src/cli.ts)
- T2 ✅ Validação de modelo fail-fast (src/cli.ts)
- T3 ✅ Mensagem de proxy pronto (src/proxy/server.ts)
- T4 ✅ Handler de porta em uso + erros descritivos (src/proxy/server.ts, src/cli.ts)
- T5 ✅ Smoke test: 49/49 testes, build limpo

---

## Execution Plan

### Phase 1: UX Improvements (Sequential)

Todas são independentes entre si — podem ser feitas em paralelo.

```
T1 (spinner) [P] T2 (model validation) [P] T3 (proxy ready) [P] T4 (error messages)
```

### Phase 2: Smoke (Sequential)

```
T1, T2, T3, T4 → T5 (smoke)
```

---

## Task Breakdown

### T1: Spinner em `runClaudeCode`

**What**: Adicionar spinner visual usando @clack/prompts durante spawn do Claude Code
**Where**: `src/cli.ts` — função `runClaudeCode`
**Depends on**: Nenhum
**Reuses**: `@clack/prompts` (já importado)

**Changes**:
```typescript
// Antes:
p.log.info(`Starting Claude Code with ${model}...`);
// spawn...

// Depois:
const spinner = p.spinner();
spinner.start(`Starting Claude Code with ${model}...`);
const child = spawn(claudePath, args, { stdio: "inherit", env });
spinner.stop(`Claude Code started`);
```

**Done when**:
- [x] Spinner aparece com mensagem "Starting Claude Code with X..."
- [x] Spinner para quando Claude Code inicia
- [x] Sem mudança de comportamento (spawn continua igual)

**Verify**:
```bash
# Manual: verificar visualmente que spinner aparece
```

---

### T2: Melhorar mensagem de validação de modelo

**What**: Verificar e melhorar mensagem de erro quando modelo é inválido
**Where**: `src/cli.ts` — `main()`
**Depends on**: Nenhum
**Reuses**: Nenhum

**Changes**: A validação já existe. Verificar se a mensagem inclui sugestão de `--list`.

**Current message**:
```typescript
p.log.error(`Unknown model: ${model}`);
p.log.info("Run 'opencode-go --list' to see available models.");
```

**Done when**:
- [x] Mensagem já inclui hint de `--list` (se não, adicionar)
- [x] `bun run src/index.ts --model invalid-model` mostra mensagem útil

**Verify**:
```bash
bun run src/index.ts --model invalid-model 2>&1
# Expected: "Unknown model: invalid-model" + "Run --list to see available models"
```

---

### T3: Mensagem de proxy pronto

**What**: Melhorar mensagem de feedback quando proxy está pronto
**Where**: `src/proxy/server.ts` — `startProxy`
**Depends on**: Nenhum
**Reuses**: Nenhum

**Changes**: Substituir/adicionar mensagem mais clara:

```typescript
// Depois de Bun.serve iniciar:
console.log(`[proxy] Proxy ready at http://localhost:${server.port}`);
console.log(`[proxy] Waiting for Claude Code...`);
```

**Done when**:
- [x] Mensagem "ready" aparece após servidor iniciar
- [x] Mensagem "waiting for Claude Code" aparece

**Verify**:
```bash
timeout 3 bun run src/index.ts --proxy --port 8082 2>&1 || true
# Expected: "ready at http://localhost:8082" + "Waiting for Claude Code"
```

---

### T4: Mensagens de erro descritivas

**What**: Verificar e melhorar mensagens de erro em cenários de falha
**Where**: `src/cli.ts`, `src/proxy/server.ts`
**Depends on**: Nenhum
**Reuses**: Nenhum

**Scenarios para verificar**:

1. **API key missing** (em `runClaudeCode`): já diz "No API key configured. Run with --setup first."
2. **API key missing no proxy** (em `main --proxy`): verificado — já diz "No API key configured. Run --setup first."
3. **Port in use**: Bun.serve lança erro — ver se a mensagem é legível
4. **Claude binary not found**: `resolveClaudePath` retorna "claude" — erro virá do spawn

**Done when**:
- [x] Todos os cenários de erro têm mensagem descritiva
- [x] Erros sugerem ação (--setup, --list, --port)
- [x] `bun run src/index.ts --proxy` sem API key mostra mensagem clara

**Verify**:
```bash
bun run src/index.ts --proxy 2>&1
# Expected: clear error about API key missing
```

---

### T5: Smoke test

**What**: Verificar que mudanças de UX não quebraram nada
**Where**: N/A
**Depends on**: T1, T2, T3, T4
**Reuses**: Nenhum

**Done when**:
- [ ] `bun run build` passa
- [ ] `bun test` passa (43 tests)
- [ ] `bun run src/index.ts --help` funciona
- [ ] `bun run src/index.ts --version` funciona
- [ ] `bun run src/index.ts --list` funciona

**Verify**:
```bash
bun run build
bun test
bun run src/index.ts --help
bun run src/index.ts --version
bun run src/index.ts --list
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: Spinner | 1 UI element | ✅ Granular |
| T2: Model validation message | 1 string | ✅ Granular |
| T3: Proxy ready message | 2 strings | ✅ Granular |
| T4: Error messages | múltiplos scenarios | ✅ Granular |
| T5: Smoke | 5 comandos | ✅ Granular |

---

## Dependency Matrix

| Task | Depends on |
|------|-----------|
| T1 | — |
| T2 | — |
| T3 | — |
| T4 | — |
| T5 | T1, T2, T3, T4 |
