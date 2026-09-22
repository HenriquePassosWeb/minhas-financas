// Seletor de provedor de IA.
// Escolhe qual serviço usar (OpenAI, Gemini ou Groq) conforme config.iaProvider.
// Trocar de provedor é só mudar IA_PROVIDER no .env — nenhuma outra camada muda.

const { config } = require('../config/env');
const openaiService = require('./openaiService');
const geminiService = require('./geminiService');
const groqService = require('./groqService');

// Retorna a análise gerada pelo provedor ativo.
async function gerarAnalise(prompt) {
  if (config.iaProvider === 'gemini') {
    return geminiService.gerarAnalise(prompt);
  }
  if (config.iaProvider === 'groq') {
    return groqService.gerarAnalise(prompt);
  }
  return openaiService.gerarAnalise(prompt);
}

// Retorna o nome do modelo do provedor ativo (para os metadados da resposta).
function modeloAtivo() {
  if (config.iaProvider === 'gemini') {
    return config.geminiModel;
  }
  if (config.iaProvider === 'groq') {
    return config.groqModel;
  }
  return config.openaiModel;
}

module.exports = { gerarAnalise, modeloAtivo };
