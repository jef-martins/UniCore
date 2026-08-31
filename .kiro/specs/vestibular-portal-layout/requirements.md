# Requirements Document

## Introduction

O **UniCore** define um sistema de design, composição responsiva, comportamentos acessíveis e documentação normativa para futuras telas do portal UniCore. O sistema de design, os componentes, os ativos visuais, os textos, os ícones, as imagens, os fluxos, a estrutura e a identidade serão originais e proprietários deste projeto, com nomes e conteúdo neutros.

Uma imagem de referência pode orientar exclusivamente a direção estética de alto nível: modo escuro, contraste elevado, verde como cor de acento, superfícies grafite e destaque para um formulário. A Referência_Estética não define, autoriza nem fornece elementos de interface, marca, texto, ícone, imagem, layout, componente, fluxo, estrutura ou identidade para reutilização. Este documento define resultados observáveis e não prescreve a implementação.

## Glossary

- **UniCore**: Sistema de design e composição de interface original e proprietário do projeto UniCore.
- **UniCore_Design_System**: Conjunto original de tokens, componentes, regras e documentação pertencente ao projeto UniCore.
- **Ativo_do_Projeto**: Elemento visual, textual ou funcional criado para o projeto UniCore ou licenciado para uso exclusivo no projeto, com origem registrada.
- **Conteúdo_Neutro**: Nome, texto, ícone, imagem ou outro conteúdo que não reproduz nem identifica marcas, pessoas, instituições ou sistemas externos.
- **Referência_Estética**: Fonte usada somente para orientar características visuais de alto nível, sem reutilização de elementos ou identidades.
- **Design_Tokens**: Valores nomeados e documentados de cor, tipografia, espaçamento, raio, borda, sombra e ponto de quebra do UniCore_Design_System.
- **Layout_Shell**: Estrutura original e reutilizável composta por cabeçalho, área principal e rodapé.
- **Hero_Section**: Área promocional original que apresenta uma campanha neutra e uma chamada para ação.
- **Registration_Card**: Painel original de formulário destacado, com campos de entrada e ação de envio.
- **Component_Library**: Conjunto documentado de componentes originais e proprietários do UniCore.
- **Breakpoint**: Largura de viewport que altera a composição responsiva.
- **Accessibility_Requirement**: Critério verificável de acesso por teclado, foco, contraste ou tecnologia assistiva.
- **Documentation_Guide**: Documento normativo que orienta a aplicação do UniCore em telas futuras.
- **CTA**: Controle com Conteúdo_Neutro que inicia uma ação ou navega para um destino configurado.
- **Mensagem_de_Erro**: Texto de validação associado ao campo inválido e exposto para tecnologias assistivas.

## Requirements

### Requirement 1: Garantir autoria e independência do sistema de design

**User Story:** Como responsável pelo produto, quero um sistema de design independente, para que o portal tenha uma identidade própria e utilizável sem associação com sistemas externos.

#### Acceptance Criteria

1. O UniCore DEVE definir o UniCore_Design_System como original e proprietário do projeto UniCore.
2. O UniCore DEVE documentar que Design_Tokens, Component_Library, Layout_Shell, Hero_Section e Registration_Card são criações originais do UniCore_Design_System.
3. QUANDO uma Referência_Estética for considerada, O UniCore DEVE usar somente as características de modo escuro, contraste elevado, acento verde, superfícies grafite e destaque para formulário como orientação visual de alto nível.
4. SE uma proposta de Ativo_do_Projeto contiver marca, texto, ícone, imagem, componente, layout, fluxo, estrutura ou identidade identificável de um sistema externo, ENTÃO O UniCore DEVE classificá-la como inelegível para o UniCore_Design_System.
5. O UniCore DEVE usar Conteúdo_Neutro em nomes de componentes, textos visíveis, ícones e imagens documentados.
6. QUANDO um Ativo_do_Projeto for incluído na documentação, O Documentation_Guide DEVE registrar a origem, a finalidade e a autorização de uso do Ativo_do_Projeto.

### Requirement 2: Definir a identidade visual reutilizável

**User Story:** Como responsável pelo produto, quero tokens visuais concretos e documentados, para que as telas futuras mantenham uma identidade própria e consistente.

#### Acceptance Criteria

1. O UniCore DEVE catalogar os Design_Tokens de cor `color-background` `#101311`, `color-surface` `#181D1A`, `color-surface-elevated` `#222A25`, `color-campaign-black` `#0B0D0C`, `color-text-primary` `#F5F7F4`, `color-text-secondary` `#B9C3BC`, `color-action-green` `#49D17D`, `color-action-primary-background` `#F5F7F4`, `color-action-primary-text` `#101311`, `color-border` `#58675C`, `color-focus` `#8EF0B3` e `color-error` `#FF7A7A`.
2. O UniCore DEVE catalogar um Design_Token de família tipográfica com fonte sem serifa autorizada para uso no projeto, pesos 400, 500, 600 e 700, tamanhos de 12 px, 14 px, 16 px, 20 px, 24 px, 32 px e 40 px e altura de linha de 1,5 para texto de corpo.
3. O UniCore DEVE catalogar a escala de espaçamento de 4 px, 8 px, 12 px, 16 px, 24 px, 32 px, 40 px, 48 px e 64 px.
4. O UniCore DEVE catalogar os raios de 4 px, 8 px, 12 px, 16 px e 999 px.
5. O UniCore DEVE catalogar as sombras `shadow-raised` `0 8px 24px rgba(0,0,0,0.28)` e `shadow-overlay` `0 16px 40px rgba(0,0,0,0.40)`.
6. O UniCore DEVE definir o padrão visual próprio com fundo escuro, superfícies grafite, texto claro, acento verde, botões primários claros e área de campanha em verde e preto.

