# AI onboarding — Project SARA

Bem-vinda/o ao Project SARA. Este guia foi escrito para que qualquer IA consiga começar a trabalhar no repositório sem depender do histórico de outra conversa.

## Comece por aqui

1. Leia este documento e `.agents/AGENTS.md`.
2. Leia `.agents/AI_HANDOFF.md` para entender produto, arquitetura, comandos e escopo atual.
3. Confira `git status`, a branch ativa e a issue/tarefa solicitada.
4. Abra o `README.md` e os arquivos da área que será alterada. Não suponha que o estado descrito em documentação substitui a inspeção do código.
5. Consulte `.agents/skills/` e as skills disponíveis no seu próprio ambiente. Skills do Codex não são automaticamente portáveis para outros agentes; use as instruções Markdown deste repositório como referência comum.

## Sobre o produto

SARA é um projeto experimental de integração de sistemas de IA multimodais. O primeiro marco cria uma interface web adaptativa para áudio, visualizações interativas e saídas estruturadas de agentes, sem assumir um fluxo convencional centrado em chat. Consulte a issue antes de ampliar esse escopo.

## Mapa rápido

- `apps/web`: React, TypeScript e Vite.
- `apps/api`: API Python com FastAPI; `GET /health` é o endpoint de saúde.
- `packages/contracts`: reservado para contratos versionados compartilhados entre frontend e API.
- `.agents/AGENTS.md`: instruções para agentes.
- `.agents/AI_HANDOFF.md`: contexto técnico e acordos de trabalho detalhados.
- `.agents/skills/`: skills de projeto portáveis em Markdown.
- `.env.example`: configuração local sem segredos; o `.env` real não deve ser versionado.

## Comandos principais

Na raiz do repositório:

```bash
npm install
npm run dev:web
npm run build
npm run lint
npm run typecheck
```

API: crie um ambiente virtual em `apps/api`, instale `apps/api/requirements.txt` e execute:

```bash
uvicorn app.main:app --app-dir apps/api --reload --host 127.0.0.1 --port 8000
```

## Como colaborar

- Mantenha frontend e API executáveis de forma independente.
- Adicione contratos compartilhados somente quando houver necessidade real de integração entre os aplicativos.
- Preserve trabalho local existente e limite cada mudança ao pedido/issue.
- Prefira interfaces acessíveis, código tipado e textos voltados ao usuário em português do Brasil, salvo orientação diferente.
- Valide as mudanças com os comandos pertinentes e registre somente resultados observados.
- Na resposta final, resuma o que mudou, como foi validado e o que ainda está pendente.
