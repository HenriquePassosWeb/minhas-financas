// Teste de propriedade: seleção exata das transações de uma fatura.
// Feature: persistencia-supabase, Property 3

const fc = require('fast-check');

// Predicado usado na exclusão de fatura (mesma regra do app/db):
// uma transação pertence à fatura se bank + referenceMonth + referenceYear coincidem.
function pertenceAFatura(t, bank, referenceMonth, referenceYear) {
  return t.bank === bank
    && t.referenceMonth === referenceMonth
    && t.referenceYear === referenceYear;
}

const arbTransacao = fc.record({
  bank: fc.constantFrom('nubank', 'c6', 'inter', 'itau'),
  referenceMonth: fc.constantFrom('01', '02', '09', '12'),
  referenceYear: fc.constantFrom('2024', '2025', '2026'),
  amount: fc.float({ min: -1000, max: 0, noNaN: true })
});

describe('Exclusão de fatura', () => {
  // Feature: persistencia-supabase, Property 3: seleção exata na exclusão de fatura
  test('seleciona exatamente as transações do bank + período informados', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransacao, { maxLength: 50 }),
        fc.constantFrom('nubank', 'c6', 'inter', 'itau'),
        fc.constantFrom('01', '02', '09', '12'),
        fc.constantFrom('2024', '2025', '2026'),
        (transacoes, bank, mes, ano) => {
          const selecionadas = transacoes.filter(t => pertenceAFatura(t, bank, mes, ano));

          // Toda selecionada casa exatamente com os 3 critérios
          for (const t of selecionadas) {
            expect(t.bank).toBe(bank);
            expect(t.referenceMonth).toBe(mes);
            expect(t.referenceYear).toBe(ano);
          }

          // Nenhuma das NÃO selecionadas casa com os 3 critérios ao mesmo tempo
          const naoSelecionadas = transacoes.filter(t => !pertenceAFatura(t, bank, mes, ano));
          for (const t of naoSelecionadas) {
            const casaTudo = t.bank === bank && t.referenceMonth === mes && t.referenceYear === ano;
            expect(casaTudo).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
