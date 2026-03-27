# Refatoração Modular — Design

**Spec**: `.specs/features/refactoring-modular/spec.md`
**Status**: ✅ Complete

---

## Architecture Overview

Refatoração pura — não muda arquitetura de runtime. O fluxo CLI → proxy → Claude Code permanece o mesmo. Apenas reorganiza código em arquivos separados seguindo SOLID e DRY.

```
src/
├── constants.ts              # Valores compartilhados
├── config.ts                # Persistência de config (SRP: só isso)
├── path.ts                  # Resolução de paths e binários (SRP:分离)
├── env.ts                   # Construção de env vars (SRP)
├── cli.ts                   # Entry point + prompts + spawn (SRP)
└── proxy/
    ├── types.ts             # Interfaces
    ├── helpers.ts           # Utilities puras (DRY: compartilhadas)
    ├── request-conversion.ts   # Anthropic → OpenAI request
    ├── response-conversion.ts  # OpenAI → Anthropic response (non-stream)
    ├── stream-conversion.ts    # OpenAI SSE → Anthropic SSE
    └── server.ts            # Bun.serve + roteamento (SRP)
```

**Decisões de design por princípio:**

| Princípio | Aplicação |
|-----------|-----------|
| **SRP** | `config.ts` só persiste config; `path.ts` só resolve paths; cada módulo tem uma razão pra mudar |
| **OCP** | `server.ts` depende de abstrações (conversion functions), não de detalhes — extensível pra novos converters |
| **DIP** | `helpers.ts` não tem dependências — utilities puras que qualquer módulo pode usar |
| **DRY** | `generateMsgId`, `mapStopReason`, `makeSSE`, `convertImageSource` vivem em `helpers.ts` — usados por todos os módulos de conversão |
| **ISP** | Cada módulo de conversão expõe só o que aquele contexto precisa |

---

## Import Graph (DAG verificado)

```
constants.ts
    ├── config.ts
    ├── path.ts
    ├── env.ts
    ├── cli.ts
    └── proxy/
          ├── types.ts       (sem dependências)
          ├── helpers.ts     (sem dependências)
          ├── request-conversion.ts  (→ helpers)
          ├── response-conversion.ts (→ helpers)
          ├── stream-conversion.ts   (→ helpers)
          └── server.ts     (→ helpers, request/response/stream converters)
```

**Não há ciclo** — o grafo é DAG puro.

---

## Components

### `src/constants.ts`

- **Purpose**: Valores compartilhados por todos os módulos
- **Location**: `src/constants.ts`
- **Interface**: Exports puros (sem função)
- **Dependencies**: Nenhuma
- **Contains**: `MODELS`, `OPENCODE_GO_ENDPOINT`, `CONFIG_DIR`, `CONFIG_FILE`, `INSTALLATIONS_DIR`, `DEFAULT_INSTALLATION_ID`, `DEFAULT_PROXY_PORT`, `PRESERVED_CLAUDE_CODE_VARS`

### `src/config.ts`

- **Purpose**: Persistência de configuração do usuário em `~/.opencode-go-cli/config.json`
- **Location**: `src/config.ts`
- **Interfaces**:
  - `getConfig(): Config`
  - `saveConfig(config: Config): void`
  - `deleteConfig(): void`
- **Dependencies**: `node:fs`, `node:os`, `node:path`, constants.ts
- **Note**: Não contém mais `getInstallationPath` — isso é responsabilidade de `path.ts`

### `src/path.ts`

- **Purpose**: Resolução de paths do filesystem e localização de binários
- **Location**: `src/path.ts`
- **Interfaces**:
  - `getInstallationPath(id: string): string` — path do config dir de uma instalação
  - `resolveClaudePath(): string` — localização do binário `claude` no PATH
- **Dependencies**: `node:fs`, `node:child_process`, `node:os`, `node:path`, constants.ts
- **Note**: Separado de `config.ts` por SRP — "persistência" e "descoberta de paths" são responsabilidades distintas

### `src/env.ts`

- **Purpose**: Construção de variáveis de ambiente para o subprocesso Claude Code
- **Location**: `src/env.ts`
- **Interfaces**:
  - `buildClaudeEnv(apiKey: string, model: string, baseUrl: string, installationId?: string): Record<string, string>`
- **Dependencies**: constants.ts, path.ts (getInstallationPath)
- **Note**: `cleanupClaudeCodeVars` permanece como função privada — é detalhe de implementação de `buildClaudeEnv`, não precisa ser exportada

### `src/cli.ts`

- **Purpose**: Entry point da CLI, parsing de argumentos, prompts interativos, spawn do Claude Code
- **Location**: `src/cli.ts`
- **Interfaces**:
  - `main(): Promise<never>`
  - `setupApiKey(): Promise<string>`
  - `selectModel(): Promise<string>`
  - `runClaudeCode(model: string, baseUrl: string, extraArgs: string[]): Promise<number>`
  - `printHelp(): void`
- **Dependencies**: `@clack/prompts`, constants.ts, config.ts, path.ts, env.ts, proxy/server.ts

### `src/proxy/types.ts`

- **Purpose**: Interfaces compartilhadas exclusivamente pelo módulo proxy
- **Location**: `src/proxy/types.ts`
- **Interfaces**:
  - `Config` — configuração persistida
  - `Model` — definição de modelo disponível
