# Refatoração Modular — Tasks

**Design**: `.specs/features/refactoring-modular/design.md`
**Status**: ✅ Complete

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Criação dos módulos base que não dependem de ninguém.

```
T1 (constants.ts) → T2 (proxy/types.ts)
```

### Phase 2: Helpers + Conversions (Sequential na criação, paralelas entre si após helpers)

Helpers é a base dos conversores — todos dependem dele. Depois que helpers existe, os 3 conversores podem ser extraídos em paralelo.

```
T1 → T2
       → T3 (helpers.ts) → T4, T5, T6 (request/response/stream) → T7 (server)
```

### Phase 3: Infraestrutura (Sequential)

CLI e entry point.

```
T7 → T8 (config.ts) → T9 (path.ts) → T10 (env.ts) → T11 (cli.ts) → T12 (index.ts) → T13 (smoke)
```

---

## Task Breakdown

### T1: Criar `src/constants.ts`

**What**: Criar arquivo `src/constants.ts` com todas as constantes extraídas de `src/index.ts`
**Where**: `src/constants.ts`
**Depends on**: Nenhum
**Reuses**: Nenhum

**Done when**:
- [ ] `src/constants.ts` existe e contém: `MODELS`, `OPENCODE_GO_ENDPOINT`, `CONFIG_DIR`, `CONFIG_FILE`, `INSTALLATIONS_DIR`, `DEFAULT_INSTALLATION_ID`, `DEFAULT_PROXY_PORT`, `PRESERVED_CLAUDE_CODE_VARS`
- [ ] `src/index.ts` continua funcionando (`bun run typecheck` passa)
- [ ] `bun run src/index.ts --help` funciona

**Verify**:
```bash
bun run typecheck
bun run src/index.ts --help
```

---

### T2: Criar `src/proxy/types.ts`

**What**: Criar `src/proxy/types.ts` com interfaces `Config` e `Model`
**Where**: `src/proxy/types.ts`
**Depends on**: T1
**Reuses**: Nenhum

**Done when**:
- [ ] `src/proxy/types.ts` existe com interfaces `Config` e `Model` exportadas
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T3: Criar `src/proxy/helpers.ts`

**What**: Extrair `generateMsgId`, `mapStopReason`, `makeSSE` e `convertImageSource` para `helpers.ts`
**Where**: `src/proxy/helpers.ts`
**Depends on**: T2
**Reuses**: Nenhum (utilities puras)

**Done when**:
- [ ] `src/proxy/helpers.ts` exporta: `generateMsgId`, `mapStopReason`, `makeSSE`, `convertImageSource`
- [ ] `src/index.ts` continua funcionando — funções existem nos dois lugares durante transição (remover do index.ts após T4-T6)
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T4: Criar `src/proxy/request-conversion.ts`

**What**: Extrair `convertAnthropicRequestToOpenAI` do `index.ts`, importando `convertImageSource` de `helpers.ts`
**Where**: `src/proxy/request-conversion.ts`
**Depends on**: T3
**Reuses**: `src/proxy/helpers.ts` (convertImageSource)

**Done when**:
- [ ] `src/proxy/request-conversion.ts` exporta `convertAnthropicRequestToOpenAI`
- [ ] Importa `convertImageSource` de `helpers.ts`
- [ ] Função removida de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T5: Criar `src/proxy/response-conversion.ts`

**What**: Extrair `convertOpenAIResponseToAnthropic` do `index.ts`, importando `generateMsgId` e `mapStopReason` de `helpers.ts`
**Where**: `src/proxy/response-conversion.ts`
**Depends on**: T3
**Reuses**: `src/proxy/helpers.ts` (generateMsgId, mapStopReason)

**Done when**:
- [ ] `src/proxy/response-conversion.ts` exporta `convertOpenAIResponseToAnthropic`
- [ ] Importa `generateMsgId` e `mapStopReason` de `helpers.ts`
- [ ] Função removida de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T6: Criar `src/proxy/stream-conversion.ts`

**What**: Extrair `makeSSE` e `streamOpenAIToAnthropic` do `index.ts`, importando `generateMsgId`, `mapStopReason`, `makeSSE` de `helpers.ts`
**Where**: `src/proxy/stream-conversion.ts`
**Depends on**: T3
**Reuses**: `src/proxy/helpers.ts` (generateMsgId, mapStopReason, makeSSE)

**Done when**:
- [ ] `src/proxy/stream-conversion.ts` exporta `streamOpenAIToAnthropic`
- [ ] Importa de `helpers.ts` — não mais de `response-conversion.ts`
- [ ] Função removida de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T7: Criar `src/proxy/server.ts`

**What**: Extrair `startProxy` do `index.ts`, importando todos os modules de conversão e helpers
**Where**: `src/proxy/server.ts`
**Depends on**: T4, T5, T6 (todos os conversion modules existem)
**Reuses**: helpers, request/response/stream-conversion, constants.ts

**Done when**:
- [ ] `src/proxy/server.ts` exporta `startProxy`
- [ ] Importa e usa: helpers, request-conversion, response-conversion, stream-conversion
- [ ] Função removida de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T8: Criar `src/config.ts`

**What**: Extrair `getConfig`, `saveConfig`, `deleteConfig` do `index.ts` (sem `resolveClaudePath` — vai pro T9)
**Where**: `src/config.ts`
**Depends on**: T1
**Reuses**: constants.ts

