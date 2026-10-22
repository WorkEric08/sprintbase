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

### Configurações
- Seu nome.
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
| Aplicativo Android | [Capacitor](https://capacitorjs.com/) |
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
| `npm run perf` | Mede a inicialização do app (tempo até a tela inicial pronta) e compara com medições salvas |

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

- **Ícones em SVG embutido**, só os 38 usados, no lugar da fonte do Font Awesome (155 KB de fonte e 100 KB de CSS que precisavam ser lidos antes de qualquer ícone aparecer).
- **Leitura do banco antecipada**: começa quando o código é carregado, em paralelo com a montagem da interface, e o primeiro quadro já sai com as matérias desenhadas. Os registros de bloco (podem ser milhares) chegam logo depois da primeira pintura.
- **Só o Ciclo no primeiro arquivo**: Progresso, Ajustes, Montar sprint, cronômetro e seletor de cores são carregados em segundo plano depois da primeira pintura, então abrem sem demora.
- **Preact** no lugar do React nos builds: metade do JavaScript para o aparelho ler e compilar.
- **Cartões fora da tela sem custo de layout** na abertura, e o WebView do Android sem a verificação de sites (o app só abre arquivos locais).

Resultado na medição: tela inicial pronta em **476 ms → 280 ms** (−41%) e JavaScript inicial de **131 KB → 62 KB**. Esses valores são do Chrome no PC, úteis para comparar versões entre si; no celular o tempo absoluto é outro. O teste ponta a ponta (`npm run e2e -- --preview`) falha se o primeiro arquivo passar do orçamento de tamanho.

## Estrutura do projeto

```
├── index.html              # Página base (aplica o tema salvo antes do React montar)
├── index.tsx               # Ponto de entrada da aplicação
├── App.tsx                 # Estrutura principal: abas, menu lateral e navegação inferior
├── types.ts                # Tipos e constantes do domínio (matérias, blocos, registros)
├── db.ts                   # Banco de dados local (Dexie / IndexedDB)
├── components/             # Telas, modais e cartões da interface
├── contexts/               # Contexto com a fonte única de dados do app
├── hooks/                  # Hooks reutilizáveis (cronômetro, botão voltar, ofensiva)
├── utils/                  # Lógica pura e testada (datas, ofensiva, calendário, backup)
├── services/               # Serviços da versão web (PWA)
├── android/                # Projeto Android gerado pelo Capacitor
├── scripts/                # Scripts do APK, dos ícones e dos testes ponta a ponta
└── public/                 # Arquivos estáticos (ícones)
```

A navegação é organizada em três abas: **Ciclo**, **Progresso** e **Ajustes**. Todos os dados passam por um único contexto (`AppDataContext`), que atualiza a tela de imediato e grava no banco local em seguida.

## Seus dados

Tudo é armazenado no próprio aparelho (IndexedDB) e não é enviado para nenhum servidor. Isso significa que:

- o app funciona sem internet;
- os dados ficam presos àquele aparelho (ou navegador);
- desinstalar o app, ou limpar os dados do site no navegador, apaga também o seu histórico de estudos.

Para não perder nada, use **Ajustes → Seus dados → Exportar**: o app gera um arquivo de backup com tudo, e **Importar** restaura esse arquivo em outro aparelho ou depois de reinstalar. Importar **substitui** os dados atuais, e o app pede confirmação antes.

## Próximos passos

O Sprint Base é uma base enxuta, pensada para crescer aos poucos. Algumas ideias para as próximas versões:

- Simulados cronometrados
- Treino de redação
- Revisão espaçada
