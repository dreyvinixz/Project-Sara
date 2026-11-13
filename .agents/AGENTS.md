# Instruções para agentes

Estas orientações se aplicam ao diretório `.agents/` e ao trabalho de agentes no projeto SARA. Antes de qualquer tarefa, leia [AI_ONBOARDING.md](AI_ONBOARDING.md) para obter o contexto inicial e [AI_HANDOFF.md](AI_HANDOFF.md) para arquitetura e estado conhecido.

## Regras de trabalho

- Siga as instruções do `AGENTS.md` mais próximo dos arquivos que estiver alterando; instruções específicas de subdiretórios complementam este arquivo.
- Leia a issue e examine o estado atual do repositório antes de editar. Preserve alterações existentes que não sejam parte da tarefa.
- Respeite os limites entre `apps/web`, `apps/api` e `packages/contracts`. Não crie dependências cruzadas entre implementações dos aplicativos.
- Não introduza credenciais, tokens ou dados pessoais em código, documentação, exemplos ou logs. Use `.env.example` apenas para valores locais não sensíveis ou placeholders.
- Mantenha o escopo da issue. Deploy público, autenticação e integrações nativas precisam de solicitação/escopo próprio.
- Use uma skill de `.agents/skills/` quando aplicável. Skills externas devem ter origem e licença verificadas antes de serem copiadas para o repositório.
- Atualize README e handoff quando uma mudança alterar comandos, arquitetura ou convenções.
- Ao concluir, informe arquivos alterados, validações realmente executadas e pontos ainda não verificados. Não declare sucesso sem evidência.

## Handoff

Use `AI_ONBOARDING.md` para orientar uma IA recém-chegada; use `AI_HANDOFF.md` como referência detalhada e atualizável do projeto.
