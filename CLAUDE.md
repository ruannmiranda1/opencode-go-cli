# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

CLI em TypeScript (Bun) que gerencia assinatura OpenCode Go e lança Claude Code com variáveis de ambiente corretas. O projeto tem dois modos de operação distintos — é importante entender qual está rodando.

## Comandos

```bash
bun run src/index.ts          # Desenvolvimento (executa direto)
bun run build                 # Build para produção (dist/)
bun run typecheck             # Type check
bun test                      # Suite de testes (49 testes)
opencode-go --setup           # Setup inicial
opencode-go --proxy --port 8080  # Modo proxy isolado
```

## Arquitetura

### O CLI é modular — dois modos de operação

**Modo interativo (padrão):** o usuário seleciona um modelo e o CLI lança o Claude Code com as variáveis de ambiente setadas (o proxy é iniciado automaticamente).

**Modo proxy (`--proxy`):** sobe um servidor HTTP na porta 8080 que traduz requisições Anthropic ↔ OpenAI. O Claude Code aponta pra esse proxy via `ANTHROPIC_BASE_URL`.

### Fluxo do proxy (o ponto central do projeto)

```
Claude Code
  ↓ POST /v1/messages (Anthropic format)
opencode-go proxy
  ↓ convertAnthropicRequestToOpenAI() — mapeia system/messages/tools
OpenCode Go API (OpenAI format)
  ↓ streaming ou não
opencode-go proxy
  ↓ streamOpenAIToAnthropic() — SSE chunk-by-chunk OR convertOpenAIResponseToAnthropic()
Claude Code
```

### Módulos

| Arquivo | Responsabilidade |
|---------|----------------|
| `src/cli.ts` | Entry point, prompts interativos, spawn do Claude Code |
| `src/proxy/server.ts` | Bun.serve + roteamento |
| `src/proxy/request-conversion.ts` | Anthropic → OpenAI |
| `src/proxy/response-conversion.ts` | OpenAI → Anthropic (non-stream) |
| `src/proxy/stream-conversion.ts` | OpenAI SSE → Anthropic SSE (async generator) |
| `src/logger.ts` | Logging com níveis DEBUG/INFO/WARN/ERROR |
| `src/env.ts` | buildClaudeEnv, cleanupClaudeCodeVars |

### Conversões importantes

- `convertAnthropicRequestToOpenAI()` — traduz o formato Anthropic (`/v1/messages`) pro formato OpenAI (`/v1/chat/completions`). Cuida de: system prompt, conteúdo de imagens como `data:` URI, tool_results como mensagens `role: "tool"`, tool_use como `tool_calls`.

- `streamOpenAIToAnthropic()` — gerador assíncrono que lê SSE do OpenAI e emite SSE do Anthropic chunk por chunk. Mantém estado de blocos (text, tool_use) com índices sequenciais. Envia eventos `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`.

- `convertOpenAIResponseToAnthropic()` — versão não-streaming da conversão acima.

### Variáveis de ambiente injetadas no Claude Code

| Variável | Valor |
|----------|-------|
| `ANTHROPIC_BASE_URL` | `http://localhost:PORT` (o proxy local) |
| `ANTHROPIC_AUTH_TOKEN` | API key do OpenCode Go |
| `ANTHROPIC_MODEL` | Modelo selecionado |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` |
| `CLAUDE_CODE_SUBAGENT_MODEL`, `ANTHROPIC_DEFAULT_*_MODEL` | Mesmo modelo (garante que todo sub-agente usa o mesmo) |

### Config

`~/.opencode-go-cli/config.json` — guarda apiKey, lastModel e proxyPort.

### Servidor HTTP

Usa `Bun.serve` (não Node.js `http`). Isso é importante: o runtime é Bun, não Node. Verifique que qualquer build/config usa `--target bun`.

## Pontos de atenção

- **Bun como runtime** — o shebang é `#!/usr/bin/env bun`, o tsconfig usa `bun-types`. Não use APIs Node que não existam no Bun.
- **SSE streaming** — a implementação de streaming é o coração do projeto. Qualquer alteração na conversão de blocos precisa respeitar o protocolo SSE do Anthropic (eventos nomeados, `data:` prefixado).
- **Conversão de tool_calls** — o índice do bloco no Anthropic é sequencial (0, 1, 2...) mas no OpenAI pode começar em qualquer número. O código mantém `openaiToolIndexToBlockIndex` pra mapear.
- **Text block vs tool block** — se um tool_call aparecer, o text block que estava aberto precisa ser fechado antes do tool block começar. O código trata isso na ordem de chegada dos chunks.
