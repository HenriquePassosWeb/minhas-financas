// Testes de integraÃ§Ã£o para a API (supertest + Gemini mockado)

process.env.OPENAI_API_KEY = 'chave-secreta-teste';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5500';

// Mocka o iaService (seletor de provedor) para controlar o comportamento
jest.mock('../src/services/iaService', () => ({
  gerarAnalise: jest.fn(),
  modeloAtivo: jest.fn().mockReturnValue('modelo-teste')
}));

const request = require('supertest');
const { criarApp } = require('../src/app');
const { gerarAnalise } = require('../src/services/iaService');
const {
  ErroIAIndisponivel,
  ErroIARateLimit
} = require('../src/middlewares/errorHandler');

const app = criarApp();

const payloadValido = {
  periodo: '09/2025',
  resumo: { totalGasto: 1500.5, quantidadeTransacoes: 20 },
  categorias: [{ categoria: 'alimentacao', nome: 'AlimentaÃ§Ã£o', total: 800.3, quantidade: 12 }]
};

describe('POST /api/analise', () => {
  beforeEach(() => {
    gerarAnalise.mockReset();
  });

  // Property 4: Formato de sucesso padronizado
  // Validates: Requirements 1.1, 1.3
  test('200 com { sucesso: true, analise } em payload vÃ¡lido', async () => {
    gerarAnalise.mockResolvedValue('Sua anÃ¡lise financeira detalhada.');

    const res = await request(app).post('/api/analise').send(payloadValido);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.analise).toBeTruthy();
  });

  test('400 em payload invÃ¡lido', async () => {
    const res = await request(app).post('/api/analise').send({ resumo: {} });
    expect(res.status).toBe(400);
    expect(res.body.sucesso).toBe(false);
  });

  test('502 quando o Gemini estÃ¡ indisponÃ­vel', async () => {
    gerarAnalise.mockRejectedValue(new ErroIAIndisponivel('x'));
    const res = await request(app).post('/api/analise').send(payloadValido);
    expect(res.status).toBe(502);
  });

  test('429 em rate limit', async () => {
    gerarAnalise.mockRejectedValue(new ErroIARateLimit('x'));
    const res = await request(app).post('/api/analise').send(payloadValido);
    expect(res.status).toBe(429);
  });

  // Property 1: Chave nunca exposta
  // Validates: Requirements 2.2
  test('nenhuma resposta contÃ©m a GEMINI_API_KEY', async () => {
    gerarAnalise.mockResolvedValue('AnÃ¡lise ok');
    const res = await request(app).post('/api/analise').send(payloadValido);
    expect(JSON.stringify(res.body)).not.toContain('chave-secreta-teste');
  });
});

describe('GET /health', () => {
  test('retorna 200 { status: ok }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

