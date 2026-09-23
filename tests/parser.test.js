// Testes do parser de CSV (parser.js) - funções puras de parsing.
// Cobre parseAmount, parseDate, detectFormat, csvToArray e parse ponta a ponta.

const { CSVParser } = require('../js/parser.js');

describe('parser.js - parseAmount', () => {
  test('formato brasileiro: milhar com ponto e decimal com vírgula', () => {
    expect(CSVParser.parseAmount('1.234,56')).toBeCloseTo(1234.56, 2);
  });

  test('formato americano: milhar com vírgula e decimal com ponto', () => {
    expect(CSVParser.parseAmount('1,234.56')).toBeCloseTo(1234.56, 2);
  });

  test('só vírgula é tratada como decimal', () => {
    expect(CSVParser.parseAmount('19,90')).toBeCloseTo(19.90, 2);
  });

  test('só ponto é tratado como decimal', () => {
    expect(CSVParser.parseAmount('19.90')).toBeCloseTo(19.90, 2);
  });

  test('sinal negativo com espaço e símbolo de moeda', () => {
    expect(CSVParser.parseAmount('- R$ 1.295,31')).toBeCloseTo(-1295.31, 2);
  });

  test('remove símbolo R$ e espaços', () => {
    expect(CSVParser.parseAmount('R$ 50,00')).toBeCloseTo(50.00, 2);
  });

  test('valor negativo simples', () => {
    expect(CSVParser.parseAmount('-42,10')).toBeCloseTo(-42.10, 2);
  });

  test('ponto isolado é tratado como decimal (1.000 = 1,0)', () => {
    // "1.000" é ambíguo (mil no BR, um ponto zero no US). Sem vírgula presente,
    // o parser mantém o ponto como separador decimal: 1.000 -> 1.
    expect(CSVParser.parseAmount('1.000')).toBeCloseTo(1, 2);
  });

  test('milhar com decimal no formato brasileiro é interpretado corretamente', () => {
    expect(CSVParser.parseAmount('1.000,00')).toBeCloseTo(1000, 2);
  });

  test('já numérico é retornado como está', () => {
    expect(CSVParser.parseAmount(-42.5)).toBe(-42.5);
  });

  test('vazio ou nulo retorna 0', () => {
    expect(CSVParser.parseAmount('')).toBe(0);
    expect(CSVParser.parseAmount(null)).toBe(0);
    expect(CSVParser.parseAmount(undefined)).toBe(0);
  });

  test('texto sem número retorna 0', () => {
    expect(CSVParser.parseAmount('abc')).toBe(0);
  });
});

describe('parser.js - parseDate', () => {
  test('DD/MM/YYYY', () => {
    const d = CSVParser.parseDate('25/12/2024');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(11); // dezembro = 11
    expect(d.getDate()).toBe(25);
  });

  test('DD-MM-YYYY', () => {
    const d = CSVParser.parseDate('01-03-2025');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(1);
  });

  test('ano com 2 dígitos vira 20XX', () => {
    const d = CSVParser.parseDate('05/06/24');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(5);
  });

  test('YYYY-MM-DD', () => {
    const d = CSVParser.parseDate('2023-07-15');
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(15);
  });

  test('string vazia retorna uma data válida (fallback para hoje)', () => {
    const d = CSVParser.parseDate('');
    expect(d instanceof Date).toBe(true);
    expect(isNaN(d)).toBe(false);
  });

  test('data inválida cai no fallback e retorna Date válido', () => {
    const d = CSVParser.parseDate('não é data');
    expect(d instanceof Date).toBe(true);
    expect(isNaN(d)).toBe(false);
  });
});

describe('parser.js - detectFormat', () => {
  test('detecta Nubank pelo header date,title,amount', () => {
    expect(CSVParser.detectFormat('date,title,amount\n2024-01-01,Mercado,50')).toBe('nubank');
  });

  test('detecta C6 pelo header', () => {
    const header = 'Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)';
    expect(CSVParser.detectFormat(header)).toBe('c6');
  });

  test('detecta Inter por palavra-chave no conteúdo', () => {
    expect(CSVParser.detectFormat('Extrato\nbanco inter\nData,Descrição,Valor')).toBe('inter');
  });

  test('formato desconhecido cai em generic', () => {
    expect(CSVParser.detectFormat('col1,col2,col3\na,b,c')).toBe('generic');
  });
});

describe('parser.js - csvToArray', () => {
  test('respeita aspas com vírgula dentro', () => {
    const linhas = CSVParser.csvToArray('a,"b,c",d');
    expect(linhas[0]).toEqual(['a', 'b,c', 'd']);
  });

  test('trata quebra de linha \\r\\n', () => {
    const linhas = CSVParser.csvToArray('a,b\r\nc,d');
    expect(linhas).toEqual([['a', 'b'], ['c', 'd']]);
  });

  test('aspas duplas escapadas viram uma aspa', () => {
    const linhas = CSVParser.csvToArray('"ele disse ""oi""",x');
    expect(linhas[0]).toEqual(['ele disse "oi"', 'x']);
  });

  test('ignora linhas totalmente vazias', () => {
    const linhas = CSVParser.csvToArray('a,b\n\nc,d');
    expect(linhas).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('parser.js - parse ponta a ponta (Nubank)', () => {
  const csv = 'date,title,amount\n2024-01-10,Mercado Silva,150,00\n2024-01-11,Pagamento recebido,-500,00';

  test('extrai transações e classifica income/expense pelo sinal', () => {
    const transacoes = CSVParser.parse(csv, 'auto');
    expect(transacoes).toHaveLength(2);

    // Nubank: positivo = compra (expense), negativo = crédito (income)
    expect(transacoes[0].description).toBe('Mercado Silva');
    expect(transacoes[0].type).toBe('expense');
    expect(transacoes[0].amount).toBeGreaterThan(0);

    expect(transacoes[1].type).toBe('income');
    expect(transacoes[1].amount).toBeLessThan(0);
  });

  test('cada transação recebe um id', () => {
    const transacoes = CSVParser.parse(csv, 'auto');
    transacoes.forEach((t) => expect(typeof t.id).toBe('string'));
  });
});