### Requirement 3: Fornecer a estrutura compartilhada do portal

**User Story:** Como visitante, quero uma estrutura de página previsível, para que eu reconheça a navegação e o conteúdo em todas as telas.

#### Acceptance Criteria

1. O Layout_Shell DEVE apresentar um cabeçalho grafite com identificação neutra do portal, navegação principal, uma ação de busca e uma ação de destaque.
2. O Layout_Shell DEVE reservar uma área principal para o conteúdo específico da página entre o cabeçalho e o rodapé.
3. O Layout_Shell DEVE apresentar um rodapé com informações do projeto e links complementares de Conteúdo_Neutro.
4. O Layout_Shell DEVE aplicar `color-background` como fundo da página e `color-surface` como superfície do cabeçalho.
5. QUANDO um item de navegação corresponder à página em exibição, O Layout_Shell DEVE comunicar o estado ativo por `aria-current`, por cor e por indicador visual adicional perceptível sem distinção de cor.

### Requirement 4: Compor a seção promocional principal

**User Story:** Como candidato, quero identificar a campanha de admissão e sua ação principal, para que eu possa iniciar a inscrição.

#### Acceptance Criteria

1. A Hero_Section DEVE apresentar título de campanha, descrição e CTA com Conteúdo_Neutro visível.
2. A Hero_Section DEVE apresentar uma área imagética original ou licenciada para o projeto ao lado ou abaixo do conteúdo textual conforme o Breakpoint aplicável.
3. A Hero_Section DEVE usar `color-action-green` e `color-campaign-black` para comunicar a campanha visual própria em verde e preto.
4. QUANDO uma imagem da Hero_Section comunicar informação sobre a campanha, A Hero_Section DEVE fornecer texto alternativo que descreva a informação comunicada.
5. QUANDO uma imagem da Hero_Section compuser somente o fundo ou a decoração da campanha, A Hero_Section DEVE identificar a imagem como decorativa para tecnologias assistivas.
6. A Hero_Section DEVE usar pares de Design_Tokens que atendam aos limites de contraste do Accessibility_Requirement no título, na descrição e na CTA.
7. QUANDO uma pessoa usuária ativar uma CTA da Hero_Section com destino configurado, A Hero_Section DEVE navegar para o destino configurado.
8. SE uma pessoa usuária ativar uma CTA da Hero_Section sem destino configurado, ENTÃO A Hero_Section DEVE manter a pessoa usuária na página atual, manter a CTA visível e não iniciar redirecionamento.

### Requirement 5: Disponibilizar o painel de inscrição

**User Story:** Como candidato, quero um painel de inscrição destacado, para que eu possa informar os dados solicitados pela campanha.

#### Acceptance Criteria

1. O Registration_Card DEVE usar `color-surface-elevated` como superfície grafite, borda de 1 px com `color-action-green`, raio de 16 px e `shadow-raised`.
2. O Registration_Card DEVE apresentar um título neutro que descreva a finalidade da inscrição.
3. O Registration_Card DEVE apresentar um rótulo visível e programaticamente associado a cada campo de entrada.
4. O Registration_Card DEVE usar `color-surface` em cada campo e `color-text-primary` para cada valor digitado.
5. QUANDO um campo apresentar ícone, O Registration_Card DEVE manter o rótulo visível como identificação do campo e excluir o ícone decorativo da árvore de acessibilidade.
6. QUANDO um campo receber foco, O Registration_Card DEVE exibir um indicador com `color-focus` que atenda ao Accessibility_Requirement.
7. QUANDO a validação de um campo falhar, O Registration_Card DEVE exibir uma Mensagem_de_Erro associada programaticamente ao campo inválido e anunciar a Mensagem_de_Erro para tecnologias assistivas.
8. QUANDO uma pessoa usuária ativar o envio com todos os dados válidos, O Registration_Card DEVE emitir exatamente um evento de inscrição para a ativação.
9. SE a integração consumidora informar falha para o evento de inscrição, ENTÃO O Registration_Card DEVE exibir uma mensagem de falha e preservar os valores informados em todos os campos.

### Requirement 6: Padronizar a biblioteca de componentes

**User Story:** Como equipe de produto, quero componentes consistentes e próprios, para que novas telas mantenham a identidade do portal.

#### Acceptance Criteria

