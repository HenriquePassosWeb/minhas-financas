// Tratamento centralizado de erros do Express.
// Mapeia classes de exceção de domínio para códigos HTTP e mensagens amigáveis.

const { config } = require('../config/env');

// Classes de erro de domínio
class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

// Erros genéricos de IA (independentes do provedor)
class ErroIARateLimit extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroIARateLimit';
  }
}

class ErroIAIndisponivel extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroIAIndisponivel';
  }
}

class ErroIATimeout extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroIATimeout';
  }
}

// Mapeia cada classe de erro para status HTTP e mensagem exibida ao cliente
function resolverResposta(err) {
  if (err instanceof ErroValidacao) {
    return { status: 400, mensagem: err.message };
  }
  if (err instanceof ErroIARateLimit) {
    return { status: 429, mensagem: 'Cota de análises da IA atingida. Aguarde a renovação ou verifique os créditos do provedor.' };
  }
  if (err instanceof ErroIAIndisponivel) {
    return { status: 502, mensagem: 'Serviço de IA indisponível no momento.' };
  }
  if (err instanceof ErroIATimeout) {
    return { status: 503, mensagem: 'A análise demorou mais que o esperado. Tente novamente.' };
  }
  return { status: 500, mensagem: 'Erro interno do servidor.' };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { status, mensagem } = resolverResposta(err);

  const corpo = { sucesso: false, erro: mensagem };

  if (config.nodeEnv === 'development') {
    corpo.detalhe = err.message;
  }

  res.status(status).json(corpo);
}

module.exports = {
  errorHandler,
  ErroValidacao,
  ErroIARateLimit,
  ErroIAIndisponivel,
  ErroIATimeout,
  // Aliases retrocompatíveis (nomes antigos = classes genéricas)
  ErroGeminiRateLimit: ErroIARateLimit,
  ErroGeminiIndisponivel: ErroIAIndisponivel,
  ErroGeminiTimeout: ErroIATimeout
};
