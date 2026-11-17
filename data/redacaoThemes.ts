/**
 * Banco de temas de redação para o Sprint.
 *
 * ⚠️ INSTRUÇÃO IMPORTANTE — CURADORIA MANUAL OBRIGATÓRIA
 * ─────────────────────────────────────────────────────────────────────────
 * Os temas ENEM (source: 'enem') DEVEM ser verificados manualmente em:
 *   → https://enem.inep.gov.br (edições anteriores)
 *   → https://download.inep.gov.br (redações oficiais)
 *
 * NÃO confie em AI para preencher anos e títulos de temas ENEM.
 * Erro aqui induz o estudante a praticar tema errado.
 *
 * Os temas de treino (source: 'treino') são seguros de usar como está.
 *
 * COMO ADICIONAR TEMAS ENEM:
 * 1. Acesse o portal INEP da edição desejada
 * 2. Baixe o PDF do caderno de questões do Dia 1
 * 3. Copie o título exato do tema (última página da prova)
 * 4. Preencha `year`, `title` e mude `verified: false` → `true`
 * ─────────────────────────────────────────────────────────────────────────
 */

import { RedacaoTheme } from '../types';

export const REDACAO_THEMES: RedacaoTheme[] = [

  // ── Temas ENEM — verificar títulos no portal INEP antes de usar ───────
  // verified: false = título precisa de confirmação na fonte oficial

  {
    id: 'enem-2022',
    title: 'Desafios para a valorização de comunidades e povos tradicionais no Brasil',
    year: 2022,
    axis: 'cultura',
    source: 'enem',
    verified: false,
    context: 'O Brasil abriga enorme diversidade de povos tradicionais: indígenas, quilombolas, ribeirinhos, pescadores artesanais, caiçaras e outros grupos cujos modos de vida estão intimamente ligados ao território. Esses povos enfrentam ameaças como o desmatamento, o avanço do agronegócio sobre suas terras, o racismo estrutural e a invisibilidade nas políticas públicas. A Constituição de 1988 reconheceu direitos coletivos desses grupos, mas a efetivação desses direitos ainda é precária. A valorização dessas culturas inclui a proteção territorial, a garantia de educação diferenciada e o respeito aos seus sistemas de cura, crença e organização social. Para a proposta de intervenção, pense em ações do Estado (demarcação de terras, políticas de saúde diferenciada), da escola (currículo que inclua saberes tradicionais) e da mídia (visibilidade e respeito a essas comunidades).',
  },
  {
    id: 'enem-2021',
    title: 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil',
    year: 2021,
    axis: 'direitos',
    source: 'enem',
    verified: false,
    context: 'O registro civil de nascimento é o primeiro documento que formalmente insere o indivíduo na sociedade e no Estado, sendo pré-requisito para acesso a saúde, educação, trabalho e benefícios sociais. No Brasil, ainda há cidadãos sem registro — especialmente em áreas rurais remotas, comunidades quilombolas e indígenas e regiões ribeirinhas da Amazônia — configurando uma invisibilidade jurídica que perpetua vulnerabilidades. A pandemia de COVID-19 expôs essa exclusão ao dificultar o acesso de muitos brasileiros a auxílios emergenciais por falta de documentação. Causas incluem distância de cartórios, falta de informação, burocracia excessiva e desigualdade socioeconômica. Para a proposta, considere cartórios itinerantes, registro facilitado em hospitais e postos de saúde, campanhas educativas e fortalecimento do Programa Documento Legal do governo federal.',
  },
  {
    id: 'enem-2020',
    title: 'O estigma associado às doenças mentais na sociedade brasileira',
    year: 2020,
    axis: 'saude',
    source: 'enem',
    verified: false,
    context: 'O estigma é uma marca social negativa associada a características consideradas desviantes. No caso das doenças mentais, o estigma leva ao preconceito, à discriminação e ao isolamento social das pessoas afetadas, dificultando a busca por ajuda e o acesso ao tratamento. O Brasil tem alta prevalência de transtornos mentais — ansiedade e depressão estão entre as principais causas de incapacidade. A Reforma Psiquiátrica Brasileira (lei 10.216/2001) representou um avanço ao proibir internações abusivas e promover a reinserção social via Caps (Centros de Atenção Psicossocial), mas o sistema ainda é subfinanciado. O estigma tem raízes históricas, culturais e religiosas. Para a proposta, considere campanhas de letramento em saúde mental, inserção do tema no currículo escolar, ampliação dos serviços de atenção psicossocial e treinamento de profissionais de saúde para abordagem humanizada.',
  },
  {
    id: 'enem-2019',
    title: 'Democratização do acesso ao cinema no Brasil',
    year: 2019,
    axis: 'cultura',
    source: 'enem',
    verified: false,
    context: 'O cinema é uma forma de arte e entretenimento com papel fundamental na construção de identidades, memória coletiva e imaginário social. No Brasil, porém, o acesso ao cinema é profundamente desigual: as salas se concentram em shoppings centers de grandes centros urbanos, tornando-o inacessível para populações periféricas, cidades do interior e classes de menor renda. Com o fechamento de cinemas de rua e o avanço do streaming, essa exclusão se aprofundou para quem não tem internet de qualidade ou equipamentos adequados. A Lei Rouanet e a Ancine financiam parte da produção cultural, mas a distribuição ainda é centralizada. Para a proposta, pense em salas de cinema itinerantes, integração do cinema na rede escolar pública (cinetecas escolares), incentivos fiscais para cinemas em municípios sem salas e ampliação do acesso digital com plataformas públicas de conteúdo cultural.',
  },
  {
    id: 'enem-2018',
    title: 'Manipulação do comportamento do usuário pelo controle de dados na internet',
    year: 2018,
    axis: 'tecnologia',
    source: 'enem',
    verified: false,
    context: 'A internet e as redes sociais coletam grandes volumes de dados sobre o comportamento dos usuários — histórico de buscas, preferências, localização, padrões de consumo. Essas informações são usadas para personalizar conteúdo, publicidade e até informação política, podendo influenciar decisões de compra, votação e comportamento social de forma que o usuário não percebe. Casos como o escândalo Cambridge Analytica, em que dados do Facebook foram usados para influenciar eleições, evidenciaram os riscos democráticos dessa prática. No Brasil, a Lei Geral de Proteção de Dados (LGPD, 2020) é um marco regulatório importante, mas a fiscalização ainda é incipiente. Para a proposta, considere fortalecimento da ANPD (Autoridade Nacional de Proteção de Dados), educação digital nas escolas, transparência algorítmica e mecanismos efetivos de consentimento do usuário.',
  },
  {
    id: 'enem-2017',
    title: 'Desafios para a formação educacional de surdos no Brasil',
    year: 2017,
    axis: 'educacao',
    source: 'enem',
    verified: false,
    context: 'A comunidade surda no Brasil reúne cerca de 10 milhões de pessoas com algum grau de surdez, das quais aproximadamente 2 milhões são surdos profundos. A Língua Brasileira de Sinais (Libras) foi reconhecida como língua oficial em 2002 (Lei 10.436), garantindo às pessoas surdas o direito a uma educação bilíngue. Na prática, a formação de professores habilitados em Libras é insuficiente, a presença de intérpretes nas escolas ainda é limitada e os materiais didáticos adaptados são escassos. A inclusão nas escolas regulares sem suporte adequado pode resultar em exclusão disfarçada. Para a proposta de intervenção, pense em ampliação da formação de professores e intérpretes de Libras, criação de escolas bilíngues para surdos, produção de materiais em Libras e fortalecimento da identidade cultural surda.',
  },
  {
    id: 'enem-2016',
    title: 'Caminhos para combater a intolerância religiosa no Brasil',
    year: 2016,
    axis: 'direitos',
    source: 'enem',
    verified: false,
    context: 'O Brasil é um país de grande diversidade religiosa — convivem catolicismo, protestantismo, religiões de matriz africana (candomblé, umbanda), espiritismo, islamismo, budismo e outras crenças. A Constituição Federal garante a liberdade de crença e o Estado laico. No entanto, casos de intolerância religiosa crescem, especialmente contra religiões de matriz africana: terreiros são depredados, fiéis são agredidos e o preconceito se manifesta cotidianamente. Esse fenômeno está relacionado ao racismo estrutural e à desinformação histórica sobre culturas afro-brasileiras. A Lei 7.716/1989 tipifica a discriminação religiosa como crime, mas os casos têm baixos índices de denúncia e punição. Para a proposta, pense em educação sobre diversidade religiosa nas escolas, treinamento de agentes de segurança pública, incentivo à denúncia e punição efetiva dos crimes de intolerância.',
  },
  {
    id: 'enem-2015',
    title: 'A persistência da violência contra a mulher na sociedade brasileira',
    year: 2015,
    axis: 'direitos',
    source: 'enem',
    verified: false,
    context: 'A violência contra a mulher é um fenômeno estrutural enraizado em desigualdades de gênero históricas. No Brasil, uma mulher é vítima de violência doméstica a cada 12 segundos, segundo dados do DataSenado. A Lei Maria da Penha (11.340/2006) representou um avanço ao criar medidas protetivas, tipificar formas de violência doméstica e psicológica e endurecer punições. Em 2015, o feminicídio foi tipificado como crime hediondo (Lei 13.104). Contudo, os números ainda são alarmantes: o Brasil tem um dos maiores índices de feminicídio do mundo. Barreiras à denúncia incluem dependência econômica, medo de represálias, falta de suporte institucional e naturalização da violência. Para a proposta, considere ampliação de DEAMs (Delegacias Especializadas), casas de acolhimento, políticas de autonomia econômica da mulher, educação de gênero nas escolas e campanhas de conscientização.',
  },

  // ── Temas Treino — por eixo temático ─────────────────────────────────

  // Meio Ambiente
  {
    id: 'treino-ma-1',
    title: 'Desafios para a preservação da Amazônia no século XXI',
    axis: 'meio-ambiente',
    source: 'treino',
    verified: true,
    context: 'A Amazônia é o maior bioma tropical do mundo, abrigando cerca de 20% de toda a biodiversidade do planeta, regulando o ciclo das chuvas no Brasil e contribuindo para o equilíbrio climático global. Apesar de sua importância, a floresta enfrenta ameaças graves: desmatamento por expansão agropecuária e grilagem, exploração ilegal de madeira e mineração, queimadas e invasão de territórios indígenas. O desmatamento na Amazônia já ultrapassou 20% da cobertura original, aproximando-se do chamado "ponto de não retorno". Os povos indígenas e comunidades tradicionais desempenham papel fundamental como guardiões do bioma. Para a proposta de intervenção, pense em: fiscalização ambiental com tecnologia de monitoramento, demarcação e proteção de terras indígenas, punição efetiva de desmatadores, fomento à bioeconomia sustentável (produtos florestais não-madeireiros) e acordos internacionais de financiamento para preservação.',
  },
  {
    id: 'treino-ma-2',
    title: 'O papel da educação ambiental na formação de cidadãos conscientes',
    axis: 'meio-ambiente',
    source: 'treino',
    verified: true,
    context: 'A educação ambiental é reconhecida pela Lei 9.795/1999 como componente essencial e permanente da educação nacional, devendo estar integrada a todas as disciplinas. Ela visa desenvolver a compreensão do meio ambiente como bem comum e a responsabilidade coletiva com a sustentabilidade. No Brasil, sua implementação ainda é desigual: muitas escolas públicas carecem de formação docente adequada, materiais didáticos e projetos práticos. A crise climática — com eventos extremos cada vez mais frequentes — torna urgente a formação de cidadãos críticos e engajados. Além do conteúdo formal, práticas como hortas escolares, coleta seletiva e visitas a unidades de conservação são instrumentos pedagógicos eficazes. Para a proposta, considere: formação continuada de professores em educação ambiental, inserção de projetos práticos de sustentabilidade nas escolas, parceria com ONGs ambientais para programas extracurriculares e incentivo à participação juvenil em conselhos ambientais.',
  },
  {
    id: 'treino-ma-3',
    title: 'Desafios para o enfrentamento da crise hídrica no Brasil',
    axis: 'meio-ambiente',
    source: 'treino',
    verified: true,
    context: 'O Brasil possui cerca de 12% das reservas de água doce do mundo, mas sua distribuição é extremamente desigual: 80% estão na Amazônia, enquanto o Nordeste semiárido sofre com a seca histórica. A crise hídrica é agravada por desperdício (perdas na distribuição chegam a 38% em algumas cidades), poluição de rios e aquíferos, desmatamento em cabeceiras e pelo uso intensivo na agropecuária, que consome cerca de 70% da água doce do país. Grandes cidades como São Paulo e Brasília já viveram racionamentos críticos. Populações periféricas, rurais e indígenas são as mais afetadas pela ausência de saneamento básico — 100 milhões de brasileiros ainda não têm acesso à água tratada. Para a proposta, pense em: investimento em infraestrutura hídrica (cisternas, adutoras), redução de perdas nas redes de distribuição, tarifação progressiva para grandes consumidores, reuso de água na indústria e agricultura e educação sobre consumo consciente.',
  },
  {
    id: 'treino-ma-4',
    title: 'A responsabilidade das empresas na redução do impacto ambiental',
    axis: 'meio-ambiente',
    source: 'treino',
    verified: true,
    context: 'Empresas são responsáveis por parcela significativa das emissões de gases de efeito estufa, geração de resíduos sólidos, poluição de rios e solos e consumo de recursos naturais. Conceitos como ESG (Environmental, Social, Governance), economia circular e relatórios de sustentabilidade ganharam espaço no mundo corporativo, mas sua adoção ainda é superficial em muitos casos — fenômeno chamado de "greenwashing". No Brasil, a legislação ambiental (Lei de Crimes Ambientais, Política Nacional de Resíduos Sólidos) estabelece responsabilidades, mas a fiscalização é insuficiente. Consumidores e investidores têm papel crescente na pressão por mudanças, especialmente via boicotes e desinvestimento. Para a proposta, considere: regulação com metas obrigatórias de redução de emissões, incentivos fiscais para empresas com práticas sustentáveis certificadas, transparência nos relatórios ambientais, punição efetiva de crimes ambientais corporativos e educação do consumidor para escolhas conscientes.',
  },

  // Tecnologia
  {
    id: 'treino-tec-1',
    title: 'O impacto das redes sociais na democracia brasileira',
    axis: 'tecnologia',
    source: 'treino',
    verified: true,
    context: 'As redes sociais revolucionaram a participação política ao ampliar o acesso à informação, facilitar a organização de movimentos sociais e aproximar eleitores e candidatos. No entanto, também potencializaram a disseminação de desinformação, discurso de ódio e polarização. Algoritmos que priorizam conteúdo com alto engajamento tendem a criar "câmaras de eco" — bolhas ideológicas que reforçam crenças sem exposição a visões divergentes. Estudos mostram que notícias falsas se espalham até 70% mais rápido que as verdadeiras. No Brasil, o uso massivo de WhatsApp em campanhas políticas e a circulação de fake news foram investigados como fatores de desequilíbrio eleitoral. O TSE tem atuado na regulação, mas os desafios persistem. Para a proposta, pense em: regulação das plataformas digitais (exigência de transparência algorítmica), letramento midiático e digital nas escolas, fortalecimento de agências de fact-checking e responsabilização de quem cria e dissemina desinformação.',
  },
  {
    id: 'treino-tec-2',
    title: 'Inteligência artificial e o futuro do trabalho no Brasil',
    axis: 'tecnologia',
    source: 'treino',
    verified: true,
    context: 'A inteligência artificial está transformando o mercado de trabalho global com velocidade sem precedentes, automatizando tarefas repetitivas físicas e cognitivas. Estima-se que no Brasil cerca de 54% dos empregos têm alto potencial de automação, especialmente nas áreas de manufatura, transporte, atendimento ao cliente e serviços financeiros. Ao mesmo tempo, a IA cria novas profissões e demanda habilidades como pensamento crítico, criatividade e capacidade de trabalhar com sistemas inteligentes. O risco é que a transição aprofunde desigualdades: trabalhadores com menor escolaridade e acesso à tecnologia são os mais vulneráveis. No Brasil, a ausência de uma política nacional robusta de requalificação profissional agrava o problema. Para a proposta, pense em: programas públicos de requalificação profissional com foco em habilidades digitais, integração curricular da educação tecnológica desde o ensino básico, regulação da IA para proteger direitos trabalhistas e fundo de transição financiado por empresas que se automatizem.',
  },
  {
    id: 'treino-tec-3',
    title: 'Fake news e o desafio da desinformação na era digital',
    axis: 'tecnologia',
    source: 'treino',
    verified: true,
    context: 'A desinformação — conteúdo falso ou enganoso difundido intencionalmente — ganhou escala industrial com as redes sociais e aplicativos de mensagens. No Brasil, o fenômeno ficou evidente durante a pandemia de COVID-19, quando teorias sobre tratamentos ineficazes e desincentivo à vacinação custaram vidas. A desinformação pode ser motivada por interesses políticos, econômicos ou simplesmente pelo engajamento emocional. Pesquisas indicam que notícias falsas exploram emoções como medo, raiva e indignação. Agências de fact-checking como Agência Lupa, AosFatos e Estadão Verifica atuam no combate, mas têm alcance limitado diante do volume de conteúdo. A LGPD e o Marco Civil da Internet estabelecem algumas responsabilidades, mas a regulação de plataformas ainda é insuficiente. Para a proposta, pense em: letramento midiático e digital obrigatório na educação básica, responsabilização das plataformas pelo conteúdo que amplificam, fortalecimento do jornalismo independente e incentivo à cultura de verificação antes de compartilhar.',
  },
  {
    id: 'treino-tec-4',
    title: 'A dependência tecnológica e seus efeitos na saúde mental',
    axis: 'tecnologia',
    source: 'treino',
    verified: true,
    context: 'O uso excessivo de smartphones e redes sociais está associado a crescimento dos índices de ansiedade, depressão, solidão e distúrbios do sono, especialmente entre adolescentes. Jovens brasileiros passam em média mais de 9 horas diárias conectados a telas. As plataformas digitais são projetadas para maximizar o tempo de uso: notificações, rolagem infinita, curtidas e sistemas de recompensa variável ativam os mesmos circuitos neurais de dependência. Fenômenos como FOMO (Fear of Missing Out), comparação social constante e cyberbullying agravam o quadro. A OMS reconheceu o "transtorno de jogos online" como distúrbio de saúde mental em 2018. Para a proposta, considere: regulação do design viciante das plataformas (especialmente para menores de idade), educação digital nas escolas com foco em uso crítico e saudável, programas de saúde mental nas escolas, orientação a famílias para estabelecer limites saudáveis e garantia de espaços físicos de socialização para jovens.',
  },

  // Sociedade
  {
    id: 'treino-soc-1',
    title: 'O papel da família na formação de valores éticos dos jovens',
    axis: 'sociedade',
    source: 'treino',
    verified: true,
    context: 'A família é o primeiro e mais importante agente de socialização humana, responsável pela transmissão de valores, normas de convivência e visão de mundo. No Brasil contemporâneo, as configurações familiares tornaram-se diversas — famílias monoparentais, homoafetivas, reconstituídas, multigeracionais —, o que também diversifica os modelos de formação. Pesquisas indicam que a qualidade do vínculo afetivo e o diálogo aberto são mais determinantes para a formação ética do que a estrutura familiar em si. No entanto, a família não age sozinha: a escola, a mídia, os grupos de amigos e as redes sociais também influenciam profundamente os jovens. Situações de violência doméstica, negligência e falta de tempo de qualidade comprometem a formação saudável. Para a proposta, pense em: programas de apoio às famílias vulneráveis (centros de referência de assistência social), formação em competências parentais, parceria ativa entre escola e família, e políticas de redução da desigualdade que diminuam o estresse familiar associado à pobreza.',
  },
  {
    id: 'treino-soc-2',
    title: 'Desafios para a erradicação do trabalho infantil no Brasil',
    axis: 'sociedade',
    source: 'treino',
    verified: true,
    context: 'O trabalho infantil priva crianças e adolescentes do direito ao desenvolvimento pleno, à educação, à saúde e ao lazer, além de causar danos físicos e psicológicos duradouros. No Brasil, apesar de avanços nas últimas décadas, ainda há cerca de 1,7 milhão de crianças e adolescentes em situação de trabalho infantil, concentrados especialmente no setor agrícola, no trabalho doméstico e em atividades urbanas informais. A pobreza é o principal fator de risco — famílias empurram filhos ao trabalho por necessidade de renda —, mas também contribuem a naturalização cultural em certas regiões ("é melhor trabalhar que ficar na rua") e a fiscalização insuficiente. A Constituição proíbe trabalho a menores de 16 anos (salvo aprendiz a partir de 14). Programas como o PETI e o Bolsa Família são ferramentas importantes de proteção. Para a proposta, considere: ampliação da transferência de renda condicionada à frequência escolar, escola em tempo integral como alternativa ao trabalho, fiscalização de empresas que usam fornecedores com trabalho infantil e campanhas de conscientização nas comunidades de risco.',
  },
  {
    id: 'treino-soc-3',
    title: 'O envelhecimento da população brasileira e os desafios para a previdência',
    axis: 'sociedade',
    source: 'treino',
    verified: true,
    context: 'O Brasil passa por uma transição demográfica acelerada: a expectativa de vida supera 76 anos e a taxa de fecundidade caiu para 1,7 filho por mulher. Projeta-se que em 2060 mais de 32% da população terá 60 anos ou mais — hoje são cerca de 15%. Esse fenômeno exerce pressão crescente sobre o sistema previdenciário (maior relação beneficiários/contribuintes), os serviços de saúde (aumento de doenças crônicas) e a assistência social (cuidados de longa duração). A Reforma da Previdência de 2019 aumentou as idades mínimas de aposentadoria como resposta parcial. Além da previdência, surgem demandas por lares de longa permanência, cuidadores profissionais, adaptação urbana para mobilidade reduzida e reinserção de idosos no mercado de trabalho. Para a proposta, pense em: regulação e financiamento adequado do sistema previdenciário, políticas de saúde preventiva para reduzir custos futuros, programas de qualificação e incentivo à contratação de trabalhadores mais velhos e expansão de centros-dia e serviços de cuidado domiciliar.',
  },
  {
    id: 'treino-soc-4',
    title: 'Desafios para a integração de refugiados na sociedade brasileira',
    axis: 'sociedade',
    source: 'treino',
    verified: true,
    context: 'O Brasil é signatário da Convenção de 1951 sobre o Estatuto dos Refugiados e tem histórico de acolhimento humanitário. Nos últimos anos, o país recebeu fluxos significativos de refugiados sírios, haitianos e venezuelanos — estes últimos concentrados especialmente em Roraima, criando desafios humanitários agudos. A Lei de Migração de 2017 (Lei 13.445) representou avanço ao tratar migrantes com base em direitos humanos. No entanto, a integração enfrenta barreiras concretas: preconceito e xenofobia da população local, dificuldades com o idioma, não reconhecimento de diplomas e qualificações, acesso limitado ao mercado formal de trabalho e ausência de políticas locais robustas de acolhimento. O CONARE (Comitê Nacional para os Refugiados) e o ACNUR (Agência da ONU para Refugiados) atuam no suporte, mas com recursos limitados. Para a proposta, pense em: programas de acolhimento e ensino de português, mecanismos ágeis de reconhecimento de diplomas, parceria com empresas para inclusão no mercado de trabalho, combate à xenofobia e fortalecimento institucional do CONARE.',
  },

  // Saúde
  {
    id: 'treino-sau-1',
    title: 'Desafios para o fortalecimento do Sistema Único de Saúde no Brasil',
    axis: 'saude',
    source: 'treino',
    verified: true,
    context: 'O SUS é um dos maiores sistemas de saúde pública do mundo, garantindo atendimento universal e gratuito a mais de 200 milhões de brasileiros. Suas conquistas incluem o Programa Nacional de Imunizações (um dos maiores do mundo), o controle de endemias, a política de medicamentos genéricos e os programas de transplantes. No entanto, o sistema enfrenta subfinanciamento crônico — o Brasil investe menos de 4% do PIB em saúde pública, enquanto países com sistemas similares investem 7-8% — superlotação de hospitais, desigualdades regionais absurdas (Norte e Nordeste têm muito menos médicos por habitante que Sul e Sudeste) e escassez de profissionais de saúde em áreas remotas. A Emenda Constitucional 95 (teto de gastos, 2016) limitou os investimentos por 20 anos. Para a proposta, pense em: financiamento adequado e progressivo ao SUS, expansão e valorização da atenção primária (postos de saúde e agentes comunitários), telemedicina para áreas remotas, formação de médicos com foco em medicina de família e redução das desigualdades regionais.',
  },
  {
    id: 'treino-sau-2',
    title: 'O impacto da pandemia na saúde mental dos brasileiros',
    axis: 'saude',
    source: 'treino',
    verified: true,
    context: 'A pandemia de COVID-19 desencadeou uma crise secundária de saúde mental de proporções históricas. O isolamento social, o luto coletivo por mais de 700 mil mortes no Brasil, o medo, as dificuldades econômicas e a sobrecarga extrema de profissionais de saúde elevaram significativamente os índices de ansiedade, depressão e estresse pós-traumático. Grupos já vulneráveis — profissionais de saúde, idosos, populações em situação de pobreza, crianças e adolescentes — foram os mais afetados. O Brasil já enfrentava uma crise de saúde mental antes da pandemia: era o país com maior prevalência de ansiedade do mundo. O acesso ao atendimento psicológico e psiquiátrico é profundamente desigual, restrito na prática às camadas com maior renda. Para a proposta, considere: ampliação dos CAPS (Centros de Atenção Psicossocial), implementação de telepsicologia no SUS, inserção de apoio psicológico nas escolas (psicólogos escolares), campanhas de redução do estigma e formação de médicos generalistas para identificar e tratar transtornos mentais comuns.',
  },
  {
    id: 'treino-sau-3',
    title: 'Desafios para o enfrentamento das doenças negligenciadas no Brasil',
    axis: 'saude',
    source: 'treino',
    verified: true,
    context: 'Doenças negligenciadas são infecções tropicais que afetam predominantemente populações em situação de pobreza extrema, recebendo pouco investimento em pesquisa e tratamento por não constituírem mercado lucrativo para a indústria farmacêutica. No Brasil, ainda circulam dengue, doença de Chagas, hanseníase, leishmaniose visceral, esquistossomose e filariose linfática, especialmente nas regiões Norte e Nordeste. O Brasil lidera o número de casos de hanseníase nas Américas. A falta de saneamento básico, o acesso precário à saúde primária, a desnutrição e a habitação precária são condições estruturais que favorecem essas doenças. A pandemia de COVID-19 prejudicou os programas de controle já existentes. Para a proposta, pense em: investimento em saneamento básico universal (fator mais efetivo de controle), ampliação da cobertura de agentes comunitários de saúde, parcerias público-privadas para pesquisa de novos tratamentos, e campanhas educativas nas regiões endêmicas.',
  },

  // Educação
  {
    id: 'treino-edu-1',
    title: 'Desafios para a superação do analfabetismo funcional no Brasil',
    axis: 'educacao',
    source: 'treino',
    verified: true,
    context: 'O analfabetismo funcional descreve a incapacidade de usar leitura, escrita e cálculo em situações cotidianas de forma plena e eficaz, mesmo que a pessoa consiga reconhecer letras. Segundo o Inaf (Indicador de Analfabetismo Funcional), cerca de 29% da população adulta brasileira é funcionalmente analfabeta. Esse fenômeno compromete o exercício da cidadania, o acesso a empregos qualificados, a compreensão de contratos, bulas e direitos básicos. As causas incluem baixa qualidade do ensino nas redes públicas, evasão escolar precoce por trabalho infantil e necessidade econômica, falta de estímulo à leitura em casa e ausência de bibliotecas acessíveis. O problema é mais grave no Nordeste e entre populações negras, rurais e de menor renda. Para a proposta, pense em: formação de professores alfabetizadores, programas de Educação de Jovens e Adultos (EJA) de qualidade, bibliotecas comunitárias e escolares, projetos de leitura nas escolas e avaliações diagnósticas para identificar alunos com dificuldades precocemente.',
  },
  {
    id: 'treino-edu-2',
    title: 'O papel do ensino técnico na redução das desigualdades sociais',
    axis: 'educacao',
    source: 'treino',
    verified: true,
    context: 'A educação profissional e tecnológica é um instrumento potente de inclusão socioeconômica, habilitando jovens ao mercado de trabalho com menor tempo de formação que o ensino superior. O Brasil conta com uma rede de Institutos Federais (IFs) com mais de 650 câmpus em todo o território nacional, além de redes estaduais e o Sistema S (Senai, Senac, Senar). No entanto, o acesso ainda é desigual: os IFs concentram vagas em municípios maiores e enfrentam disputas por vagas muito acirradas. Estudos mostram que egressos do ensino técnico têm taxa de empregabilidade significativamente superior à da educação geral, com salários iniciais mais altos. O Ensino Médio integrado — que une formação técnica e propedêutica — é uma proposta promissora mas subutilizada. Para a proposta, pense em: expansão dos IFs para municípios menores e periferias, maior oferta de bolsas para estudantes de baixa renda (Pronatec), parcerias com empresas para estágios e emprego, e integração do ensino técnico ao ensino médio regular.',
  },
  {
    id: 'treino-edu-3',
    title: 'Desafios para a inclusão de pessoas com deficiência nas escolas brasileiras',
    axis: 'educacao',
    source: 'treino',
    verified: true,
    context: 'A Constituição Federal de 1988 e a Lei Brasileira de Inclusão (LBI, 2015) garantem às pessoas com deficiência o direito à educação inclusiva em escolas regulares com apoio especializado. Na prática, porém, a inclusão é frequentemente superficial: muitas escolas carecem de infraestrutura acessível (rampas, banheiros adaptados), materiais pedagógicos em formatos acessíveis (braille, audiodescrição, libras), intérpretes de Libras e professores capacitados para atender alunos com diferentes necessidades. O Censo Escolar registra crescimento nas matrículas de alunos com deficiência em escolas regulares, mas o que ocorre dentro da sala de aula nem sempre é inclusivo. Alunos surdos sem intérprete, cegos sem material adaptado e autistas sem apoio especializado podem estar "presentes mas ausentes". Para a proposta, considere: formação continuada de professores em educação inclusiva, provisão de recursos de tecnologia assistiva, contratação de profissionais de apoio especializado, adequação arquitetônica das escolas e monitoramento da qualidade da inclusão.',
  },

  // Direitos
  {
    id: 'treino-dir-1',
    title: 'O avanço do racismo estrutural e os desafios para sua superação',
    axis: 'direitos',
    source: 'treino',
    verified: true,
    context: 'O racismo estrutural descreve como práticas, normas e instituições sociais reproduzem sistematicamente desvantagens para grupos racializados, independentemente da intenção individual de discriminar. No Brasil, herança de mais de 300 anos de escravidão e da ausência de políticas de reparação pós-abolição, o racismo se manifesta em dados concretos: negros e pardos (56% da população) representam 75% das vítimas de homicídio, têm renda média 41% menor que brancos e são maioria entre os desempregados e encarcerados. Políticas de cotas raciais em universidades (lei 12.711/2012) e no serviço público representaram avanços importantes, com resultados comprovados na redução da desigualdade educacional. O racismo também opera no cotidiano — abordagens policiais, negações de emprego, invisibilidade na mídia. Para a proposta, pense em: ampliação e fortalecimento das cotas, educação antirracista desde a infância (lei 10.639/2003 sobre história afro-brasileira), representatividade nas instituições, punição efetiva de crimes de racismo e valorização da cultura afro-brasileira e indígena.',
  },
  {
    id: 'treino-dir-2',
    title: 'Desafios para a garantia dos direitos da pessoa com deficiência no Brasil',
    axis: 'direitos',
    source: 'treino',
    verified: true,
    context: 'O Brasil possui legislação avançada sobre direitos das pessoas com deficiência: a Convenção da ONU sobre os Direitos das Pessoas com Deficiência (ratificada em 2008) e a Lei Brasileira de Inclusão (LBI, 2015) estabelecem um arcabouço robusto. No entanto, a efetivação desses direitos é precária. Cerca de 18,6 milhões de brasileiros têm alguma deficiência (Censo IBGE 2022). Barreiras concretas incluem: inacessibilidade de espaços públicos e transportes (calçadas quebradas, falta de elevadores, ônibus sem rampas), mercado de trabalho restrito — a cota de 2% a 5% para PCDs em empresas com mais de 100 funcionários é frequentemente descumprida —, acesso limitado à saúde especializada e à educação inclusiva de qualidade. Preconceito e baixas expectativas sociais também limitam a autonomia das pessoas com deficiência. Para a proposta, considere: fiscalização efetiva das cotas de emprego, investimento em acessibilidade universal nos espaços públicos, ampliação de serviços de reabilitação no SUS, tecnologia assistiva acessível e campanhas de conscientização sobre inclusão.',
  },
  {
    id: 'treino-dir-3',
    title: 'A violência doméstica e os desafios para a proteção da mulher',
    axis: 'direitos',
    source: 'treino',
    verified: true,
    context: 'A violência doméstica é um fenômeno estrutural enraizado em relações de poder desiguais de gênero, naturalizado por séculos de cultura patriarcal. No Brasil, uma mulher sofre agressão a cada 12 segundos. A Lei Maria da Penha (11.340/2006) é considerada uma das legislações mais avançadas do mundo sobre o tema, criando medidas protetivas de urgência, tipificando formas de violência doméstica (física, psicológica, patrimonial, moral, sexual) e estabelecendo Juizados Especiais. Em 2015, o feminicídio foi tipificado como crime hediondo. Apesar desses avanços legais, os números de feminicídio cresceram: o Brasil registra mais de 1.400 feminicídios por ano. Barreiras à denúncia incluem dependência econômica, medo de represálias, dificuldade de acesso aos serviços de proteção e, em muitos casos, normalização da violência pela própria vítima. Para a proposta, pense em: ampliação de DEAMs (Delegacias Especializadas em Atendimento à Mulher), casas de abrigo com capacidade suficiente, políticas de autonomia econômica da mulher, educação de gênero desde o ensino básico e campanhas que incentivem denúncias e rompam a cultura do silêncio.',
  },

  // Economia
  {
    id: 'treino-eco-1',
    title: 'Desafios para o empreendedorismo jovem no Brasil',
    axis: 'economia',
    source: 'treino',
    verified: true,
    context: 'O empreendedorismo é visto como uma saída para o desemprego juvenil e como motor de inovação e desenvolvimento. No Brasil, a taxa de desemprego entre jovens de 18 a 24 anos supera 20%, o dobro da média geral. Ao mesmo tempo, abrir e manter um negócio no país é desafiador: o Brasil ocupa posições baixas nos rankings de facilidade para fazer negócios. Os obstáculos incluem burocracia excessiva (abertura de empresas pode levar semanas), alta carga tributária, dificuldade de acesso a crédito (juros elevados para micro e pequenos negócios), falta de capacitação em gestão e desigualdade de acesso ao ecossistema de inovação. O MEI (Microempreendedor Individual) simplificou a formalização para negócios menores, mas 60% dos MEIs têm dificuldade de crescimento. Para a proposta, pense em: desburocratização do processo de abertura de empresas, linhas de microcrédito com juros acessíveis para jovens de baixa renda, programas de mentoria e capacitação em gestão (via SEBRAE e institutos técnicos), educação empreendedora nas escolas e políticas de apoio a startups sociais.',
  },
  {
    id: 'treino-eco-2',
    title: 'O impacto da informalidade no mercado de trabalho brasileiro',
    axis: 'economia',
    source: 'treino',
    verified: true,
    context: 'O trabalho informal — sem carteira assinada, sem recolhimento de FGTS e INSS, sem acesso a férias, 13º salário ou seguro-desemprego — afeta cerca de 40% dos trabalhadores brasileiros, cerca de 38 milhões de pessoas. A informalidade é maior entre negros, mulheres, jovens, trabalhadores de baixa escolaridade e nas regiões Norte e Nordeste. Embora ofereça alguma flexibilidade, a informalidade priva os trabalhadores de proteção social, especialmente na velhice (sem aposentadoria) e em momentos de crise. A pandemia de COVID-19 agravou o problema: o trabalho por plataformas digitais (entregadores e motoristas de aplicativo) criou uma nova categoria de trabalhadores informais em escala. A Reforma Trabalhista de 2017 gerou debate sobre se facilitou ou aprofundou a precarização. Para a proposta, pense em: regulação específica das plataformas de trabalho digital com proteção social mínima, incentivos fiscais para formalização de micro e pequenas empresas, ampliação da cobertura do seguro-desemprego para trabalhadores informais e programas de capacitação para inserção no mercado formal.',
  },

  // Cultura
  {
    id: 'treino-cul-1',
    title: 'O papel do patrimônio histórico na construção da identidade nacional',
    axis: 'cultura',
    source: 'treino',
    verified: true,
    context: 'O patrimônio histórico e cultural é o conjunto de bens materiais (edificações, sítios arqueológicos, documentos) e imateriais (festas, culinária, línguas, músicas, saberes tradicionais) que uma sociedade reconhece como expressão de sua memória e identidade. No Brasil, o IPHAN (Instituto do Patrimônio Histórico e Artístico Nacional) é responsável pela proteção desses bens, que incluem centros históricos como Ouro Preto e Olinda, manifestações como capoeira, frevo, samba e artesanato indígena. O incêndio do Museu Nacional em 2018, que destruiu acervo de 200 anos, evidenciou o descaso do poder público com a preservação. Além da falta de investimento, o patrimônio enfrenta especulação imobiliária, vandalismo e a invisibilidade de bens de grupos historicamente marginalizados. Para a proposta, pense em: financiamento público adequado para preservação, educação patrimonial nas escolas, uso de tecnologia para digitalização e acesso virtual a acervos, reconhecimento de patrimônios culturais de comunidades afro-brasileiras e indígenas e parcerias entre poder público, empresas e sociedade civil.',
  },
  {
    id: 'treino-cul-2',
    title: 'Desafios para a valorização das culturas indígenas no Brasil',
    axis: 'cultura',
    source: 'treino',
    verified: true,
    context: 'O Brasil abriga 305 etnias indígenas com 274 idiomas distintos, representando uma diversidade cultural e linguística ímpar. No entanto, esses povos enfrentam ameaças à sua existência cultural e física: invasão de terras, garimpo ilegal, violência, pressão para abandonar línguas e práticas tradicionais e aculturação forçada por agentes religiosos e econômicos. A Constituição de 1988 reconheceu pela primeira vez os direitos originários dos povos indígenas, incluindo a posse de suas terras. O território é a base da reprodução cultural, espiritual e econômica dessas comunidades — sem terra, não há cultura. A demarcação de terras é o mecanismo mais eficaz de proteção, mas está em disputa permanente com interesses do agronegócio e mineração. Línguas indígenas desaparecem: das 1.300 existentes no século XVI, restam cerca de 274. Para a proposta, pense em: aceleração das demarcações de terras, políticas de educação escolar indígena diferenciada (com ensino em língua materna), criação e fortalecimento de museus e centros culturais indígenas, proteção jurídica do conhecimento tradicional e valorização pública dessas culturas na mídia e nos currículos escolares.',
  },
  {
    id: 'treino-cul-3',
    title: 'A valorização da leitura como instrumento de cidadania',
    axis: 'cultura',
    source: 'treino',
    verified: true,
    context: 'A leitura é uma ferramenta de emancipação intelectual e exercício pleno da cidadania: forma o senso crítico, amplia o repertório cultural e capacita o indivíduo a interpretar o mundo e os próprios direitos. No Brasil, os índices de leitura ainda são baixos — boa parte da população lê pouco ou nenhum livro por ano fora da obrigação escolar. As causas incluem a baixa oferta de bibliotecas públicas, o preço elevado dos livros, a ausência de estímulo familiar e a concorrência das telas. A leitura por prazer, quando incentivada desde a infância, está associada a melhor desempenho escolar e maior mobilidade social. Para a proposta, pense em: ampliação e modernização de bibliotecas comunitárias e escolares, programas de mediação de leitura nas escolas, distribuição de acervos acessíveis, incentivos fiscais ao mercado editorial popular e campanhas culturais que aproximem a leitura do cotidiano dos jovens.',
  },

  // Economia
  {
    id: 'treino-eco-3',
    title: 'Desafios para a inclusão financeira da população de baixa renda',
    axis: 'economia',
    source: 'treino',
    verified: true,
    context: 'A inclusão financeira — acesso a contas, crédito, poupança e meios de pagamento — é condição para que famílias planejem o futuro, enfrentem imprevistos e construam patrimônio. No Brasil, milhões de pessoas ainda estão à margem do sistema financeiro formal ou dependem de crédito informal com juros abusivos. A expansão de bancos digitais, do Pix e de contas simplificadas ampliou o acesso, mas persistem barreiras: baixa educação financeira, desconfiança em relação a instituições, endividamento por crédito caro (cartão e cheque especial) e exclusão digital. O superendividamento das famílias atingiu níveis recordes nos últimos anos. Para a proposta, pense em: educação financeira nas escolas e em programas comunitários, regulação de juros abusivos, expansão de microcrédito orientado, ampliação do acesso digital e proteção ao consumidor superendividado.',
  },
  {
    id: 'treino-eco-4',
    title: 'O impacto da concentração de renda no desenvolvimento social brasileiro',
    axis: 'economia',
    source: 'treino',
    verified: true,
    context: 'O Brasil é um dos países mais desiguais do mundo em distribuição de renda: uma pequena parcela da população concentra fatia desproporcional da riqueza nacional, enquanto milhões vivem em situação de pobreza. Essa concentração limita o desenvolvimento social, reduz a mobilidade entre classes, sobrecarrega serviços públicos e enfraquece o mercado interno. Suas raízes são históricas — escravidão, ausência de reforma agrária, sistema tributário regressivo que cobra proporcionalmente mais dos mais pobres. A desigualdade se reproduz no acesso à educação de qualidade, saúde, moradia e oportunidades de trabalho. Para a proposta, pense em: reforma tributária que torne a cobrança mais progressiva, investimento em educação pública de qualidade, políticas de transferência de renda condicionada, fortalecimento do salário mínimo e ampliação do acesso a serviços públicos essenciais.',
  },

  // Meio Ambiente
  {
    id: 'treino-ma-5',
    title: 'Os desafios da gestão de resíduos sólidos nas cidades brasileiras',
    axis: 'meio-ambiente',
    source: 'treino',
    verified: true,
    context: 'A produção de resíduos sólidos cresce com a urbanização e o consumo, mas a maioria das cidades brasileiras ainda não dá destinação adequada ao lixo. Lixões a céu aberto persistem em milhares de municípios, contaminando solo e lençóis freáticos, apesar de a Política Nacional de Resíduos Sólidos (Lei 12.305/2010) prever sua extinção. A coleta seletiva é incipiente e a reciclagem no país é baixa, embora exista uma extensa rede de catadores que cumpre papel ambiental e social essencial — muitas vezes sem reconhecimento ou condições dignas de trabalho. O consumo de descartáveis e a obsolescência programada agravam o volume gerado. Para a proposta, pense em: universalização da coleta seletiva, valorização e formalização dos catadores em cooperativas, incentivos à logística reversa pelas empresas, educação ambiental sobre consumo e descarte e construção de aterros sanitários adequados.',
  },

  // Tecnologia
  {
    id: 'treino-tec-5',
    title: 'Os desafios da inclusão digital no Brasil',
    axis: 'tecnologia',
    source: 'treino',
    verified: true,
    context: 'O acesso à internet tornou-se condição para estudar, trabalhar, acessar serviços públicos e exercer a cidadania — mas no Brasil esse acesso é desigual. Milhões de pessoas, sobretudo em áreas rurais, periferias e regiões Norte e Nordeste, não têm conexão de qualidade ou dispositivos adequados. A pandemia de COVID-19 expôs essa "exclusão digital" quando o ensino remoto deixou para trás estudantes sem internet ou computador. Além do acesso físico, há a barreira do letramento digital: saber usar as ferramentas de forma crítica e produtiva. A exclusão digital aprofunda outras desigualdades, restringindo oportunidades de emprego e educação. Para a proposta, pense em: expansão da infraestrutura de banda larga a regiões remotas, programas de distribuição de dispositivos a estudantes de baixa renda, oferta de internet pública gratuita em espaços comunitários e formação em letramento digital nas escolas.',
  },

  // Sociedade
  {
    id: 'treino-soc-5',
    title: 'O combate à fome e à insegurança alimentar no Brasil',
    axis: 'sociedade',
    source: 'treino',
    verified: true,
    context: 'A fome voltou a ser uma realidade para milhões de brasileiros, com parcela significativa da população convivendo com algum grau de insegurança alimentar. A insegurança alimentar não significa apenas ausência de comida, mas também a incerteza sobre a próxima refeição e o consumo de alimentos de baixa qualidade nutricional. Suas causas combinam desemprego, inflação dos alimentos, desigualdade de renda e enfraquecimento de políticas públicas de segurança alimentar. O Brasil já chegou a sair do Mapa da Fome da ONU, demonstrando que o problema tem solução com políticas adequadas. Programas como a alimentação escolar e a aquisição de alimentos da agricultura familiar são instrumentos importantes. Para a proposta, pense em: fortalecimento de programas de transferência de renda, apoio à agricultura familiar, ampliação da alimentação escolar, criação de restaurantes populares e combate ao desperdício de alimentos.',
  },
  {
    id: 'treino-soc-6',
    title: 'Mobilidade urbana e qualidade de vida nas cidades brasileiras',
    axis: 'sociedade',
    source: 'treino',
    verified: true,
    context: 'O modelo de mobilidade das cidades brasileiras, centrado no transporte individual motorizado, gera congestionamentos crônicos, poluição do ar, acidentes de trânsito e perda de horas produtivas. O transporte público, especialmente nas periferias, costuma ser caro, lotado e demorado, penalizando os trabalhadores de menor renda que dependem dele. A falta de infraestrutura para pedestres e ciclistas desincentiva alternativas sustentáveis. A mobilidade precária afeta diretamente a qualidade de vida, o acesso a empregos, saúde e lazer, além de aprofundar a segregação socioespacial. A Política Nacional de Mobilidade Urbana (Lei 12.587/2012) prioriza o transporte coletivo e os modos não motorizados, mas sua implementação é lenta. Para a proposta, pense em: investimento e subsídio ao transporte público de qualidade, criação de ciclovias e calçadas acessíveis, integração entre modais e planejamento urbano que aproxime moradia e trabalho.',
  },

  // Saúde
  {
    id: 'treino-sau-4',
    title: 'A importância da vacinação para a saúde coletiva no Brasil',
    axis: 'saude',
    source: 'treino',
    verified: true,
    context: 'A vacinação é uma das estratégias de saúde pública mais eficazes da história, responsável pela erradicação da varíola e pelo controle de doenças como poliomielite, sarampo e rubéola. O Programa Nacional de Imunizações brasileiro já foi referência mundial em cobertura gratuita e universal. Nos últimos anos, porém, as taxas de vacinação caíram abaixo das metas, levando ao retorno de doenças antes controladas. Esse recuo combina desinformação e movimentos antivacina amplificados pelas redes sociais, falsa sensação de segurança, dificuldades de acesso a postos de saúde e fragilidade das campanhas educativas. A imunização depende da chamada imunidade coletiva: quando muitos se vacinam, protegem inclusive quem não pode tomar a vacina. Para a proposta, pense em: combate à desinformação com campanhas educativas, ampliação de horários e locais de vacinação, busca ativa de não vacinados pelos agentes de saúde e inserção do tema nas escolas.',
  },

  // Educação
  {
    id: 'treino-edu-4',
    title: 'Os impactos da evasão escolar no ensino médio brasileiro',
    axis: 'educacao',
    source: 'treino',
    verified: true,
    context: 'A evasão escolar no ensino médio é um dos maiores gargalos da educação brasileira: parte significativa dos jovens que ingressam não conclui essa etapa. Entre as causas estão a necessidade de trabalhar para complementar a renda familiar, a gravidez na adolescência, a falta de identificação com um currículo distante da realidade do aluno, a baixa qualidade do ensino e a violência. A evasão compromete o futuro desses jovens, reduzindo oportunidades de emprego qualificado e perpetuando o ciclo de pobreza e desigualdade. O período da pandemia agravou o problema, com muitos estudantes abandonando os estudos durante o ensino remoto. Para a proposta, pense em: ampliação da escola em tempo integral, currículo mais conectado a projetos de vida e ao mundo do trabalho, transferência de renda condicionada à permanência escolar, apoio socioemocional aos estudantes e busca ativa dos que abandonaram a escola.',
  },

  // Direitos
  {
    id: 'treino-dir-4',
    title: 'Caminhos para o combate à LGBTfobia na sociedade brasileira',
    axis: 'direitos',
    source: 'treino',
    verified: true,
    context: 'A população LGBTQIA+ enfrenta no Brasil altos índices de violência, discriminação e exclusão, em um país que registra um dos maiores números de mortes violentas dessa comunidade no mundo. A LGBTfobia se manifesta em agressões físicas, no preconceito no ambiente de trabalho e escolar, na rejeição familiar e na invisibilidade de direitos. Em 2019, o Supremo Tribunal Federal enquadrou a homofobia e a transfobia como crimes equiparáveis ao racismo, um avanço jurídico importante, mas a efetivação da proteção ainda é frágil. A ausência de uma legislação específica federal e a baixa notificação dos casos dificultam o enfrentamento. A escola e a família, quando acolhedoras, são fatores de proteção decisivos. Para a proposta, pense em: educação para a diversidade e o respeito desde o ensino básico, capacitação de agentes de segurança e saúde, criação de canais seguros de denúncia, políticas de inclusão no mercado de trabalho e campanhas de conscientização social.',
  },
];

export const AXIS_LABELS: Record<string, string> = {
  'meio-ambiente': 'Meio Ambiente',
  'tecnologia':    'Tecnologia',
  'sociedade':     'Sociedade',
  'saude':         'Saúde',
  'educacao':      'Educação',
  'direitos':      'Direitos',
  'economia':      'Economia',
  'cultura':       'Cultura',
  'treino':        'Treino Geral',
};

export const AXIS_COLORS: Record<string, string> = {
  'meio-ambiente': '#10b981',
  'tecnologia':    '#6366f1',
  'sociedade':     '#f59e0b',
  'saude':         '#ef4444',
  'educacao':      '#3b82f6',
  'direitos':      '#8b5cf6',
  'economia':      '#06b6d4',
  'cultura':       '#f97316',
  'treino':        '#6b7280',
};