1. A Component_Library DEVE documentar botões originais nas variantes primária clara, secundária e textual.
2. A Component_Library DEVE documentar os estados padrão, hover, foco, pressionado e desabilitado para cada variante de botão.
3. A Component_Library DEVE documentar o estado de erro para cada controle que aceite validação.
4. A Component_Library DEVE comunicar cada mudança de estado interativo por diferença perceptível além de cor.
5. A Component_Library DEVE documentar os controles originais de entrada de texto, seleção, caixa de seleção e Mensagem_de_Erro.
6. A Component_Library DEVE documentar card, cabeçalho, navegação, Hero_Section e Registration_Card como componentes originais do projeto UniCore.
7. QUANDO um componente receber conteúdo maior que o exemplo documentado, A Component_Library DEVE manter textos e controles visíveis, sem sobreposição, corte ou rolagem horizontal.

### Requirement 7: Garantir comportamento responsivo

**User Story:** Como candidato que acessa por diferentes dispositivos, quero uma interface adaptada à largura disponível, para que eu consiga ler e interagir com o portal.

#### Acceptance Criteria

1. O UniCore DEVE definir a composição compacta para viewports de 0 px a 767 px com grade de 4 colunas, margens de 16 px e calha de 16 px.
2. O UniCore DEVE definir a composição intermediária para viewports de 768 px a 1199 px com grade de 8 colunas, margens de 32 px e calha de 24 px.
3. O UniCore DEVE definir a composição ampla para viewports a partir de 1200 px com grade de 12 colunas, largura máxima de conteúdo de 1200 px, margens laterais automáticas e calha de 24 px.
4. ENQUANTO o viewport estiver na composição compacta, A Hero_Section DEVE empilhar o conteúdo textual, a área imagética e o Registration_Card em uma coluna.
5. ENQUANTO o viewport estiver na composição intermediária, A Hero_Section DEVE manter o conteúdo textual e o Registration_Card em blocos que ocupem a largura disponível sem sobreposição.
6. ENQUANTO o viewport estiver na composição ampla, A Hero_Section DEVE apresentar o conteúdo promocional e o Registration_Card em colunas adjacentes.
7. QUANDO a largura do viewport mudar dentro ou entre as composições definidas, O UniCore DEVE manter conteúdos e controles inteiramente visíveis, operáveis e sem rolagem horizontal.

### Requirement 8: Atender aos requisitos de acessibilidade

**User Story:** Como pessoa usuária com necessidades de acesso, quero utilizar o portal com teclado e tecnologias assistivas, para que eu possa concluir as ações disponíveis.

#### Acceptance Criteria

1. O UniCore DEVE usar pares de cores com contraste mínimo de 4,5:1 para texto normal.
2. O UniCore DEVE usar pares de cores com contraste mínimo de 3:1 para texto grande, controles e indicadores gráficos essenciais.
3. QUANDO uma pessoa usuária navegar somente pelo teclado, O UniCore DEVE apresentar os elementos interativos em uma ordem de foco que siga a ordem visual e funcional.
4. QUANDO um elemento interativo receber foco pelo teclado, O UniCore DEVE mostrar um indicador de foco visível com contraste mínimo de 3:1 contra as cores adjacentes.
5. SE um elemento interativo não puder apresentar um indicador de foco visível, ENTÃO O UniCore DEVE remover o elemento da ordem de foco.
6. A Component_Library DEVE documentar o nome acessível, a função e os estados acessíveis de cada componente interativo.
7. QUANDO uma Mensagem_de_Erro for exibida, O Registration_Card DEVE disponibilizar a Mensagem_de_Erro para leitura por tecnologias assistivas.

### Requirement 9: Produzir a documentação normativa do sistema

**User Story:** Como integrante da equipe, quero documentação completa do layout, para que eu possa criar telas futuras alinhadas à identidade própria do portal.

#### Acceptance Criteria

1. O Documentation_Guide DEVE apresentar cada Design_Token com nome, valor, finalidade e exemplo de uso.
2. O Documentation_Guide DEVE apresentar a anatomia, as variantes, os estados, os tamanhos e as regras de conteúdo de cada componente da Component_Library.
3. O Documentation_Guide DEVE apresentar composições originais para página inicial, página de conteúdo e página com formulário.
4. O Documentation_Guide DEVE apresentar as grades, os Breakpoints, a escala de espaçamento e as regras de composição responsiva.
5. O Documentation_Guide DEVE apresentar os Accessibility_Requirement aplicáveis a contraste, foco, teclado, rótulos, imagens, nomes acessíveis, estados e Mensagem_de_Erro.
6. O Documentation_Guide DEVE incluir uma checklist obrigatória de revisão de nova tela com verificações de autoria dos Ativos_do_Projeto, Conteúdo_Neutro, Design_Tokens, componentes, grade, Breakpoints, contraste, foco visível, navegação por teclado, estado ativo de navegação, tratamento de imagens, nomes acessíveis, Mensagem_de_Erro e ausência de rolagem horizontal.
7. QUANDO a equipe revisar uma nova tela, O Documentation_Guide DEVE identificar os componentes e Design_Tokens obrigatórios, os critérios de acessibilidade aplicáveis, os registros de origem exigidos e os itens da checklist que a nova tela deve satisfazer para usar a aparência padrão.
