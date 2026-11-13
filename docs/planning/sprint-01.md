# SARA — Sprint 01: Fundação da interface web adaptativa

> Status: **planejada** · Duração: **a definir** · Branch de planejamento: `planning/sprint-01-issues`  
> Repositório: [Project-Sara](https://github.com/dreyvinixz/Project-Sara)  
> Os itens rastreáveis são **issues do repositório**, independentes de branch. Esta branch guarda o plano e a organização.

## Objetivo da sprint

Entregar um **protótipo web local** em que uma intenção possa ser transformada em uma interface interativa, sem fluxo de chatbot como tela principal. Validar com dois cenários: **aula visual de rede neural** e **painel de mercado**. Voz é um aprimoramento experimental; dados simulados ou históricos devem ser explicitamente sinalizados.

## Backlog priorizado

| ID | Prioridade | Pontos (estimativa inicial) | Issue | Entrega |
|---|---|---:|---|---|
| S1-01 | P0 | 3 | [#1 — Monorepo + API](https://github.com/dreyvinixz/Project-Sara/issues/1) | Fundação local |
| S1-02 | P0 | 3 | [#2 — Shell adaptativo](https://github.com/dreyvinixz/Project-Sara/issues/2) | Workspace responsivo |
| S1-03 | P0 | 5 | [#3 — SceneDocument v0](https://github.com/dreyvinixz/Project-Sara/issues/3) | Contratos seguros |
| S1-04 | P0 | 5 | [#4 — API e orquestrador](https://github.com/dreyvinixz/Project-Sara/issues/4) | Roteamento de intenção por mock |
| S1-05 | P0 | 5 | [#5 — Renderer de cenas](https://github.com/dreyvinixz/Project-Sara/issues/5) | Interface dinâmica |
| S1-06 | P1 | 3 | [#6 — Voz no navegador](https://github.com/dreyvinixz/Project-Sara/issues/6) | Push-to-talk e narração com fallback |
| S1-07 | P1 | 5 | [#7 — Aula 3D](https://github.com/dreyvinixz/Project-Sara/issues/7) | Interação sobre rede neural |
| S1-08 | P1 | 5 | [#8 — Painel financeiro](https://github.com/dreyvinixz/Project-Sara/issues/8) | Gráfico/eventos/fontes |
| S1-09 | P0 | 3 | [#9 — CI e segurança](https://github.com/dreyvinixz/Project-Sara/issues/9) | Qualidade automatizada |
| S1-10 | P1 | 2 | [#10 — Demo E2E](https://github.com/dreyvinixz/Project-Sara/issues/10) | Demonstração e documentação |

**Total estimado:** 39 pontos (24 P0 / 15 P1). Essas estimativas não equivalem a horas; recalibrar de acordo com a capacidade da equipe. Se a equipe for pequena, tratar P1 como itens condicionados à conclusão do núcleo P0, ou dividir esta sprint.

## Caminho crítico e ordem sugerida

1. **S1-01** estabelece o ambiente.
2. **S1-02** e **S1-03** podem ser iniciadas em paralelo.
3. **S1-04** depende do contrato de cenas.
4. **S1-05** depende da interface, do contrato e da API.
5. **S1-06 / S1-07 / S1-08** são provas de experiência e podem avançar de maneira incremental.
6. **S1-09** deve ser iniciado cedo e evoluir junto com as demais issues.
7. **S1-10** verifica os fluxos completos antes do encerramento.

## Definição de pronto (DoD)

- [ ] Critérios de aceite da issue atendidos.
- [ ] Build, lint e testes relevantes passando em CI.
- [ ] Fluxo principal pode ser demonstrado localmente com README atualizado.
- [ ] Nenhum segredo incluído no repositório.
- [ ] Componentes/renderizações da IA só executam recursos aprovados; entradas externas validadas.
- [ ] Funcionalidade de áudio solicita permissão e oferece fallback acessível.
- [ ] Dados demonstrativos e notícias sem atualização verificada não são apresentados como atuais.
- [ ] Mudanças submetidas via Pull Request para revisão antes de merge na `main`.

## Fora do escopo da Sprint 01

- Agente com acesso irrestrito ao sistema operacional ou a outros aplicativos.
- Wake word e escuta permanente em background no celular.
- Feed financeiro em tempo real obrigatório, recomendações de investimento automatizadas ou operações financeiras.
- Implantação pública, autenticação de produção ou infraestrutura de alta disponibilidade.
- Gerar/executar JavaScript arbitrário retornado por um modelo.

## Próxima revisão de planejamento

Confirmar a capacidade disponível, selecionar quais itens P1 cabem na primeira sprint e converter esta estimativa inicial em compromissos realistas. As issues são a fonte de verdade da execução; este arquivo é o índice do planejamento.
