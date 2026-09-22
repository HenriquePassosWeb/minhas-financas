// IntegraÃ§Ã£o isolada com a API do Google Gemini.
// Sem regra de negÃ³cio: apenas monta a chamada, aplica timeout e traduz falhas
// da API em exceÃ§Ãµes de domÃ­nio.

const { config } = require('../config/env');
const {
  ErroIARateLimit,
  ErroIAIndisponivel,
  ErroIATimeout
} = require('../middlewares/errorHandler');

const TIMEOUT_MS = 60000;
const MAX_TENTATIVAS = 5;
const ESPERA_ENTRE_TENTATIVAS_MS = 1200;

// Pausa entre tentativas
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extrai o texto da resposta do Gemini com verificaÃ§Ã£o defensiva
function extrairTexto(respostaGemini) {
  const texto = respostaGemini
    && respostaGemini.candidates
    && respostaGemini.candidates[0]
    && respostaGemini.candidates[0].content
    && respostaGemini.candidates[0].content.parts
    && respostaGemini.candidates[0].content.parts[0]
    && respostaGemini.candidates[0].content.parts[0].text;

  if (!texto) {
    throw new ErroIAIndisponivel('Resposta do Gemini em formato inesperado.');
  }
  return texto;
}

// Faz uma Ãºnica chamada ao Gemini para o modelo informado.
// Traduz falhas em exceÃ§Ãµes de domÃ­nio.
async function chamarGemini(prompt, modelo) {
  const modeloAlvo = modelo || config.geminiModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloAlvo}:generateContent`;

  const corpo = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.geminiApiKey
      },
      body: JSON.stringify(corpo),
      signal: controller.signal
    });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new ErroIATimeout('Tempo limite excedido ao chamar o Gemini.');
    }
    throw new ErroIAIndisponivel('Falha de conexÃ£o com o Gemini.');
  } finally {
    clearTimeout(timer);
  }

  if (resposta.status === 429) {
    throw new ErroIARateLimit('Limite de requisiÃ§Ãµes do Gemini excedido.');
  }
  if (resposta.status >= 500) {
    throw new ErroIAIndisponivel('Gemini retornou erro de servidor.');
  }
  if (!resposta.ok) {
    throw new ErroIAIndisponivel('Gemini retornou resposta inesperada.');
  }

  const json = await resposta.json();
  return extrairTexto(json);
}

// Tenta um modelo com retry para falhas transitÃ³rias (503 de alta demanda).
// Rate limit e timeout sÃ£o propagados imediatamente (retry nÃ£o ajudaria).
async function tentarModeloComRetry(prompt, modelo) {
  let ultimoErro;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    try {
      return await chamarGemini(prompt, modelo);
    } catch (erro) {
      ultimoErro = erro;
      if (!(erro instanceof ErroIAIndisponivel) || tentativa === MAX_TENTATIVAS) {
        throw erro;
      }
      await esperar(ESPERA_ENTRE_TENTATIVAS_MS * tentativa);
    }
  }

  throw ultimoErro;
}

// Gera a anÃ¡lise tentando o modelo principal e, se ele ficar indisponÃ­vel,
// caindo automaticamente para o modelo de fallback.
async function gerarAnalise(prompt) {
  try {
    return await tentarModeloComRetry(prompt, config.geminiModel);
  } catch (erro) {
    const podeUsarFallback = erro instanceof ErroIAIndisponivel
      && config.geminiModelFallback
      && config.geminiModelFallback !== config.geminiModel;

    if (!podeUsarFallback) {
      throw erro;
    }
    // Modelo principal indisponÃ­vel: tenta o fallback.
    return await tentarModeloComRetry(prompt, config.geminiModelFallback);
  }
}

module.exports = { gerarAnalise, chamarGemini, tentarModeloComRetry, extrairTexto };

