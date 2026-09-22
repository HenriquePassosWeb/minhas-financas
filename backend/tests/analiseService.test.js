// Testes unitÃ¡rios e property-based para services/analiseService.js

process.env.IA_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = 'chave-teste';
process.env.NODE_ENV = 'test';

// Mocka o iaService (seletor de provedor) para nao bater na API real
jest.mock('../src/services/iaService', () => ({
  gerarAnalise: jest.fn().mockResolvedValue('Analise gerada'),
  modeloAtivo: jest.fn().mockReturnValue('modelo-teste')
}));

const fc = require('fast-check');
const { analisarFinancas, validarPayload, montarPrompt } = require('../src/services/analiseService');
const { gerarAnalise } = require('../src/services/iaService');
const { ErroValidacao } = require('../src/middlewares/errorHandler');

const payloadValido = {
  periodo: '09/2025',
  resumo: { totalGasto: 1500.5, quantidadeTransacoes: 20 },
  categorias: [
    { categoria: 'alimentacao', nome: 'AlimentaÃ§Ã£o', total: 800.3, quantidade: 12 },
    { categoria: 'transporte', nome: 'Transporte', total: 700.2, quantidade: 8 }
  ]
};

describe('validarPayload', () => {
  test('retorna true para payload vÃ¡lido', () => {
    expect(validarPayload(payloadValido)).toBe(true);
  });

  test('lanÃ§a ErroValidacao quando dados Ã© null', () => {
    expect(() => validarPayload(null)).toThrow(ErroValidacao);
  });

  test('lanÃ§a ErroValidacao quando totalGasto Ã© negativo', () => {
    const invalido = { ...payloadValido, resumo: { totalGasto: -1 } };
    expect(() => validarPayload(invalido)).toThrow(ErroValidacao);
  });

  test('lanÃ§a ErroValidacao quando categorias estÃ¡ vazio', () => {
    const invalido = { ...payloadValido, categorias: [] };
    expect(() => validarPayload(invalido)).toThrow(ErroValidacao);
  });

  test('lanÃ§a ErroValidacao quando um item de categoria nÃ£o tem total numÃ©rico', () => {
    const invalido = { ...payloadValido, categorias: [{ categoria: 'x' }] };
    expect(() => validarPayload(invalido)).toThrow(ErroValidacao);
  });

  // Property 2: ValidaÃ§Ã£o antes de custo
  // Validates: Requirements 3.6
  test('qualquer entrada sem categorias vÃ¡lidas sempre lanÃ§a ErroValidacao', () => {
    fc.assert(
      fc.property(fc.anything(), (entrada) => {
        const ehValido =
          entrada &&
          typeof entrada === 'object' &&
          !Array.isArray(entrada) &&
          entrada.resumo &&
          typeof entrada.resumo.totalGasto === 'number' &&
          !Number.isNaN(entrada.resumo.totalGasto) &&
          entrada.resumo.totalGasto >= 0 &&
          Array.isArray(entrada.categorias) &&
          entrada.categorias.length > 0 &&
          entrada.categorias.every((c) => typeof c.total === 'number' && !Number.isNaN(c.total));

        if (ehValido) {
          return true; // ignora entradas por acaso vÃ¡lidas
        }
        try {
          validarPayload(entrada);
          return false; // nÃ£o deveria passar
        } catch (erro) {
          return erro instanceof ErroValidacao;
        }
      })
    );
  });
});

describe('montarPrompt', () => {
  test('inclui perÃ­odo, total e nomes de categorias', () => {
    const prompt = montarPrompt(payloadValido);
    expect(prompt).toContain('09/2025');
    expect(prompt).toContain('1500,50');
    expect(prompt).toContain('AlimentaÃ§Ã£o');
  });

  // Property 5: Pureza do prompt
  // Validates: Requirements 6.5
  test('Ã© determinÃ­stico: mesmo input produz mesmo output', () => {
    expect(montarPrompt(payloadValido)).toBe(montarPrompt(payloadValido));
  });
});

describe('analisarFinancas', () => {
  beforeEach(() => {
    gerarAnalise.mockClear();
  });

  test('retorna { analise, meta } em sucesso', async () => {
    const resultado = await analisarFinancas(payloadValido);
    expect(resultado.analise).toBe('Analise gerada');
    expect(resultado.meta.modelo).toBeDefined();
  });

  // Property 2: ValidaÃ§Ã£o antes de custo (nÃ£o chama o Gemini se invÃ¡lido)
  // Validates: Requirements 3.6
  test('nÃ£o chama o Gemini quando o payload Ã© invÃ¡lido', async () => {
    await expect(analisarFinancas(null)).rejects.toThrow(ErroValidacao);
    expect(gerarAnalise).not.toHaveBeenCalled();
  });
});

