// Testes de propriedade da camada de dados (db.js) - funções puras.
// Feature: persistencia-supabase

const fc = require('fast-check');
const { paraLinha, paraTransacao } = require('../js/db.js');

// Gerador de uma transação válida no formato JS
const arbTransacao = fc.record({
  date: fc.date({ min: new Date('2000-01-01'), max: new Date('2100-01-01') }),
  description: fc.string({ minLength: 1, maxLength: 60 }),
  amount: fc.float({ min: -100000, max: 100000, noNaN: true }),
  category: fc.constantFrom('alimentacao', 'transporte', 'saude', 'outros', 'lazer'),
  type: fc.constantFrom('expense', 'income'),
  bank: fc.constantFrom('nubank', 'c6', 'inter', 'itau', 'bradesco', 'generic'),
  referenceMonth: fc.constantFrom('01', '02', '03', '09', '12'),
  referenceYear: fc.constantFrom('2024', '2025', '2026')
});

describe('db.js - conversão de formato', () => {
  // Feature: persistencia-supabase, Property 1: round-trip de conversão preserva campos de domínio
  test('paraLinha -> paraTransacao preserva os campos de domínio', () => {
    fc.assert(
      fc.property(arbTransacao, (t) => {
        const linha = paraLinha(t, 'user-abc');
        // simula o id gerado pelo banco na volta
        const volta = paraTransacao({ ...linha, id: 'id-1' });

        // Campos de texto/categoria preservados
        expect(volta.description).toBe(t.description);
        expect(volta.category).toBe(t.category);
        expect(volta.type).toBe(t.type);
        expect(volta.bank).toBe(t.bank);
        expect(volta.referenceMonth).toBe(t.referenceMonth);
        expect(volta.referenceYear).toBe(t.referenceYear);
        // Amount preservado numericamente
        expect(volta.amount).toBeCloseTo(t.amount, 5);
        // Data preservada até o dia (a persistência guarda YYYY-MM-DD)
        const esperado = t.date.toISOString().slice(0, 10);
        expect(volta.date.toISOString().slice(0, 10)).toBe(esperado);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: persistencia-supabase, Property 2: isolamento por usuário na camada de dados
  test('paraLinha sempre carrega o user_id informado', () => {
    fc.assert(
      fc.property(arbTransacao, fc.string({ minLength: 1, maxLength: 40 }), (t, userId) => {
        const linha = paraLinha(t, userId);
        expect(linha.user_id).toBe(userId);
      }),
      { numRuns: 100 }
    );
  });
});
