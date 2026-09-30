# 💰 SmartFinance

Aplicativo mobile para **gestão financeira pessoal**, desenvolvido com React Native e TypeScript.

O SmartFinance foi criado para centralizar o controle das finanças em um único aplicativo, permitindo acompanhar saldo, receitas, despesas, transações, limites de gastos e indicadores financeiros de forma simples e visual.

---

## 📱 Sobre o projeto

O **SmartFinance** é uma aplicação mobile multiplataforma voltada para organização e acompanhamento financeiro pessoal.

A aplicação possui autenticação de usuários, gerenciamento de transações, controle de limites, análises gráficas e integração com o Supabase para persistência dos dados.

### 🎯 Objetivos

* Centralizar o controle das finanças pessoais;
* Facilitar o registro e acompanhamento de receitas e despesas;
* Permitir a definição e acompanhamento de limites financeiros;
* Apresentar informações financeiras de maneira visual;
* Disponibilizar análises por período, categoria e instituição financeira;
* Oferecer uma experiência mobile simples e intuitiva.

---

## ✨ Funcionalidades

### 🔐 Autenticação

* Criação de conta;
* Login com e-mail e senha;
* Persistência da sessão;
* Logout;
* Validação dos campos de autenticação;
* Tela de carregamento/splash durante a inicialização.

A autenticação e persistência da sessão são realizadas utilizando **Supabase Auth** e `AsyncStorage`.

---

### 🏠 Dashboard

A tela inicial apresenta um resumo da situação financeira do usuário:

* Saldo total consolidado;
* Total de receitas;
* Total de despesas;
* Fluxo de saídas semanal;
* Atividades recentes;
* Detalhes das transações;
* Indicadores financeiros;
* Acesso rápido ao extrato.

---

### 💳 Gerenciamento de transações

O aplicativo permite registrar e acompanhar movimentações financeiras.

Funcionalidades incluem:

* Adicionar transações;
* Editar transações;
* Visualizar detalhes;
* Separar receitas e despesas;
* Filtrar por tipo;
* Filtrar por período;
* Visualizar movimentações por mês;
* Navegar entre diferentes meses;
* Visualizar todas as movimentações;
* Cálculo automático dos totais do período.

As transações também podem apresentar informações como:

* Descrição;
* Valor;
* Data;
* Horário;
* Tipo da movimentação;
* Categoria;
* Instituição financeira.

---

### 📊 Análises e gráficos

A área de estatísticas apresenta informações financeiras de forma visual.

Inclui:

* Comparação entre receitas e despesas;
* Histórico financeiro dos últimos 6 meses;
* Distribuição de despesas por categoria;
* Ranking de gastos por banco;
* Quantidade de transações por instituição;
* Categoria com maior impacto nos gastos;
* Detalhamento das informações através de modais.

Os gráficos são renderizados utilizando **React Native SVG**.

---

### 💰 Controle de limites

O SmartFinance permite acompanhar limites financeiros definidos pelo usuário.

É possível:

* Visualizar limites;
* Editar limites;
* Acompanhar utilização;
* Comparar gastos com os valores estabelecidos.

---

### 🔔 Notificações

O projeto possui uma estrutura dedicada ao gerenciamento de notificações, incluindo:

* Solicitação de permissão;
* Listener de notificações;
* Bridge para integração com recursos nativos.

---

### 👤 Perfil

A aplicação possui uma área de perfil para gerenciamento das informações do usuário e acesso às funcionalidades relacionadas à conta.

---

## 🛠️ Tecnologias utilizadas

| Tecnologia           | Utilização                           |
| -------------------- | ------------------------------------ |
| **React Native**     | Desenvolvimento mobile               |
| **TypeScript**       | Tipagem e desenvolvimento            |
| **React**            | Construção da interface              |
| **Supabase**         | Autenticação e persistência de dados |
| **AsyncStorage**     | Persistência local da sessão         |
| **React Native SVG** | Gráficos e elementos visuais         |
| **React Navigation** | Navegação                            |
| **Jest**             | Testes                               |
| **ESLint**           | Análise de código                    |
| **Prettier**         | Formatação de código                 |

### Versões principais

```text
React Native: 0.87.1
React: 19.2.3
TypeScript: 6.x
Supabase JS: 2.x
Node.js: >= 22.11.0
```

---

## 🏗️ Arquitetura

O projeto segue uma organização baseada em componentes, telas, contextos e serviços.

```text
SmartFinance
│
├── android/                  # Projeto nativo Android
├── ios/                      # Projeto nativo iOS
│
├── src/
│   │
│   ├── assets/               # Imagens e recursos
│   │
│   ├── components/           # Componentes reutilizáveis
│   │
│   ├── context/              # Contextos globais da aplicação
│   │
│   ├── screens/              # Telas da aplicação
│   │   ├── AuthScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── BudgetScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   └── ProfileScreen.tsx
│   │
│   ├── services/             # Serviços e integrações externas
│   │   ├── supabase.ts
│   │   ├── notificationBridge.ts
│   │   ├── notificationListener.ts
│   │   └── parser/
│   │
│   ├── theme/                # Tema e identidade visual
│   │
│   ├── types/                # Tipos e interfaces TypeScript
│   │
│   └── utils/                # Funções auxiliares
│
├── __tests__/                # Testes automatizados
│
├── App.tsx                   # Ponto principal da aplicação
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── README.md
```

---

## 🔄 Fluxo da aplicação

De maneira simplificada, o fluxo principal funciona da seguinte forma:

