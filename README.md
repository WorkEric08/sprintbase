# Sprint Base

**Sprint Base** é um aplicativo de organização de estudos para estudantes em geral. A ideia é simples: você divide seu tempo em **blocos de estudo**, executa cada bloco com um cronômetro e acompanha, de forma visual, quanto já estudou. Tudo com um método ágil, fácil de entender e acessível a qualquer público.

Não precisa de conta, de internet nem de servidor: os dados ficam salvos no próprio dispositivo.

## Como funciona

O método gira em torno de três ideias:

1. **Ciclo** — você cadastra as matérias que estuda e define, para cada uma, a duração de um bloco e quantos blocos pretende cumprir.
2. **Sprint** — você monta uma fila de blocos de estudo e pausas e a executa do início ao fim, uma etapa por vez.
3. **Registro** — ao terminar cada bloco, você anota como foi (nota de 1 a 5, questões resolvidas e acertos, subtópico estudado), e o app transforma isso em progresso.

## Funcionalidades

### Ciclo de matérias
- Criar, editar e excluir matérias, cada uma com **nome**, **cor**, **duração do bloco** (de 5 a 120 minutos) e **meta de blocos** (de 1 a 100).
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

### Configurações
- Seu nome.
- Tema **claro** ou **escuro**, aplicado antes da tela carregar para não piscar.

## Tecnologias

| Área | Tecnologia |
|---|---|
| Interface | [React 19](https://react.dev/) |
| Linguagem | [TypeScript](https://www.typescriptlang.org/) |
| Build e servidor de desenvolvimento | [Vite](https://vitejs.dev/) |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) |
| Armazenamento local | [Dexie](https://dexie.org/) (IndexedDB) |
| Seletor de cores | [react-colorful](https://github.com/omgovich/react-colorful) |
| Ícones | [Font Awesome](https://fontawesome.com/) (empacotado, funciona offline) |

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

## Estrutura do projeto

```
├── index.html              # Página base (aplica o tema salvo antes do React montar)
├── index.tsx               # Ponto de entrada da aplicação
├── App.tsx                 # Estrutura principal: abas, menu lateral e navegação inferior
├── types.ts                # Tipos e constantes do domínio (matérias, blocos, registros)
├── db.ts                   # Banco de dados local (Dexie / IndexedDB)
├── components/             # Telas, modais e cartões da interface
├── contexts/               # Contexto com a fonte única de dados do app
├── hooks/                  # Hooks reutilizáveis (cronômetro, botão voltar)
├── utils/                  # Funções auxiliares (formatação, geração de ids)
└── public/                 # Arquivos estáticos (ícone)
```

A navegação é organizada em três abas: **Ciclo**, **Progresso** e **Ajustes**. Todos os dados passam por um único contexto (`AppDataContext`), que atualiza a tela de imediato e grava no banco local em seguida.

## Seus dados

Tudo é armazenado no navegador, em IndexedDB, e não é enviado para nenhum servidor. Isso significa que:

- o app funciona sem internet;
- os dados ficam presos àquele navegador e dispositivo;
- limpar os dados do site no navegador apaga também o seu histórico de estudos.

## Próximos passos

O Sprint Base é uma base enxuta, pensada para crescer aos poucos. Algumas ideias para as próximas versões:

- Ofensiva de dias consecutivos e calendário de estudos
- Simulados cronometrados
- Treino de redação
- Revisão espaçada
- Versão para Android (APK)
