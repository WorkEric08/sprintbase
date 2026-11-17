# Sprint Base

**Sprint Base** é um aplicativo de organização de estudos para estudantes em geral. A ideia é simples: você divide seu tempo em **blocos de estudo**, executa cada bloco com um cronômetro e acompanha, de forma visual, quanto já estudou. Tudo com um método ágil, fácil de entender e acessível a qualquer público.

Não precisa de conta, de internet nem de servidor: os dados ficam salvos no próprio dispositivo.

## Experimente agora (sem instalar nada)

**[sprintbase-fawn.vercel.app](https://sprintbase-fawn.vercel.app/)** — a versão web funciona em qualquer navegador, no celular ou no computador, e também pode ser instalada como aplicativo pela opção "Adicionar à tela inicial" do navegador. Ela e o aplicativo Android são o mesmo programa, mas guardam os dados separadamente: para levar o histórico de um para o outro, use o backup em **Ajustes → Seus dados**.

## Baixar o app (Android)

A versão mais recente do aplicativo está na página de **[Releases](https://github.com/WorkEric08/sprintbase/releases/latest)**: baixe o arquivo **`Sprint.apk`** (ou use o [link direto](https://github.com/WorkEric08/sprintbase/releases/latest/download/Sprint.apk)). Funciona em Android 7.0 ou superior.

Para instalar:

1. Abra o link acima **no celular Android** e baixe o `Sprint.apk`.
2. Toque no arquivo baixado. Na primeira vez, o Android pede para permitir a instalação de apps desconhecidos para o navegador (ou app de arquivos) que você usou: ative **Permitir desta fonte** e volte.
3. Toque em **Instalar**. Se o Play Protect mostrar um aviso, toque em **Mais detalhes → Instalar mesmo assim**. O aviso aparece porque o app não vem da Play Store; o arquivo é assinado e o código está neste repositório.
4. Abra o **Sprint**.

> Os dados ficam só no aparelho. Desinstalar o app apaga o histórico: use **Ajustes → Seus dados → Exportar** para guardar um backup antes de desinstalar ou trocar de celular.

## Como funciona

O método gira em torno de três ideias:

1. **Ciclo** — você cadastra as matérias que estuda e define, para cada uma, a duração de um bloco e quantos blocos pretende cumprir.
2. **Sprint** — você monta uma fila de blocos de estudo e pausas e a executa do início ao fim, uma etapa por vez.
3. **Registro** — ao terminar cada bloco, você anota como foi (nota de 1 a 5, questões resolvidas e acertos, subtópico estudado), e o app transforma isso em progresso.

## Funcionalidades

### Ciclo de matérias
- Criar, editar e excluir matérias, cada uma com **nome**, **cor**, **duração do bloco** (de 5 a 120 minutos) e **meta de blocos** (de 1 a 100). A cor vem de uma paleta rápida ou de um seletor livre, em que você escolhe qualquer cor e tom arrastando ou digitando o código (por exemplo `#10B981`).
- Cada matéria exibe uma barra de progresso e um quadradinho por bloco da meta, preenchidos conforme você avança.
- Possibilidade de zerar os blocos de uma matéria (com confirmação).

### Montar e executar um Sprint
- Monte a fila tocando nas matérias; o app mostra quantos blocos ainda estão disponíveis em cada uma.
- Cada bloco pode ser de **Estudo**, **Revisão** ou **Questões**.
- Inclua **pausas** entre os blocos, de 5 a 60 minutos.
- Execute com um **cronômetro regressivo** com anel de progresso, pausa e retomada, e opção de pular para a próxima etapa ou encerrar o sprint.
- O cronômetro se baseia no horário real, então continua correto mesmo com o app em segundo plano.
- O botão voltar do celular pede confirmação antes de sair de um bloco em andamento.

### Registro pós-bloco
- **Autoavaliação** de 1 a 5.
- **Questões** resolvidas e corretas.
- **Subtópico** estudado, com sugestões a partir do que você já registrou.
- Se preferir, é possível pular o registro; o bloco continua contando.

### Progresso
- **Anel geral** com a porcentagem de blocos concluídos em relação à meta de todas as matérias.
- Métricas por **dia, semana ou mês**: tempo estudado, blocos concluídos e taxa de acerto.
- Distribuição dos blocos por tipo (estudo, revisão e questões).
- Detalhamento por matéria dentro do período escolhido.

### Ofensiva e calendário
- **Ofensiva**: quantos dias seguidos você estudou, com o **recorde** e o total de dias. Os textos só incentivam, nunca cobram.
- **Dias bônus**: a cada 7 dias de estudo seguidos você ganha 1 dia bônus (até 3 guardados). Se faltar um dia, o bônus cobre a falta e a sequência continua.
- **Bem-vindo de volta**: depois de alguns dias sem estudar, o app recebe você de forma acolhedora, uma vez por dia.
- **Calendário** dos últimos 4 meses, colorido pela sua **meta diária de blocos** (mínimo e máximo que você define). Toque em um dia para ver blocos, questões e acerto, e escreva uma **anotação** sobre ele.
- A ofensiva pode ser desligada em Ajustes; o calendário continua aparecendo.

### Simulado
- Aba própria para treinar com o cronômetro da prova: **ENEM — Dia 1** (5 h 30, modo estrito, com redação), **ENEM — Dia 2** (5 h, modo estrito) e **Customizado** (de 1 h a 8 h, com modo estrito opcional).
- O cronômetro usa o horário real e fica gravado: se o Android encerrar o app no meio da prova, ao reabrir o tempo continua certo.
- **Avisos** quando faltar 1 hora, 30 minutos e 10 minutos, e quando o **tempo acabar**. No aplicativo Android eles são notificações agendadas no sistema, que chegam **mesmo com a tela bloqueada** (o Android pede a permissão de notificações ao começar). Se **Alarmes e lembretes** estiver desligado para o app (padrão no Android 14), o cronômetro mostra um botão para permitir, e os avisos passam a tocar na hora exata. Na versão web só aparecem com o app aberto.
- A **tela fica ligada** durante a prova (você ainda pode bloqueá-la quando quiser).
- Pausar (fora do modo estrito) para o relógio e cancela os avisos; retomar agenda tudo de novo.
- Ao terminar ou encerrar, o **registro**: acertos por área (toque no número para digitar), nota da redação, controle do tempo e impressões. **Pular** guarda só o tempo, sem gabarito.
- **Histórico**: média dos últimos 3 simulados, gráfico de evolução e linha do tempo com o detalhe de cada um. Excluir pede confirmação e dá para **desfazer**.
- Em **Progresso**, o desempenho **por área** mostra a tendência (melhorando, estável ou piorando) e aponta a maior queda.

### Redação
- Aba para treinar a redação do ENEM: **43 temas** (35 de treino e 8 de edições do ENEM) com busca, filtro por eixo e a categoria **Feitas**. Os temas do ENEM mostram **"A conferir"**: o título e o ano ainda não foram conferidos na fonte oficial (INEP), e essa conferência é manual.
- Dois modos: **Escrever aqui** (editor em tela cheia) ou **Escrever no papel** (mostra o texto de apoio e conta o tempo enquanto você escreve à mão).
- **Cronômetro de 90 minutos** sempre à vista, com pausa. A tela fica ligada enquanto ele corre. Acabou o tempo: a autoavaliação abre sozinha e o texto não se perde.
- Um **aviso de fim do tempo** chega como notificação mesmo com a tela bloqueada (a permissão é a mesma do Simulado).
- O texto é **salvo sozinho**: 5 segundos depois de parar de digitar, a cada 30 segundos com o cronômetro correndo e, principalmente, **no instante em que o app vai para segundo plano**, porque o Android pode encerrar o app sem avisar. Se isso acontecer, o **rascunho aparece** na aba Redação com o texto e o tempo já usado, e dá para continuar de onde parou.
- Apoio durante a escrita: texto de apoio do tema, as 5 competências e um checklist. Contador de palavras (ideal: 150 a 500).
- **Autoavaliação** ao concluir: as 5 competências do ENEM de 0 a 200, somando a nota (0 a 1000). Também dá para **salvar sem nota**.
- **Histórico**: média das 3 últimas e melhor nota, gráfico de evolução, cartão **por competência** (a média de cada uma nas últimas 5 redações e o **ponto fraco**, com o que focar) e linha do tempo com o detalhe por competência e o texto. Excluir redação ou descartar rascunho pede confirmação e dá para **desfazer**.

### Edital e prova
- Em **Ajustes → Prova**: escolha o **edital** (**ENEM**, com as 6 matérias da Matriz de Referência, ou **Personalizado**, com as matérias que você nomear) e a **data da prova**.
- Aplicar um edital **cria as matérias que faltam e liga as que já existem** (nada é apagado). A ligação é por uma chave própria, então **renomear uma matéria não quebra a cobertura**.
- Com data definida, o **Ciclo** mostra a **contagem regressiva** (com marcos sugeridos para a fase em que você está) e avisa quando a prova já passou. O seletor de data é do próprio app.
- Em **Progresso**, o cartão **Edital coberto** mostra quantas matérias do edital já têm blocos concluídos e, se o edital listar subtópicos, quais ainda não foram estudados.

### Revisão espaçada
- No registro do bloco, **Marcar pra revisar** cria uma revisão para o subtópico (ou "(geral)"): ela volta **amanhã e depois de 3, 7, 15, 30 e 60 dias**, até ser **consolidada**. Marcar de novo o mesmo subtópico reinicia no dia seguinte, sem duplicar.
- **Montar sprint** avisa quando há revisões pendentes (é o único lembrete: o app não manda notificações de revisão) e oferece uma **pausa de revisão**. Nela cada subtópico pendente vem com **Acertei** e **Errei**: acertar avança para o próximo intervalo; errar volta para o dia seguinte. Revisões atrasadas continuam na fila, com o aviso de quantos dias.
- Em **Progresso**, o cartão **Revisão espaçada** mostra pendentes, atrasadas e dominadas, e a lista do que vem a seguir.

### Desempenho por subtópico e por banca
- No registro do bloco você pode marcar a **banca** das questões (a **banca alvo** de Ajustes já vem marcada).
- **Pontos fortes e fracos** por subtópico (a partir de 3 questões; forte = 70% ou mais de acerto).
- **Desempenho por banca** (a partir de 50 questões por banca), comparado com a banca alvo.

### Configurações
- Seu nome.
- **Prova**: edital, data da prova e banca alvo.
- Tema **claro** ou **escuro**, aplicado antes da tela carregar para não piscar.
- **Backup**: exporta todos os seus dados para um arquivo e importa de volta (útil para trocar de aparelho ou antes de desinstalar).

## Tecnologias

| Área | Tecnologia |
|---|---|
| Interface | [React 19](https://react.dev/) no desenvolvimento e [Preact](https://preactjs.com/) (mesma API, bem menor) no aplicativo e na versão web publicados |
| Linguagem | [TypeScript](https://www.typescriptlang.org/) |
| Build e servidor de desenvolvimento | [Vite](https://vitejs.dev/) |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) |
| Armazenamento local | [Dexie](https://dexie.org/) (IndexedDB) |
| Seletor de cores | [react-colorful](https://github.com/omgovich/react-colorful) |
| Ícones | [Font Awesome](https://fontawesome.com/), só os ícones usados, como SVG embutido (sem fonte; funciona offline) |
| Aplicativo Android | [Capacitor](https://capacitorjs.com/), com o plugin oficial de notificações locais (usado só nos avisos do simulado) e dois plugins próprios em Java (cor das barras do sistema e tela ligada) |
| Gráficos | SVG próprio (sem biblioteca de gráficos) |
| Versão web instalável (PWA) | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Testes | [Vitest](https://vitest.dev/) (unitários) e [Puppeteer](https://pptr.dev/) (ponta a ponta, na web e no app) |

## Como rodar

**Pré-requisito:** [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).

```bash
# 1. Clone o repositório
git clone https://github.com/WorkEric08/sprintbase.git
cd sprintbase

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O app abre em [http://localhost:3001](http://localhost:3001). Como o servidor escuta em todas as interfaces de rede, também dá para acessá-lo pelo celular, na mesma rede Wi-Fi, usando o IP do computador.

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento na porta 3001 |
| `npm run build` | Gera a versão de produção na pasta `dist/` |
| `npm run preview` | Serve localmente a versão gerada pelo build |
| `npm run lint` | Verifica os tipos com o TypeScript (`tsc --noEmit`) |
| `npm test` | Roda os testes unitários |
| `npm run e2e` | Teste ponta a ponta no navegador (veja abaixo para o aplicativo no celular) |
| `npm run e2e:abertura` | Testa, no Chrome, a animação de abertura (quadros, duração, app lento, falhas); constrói o app antes |
| `npm run e2e:simulado-nativo` | Testa, no Chrome com a ponte do Capacitor simulada, o que o Simulado e a Redação pedem ao Android (permissão, 4 avisos agendados, alarmes exatos, cancelar ao pausar/encerrar, tela ligada, gravar o rascunho ao ir para segundo plano) |
| `npm run perf` | Mede a inicialização do app (tempo até a tela inicial pronta) e compara com medições salvas |
| `npm run perf:abertura` | Mede quando a tela inicial fica pronta, contando do primeiro quadro da abertura, com a CPU 1×, 6×, 10× e 20× mais lenta |

### Gerar o APK

Além do Node.js, é preciso o **JDK 21** e o **Android SDK** (plataforma 36). O script encontra o JDK e o SDK pelas variáveis `JAVA_HOME` e `ANDROID_HOME`.

| Comando | O que faz |
|---|---|
| `npm run android:build` | Gera o APK de **debug** (`com.workeric08.sprint.debug`) |
| `npm run android:run` | Gera, instala e abre o app de debug no celular/emulador conectado |
| `npm run android:release` | Gera o APK **assinado** para distribuição em `release/Sprint.apk`, com o checksum SHA-256 |
| `npm run android:devices` | Lista os aparelhos conectados |
| `npm run e2e -- --target android` | Roda o teste ponta a ponta no app de debug conectado (**apaga os dados do app**) |

O APK de release é assinado com uma chave que fica **fora do repositório**, em `~/.sprint-signing` (veja o `LEIA-ME.txt` que ela contém). Quem clonar o projeto e não tiver essa chave consegue gerar o APK de debug normalmente, mas não o de release.

Para abrir no Android Studio, abra a pasta `android/` e rode `npm run android:sync` antes de cada build, para o aplicativo empacotar a versão mais recente do código.

## Desempenho

O app abre direto na tela inicial, com os dados já desenhados. O que foi feito para isso (medido com `npm run perf`, que simula um celular com CPU 4× mais lenta e 1.500 registros no banco):

- **Ícones em SVG embutido**, só os 60 usados (21 no primeiro arquivo, os outros 39 chegam com as telas que os usam), no lugar da fonte do Font Awesome (155 KB de fonte e 100 KB de CSS que precisavam ser lidos antes de qualquer ícone aparecer).
- **Leitura do banco antecipada**: começa quando o código é carregado, em paralelo com a montagem da interface, e o primeiro quadro já sai com as matérias desenhadas. Os registros de bloco (podem ser milhares) chegam logo depois da primeira pintura.
- **Só o Ciclo no primeiro arquivo**: Progresso, Ajustes, Montar sprint, cronômetro e seletor de cores são carregados em segundo plano depois da primeira pintura, então abrem sem demora.
- **Preact** no lugar do React nos builds: metade do JavaScript para o aparelho ler e compilar.
- **Cartões fora da tela sem custo de layout** na abertura, e o WebView do Android sem a verificação de sites (o app só abre arquivos locais).

Resultado na medição: tela inicial pronta em **476 ms → 280 ms** (−41%) e JavaScript inicial de **131 KB → 62 KB**. Esses valores são do Chrome no PC, úteis para comparar versões entre si; no celular o tempo absoluto é outro. O teste ponta a ponta (`npm run e2e -- --preview`) falha se o primeiro arquivo passar do orçamento de tamanho.

## Abertura animada

Ao abrir, o app mostra por 2 s o logo se desenhando: um cronômetro cujo ponteiro dá uma volta, desenhando o contorno atrás de si, e que termina no visto. É uma camada **por cima** do app, que carrega por baixo já na tela inicial.

- **Onde mora:** tudo inline no `index.html` (HTML, CSS e um script mínimo), sem depender do bundle, que é justamente o que pode falhar. Começa no primeiro quadro pintado, antes de qualquer JavaScript (`window.__aberturaInicio`).
- **Tempo:** 2 s no total, com o fade de saída (320 ms) incluído. Ela só sai quando passou o tempo **e** o app está pronto (tela inicial desenhada e fontes carregadas, com no máximo 1,5 s de espera por elas): app pronto cedo, a animação termina normalmente; app lento, o logo completo fica parado esperando e sai na hora em que o app abre. A saída é `encerrarAbertura()` (`services/abertura.ts`), chamada pelo `App.tsx` junto da marca `sprint:ready`.
- **Só `transform` nas peças:** o navegador anima `transform` na placa de vídeo, sem a thread principal, que nos primeiros 0,6 s está ocupada carregando o app. Por isso o contorno é feito de duas metades de anel que giram por trás de uma janela fixa (a curva de ease do desenho é cortada ao meio com De Casteljau: `node scripts/abertura-curva.mjs`), e não de um SVG com `stroke-dashoffset` (que só anda na thread principal e trava). O mesmo vale para `clip-path`, largura, posição, etc. Um teste confere que toda animação das peças anima só `transform`.
- **Toque:** enquanto cobre a tela a abertura pega o toque; ao começar a sair, deixa de pegar.
- **Movimento reduzido** (`prefers-reduced-motion`): logo completo e parado, e sai assim que o app está pronto.
- **Rede de segurança:** se o app não ficar pronto em 8 s, a abertura mostra "O app está demorando para abrir", diz que nada foi apagado, mostra até 3 linhas do que deu errado (anotado desde o começo da página em `window.__errosDaAbertura`) e o botão **Tentar de novo**: ele desregistra os service workers, apaga só os caches do próprio app e recarrega. Nunca toca em IndexedDB nem em localStorage. Se o app abrir, mesmo lento, a abertura some junto com a mensagem.
- **Só para testes:** a duração padrão é `DURACAO_DA_ABERTURA_MS` (2000); a chave `sprint-abertura-ms` do localStorage a substitui, e com `0` a abertura nem entra (é o que o `npm run e2e` usa, para ela não segurar o toque). `npm run e2e:abertura` testa a duração de verdade.
- **No Android:** a abertura do sistema fica preta, sem ícone (`sprint_splash_background`, igual ao `background_color` do manifest e ao fundo do WebView) e sai no primeiro quadro que a página pinta; a animação é da página. O que vem antes disso (do toque no ícone até o WebView pintar) é do sistema e não dá para medir pela web.

## Simulado por dentro

Decisões desta versão (2026-11-17), com o motivo, e as regras que não podem regredir.

**Decisões**
- **Relógio de horário real e sessão gravada.** O simulado em andamento fica em `settings` (`simulado_active`), e tudo (quanto falta, pausas, fim) é recalculado de horários reais (`utils/simulado.ts`). *Substitui* o app original, em que sair da aba perdia o simulado: aqui sair da aba, bloquear a tela ou o Android matar o processo não perde nada. A sessão **não entra no backup** (é do momento; restaurar um backup cancela os avisos agendados).
- **Avisos = notificações locais agendadas** (`@capacitor/local-notifications`, só em `services/simuladoAlerts.ts`, carregado sob demanda e só no APK), porque o Android suspende o WebView com a tela apagada. Ids fixos: agendar de novo substitui, nunca duplica. Agendam ao começar e ao retomar; cancelam ao pausar, encerrar e ao salvar o registro. O app também avisa na tela (cartão no topo) quando o limite é cruzado com ele aberto.
- **Quatro avisos, o último é o fim do tempo** (só como notificação: com a tela bloqueada ninguém veria o relógio zerar, e dentro do app a folha de registro já abre sozinha).
- **Alarme exato só com a permissão.** Desde a versão 8.3 do plugin, agendar um aviso exato sem a permissão "Alarmes e lembretes" abre sozinho a tela de configurações do Android, a cada agendamento. Por isso o app pede alarme **inexato** por padrão (`isExactNotification: false`) e só pede exato quando a permissão já existe; o botão **Permitir alarmes exatos** do cronômetro leva a pessoa à tela do sistema, e ao voltar os avisos são reagendados.
- **Tela ligada**: plugin próprio `KeepAwakePlugin.java` (`FLAG_KEEP_SCREEN_ON`), com a Wake Lock API como alternativa na web. Só enquanto o cronômetro corre (solta na pausa e no fim).
- **Gráfico em SVG próprio** (`components/EvolutionChart.tsx`): o Recharts custaria ~100 KB para desenhar uma linha. A inicialização continua igual na medição (`npm run perf`: 283 → 273 ms; JavaScript inicial +3 KB).
- **Guarda de navegação** (`contexts/NavigationGuardContext.tsx`): trocar de aba com o simulado na tela pede confirmação. Como o simulado não se perde ao sair, o texto diz isso. O botão voltar do aparelho não passa por ela: pede para encerrar.
- **"Pular" no registro guarda o simulado sem gabarito** (aparece no histórico como "sem nota"). *Substitui* o descarte do original: cinco horas de prova não se perdem por um toque no voltar.
- **A redação não conta como questão.** O original somava 1 questão errada no ENEM Dia 1, puxando o aproveitamento para baixo; a nota (0–1000) fica à parte.
- **Só os 3 modelos que a tela mostra** (ENEM Dia 1, Dia 2, Customizado). PRF/PF e INSS existiam no código do original, mas a interface nunca os ofereceu.
- **`useSimulados` virou parte do `AppDataContext`** (como `useSubjects` e `useBlockLogs`): uma fonte única, sem cópias que ficam velhas. Os simulados (dezenas de linhas) são lidos depois da primeira pintura.
- **Modo desenvolvedor** (nome `DevInfo`): a tela de começar oferece velocidade ×12 ou ×60 (5 h 30 viram ~27 min ou ~5,5 min reais, e os avisos acompanham), e encerrar conta como concluído com a duração toda.

**Regras para não regredir**
- Nunca guardar "quanto falta" em memória: sempre derivar de `(sessão, agora)` (`remainingMs`). Um `setInterval` só serve para redesenhar.
- O plugin de notificações **não pode ser devolvido por uma função `async`** (é um Proxy do Capacitor; o `await` o trata como "thenable" e nada é agendado). Cada função faz o próprio `import()` e usa o plugin ali mesmo. O teste `npm run e2e:simulado-nativo` e `utils/simuladoAlerts.test.ts` reprovam se isso voltar.
- `@capacitor/local-notifications` não pode ser importado fora do serviço dos avisos (um teste confere), nem no primeiro arquivo do app.
- A tela do cronômetro precisa caber sem rolagem a 320×568 (o e2e mede 320, 360, 390, 768 e 1280) e as caixas "Questões/Corretas" do registro ficam uma sob a outra abaixo de 360 px, para o número nunca ser cortado.
- Excluir um simulado pede confirmação **e** dá para desfazer (7 s).
- Quem mexer no registro: a redação tem `questionsTotal` 0; `overallPct` devolve `null` (não 0%) quando não há questões.

## Redação por dentro

Decisões desta versão (2026-11-17), com o motivo, e as regras que não podem regredir.

**Decisões**
- **O rascunho é a própria redação com `completedAt: null`** (formato do app original, tabela `redacaoSessions`), com um campo a mais, `elapsedMs`, que guarda o tempo de escrita já usado. O original ignora esse campo, então os dados vão e voltam entre as duas versões.
- **Gravar ao ir para segundo plano** (`hooks/useAppPause.ts`: `appStateChange` do Capacitor no APK, mais `visibilitychange` e `pagehide`). *Substitui* o salvamento só de 5 s do original, que perdia tudo se o Android matasse o processo nesse intervalo. O cronômetro volta **parado** no tempo salvo (o tempo em que o app esteve morto não conta).
- **Campo de texto não controlado** (`defaultValue`): o texto vive no próprio campo, então teclado, autocorreção e composição de palavras (IME) do celular nunca brigam com a interface (importa mais ainda porque o app publicado usa Preact).
- **Escrita em tela cheia opaca** (como o sprint), em vez de dentro da aba: sem a barra de abas sobre o teclado e sem a tela de baixo aparecer. O botão voltar pergunta antes de sair e sair guarda o rascunho. Isso *substitui* a guarda de troca de aba que o original usava aqui.
- **"Salvar sem nota"** na autoavaliação (o original obrigava a dar nota), e **"Voltar ao texto"** em vez de "Pular".
- **Temas já feitos** (`useCompletedThemes`) passam do localStorage para `settings` (entram no backup). O valor antigo é copiado uma vez, se existir. Resetar a lista pede confirmação e dá para desfazer (o original usava `window.confirm`).
- **Os temas do ENEM não foram alterados.** O arquivo `data/redacaoThemes.ts` é idêntico ao do app original e todos os temas do ENEM seguem com `verified: false`; a tela mostra "A conferir" neles. Conferir título e ano no portal do INEP e trocar para `verified: true` é um trabalho manual, que **não deve ser feito por IA**.
- **Gráfico**: o mesmo `EvolutionChart` em SVG do Simulado (eixo até 1000). `useRedacao` virou parte do `AppDataContext` (`redacoes`, lidas depois da primeira pintura).
- **Dois ajustes de interface** em relação ao original: tocar num tema abre direto a escolha do modo (sem o botão fixo no rodapé, que ficaria atrás da barra de abas), e o histórico mostra a data junto do título para ele não ficar espremido.

**Regras para não regredir**
- O campo de texto da redação **não pode virar controlado** (`value=`): quebra o IME e faz o cursor pular. Um teste confere.
- Depois de concluída, nenhum salvamento de rascunho pode sobrescrever a redação (`doneRef` em `useRedacaoWriter`).
- Não gravar rascunho vazio de uma redação que nunca existiu (abrir e sair não deixa lixo).
- O rodapé com o botão **Concluir** sai da frente do teclado (`useKeyboardVisible`); o botão do cabeçalho continua disponível.
- Nota = soma das 5 competências (0–1000), cada uma de 40 em 40. Redação "sem nota" e rascunho **não entram** nas médias.
- Excluir redação e descartar rascunho: confirmação **e** desfazer.

## Edital, revisão e banca por dentro

Decisões desta versão (2026-11-17), com o motivo, e as regras que não podem regredir.

**Decisões**
- **A cobertura do edital cruza por chave, não pelo nome.** O app original ligava a matéria do app à do edital pelo nome, e renomear a matéria quebrava a cobertura. Agora cada matéria guarda `editalKey` (o nome da matéria do edital, gravado ao aplicar o edital); o nome só vale para matérias antigas sem chave. É um campo **opcional** da própria matéria: **o schema do banco não mudou** e o app original o ignora. Uma matéria que já tem a chave de outra matéria do edital não é "roubada" pelo nome.
- **Só ENEM e Personalizado.** `data/editais.ts` não traz mais PRF, PF, INSS e tribunais: a interface do original nunca os ofereceu, e os dados deles eram de exemplo (pesos aproximados e incidências zeradas, a conferir à mão nos editais oficiais).
- **A revisão se faz na pausa de revisão do sprint** (`review-break`), que é o **mesmo componente** da pausa comum (`BreakTimerView`, com uma lista de subtópicos). *Substitui* o original, em que as revisões podiam ser criadas mas **nunca concluídas** (a tela da fila foi desligada e a pausa só mostrava a lista).
- **Algoritmo** (`utils/reviewAlgorithm.ts`, testado): D+1 → 3 → 7 → 15 → 30 → 60 → consolidado; errar volta ao D+1; `nextReviewAt` é sempre a meia-noite local; marcar de novo (sem diferenciar maiúsculas) reinicia sem duplicar.
- **Apagar uma matéria apaga as revisões dela** (elas ficariam pendentes sem poder ser feitas).
- **A banca passa a ser gravada no registro do bloco** e a banca alvo vem marcada. *Substitui* o original, em que a banca era coletada e descartada, então o cartão de banca nunca tinha dados.
- **Pontos fortes e fracos** não se repetem: forte = 70% ou mais, fraco = abaixo disso, até 5 de cada. O original listava os mesmos subtópicos nas duas listas quando eram poucos; registros sem subtópico ficam de fora.
- **Seletor de data próprio** (`DatePickerModal`), sem o campo de data do navegador; a contagem acompanha a virada do dia.
- **Ícones divididos em dois grupos** (`Icon.tsx` e `iconsExtra.ts`): as Fases 4 a 6 somaram 39 ícones ao arquivo principal e atrasaram a abertura; agora só os 21 do primeiro quadro ficam nele (cada ícone extra vem do próprio arquivo do pacote, senão o empacotador o devolve ao arquivo principal). `utils/icons.test.ts` reprova se a tela inicial passar a usar um ícone extra.

**Regras para não regredir**
- O primeiro arquivo do app não importa `iconsExtra`, e toda tela sob demanda passa por `withIcons` em `screens.tsx`.
- Nenhum `<input type="date">` ou `type="time"` em tela alguma (um teste confere).
- Passos da carga em segundo plano do `AppDataContext` (simulados, redações, revisões) pulam com `if`, **nunca com `return`**: um `return` por "sem dados" fazia as redações nunca carregarem num banco sem simulados (bug real, achado pela ponte simulada).
- A revisão consolidada nunca volta à fila; a atrasada continua nela.

## Estrutura do projeto

```
├── index.html              # Página base: abertura animada inline e tema salvo (aplicado antes do React montar)
├── index.tsx               # Ponto de entrada da aplicação
├── App.tsx                 # Estrutura principal: abas, menu lateral e navegação inferior
├── types.ts                # Tipos e constantes do domínio (matérias, blocos, registros)
├── db.ts                   # Banco de dados local (Dexie / IndexedDB)
├── components/             # Telas, modais e cartões da interface
├── contexts/               # Fonte única de dados do app e guarda de navegação entre abas
├── data/                   # Conteúdo estático (modelos de simulado e temas de redação)
├── hooks/                  # Hooks reutilizáveis (cronômetro, botão voltar, ofensiva, simulado, escrita da redação)
├── utils/                  # Lógica pura e testada (datas, ofensiva, calendário, backup, simulado e redação)
├── services/               # Serviços: PWA (só web), abertura animada, avisos do simulado e tela ligada
├── android/                # Projeto Android gerado pelo Capacitor
├── scripts/                # Scripts do APK, dos ícones e dos testes ponta a ponta
└── public/                 # Arquivos estáticos (ícones)
```

A navegação é organizada em cinco abas: **Ciclo**, **Simulado**, **Redação**, **Progresso** e **Ajustes**. Todos os dados passam por um único contexto (`AppDataContext`), que atualiza a tela de imediato e grava no banco local em seguida.

## Seus dados

Tudo é armazenado no próprio aparelho (IndexedDB) e não é enviado para nenhum servidor. Isso significa que:

- o app funciona sem internet;
- os dados ficam presos àquele aparelho (ou navegador);
- desinstalar o app, ou limpar os dados do site no navegador, apaga também o seu histórico de estudos.

Para não perder nada, use **Ajustes → Seus dados → Exportar**: o app gera um arquivo de backup com tudo, e **Importar** restaura esse arquivo em outro aparelho ou depois de reinstalar. Importar **substitui** os dados atuais, e o app pede confirmação antes.

## Próximos passos

O Sprint Base é uma base enxuta, pensada para crescer aos poucos. O que falta é o polimento final: desempenho em tabelas grandes, telas largas e tablets, acessibilidade, permissões mínimas do Android e a versão do app em Ajustes.

## O que não foi verificado

Conferido por testes unitários, ponta a ponta no Chrome (web e build de produção) e com a ponte do Capacitor **simulada**, mas **não em aparelho Android real**:

- **Avisos com a tela bloqueada.** O teste simulado prova que o app pede a permissão, cria o canal e agenda os 3 avisos com os horários certos; não prova que o Android os entrega com a tela apagada. Roteiro: em **Ajustes** use o nome `DevInfo`; em **Simulado** escolha **ENEM — Dia 1** com velocidade **×12** (≈ 27 min reais), toque em **Começar**, permita as notificações, **bloqueie a tela** e espere. Os avisos devem chegar aos ~22 min 30 s (1 hora), ~25 min (30 minutos) e ~26 min 40 s (10 minutos).
- **Precisão dos avisos.** O alarme só é exato se **Alarmes e lembretes** estiver permitido para o app (no Android 14 vem desligado); sem isso o Android pode atrasar o aviso em alguns minutos com o aparelho parado. O botão **Permitir alarmes exatos** do cronômetro abre essa tela do sistema; o que o app pede ao Android é testado com a ponte simulada, mas a tela do sistema e o efeito no horário real não foram vistos em aparelho.
- **Aviso de fim do tempo** (4º aviso) com a tela bloqueada: mesmo roteiro acima, ele deve chegar aos ~27 min 30 s.
- **Tela ligada** (`FLAG_KEEP_SCREEN_ON`) durante o cronômetro, e voltar a apagar na pausa e no fim.
- **Sobreviver ao Android matar o processo** no meio da prova (a lógica é testada; falta ver no aparelho) e a guarda de troca de aba no APK.
- **Teclado numérico** e a rolagem da folha de registro com o teclado aberto, no WebView real.
- **Aviso de fim do cronômetro da Redação** com a tela bloqueada (escreva com o cronômetro correndo, bloqueie a tela e espere os 90 minutos; para testar mais rápido, use um rascunho com tempo quase esgotado). O app pede esse aviso como inexato quando **Alarmes e lembretes** está desligado, então pode atrasar alguns minutos; a Redação não tem o botão para ligar essa permissão (o Simulado tem).
- **Redação no aparelho**: escrever um texto longo, bloquear a tela, **forçar o Android a encerrar o app** (Configurações → Apps → Sprint → Forçar parada, ou arrastar o app para fora dos recentes) e reabrir: o rascunho deve estar na aba Redação com o texto e o tempo. A ponte simulada prova que o app grava no evento `appStateChange`; não prova que o WebView termina de gravar antes de o Android encerrar o processo.
- **Teclado, autocorreção e IME em texto longo** (várias centenas de palavras, com acentos, correção automática e sugestões) no WebView real, e a rolagem do campo com o teclado aberto.
- **Fase 6 no aparelho**: marcar uma revisão, fazer a pausa de revisão num sprint real, escolher a data da prova no seletor próprio e ver a contagem no Ciclo. O ciclo D+1 → D+60 foi percorrido por inteiro nos testes (alterando as datas no banco para "viajar no tempo"), mas não esperando os dias de verdade.
- O teste ponta a ponta `-- --target android` continua sem ter rodado (e o roteiro do Simulado fica de fora dele: a janela de permissão do sistema cobre o app).
