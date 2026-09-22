// Configuração de ambiente - lida e validada uma única vez na inicialização.
// Falha rápido (fail fast) se uma variável obrigatória estiver ausente.

class EConfiguracaoInvalida extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'EConfiguracaoInvalida';
  }
}

function carregarEnv() {
  // Provedor de IA ativo: 'groq' (padrão), 'openai' ou 'gemini'
  const iaProvider = (process.env.IA_PROVIDER || 'groq').toLowerCase();

  const openaiApiKey = process.env.OPENAI_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const groqApiKey = process.env.GROQ_API_KEY || '';

  // Valida a chave do provedor ATIVO (fail fast)
  if (iaProvider === 'openai' && openaiApiKey.trim() === '') {
    throw new EConfiguracaoInvalida('OPENAI_API_KEY ausente ou vazia. O servidor não pode iniciar com IA_PROVIDER=openai.');
  }
  if (iaProvider === 'gemini' && geminiApiKey.trim() === '') {
    throw new EConfiguracaoInvalida('GEMINI_API_KEY ausente ou vazia. O servidor não pode iniciar com IA_PROVIDER=gemini.');
  }
  if (iaProvider === 'groq' && groqApiKey.trim() === '') {
    throw new EConfiguracaoInvalida('GROQ_API_KEY ausente ou vazia. O servidor não pode iniciar com IA_PROVIDER=groq.');
  }

  const config = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    iaProvider: iaProvider,

    // OpenAI
    openaiApiKey: openaiApiKey,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

    // Gemini
    geminiApiKey: geminiApiKey,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    geminiModelFallback: process.env.GEMINI_MODEL_FALLBACK || 'gemini-flash-lite-latest',

    // Groq (endpoint compatível com OpenAI)
    groqApiKey: groqApiKey,
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    groqModelFallback: process.env.GROQ_MODEL_FALLBACK || 'openai/gpt-oss-20b',

    corsOrigin: process.env.CORS_ORIGIN || '*',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || ''
  };

  return Object.freeze(config);
}

module.exports = { config: carregarEnv(), carregarEnv, EConfiguracaoInvalida };