**Done when**:
- [ ] `src/config.ts` exporta: `getConfig`, `saveConfig`, `deleteConfig`
- [ ] Funções removidas de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T9: Criar `src/path.ts`

**What**: Extrair `getInstallationPath` e `resolveClaudePath` do `index.ts`
**Where**: `src/path.ts`
**Depends on**: T1
**Reuses**: constants.ts

**Done when**:
- [ ] `src/path.ts` exporta: `getInstallationPath`, `resolveClaudePath`
- [ ] Funções removidas de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T10: Criar `src/env.ts`

**What**: Extrair `cleanupClaudeCodeVars` (privada) e `buildClaudeEnv` do `index.ts`
**Where**: `src/env.ts`
**Depends on**: T1, T9
**Reuses**: constants.ts, path.ts (getInstallationPath)

**Done when**:
- [ ] `src/env.ts` exporta `buildClaudeEnv`; `cleanupClaudeCodeVars` é privada (não exportada)
- [ ] Importa `getInstallationPath` de `path.ts`
- [ ] Funções removidas de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T11: Criar `src/cli.ts`

**What**: Extrair `main`, `setupApiKey`, `selectModel`, `runClaudeCode`, `printHelp` do `index.ts`
**Where**: `src/cli.ts`
**Depends on**: T8, T9, T10, T7 (config, path, env, proxy/server)
**Reuses**: @clack/prompts, todos os módulos

**Done when**:
- [ ] `src/cli.ts` exporta `main` como entry point
- [ ] Importa e usa todos os módulos necessários
- [ ] Funções removidas de `src/index.ts`
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T12: Reescrever `src/index.ts`

**What**: Reduzir `src/index.ts` a shebang + imports + `main()`
**Where**: `src/index.ts`
**Depends on**: T11
**Reuses**: cli.ts

**Done when**:
- [ ] `src/index.ts` contém apenas: shebang, import de cli.ts, chamada `main()`
- [ ] Todo código de negócio foi movido para os módulos
- [ ] `bun run typecheck` passa

**Verify**:
```bash
bun run typecheck
```

---

### T13: Smoke test completo

**What**: Verificar que todos os comandos da CLI funcionam como antes da refatoração
**Where**: N/A (teste de sistema)
**Depends on**: T12
**Reuses**: Nenhum

**Done when**:
- [ ] `bun run build` compila sem erros e gera `dist/index.js`
- [ ] `bun run src/index.ts --help` mostra help idêntico
- [ ] `bun run src/index.ts --version` mostra "opencode-go v1.0.0"
- [ ] `bun run src/index.ts --list` lista os 4 modelos
- [ ] `bun run src/index.ts --reset` deleta config sem erro

**Verify**:
```bash
bun run build
bun run src/index.ts --help
bun run src/index.ts --version
bun run src/index.ts --list
```

---

## Parallel Execution Map

```
Phase 1:
  T1 ──→ T2

Phase 2:
  T2 ──→ T3
           ├──→ T4 [P]
           ├──→ T5 [P]  }  T4, T5, T6 run in parallel after T3
           └──→ T6 [P]
                └──→ T7

Phase 3:
  T7 ──→ T8 ──→ T9 ──→ T10 ──→ T11 ──→ T12 ──→ T13
```

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1: constants.ts | 1 arquivo | ✅ Granular |
| T2: proxy/types.ts | 1 arquivo | ✅ Granular |
| T3: proxy/helpers.ts | 1 arquivo, 4 utilities | ✅ Granular |
| T4: proxy/request-conversion.ts | 1 arquivo, 1 função principal | ✅ Granular |
| T5: proxy/response-conversion.ts | 1 arquivo, 1 função principal | ✅ Granular |
| T6: proxy/stream-conversion.ts | 1 arquivo, 1 função principal | ✅ Granular |
| T7: proxy/server.ts | 1 arquivo | ✅ Granular |
| T8: config.ts | 1 arquivo, 3 funções | ✅ Granular |
| T9: path.ts | 1 arquivo, 2 funções | ✅ Granular |
| T10: env.ts | 1 arquivo, 2 funções | ✅ Granular |
| T11: cli.ts | 1 arquivo, 5 funções | ✅ Granular |
| T12: index.ts rewrite | 1 arquivo | ✅ Granular |
| T13: smoke test | 5 comandos | ✅ Granular |

---

## Dependency Matrix

| Task | Depends on |
|------|-----------|
| T1 | — |
| T2 | T1 |
| T3 | T2 |
| T4 | T3 |
| T5 | T3 |
| T6 | T3 |
| T7 | T4, T5, T6 |
| T8 | T1 |
| T9 | T1 |
| T10 | T1, T9 |
| T11 | T7, T8, T9, T10 |
| T12 | T11 |
| T13 | T12 |

---

## Execution Notes

- **`bun run typecheck` após cada task** — se não passar, não avançar
- **`bun run src/index.ts --help` após cada task** — smoke test rápido que garante que não quebrou nada
- **T4, T5, T6 podem rodar em paralelo** — todas dependem só de T3
- **T8 e T9 são independentes entre si** — ambas dependem só de T1
- **T10 depende de T9** — usa `getInstallationPath` de path.ts
