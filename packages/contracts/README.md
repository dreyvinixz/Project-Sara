# SceneDocument v0 — contrato de interface declarativa

A SARA compõe interfaces a partir de **dados estruturados**, e nunca de HTML, JavaScript, shaders ou comandos de sistema enviados por um agente. Este contrato está isolado do shell web (issue #2) e da API (issue #4).

## Arquivos e integração

- `scene-document-v0.schema.json`: fonte canônica (JSON Schema 2020-12; `schemaVersion: "0.0"`).
- `user-action-v0.schema.json`: eventos emitidos após uma interação.
- `fixtures/market-overview.json` e `fixtures/neural-network-lesson.json`: cenas offline que não precisam de API/chave.
- `index.mjs`: validador JavaScript para a aplicação web (usando Ajv). `index.d.ts`: tipos públicos.
- `index.mjs` / `index.d.ts`: validador JavaScript e tipos públicos para o renderer e consumidores Node.

O componente deve ter um `id` estável entre revisões. Ações possuem `id` e apontam a um componente existente (`select`, `adjust`) ou referência existente (`navigate`). `news_panel.items[].referenceId` e `time_series.points[].eventId` são vínculos opcionais; IDs de eventos devem corresponder a itens existentes. IDs de componentes, ações, itens de notícias e referências precisam ser únicos **em sua coleção**, e ações são verificadas contra seus destinos após a validação estrutural.

### Protocolo de interação

1. O backend envia um `SceneDocument` inteiro com `sessionId` e `revision` (inteiro crescente).
2. O renderer valida antes de renderizar; tipo desconhecido ou payload inválido deve gerar erro/fallback, nunca executar o conteúdo.
3. Ao interagir, a UI envia `{"schemaVersion":"0.0","type":"user_action","sessionId":"demo_neural","sceneRevision":0,"actionId":"adjust_network","componentId":"network","value":0.7}`.
4. A API valida a estrutura **e** a associação entre evento, ação, componente, sessão e revisão. Eventos antigos devem ser rejeitados/ignorados. `validateUserAction(event, scene)` implementa esta verificação de associação no contrato; a integração HTTP fica para a issue #4.
5. A resposta é um novo documento completo com `revision > anterior`. O renderer reutiliza `id` para preservar estado quando apropriado. Patches parciais não existem no v0.

### Modelo de componentes permitido

| `type` | Uso |
| --- | --- |
| `text` | Texto literal, sem interpretar markup |
| `time_series` | Série temporal e marcadores por `eventId` |
| `news_panel` | Resumos datados, com proveniência opcional |
| `scene_3d` | Apenas preset `feedforward_network`, sem scripts |
| `control` | `slider` ou `button`, vinculado a ação declarada |

Em `scene_3d`, `layers = [entradas, ocultas..., saídas]` e `weights[etapa][destino][origem]`. Cada matriz precisa ter dimensões correspondentes às camadas adjacentes; a verificação semântica rejeita divergências. Não há bias em v0. No `slider`, `min <= value <= max` e `min < max`.

### Segurança e proveniência

- **Todos os textos são não confiáveis**: use `textContent`/React text nodes, nunca `innerHTML`, `dangerouslySetInnerHTML`, `eval`, scripts ou execução dinâmica.
- URLs permitidas: apenas `https:`, com hostname válido e sem credenciais embutidas; links são abertos somente por decisão explícita do usuário, com precauções contra tabnabbing (`rel="noopener noreferrer"`).
- JSON Schema restringe tipos e propriedades. O validador JavaScript faz checagens adicionais de IDs cruzados, matrizes, faixas numéricas e URLs. Dados recebidos por rede devem ser revalidados, não apenas convertidos via TypeScript.
- `dataStatus:"demo"` sinaliza conteúdo simulado. A fixture de mercado contém **números/eventos inventados**; o link oficial da B3 dá apenas contexto, não prova os eventos. Dados reais precisam de origem verificável, data de atualização (`asOf`) e indicação clara de indisponibilidade.
- `dataStatus:"verified"` exige `asOf` e proveniência vinculada: séries temporais informam `source` e `referenceId`; cada item de notícias inclui seu `referenceId`. As referências devem apontar para URLs HTTPS válidas sem credenciais embutidas.
- Nunca expor chaves, dados pessoais, acesso a arquivos locais ou permissões de SO no documento.

### Testes locais

```bash
npm install
npm --workspace @sara/contracts test
```

Os testes JavaScript validam os exemplos e rejeitam tipos não permitidos, destinos inexistentes, URLs inseguras, matrizes inconsistentes, faixas inválidas e eventos desatualizados ou associados a controles incorretos. A API pode validar a mesma fonte JSON Schema com uma implementação JSON Schema 2020-12; a integração HTTP acontecerá nas issues #4 e #5.
