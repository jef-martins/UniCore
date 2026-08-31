# Implementation Plan: UniCore
## Overview
Implementar incrementalmente o **UniCore_Design_System** no projeto TypeScript existente, expondo a tela-base do UniCore com conteúdo e ativos neutros, contratos explícitos e testes automatizados. Nenhuma tarefa autoriza reutilizar marcas, textos, imagens, ícones, fluxos ou layouts identificáveis de referências externas.
## Tasks
- [x] 1. Integrar a fundação ao projeto existente
  - [x] 1.1 Adaptar o ponto de entrada, a estrutura de estilos e as rotas/composição existentes para expor a tela-base do UniCore, preservando convenções, dependências e build atuais. _Requirements: 1.1, 1.2, 3.2_
  - [x]* 1.2 Escrever testes unitários de montagem da tela-base do UniCore e de resolução dos módulos públicos no ambiente de teste existente. _Requirements: 3.2_
- [x] 2. Implementar tokens, triagem e registro de ativos
  - [x] 2.1 Criar o catálogo tipado e as variáveis de Design Tokens com todos os valores normativos de cor, tipografia, espaço, raio, sombra e breakpoints; fazer os estilos consumirem somente esses tokens. _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 2.2 Implementar `AssetRecord`, manifesto/registro e validação de elegibilidade que exija origem, finalidade e autorização e rejeite ativos ou conteúdo identificáveis de terceiros; cadastrar apenas mídia, ícones e textos originais/neutros. _Requirements: 1.3, 1.4, 1.5, 1.6_
  - [x]* 2.3 Escrever testes unitários para valores do catálogo, exigência dos campos do `AssetRecord` e rejeição de propostas inelegíveis. _Requirements: 1.4, 1.6, 2.1–2.5_
- [x] 3. Construir o shell e os componentes reutilizáveis
  - [x] 3.1 Implementar `LayoutShell` com atalho para conteúdo, cabeçalho, navegação neutra, busca, ação de destaque, `main`, rodapé e indicação ativa por `aria-current`, cor e indicador não cromático. _Requirements: 3.1–3.5, 8.3, 8.6_
  - [x] 3.2 Implementar componentes originais `Button`, `TextInput`, `Select`, `Checkbox`, `ErrorMessage`, `Card` e mídia, com variantes/estados documentados em código, rótulos visíveis, semântica acessível, ícones decorativos ocultos e reflow de conteúdo longo. _Requirements: 5.3–5.7, 6.1–6.7, 8.3–8.7_
  - [x]* 3.3 Escrever testes unitários dos estados, nomes/funções acessíveis, associação de rótulos e erros, semântica desabilitada e item de navegação ativo. _Requirements: 3.5, 5.3–5.7, 6.1–6.6, 8.6_
- [ ] 4. Compor campanha, inscrição e contratos de interação
  - [x] 4.1 Implementar `HeroSection` com conteúdo neutro configurável, composição visual original verde/preto, mídia informativa ou decorativa tratada corretamente e CTA visível. _Requirements: 1.3–1.5, 4.1–4.6, 8.1–8.2_
  - [x]* 4.2 Escrever propriedade fast-check (mínimo 100 casos) **Property 1: Navegação total e segura da CTA**, simulando destinos válidos e ausentes e verificando comando único, destino idêntico ou nenhuma navegação e CTA preservada. Incluir o comentário de rastreio `// Feature: unicore, Property 1: Navegação total e segura da CTA`. _Validates: Requirements 4.7, 4.8_
  - [~] 4.3 Implementar `RegistrationCard`, `FieldConfig`, `RegistrationState` e contratos `registration_submit`/`registration_result`: validar campos, associar/anunciar erros, bloquear reenvio pendente, ignorar IDs divergentes e preservar valores após falha. _Requirements: 5.1–5.9, 8.7_
  - [ ]* 4.4 Escrever propriedade fast-check (mínimo 100 casos) **Property 3: Validação inválida bloqueia o envio e associa o erro**, gerando campos/valores inválidos e verificando zero eventos, `aria-invalid`, `aria-describedby` e anúncio. Incluir o comentário de rastreio `// Feature: unicore, Property 3: Validação inválida bloqueia o envio e associa o erro`. _Validates: Requirements 5.7, 5.8, 8.7_
  - [ ]* 4.5 Escrever propriedade fast-check (mínimo 100 casos) **Property 4: Uma ativação válida emite somente um evento enquanto pendente**, gerando sequências de clique/Enter e verificando uma emissão e um `activationId`. Incluir o comentário de rastreio `// Feature: unicore, Property 4: Uma ativação válida emite somente um evento enquanto pendente`. _Validates: Requirements 5.8_
  - [ ]* 4.6 Escrever propriedade fast-check (mínimo 100 casos) **Property 5: Falha remota preserva valores e notifica erro**, gerando valores, IDs e falhas para verificar preservação, anúncio, estado operável e ignorar resultados divergentes. Incluir o comentário de rastreio `// Feature: unicore, Property 5: Falha remota preserva valores e notifica erro`. _Validates: Requirements 5.9_
  - [ ]* 4.7 Escrever testes unitários e de integração com consumidor simulado para CTA com/sem destino, validação, sucesso, falha, mídia indisponível e os contratos de evento. _Requirements: 4.4–4.8, 5.7–5.9_
