// Integração isolada com a API do Groq (compatível com o formato OpenAI).
// Sem regra de negócio: monta a chamada, aplica timeout e traduz falhas
// da API em exceções de domínio.

const { config } = require('../config/env');
const {
  ErroIARateLimit,
  ErroIAIndisponivel,
  ErroIATimeout
} = require('../middlewares/errorHandler');

const TIMEOUT_MS = 60000;

// Extrai o texto da resposta do Groq (formato OpenAI) com verificação defensiva
function extrairTexto(resposta) {
  const texto = resposta
    && resposta.choices
    && resposta.choices[0]
    && resposta.choices[0].message
    && resposta.choices[0].message.content;

  if (!texto) {
    throw new ErroIAIndisponivel('Resposta do Groq em formato inesperado.');
  }
  return texto;
}

// Faz uma única chamada ao Groq para o modelo informado.
async function chamarGroq(prompt, modelo) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const corpo = {
    model: modelo,
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
        Authorization: `Bearer ${config.groqApiKey}`
      },
      body: JSON.stringify(corpo),
      signal: controller.signal
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new ErroIATimeout('Tempo limite excedido ao chamar o Groq.');
    }
    throw new ErroIAIndisponivel('Falha de conexão com o Groq.');
  } finally {
    clearTimeout(timer);
  }

  if (resposta.status === 429) {
    throw new ErroIARateLimit('Limite de requisições do Groq excedido. Tente novamente em instantes.');
  }
  if (resposta.status >= 500) {
    throw new ErroIAIndisponivel('Groq retornou erro de servidor.');
  }
  if (!resposta.ok) {
    throw new ErroIAIndisponivel('Groq retornou resposta inesperada.');
  }

  const json = await resposta.json();
  return extrairTexto(json);
}

// Gera a análise tentando o modelo principal e, se ele ficar indisponível ou
// estourar o limite, caindo automaticamente para o modelo de fallback.
async function gerarAnalise(prompt) {
  try {
    return await chamarGroq(prompt, config.groqModel);
  } catch (erro) {
    const ehTransitorio = erro instanceof ErroIAIndisponivel
      || erro instanceof ErroIARateLimit
      || erro instanceof ErroIATimeout;
    const temFallback = config.groqModelFallback
      && config.groqModelFallback !== config.groqModel;

    if (!ehTransitorio || !temFallback) {
      throw erro;
    }
    // Modelo principal falhou: tenta o fallback.
    return await chamarGroq(prompt, config.groqModelFallback);
  }
}

module.exports = { gerarAnalise, chamarGroq, extrairTexto };
