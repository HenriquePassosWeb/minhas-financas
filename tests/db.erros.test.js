// Testes da tradução de erros de infraestrutura em exceções de domínio.
// Feature: persistencia-supabase

const {
  traduzirErro,
  ESessaoAusente,
  EFalhaDeRede,
  EFalhaSupabase
} = require('../js/db.js');

describe('db.js - tradução de erros', () => {
  test('erro de rede vira EFalhaDeRede', () => {
    expect(traduzirErro({ message: 'Failed to fetch' })).toBeInstanceOf(EFalhaDeRede);
    expect(traduzirErro({ message: 'network error' })).toBeInstanceOf(EFalhaDeRede);
  });

  test('erro de sessão/JWT vira ESessaoAusente', () => {
    expect(traduzirErro({ message: 'JWT expired' })).toBeInstanceOf(ESessaoAusente);
    expect(traduzirErro({ message: 'invalid session token' })).toBeInstanceOf(ESessaoAusente);
  });

  test('erro genérico vira EFalhaSupabase', () => {
    expect(traduzirErro({ message: 'algo deu errado' })).toBeInstanceOf(EFalhaSupabase);
    expect(traduzirErro(null)).toBeInstanceOf(EFalhaSupabase);
  });
});
