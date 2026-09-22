// Testes unitários para config/env.js

describe('config/env', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...envOriginal };
    process.env.IA_PROVIDER = 'openai';
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  test('usa defaults de port e modelos quando ausentes', () => {
    process.env.OPENAI_API_KEY = 'chave-teste';
    delete process.env.PORT;
    delete process.env.OPENAI_MODEL;
    delete process.env.GEMINI_MODEL;

    const { carregarEnv } = require('../src/config/env');
    const config = carregarEnv();

    expect(config.port).toBe(3000);
    expect(config.openaiModel).toBe('gpt-4o-mini');
    expect(config.geminiModel).toBe('gemini-3.6-flash');
  });

  test('lança erro quando OPENAI_API_KEY ausente e provider é openai', () => {
    delete process.env.OPENAI_API_KEY;
    process.env.IA_PROVIDER = 'openai';
    expect(() => require('../src/config/env')).toThrow('OPENAI_API_KEY');
  });

  test('lança erro quando GEMINI_API_KEY ausente e provider é gemini', () => {
    process.env.IA_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY;
    expect(() => require('../src/config/env')).toThrow('GEMINI_API_KEY');
  });

  test('retorna objeto imutável', () => {
    process.env.OPENAI_API_KEY = 'chave-teste';
    const { carregarEnv } = require('../src/config/env');
    const config = carregarEnv();

    expect(Object.isFrozen(config)).toBe(true);
  });
});
