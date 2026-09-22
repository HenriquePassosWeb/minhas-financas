# Deploy do Backend no Render

Guia para publicar o backend do Minhas Finanças como Web Service no Render.

## Configuração do Web Service

| Campo | Valor |
|-------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Health Check Path | `/health` |

## Variáveis de Ambiente (painel do Render)

Configure em **Environment** (nunca commite valores reais):

| Variável | Valor | Obrigatória |
|----------|-------|-------------|
| `IA_PROVIDER` | `groq`, `openai` ou `gemini` (define o provedor ativo) | Sim |
| `GROQ_API_KEY` | sua chave do Groq (gratuito, sem cartão) | Sim se `IA_PROVIDER=groq` |
| `GROQ_MODEL` | `openai/gpt-oss-20b` (opcional) | Não |
| `OPENAI_API_KEY` | sua chave da OpenAI | Sim se `IA_PROVIDER=openai` |
| `OPENAI_MODEL` | `gpt-4o-mini` (opcional) | Não |
| `GEMINI_API_KEY` | sua chave do Google Gemini | Sim se `IA_PROVIDER=gemini` |
| `GEMINI_MODEL` | `gemini-3.6-flash` (opcional) | Não |
| `GEMINI_MODEL_FALLBACK` | `gemini-flash-lite-latest` (modelo reserva) | Não |
| `CORS_ORIGIN` | URL do frontend (Static Site) | Sim (recomendado) |
| `NODE_ENV` | `production` | Sim |
| `PORT` | injetada automaticamente pelo Render | Não |

> **Trocar de provedor**: basta mudar `IA_PROVIDER` entre `groq`, `openai` e `gemini` e garantir que a chave correspondente esteja configurada. Nenhuma mudança de código é necessária.
>
> **Provedor recomendado**: `groq` — gratuito, sem cartão de crédito, com limite diário generoso (~14.400 requisições/dia).

## Observações

- **Cold start**: no plano free, o serviço "dorme" após inatividade. A primeira requisição pode levar ~30s. O frontend exibe o estado "Analisando seus gastos..." para tolerar essa latência.
- **CORS**: `CORS_ORIGIN` deve apontar para a URL exata do frontend. Em desenvolvimento local, use `http://localhost:5500`.
- **Endpoint principal**: `POST /api/analise`.
- **Health check**: `GET /health` retorna `{ "status": "ok" }`.

## Teste rápido após deploy

```bash
curl https://finance-app-passos.onrender.com/health
```

Deve retornar `{"status":"ok"}`.
