# Melhorias de UX — Design

**Spec**: `.specs/features/ux-improvements/spec.md`
**Status**: ✅ Complete

---

## Architecture Overview

Pequenas mudanças em `src/cli.ts` e `src/proxy/server.ts` — não muda estrutura, só UX. Não há novos módulos.

```
src/
├── cli.ts           ← spinner, validação de modelo, feedback de proxy
└── proxy/
    └── server.ts    ← "ready" message
```

---

## Changes

### cli.ts — runClaudeCode

Adicionar spinner com `@clack/prompts` antes do spawn:

```typescript
const spinner = p.spinner();
spinner.start("Starting Claude Code...");

// spawn...

spinner.stop("Claude Code started");
```

**Nota**: `@clack/prompts` já está importado em `cli.ts` — só usar.

### cli.ts — validação de modelo

Já existe validação mas a mensagem pode ser melhorada. Verificar se está mostrando sugestão de `--list`.

### cli.ts — startProxy + feedback

O proxy já printa "Server started at http://localhost:PORT". Adicionar "Proxy ready" mais proeminente.

### cli.ts — error messages

Verificar se erros são descritivos. Se não, melhorar.

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Spinner via @clack/prompts | já está no projeto | sem nova dependência |
| Validação early | antes do proxy start | fail fast |
| Mensagens de erro com ação | "Run --list" etc. | orientação ao usuário |

---

## Code Location

```
src/
├── cli.ts           — todas as mudanças de UX
└── proxy/
    └── server.ts    — mensagem de ready
```
