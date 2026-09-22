# 💰 Minhas Finanças

Aplicativo de controle financeiro pessoal focado em faturas de cartão de crédito.
Importe o CSV do seu banco, veja seus gastos categorizados e receba uma análise
inteligente do seu consumo gerada por IA.

## ✨ Funcionalidades

- 📁 **Importação de CSV** — Nubank, C6, Inter, Itaú, Bradesco e formato genérico
- 🏷️ **Categorização automática** por estabelecimento, com ajuste manual
- 📊 **Gráficos interativos** — gastos por categoria e evolução diária
- 🏪 **Agrupamento por estabelecimento** — veja quanto gastou em cada lugar
- 🔍 **Filtros** por período, banco, categoria e busca
- 🤖 **Consultor Financeiro IA** — análise dos gastos com sugestões de economia
- 🔐 **Autenticação** de usuários (email/senha via Supabase)

## 🏗️ Arquitetura

O projeto é dividido em **frontend** (Vanilla JS) e **backend** (Node.js + Express).

```
minhas-financas/
├── index.html / login.html        # Páginas
├── styles.css / login.css         # Estilos
├── js/                            # Frontend (Vanilla JS)
│   ├── app.js                     # Lógica principal
│   ├── parser.js                  # Parser CSV multi-banco
│   ├── categorizer.js             # Categorização automática
│   ├── charts.js                  # Gráficos (Chart.js)
│   ├── categories.js              # Definição de categorias
│   ├── ai-consultant.js           # Integração com o backend de IA
│   ├── auth.js / auth-guard.js    # Autenticação (Supabase)
│   ├── login.js                   # Tela de login
│   └── supabase-config.js         # Cliente Supabase
└── backend/                       # API Node.js + Express
    ├── server.js                  # Ponto de entrada
    └── src/
        ├── config/env.js          # Configuração e validação de ambiente
        ├── controllers/           # Camada HTTP
        ├── services/              # Regra de negócio + integração com IA
        ├── routes/                # Rotas da API
        ├── middlewares/           # Tratamento de erros
        └── app.js                 # Configuração do Express
```

### Backend multi-provedor de IA

O backend suporta **3 provedores de IA** (Groq, OpenAI e Gemini), selecionáveis por
configuração (`IA_PROVIDER`) sem alterar código, com fallback automático de modelo.
Provedor padrão: **Groq** (gratuito).

## 🚀 Como rodar localmente

### Backend

```bash
cd backend
npm install
cp .env.example .env   # preencha as chaves
npm start              # sobe em http://localhost:3000
```

### Frontend

Sirva a raiz do projeto com um servidor estático (o Supabase Auth exige http://):

```bash
npx serve -l 5500 .
```

Acesse `http://localhost:5500/login.html`.

## ⚙️ Configuração

Crie `backend/.env` a partir de `backend/.env.example`:

```env
IA_PROVIDER=groq
GROQ_API_KEY=sua_chave_groq
GROQ_MODEL=openai/gpt-oss-120b
GROQ_MODEL_FALLBACK=openai/gpt-oss-20b
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5500
```

- **Groq** (gratuito, sem cartão): https://console.groq.com
- **OpenAI**: https://platform.openai.com
- **Gemini**: https://aistudio.google.com/apikey

## 🧩 API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/analise` | Recebe os dados financeiros e retorna a análise da IA |
| `GET` | `/health` | Health check (retorna `{ "status": "ok" }`) |

## 🛠️ Tecnologias

- **Frontend**: HTML, CSS, JavaScript (Vanilla), Chart.js
- **Backend**: Node.js, Express
- **Auth**: Supabase
- **IA**: Groq / OpenAI / Gemini (multi-provedor)
- **Deploy**: Render

## 📦 Deploy

Instruções detalhadas de deploy do backend no Render em
[`backend/README-DEPLOY.md`](backend/README-DEPLOY.md).
