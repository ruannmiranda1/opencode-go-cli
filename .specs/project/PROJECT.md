# OpenCode Go CLI

**Vision:** CLI que permite usar modelos de IA de código (MiniMax M2.7, Kimi K2.5, etc.) via assinatura OpenCode Go, roteando as chamadas através de um proxy local que traduz o protocolo Anthropic (usado pelo Claude Code) para o formato OpenAI (aceito pela API OpenCode Go).

**For:** Desenvolvedores que usam Claude Code e querem acessar modelos alternativos através da OpenCode Go API sem modificar como o Claude Code funciona.

**Solves:** O Claude Code usa nativamente o protocolo Anthropic, mas provedores como OpenCode Go oferecem modelos de código via API OpenAI-compatível. O proxy faz a tradução transparente entre os dois.

## Goals

- Claude Code consegue usar qualquer modelo disponível na OpenCode Go API sem configuração adicional
- Proxy local traduz streaming SSE chunk-by-chunk em tempo real (sem buffering completo)
- CLI minimalista: setup rápido, seleção de modelo, launch do Claude Code
- Configuração persistente (API key, último modelo selecionado)

## Tech Stack

**Core:**

- Runtime: Bun
- Language: TypeScript (strict mode)
- Server: Bun.serve (HTTP proxy built-in)
- CLI prompts: @clack/prompts
- Package manager: bun

**Key dependencies:**

- @clack/prompts (interactive CLI prompts)
- bun (runtime + bundler)

## Scope

**v1 includes:**

- CLI interativo com seleção de modelo
- Proxy HTTP traduzindo Anthropic ↔ OpenAI (streaming e não-streaming)
- Persistência de API key e último modelo
- Suporte a multi-instalação (config dirs separados)
- Modo não-interativo (--model, flags direto)
- Todas as flags do Claude Code são transparentemente passadas

**Explicitly out of scope:**

- Servidor proxy standalone (sem CLI) — feito pra ser iniciado pela CLI
- Autenticação própria (confia na API key do OpenCode Go)
- Rate limiting ou cache
- Testes automatizados (✅ implementado — 49 testes via Bun test runner)
- Plugin/extensão pra outros editores

## Constraints

- Runtime é Bun (não Node) — Bun.serve, não http module
- API OpenCode Go é OpenAI-compatível (chat completions)
- Claude Code espera protocolo Anthropic (/v1/messages com SSE)
- Proxy é local (localhost) — não é um servidor de produção