- [ ] 5. Aplicar composição responsiva e acessibilidade transversal
  - [~] 5.1 Implementar grades e regras de reflow compacta, intermediária e ampla, com margens, calhas, máximo de conteúdo, ordem de hero/formulário e dimensões fluidas sem rolagem horizontal. _Requirements: 6.7, 7.1–7.7_
  - [ ]* 5.2 Escrever propriedade fast-check (mínimo 100 casos) **Property 2: Reflow sem rolagem horizontal nas faixas previstas**, gerando larguras/conteúdos e medindo overflow, visibilidade e composição em navegador headless. Incluir o comentário de rastreio `// Feature: unicore, Property 2: Reflow sem rolagem horizontal nas faixas previstas`. _Validates: Requirements 6.7, 7.4–7.7_
  - [~] 5.3 Aplicar e centralizar regras de contraste, foco externo visível, ordem de tabulação, sinalização de estado além de cor e remoção da tabulação de controles incapazes de exibir foco. _Requirements: 5.6, 6.4, 8.1–8.6_
  - [ ]* 5.4 Escrever propriedade fast-check (mínimo 100 casos) **Property 6: Estados interativos preservam foco acessível e semântica**, gerando controles, variantes, estados e faixas para verificar teclado, semântica, contraste e foco. Incluir o comentário de rastreio `// Feature: unicore, Property 6: Estados interativos preservam foco acessível e semântica`. _Validates: Requirements 5.6, 6.4, 8.3–8.6_
  - [ ]* 5.5 Escrever testes automatizados de acessibilidade e interação por teclado para shell, hero, formulário, imagens, foco e contrastes, incluindo os limites de breakpoint. _Requirements: 3.5, 4.4–4.6, 5.3–5.7, 8.1–8.7_
- [ ] 6. Produzir o guia normativo e a revisão estruturada
  - [~] 6.1 Criar o `DocumentationGuide`/conteúdo versionado com autoria do UniCore_Design_System, tokens, anatomia/variantes/estados/tamanhos, composições originais, grades, acessibilidade, contratos, política de ativos e checklist de `ScreenReview`. _Requirements: 1.1–1.6, 2.1–2.6, 6.1–6.6, 9.1–9.7_
  - [ ]* 6.2 Escrever testes unitários que validem a presença dos registros normativos, checklist obrigatório, referências aos tokens/componentes e campos exigidos de `ScreenReview`. _Requirements: 1.2, 1.6, 9.1–9.7_
- [ ] 7. Finalizar a integração pública e a cobertura integrada
  - [~] 7.1 Conectar o shell, hero, cartão, ativos aprovados, tokens, destinos de CTA e adaptadores de inscrição à rota/tela pública existente do UniCore; exportar contratos e impedir valores de fallback identificáveis de referência externa. _Requirements: 1.3–1.5, 3.1–3.4, 4.1–4.8, 5.1–5.9, 7.1–7.7_
  - [ ]* 7.2 Escrever testes de integração da página completa do UniCore para os três breakpoints, fluxos de CTA e inscrição, erro remoto, reflow e requisitos acessíveis; rastrear os critérios de requisito em cada cenário. _Requirements: 3.1–3.5, 4.1–4.8, 5.1–5.9, 7.1–7.7, 8.1–8.7_
- [~] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
## Notes
- Tarefas com `*` são testes opcionais; as seis propriedades usam fast-check, ao menos 100 execuções e o comentário de rastreio `// Feature: unicore, Property N: <título>` definido no design.
- Cada ativo, texto, ícone e imagem deve continuar original/neutro e ter registro de origem, finalidade e autorização antes do uso.
## Task Dependency Graph
```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3"] },
    { "id": 5, "tasks": ["3.1"] },
    { "id": 6, "tasks": ["3.2"] },
    { "id": 7, "tasks": ["3.3"] },
    { "id": 8, "tasks": ["4.1"] },
    { "id": 9, "tasks": ["4.2"] },
    { "id": 10, "tasks": ["4.3"] },
    { "id": 11, "tasks": ["4.4"] },
    { "id": 12, "tasks": ["4.5"] },
    { "id": 13, "tasks": ["4.6"] },
    { "id": 14, "tasks": ["4.7"] },
    { "id": 15, "tasks": ["5.1"] },
    { "id": 16, "tasks": ["5.2"] },
    { "id": 17, "tasks": ["5.3"] },
    { "id": 18, "tasks": ["5.4"] },
    { "id": 19, "tasks": ["5.5"] },
    { "id": 20, "tasks": ["6.1"] },
    { "id": 21, "tasks": ["6.2"] },
    { "id": 22, "tasks": ["7.1"] },
    { "id": 23, "tasks": ["7.2"] }
  ]
}
```