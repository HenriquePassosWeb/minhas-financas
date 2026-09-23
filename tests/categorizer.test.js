// Testes do categorizador (categorizer.js) - lógica pura de categorização.
// Não toca em loadCustomRules/saveCustomRule (dependem do DB).

const { Categorizer } = require('../js/categorizer.js');

// Garante estado limpo de regras customizadas antes de cada teste,
// para exercitar apenas as regras padrão e a detecção de fatura.
beforeEach(() => {
  Categorizer.customRules = {};
});

describe('categorizer.js - normalizeText', () => {
  test('remove acentos, caixa e caracteres especiais', () => {
    expect(Categorizer.normalizeText('Alimentação!!!')).toBe('alimentacao');
  });

  test('mantém números e espaços', () => {
    expect(Categorizer.normalizeText('Uber 99 App')).toBe('uber 99 app');
  });
});

describe('categorizer.js - categorize (regras padrão)', () => {
  test('iFood cai em alimentação', () => {
    expect(Categorizer.categorize('IFOOD *Restaurante XPTO')).toBe('alimentacao');
  });

  test('Uber cai em transporte', () => {
    expect(Categorizer.categorize('UBER *TRIP 001')).toBe('transporte');
  });

  test('Netflix cai em lazer (primeira regra que casa)', () => {
    // "netflix" aparece tanto em lazer quanto em assinaturas; a iteração
    // percorre as categorias na ordem de declaração e lazer vem antes.
    expect(Categorizer.categorize('NETFLIX.COM')).toBe('lazer');
  });

  test('farmácia cai em saúde', () => {
    expect(Categorizer.categorize('DROGARIA PACHECO')).toBe('saude');
  });

  test('descrição sem correspondência cai em outros', () => {
    expect(Categorizer.categorize('XYZ ESTABELECIMENTO DESCONHECIDO')).toBe('outros');
  });
});

describe('categorizer.js - detecção de pagamento de fatura', () => {
  test('"Pagamento recebido" é classificado como pagamento_fatura', () => {
    expect(Categorizer.categorize('Pagamento recebido')).toBe('pagamento_fatura');
  });

  test('"Pagto fatura" é classificado como pagamento_fatura', () => {
    expect(Categorizer.categorize('PAGTO FATURA CARTAO')).toBe('pagamento_fatura');
  });

  test('fatura tem prioridade sobre regras padrão', () => {
    // A detecção de fatura ocorre antes das regras de categoria.
    expect(Categorizer.categorize('Pagamento de fatura')).toBe('pagamento_fatura');
  });
});

describe('categorizer.js - regras customizadas', () => {
  test('regra customizada exata tem prioridade sobre regra padrão', () => {
    Categorizer.customRules = { 'ifood': 'lazer' };
    // Sem a regra custom, "ifood" iria para alimentacao.
    expect(Categorizer.categorize('iFood')).toBe('lazer');
  });

  test('regra customizada parcial também casa', () => {
    Categorizer.customRules = { 'salao da maria': 'servicos' };
    expect(Categorizer.categorize('Salao da Maria - corte')).toBe('servicos');
  });
});

describe('categorizer.js - categorizeAll', () => {
  test('categoria existente é preservada', () => {
    const entrada = [{ description: 'IFOOD', category: 'lazer' }];
    const saida = Categorizer.categorizeAll(entrada);
    expect(saida[0].category).toBe('lazer');
  });

  test('usa c6Category quando não há category', () => {
    const entrada = [{ description: 'Qualquer', c6Category: 'transporte' }];
    const saida = Categorizer.categorizeAll(entrada);
    expect(saida[0].category).toBe('transporte');
  });

  test('categoriza automaticamente quando não há category nem c6Category', () => {
    const entrada = [{ description: 'UBER *TRIP' }];
    const saida = Categorizer.categorizeAll(entrada);
    expect(saida[0].category).toBe('transporte');
  });

  test('não muta o objeto original', () => {
    const original = { description: 'UBER *TRIP' };
    Categorizer.categorizeAll([original]);
    expect(original.category).toBeUndefined();
  });
});
