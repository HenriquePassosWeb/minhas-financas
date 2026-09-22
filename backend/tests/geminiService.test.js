// Testes unitÃ¡rios para services/geminiService.js (fetch mockado)

process.env.IA_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'chave-teste';
process.env.OPENAI_API_KEY = 'chave-teste';
process.env.NODE_ENV = 'test';

const { gerarAnalise, chamarGemini, extrairTexto } = require('../src/services/geminiService');
const {
  ErroIARateLimit,
  ErroIAIndisponivel,
  ErroIATimeout
} = require('../src/middlewares/errorHandler');

describe('geminiService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('extrairTexto retorna o texto em resposta bem-sucedida', () => {
    const resposta = {
      candidates: [{ content: { parts: [{ text: 'AnÃ¡lise ok' }] } }]
    };
    expect(extrairTexto(resposta)).toBe('AnÃ¡lise ok');
  });

  test('extrairTexto lanÃ§a ErroIAIndisponivel em estrutura inesperada', () => {
    expect(() => extrairTexto({})).toThrow(ErroIAIndisponivel);
  });

  test('gerarAnalise retorna texto quando a chamada Ã© bem-sucedida', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Resultado' }] } }] })
    });

    const texto = await gerarAnalise('prompt qualquer');
    expect(texto).toBe('Resultado');
  });

  test('gerarAnalise lanÃ§a ErroIARateLimit em HTTP 429', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    await expect(gerarAnalise('p')).rejects.toThrow(ErroIARateLimit);
  });

  // chamarGemini Ã© a chamada Ãºnica (sem retry) â€” testes de erro de resposta ficam aqui
  test('chamarGemini lanÃ§a ErroIAIndisponivel em HTTP 5xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(chamarGemini('p')).rejects.toThrow(ErroIAIndisponivel);
  });

  test('chamarGemini lanÃ§a ErroIAIndisponivel quando falta candidates', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await expect(chamarGemini('p')).rejects.toThrow(ErroIAIndisponivel);
  });

  // Property 6: Timeout garantido
  // Validates: Requirements 5.1, 5.2
  test('gerarAnalise lanÃ§a ErroIATimeout quando a chamada aborta', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      const erro = new Error('aborted');
      erro.name = 'AbortError';
      return Promise.reject(erro);
    });
    await expect(gerarAnalise('p')).rejects.toThrow(ErroIATimeout);
  });
});

