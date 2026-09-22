// Integração isolada com a API da OpenAI (Chat Completions).
// Sem regra de negócio: monta a chamada, aplica timeout e traduz falhas
// da API em exceções de domínio.

const { config } = require('../config/env');
const {
  ErroIARateLimit,
  ErroIAIndisponivel,
  ErroIATimeout
} = require('../middlewares/errorHandler');

const TIMEOUT_MS = 60000;

// Extrai o texto da resposta da OpenAI com verificação defensiva
function extrairTexto(respostaOpenai) {
  const texto = respostaOpenai
    && respostaOpenai.choices
    && respostaOpenai.choices[0]
    && respostaOpenai.choices[0].message
    && respostaOpenai.choices[0].message.content;

  if (!texto) {
    throw new ErroIAIndisponivel('Resposta da OpenAI em formato inesperado.');
  }
  return texto;
}

// Gera a análise chamando a API da OpenAI. Recebe o prompt já montado.
async function gerarAnalise(prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const corpo = {
    model: config.openaiModel,
    messages: [
      { role: 'system', content: 'Você é um consultor financeiro pessoal brasileiro, direto e prático.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1200
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify(corpo),
      signal: controller.signal
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new ErroIATimeout('Tempo limite excedido ao chamar a OpenAI.');
    }
    throw new ErroIAIndisponivel('Falha de conexão com a OpenAI.');
  } finally {
    clearTimeout(timer);
  }

  if (resposta.status === 429) {
    const detalhe = await resposta.json().catch(() => ({}));
    const codigo = detalhe && detalhe.error && detalhe.error.code;
    if (codigo === 'insufficient_quota') {
      throw new ErroIARateLimit('Sem créditos na conta da OpenAI. Adicione créditos em platform.openai.com/settings/organization/billing.');
    }
    throw new ErroIARateLimit('Limite de requisições da OpenAI excedido. Tente novamente em instantes.');
  }
  if (resposta.status >= 500) {
    throw new ErroIAIndisponivel('OpenAI retornou erro de servidor.');
  }
  if (!resposta.ok) {
    throw new ErroIAIndisponivel('OpenAI retornou resposta inesperada.');
  }

  const json = await resposta.json();
  return extrairTexto(json);
}

module.exports = { gerarAnalise, extrairTexto };
