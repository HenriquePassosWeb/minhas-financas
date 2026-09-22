// Testes unitÃ¡rios para middlewares/errorHandler.js

process.env.OPENAI_API_KEY = 'chave-teste';
process.env.NODE_ENV = 'production';

const {
  errorHandler,
  ErroValidacao,
  ErroIARateLimit,
  ErroIAIndisponivel,
  ErroIATimeout
} = require('../src/middlewares/errorHandler');

function criarRes() {
  const res = {};
  res.statusCode = null;
  res.corpo = null;
  res.status = (codigo) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (dados) => {
    res.corpo = dados;
    return res;
  };
  return res;
}

describe('errorHandler', () => {
  // Property 3: Formato de erro padronizado
  // Validates: Requirements 4.1
  test('corpo sempre no formato { sucesso: false, erro: string }', () => {
    const res = criarRes();
    errorHandler(new ErroValidacao('campo invÃ¡lido'), {}, res, () => {});

    expect(res.corpo.sucesso).toBe(false);
    expect(typeof res.corpo.erro).toBe('string');
  });

  test('mapeia ErroValidacao para 400', () => {
    const res = criarRes();
    errorHandler(new ErroValidacao('x'), {}, res, () => {});
    expect(res.statusCode).toBe(400);
  });

  test('mapeia ErroIARateLimit para 429', () => {
    const res = criarRes();
    errorHandler(new ErroIARateLimit('x'), {}, res, () => {});
    expect(res.statusCode).toBe(429);
  });

  test('mapeia ErroIAIndisponivel para 502', () => {
    const res = criarRes();
    errorHandler(new ErroIAIndisponivel('x'), {}, res, () => {});
    expect(res.statusCode).toBe(502);
  });

  test('mapeia ErroIATimeout para 503', () => {
    const res = criarRes();
    errorHandler(new ErroIATimeout('x'), {}, res, () => {});
    expect(res.statusCode).toBe(503);
  });

  test('mapeia erro desconhecido para 500', () => {
    const res = criarRes();
    errorHandler(new Error('inesperado'), {}, res, () => {});
    expect(res.statusCode).toBe(500);
  });

  test('omite detalhe/stack em produÃ§Ã£o', () => {
    const res = criarRes();
    errorHandler(new ErroValidacao('x'), {}, res, () => {});
    expect(res.corpo.detalhe).toBeUndefined();
  });
});