- **Dependencies**: Nenhuma

### `src/proxy/helpers.ts`

- **Purpose**: Utilities puras compartilhadas por todos os módulos de conversão (DRY central point)
- **Location**: `src/proxy/helpers.ts`
- **Interfaces**:
  - `generateMsgId(): string` — gera ID único no formato `msg_xxxxxxxxxxxx`
  - `mapStopReason(finishReason: string | null | undefined): string` — mapeia finish_reason OpenAI → stop_reason Anthropic
  - `makeSSE(event: string, data: any): string` — formata string SSE com prefixo `event:` e `data:`
  - `convertImageSource(source: any): string` — normaliza source de imagem para data URI ou URL
- **Dependencies**: Nenhuma (pure functions)
- **Reused by**: request-conversion.ts, response-conversion.ts, stream-conversion.ts

### `src/proxy/request-conversion.ts`

- **Purpose**: Traduz Anthropic `/v1/messages` request → OpenAI `/v1/chat/completions` request
- **Location**: `src/proxy/request-conversion.ts`
- **Interfaces**:
  - `convertAnthropicRequestToOpenAI(body: any): any`
- **Dependencies**: helpers.ts (convertImageSource)

### `src/proxy/response-conversion.ts`

- **Purpose**: Traduz OpenAI response → Anthropic message (non-streaming)
- **Location**: `src/proxy/response-conversion.ts`
- **Interfaces**:
  - `convertOpenAIResponseToAnthropic(openaiResp: any): any`
- **Dependencies**: helpers.ts (generateMsgId, mapStopReason)

### `src/proxy/stream-conversion.ts`

- **Purpose**: Async generator — lê OpenAI SSE, emite Anthropic SSE chunk por chunk em tempo real
- **Location**: `src/proxy/stream-conversion.ts`
- **Interfaces**:
  - `streamOpenAIToAnthropic(response: Response): AsyncGenerator<string>`
- **Dependencies**: helpers.ts (generateMsgId, mapStopReason, makeSSE)
- **Note**: Logging foi implementado no Milestone 3 (Debug Logging Gated) — `src/logger.ts` com níveis DEBUG/INFO/WARN/ERROR.

### `src/proxy/server.ts`

- **Purpose**: HTTP server com Bun.serve — roteia requisições e orquestra a chamada aos converters
- **Location**: `src/proxy/server.ts`
- **Interfaces**:
  - `startProxy(port: number, apiKey: string): Promise<void>`
- **Dependencies**: helpers.ts, request-conversion.ts, response-conversion.ts, stream-conversion.ts, constants.ts
- **Note**: O inline `ReadableStream` factory permanece como está nesta refatoração — extrair seria micro-otimização fora do scope

### `src/index.ts` (reescrito)

- **Purpose**: Entry point mínimo — shebang + import de `main()` de `cli.ts`
- **Location**: `src/index.ts`
- **Contains**: Shebang, imports, `main()`
- **Dependencies**: cli.ts

---

## Data Models

Nenhum modelo novo — move apenas as interfaces existentes:

```typescript
interface Config {
  apiKey?: string;
  lastModel?: string;
  proxyPort?: number;
}

interface Model {
  id: string;
  name: string;
  description: string;
}
```

---

## Error Handling Strategy

Mantém exatamente o mesmo comportamento de erro do código original:

| Scenario | Handling | User Impact |
|----------|----------|-------------|
| Config file missing | `getConfig` retorna `{}` | Setup prompt aparece |
| API key inválida | Proxy retorna 401 da OpenCode Go | Claude Code mostra erro |
| OpenCode Go API error | Proxy forward error com status code original | Claude Code mostra erro |
| Proxy port em uso | Bun.serve lança erro | Mensagem de erro clara |
| Claude binary não encontrado | `resolveClaudePath` retorna `"claude"` | Claude Code tenta resolver no PATH |

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| `path.ts` separado de `config.ts` | Módulo próprio | SRP — "persistência" e "descoberta de paths" são responsabilidades distintas |
| `helpers.ts` centraliza utilities | Módulo próprio | DRY — generateMsgId, mapStopReason, makeSSE, convertImageSource são usadas por múltiplos converters |
| `cleanupClaudeCodeVars` não exportada | Privada em env.ts | É detalhe de implementação de buildClaudeEnv — callers não precisam conhecer |
| `Config` e `Model` em `proxy/types.ts` | Co-localizado com proxy | Interfaces só são usadas dentro do módulo proxy |
| Sem barrel exports | Imports diretos por arquivo | Cada módulo exporta só o necessário — nenhuma abstração desnecessária |
| `src/index.ts` como entry point mínimo | Mantém compatibilidade | `bun run src/index.ts` continua funcionando |

---

## Strategy para não quebrar

1. **Após cada task**: `bun run typecheck` deve passar antes de avançar
2. **Após cada task**: `bun run src/index.ts --help` deve funcionar — significa que a refatoração não quebrou nada
3. **Último passo**: `bun run build` compila e smoke test completo
4. **Incremental**: mover functions uma por vez do index.ts para o arquivo destino, mantendo index.ts funcional em cada passo