```text
                 ┌─────────────────┐
                 │    SmartFinance │
                 └────────┬────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Autenticação  │
                  └───────┬───────┘
                          │
                 ┌────────┴────────┐
                 │                 │
              Usuário           Sem sessão
                 │                 │
                 ▼                 ▼
          ┌─────────────┐    ┌─────────────┐
          │  Dashboard  │    │    Login    │
          └──────┬──────┘    └─────────────┘
                 │
        ┌────────┼────────┬──────────┐
        │        │        │          │
        ▼        ▼        ▼          ▼
     Extrato  Limites  Gráficos   Perfil
        │        │        │          │
        └────────┴────────┴──────────┘
                     │
                     ▼
                ┌──────────┐
                │ Supabase │
                └──────────┘
```

---

## 🚀 Como executar o projeto

### 📋 Pré-requisitos

Antes de executar o projeto, certifique-se de possuir:

* Node.js `>= 22.11.0`;
* npm;
* JDK configurado para desenvolvimento Android;
* Android Studio e/ou Xcode;
* Emulador Android/iOS ou dispositivo físico;
* Ambiente React Native configurado.

Para detalhes sobre a configuração do ambiente, consulte a documentação oficial do React Native.

---

## 📥 Instalação

Clone o repositório:

```bash
git clone https://github.com/Miguel-Ankido/SmartFinance.git
```

Entre na pasta:

```bash
cd SmartFinance
```

Instale as dependências:

```bash
npm install
```

---

## ▶️ Executando o projeto

### Metro

Inicie o servidor Metro:

```bash
npm start
```

### Android

Em outro terminal:

```bash
npm run android
```

### iOS

Para iOS, instale as dependências nativas:

```bash
bundle install
bundle exec pod install
```

Depois execute:

```bash
npm run ios
```

---

## 🧪 Testes

Para executar os testes automatizados:

```bash
npm test
```

Para executar o lint:

```bash
npm run lint
```

---

## 🔧 Configuração do Supabase

O SmartFinance utiliza o **Supabase** como serviço de backend.

A integração está centralizada em:

```text
src/services/supabase.ts
```

O projeto utiliza:

* Supabase Authentication;
* Persistência de sessão;
* AsyncStorage;
* Cliente oficial `@supabase/supabase-js`.

### ⚠️ Segurança

Para ambientes de desenvolvimento, é recomendado utilizar variáveis de ambiente em vez de manter configurações de infraestrutura diretamente no código-fonte.

Uma configuração mais adequada seria:

```env
SUPABASE_URL=sua_url
SUPABASE_ANON_KEY=sua_chave
```

> **Importante:** nunca exponha chaves privilegiadas, como `service_role`, dentro de uma aplicação mobile. Apenas credenciais apropriadas para uso público/client-side devem ser utilizadas no aplicativo.

---

## 🎨 Interface

A interface do SmartFinance utiliza uma identidade visual focada em:

* Tema escuro;
* Cards financeiros;
* Indicadores visuais;
* Gráficos;
* Navegação inferior;
* Componentes modais;
* Feedback visual para receitas e despesas.

A navegação principal é composta por cinco áreas:

```text
┌────────┬─────────┬─────────┬──────────┬────────┐
│  Home  │ Extrato │ Limites │ Gráficos │ Perfil │
└────────┴─────────┴─────────┴──────────┴────────┘
```

A aplicação também permite navegação horizontal entre as principais telas.

---

## 📱 Principais telas

### Home

Dashboard financeiro com:

* Saldo;
* Receitas;
* Despesas;
* Fluxo semanal;
* Atividades recentes.

### Extrato

Gerenciamento e consulta das movimentações financeiras.

### Limites

Controle dos limites financeiros definidos pelo usuário.

### Gráficos

Visualização de:

* Receitas x despesas;
* Histórico mensal;
* Gastos por categoria;
* Gastos por banco.

### Perfil

Área relacionada aos dados e configurações da conta.

---

## 🧩 Componentes

O projeto utiliza componentes reutilizáveis para funcionalidades específicas, incluindo:

```text
AddTransactionModal
EditTransactionModal
EditBudgetModal
TransactionDetailModal
BankDetailModal
CategoryDistributionModal
IncomeExpenseDetailModal
ExportReportModal
WeeklyOutflowDetailModal
NotificationPermissionCard
```

Essa organização facilita a manutenção e a evolução da interface.

---

## 🧪 Estrutura de qualidade

O projeto possui configuração para:

* **ESLint** — análise estática do código;
* **Prettier** — padronização de formatação;
* **Jest** — testes automatizados;
* **TypeScript** — verificação estática de tipos.

Scripts disponíveis:

```bash
npm start
npm run android
npm run ios
npm test
npm run lint
```

---

## 📌 Roadmap

Possíveis evoluções para o projeto:

* [ ] Melhorar cobertura de testes;
* [ ] Implementar testes E2E;
* [ ] Separar configurações do Supabase em variáveis de ambiente;
* [ ] Melhorar tratamento global de erros;
* [ ] Adicionar suporte a múltiplas contas bancárias;
* [ ] Adicionar metas financeiras;
* [ ] Criar notificações de vencimentos;
* [ ] Adicionar filtros avançados;
* [ ] Melhorar acessibilidade;
* [ ] Criar pipeline de CI/CD;
* [ ] Disponibilizar builds para Android e iOS.

---

## 📂 Repositório

O código-fonte está disponível no GitHub:

**https://github.com/Miguel-Ankido/SmartFinance**

---

## 👨‍💻 Autor

**Miguel Nunes**

GitHub: **[@Miguel-Ankido](https://github.com/Miguel-Ankido)**

---

## 📄 Licença

Este projeto não possui uma licença open source definida no momento.

Caso o projeto seja disponibilizado publicamente para uso ou contribuição, recomenda-se definir uma licença adequada, como MIT, Apache 2.0 ou outra que corresponda aos objetivos do projeto.

---

<p align="center">
  Desenvolvido com ❤️ usando React Native e TypeScript.
</p>
