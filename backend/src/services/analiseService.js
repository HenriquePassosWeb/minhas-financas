// Regra de negócio da análise financeira.
// Valida o payload (fail fast), monta o prompt e orquestra a chamada ao Gemini.

const { ErroValidacao } = require('../middlewares/errorHandler');
const { gerarAnalise, modeloAtivo } = require('./iaService');

// Valida o payload. Lança ErroValidacao se inválido; retorna true se válido.
function validarPayload(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroValidacao('Payload ausente ou inválido.');
  }

  const resumo = dados.resumo;
  if (!resumo || typeof resumo.totalGasto !== 'number' || Number.isNaN(resumo.totalGasto) || resumo.totalGasto < 0) {
    throw new ErroValidacao('resumo.totalGasto ausente, não numérico ou negativo.');
  }

  if (!Array.isArray(dados.categorias) || dados.categorias.length === 0) {
    throw new ErroValidacao('categorias ausente ou vazio.');
  }

  const temTotalInvalido = dados.categorias.some(
    (categoria) => typeof categoria.total !== 'number' || Number.isNaN(categoria.total)
  );
  if (temTotalInvalido) {
    throw new ErroValidacao('Todo item de categorias deve ter total numérico.');
  }

  return true;
}

// Formata um valor numérico como moeda brasileira
function formatarReal(valor) {
  return valor.toFixed(2).replace('.', ',');
}

// Monta o prompt do consultor financeiro. Função pura.
function montarPrompt(dados) {
  const linhas = [];

  linhas.push('Você é um consultor financeiro pessoal brasileiro. Analise os gastos do usuário');
  linhas.push('de forma clara, acolhedora e prática. Responda SEMPRE em português do Brasil,');
  linhas.push('usando valores em R$. Não invente dados além dos fornecidos.');
  linhas.push('');
  linhas.push(`## Dados do período ${dados.periodo || 'informado'}`);
  linhas.push(`Total gasto: R$ ${formatarReal(dados.resumo.totalGasto)}`);

  if (typeof dados.resumo.quantidadeTransacoes === 'number') {
    linhas.push(`Transações: ${dados.resumo.quantidadeTransacoes}`);
  }

  if (dados.comparativo && typeof dados.comparativo.totalGastoAnterior === 'number') {
    const anterior = dados.comparativo.totalGastoAnterior;
    const variacao = anterior > 0 ? (((dados.resumo.totalGasto - anterior) / anterior) * 100).toFixed(1) : '0';
    linhas.push(`Período anterior (${dados.comparativo.periodoAnterior || 'anterior'}): R$ ${formatarReal(anterior)} (variação ${variacao}%)`);
  }

  linhas.push('');
  linhas.push('## Gastos por categoria (maior para menor)');
  const categoriasOrdenadas = [...dados.categorias].sort((a, b) => b.total - a.total);
  categoriasOrdenadas.forEach((categoria) => {
    const nome = categoria.nome || categoria.categoria;
    const quantidade = categoria.quantidade != null ? ` (${categoria.quantidade} transações)` : '';
    linhas.push(`- ${nome}: R$ ${formatarReal(categoria.total)}${quantidade}`);
  });

  if (Array.isArray(dados.estabelecimentos) && dados.estabelecimentos.length > 0) {
    linhas.push('');
    linhas.push('## Principais estabelecimentos');
    dados.estabelecimentos.forEach((estabelecimento) => {
      const quantidade = estabelecimento.quantidade != null ? ` (${estabelecimento.quantidade}x)` : '';
      linhas.push(`- ${estabelecimento.nome}: R$ ${formatarReal(estabelecimento.total)}${quantidade}`);
    });
  }

  linhas.push('');
  linhas.push('## O que você deve entregar');
  linhas.push('Responda em MARKDOWN, com EXATAMENTE estas 5 seções, nesta ordem,');
  linhas.push('cada uma começando com "## " e o emoji indicado:');
  linhas.push('');
  linhas.push('## 📊 Resumo do mês');
  linhas.push('2 a 3 frases sobre o panorama geral. Use **negrito** nos valores em R$.');
  linhas.push('');
  linhas.push('## 💸 Onde o dinheiro foi');
  linhas.push('Apresente uma TABELA markdown com as colunas: Categoria | Valor | % do total | Transações.');
  linhas.push('Ordene da maior para a menor. Depois, 1 frase de destaque começando com "> ".');
  linhas.push('');
  linhas.push('## ⚠️ Alertas');
  linhas.push('Lista com "- " de gastos elevados, assinaturas duplicadas ou recorrências caras.');
  linhas.push('');
  linhas.push('## 💡 Sugestões de economia');
  linhas.push('Lista com "- " de 3 a 5 dicas concretas e realistas, com valores estimados quando possível.');
  linhas.push('');
  linhas.push('## 🎯 Meta sugerida');
  linhas.push('1 a 2 frases com uma meta simples e atingível para o próximo mês.');
  linhas.push('');
  linhas.push('REGRAS DE FORMATAÇÃO:');
  linhas.push('- Sempre use "## " (dois hashtags e espaço) nos títulos das seções.');
  linhas.push('- Use tabela markdown de verdade (com | e a linha separadora |---|).');
  linhas.push('- Valores sempre no formato R$ 0.000,00.');
  linhas.push('- Seja específico com os números fornecidos. Evite conselhos genéricos.');
  linhas.push('- Não escreva nada fora dessas 5 seções.');

  return linhas.join('\n');
}

// Orquestra a análise: valida, monta o prompt e chama o Gemini.
async function analisarFinancas(dados) {
  validarPayload(dados);

  const prompt = montarPrompt(dados);
  const analise = await gerarAnalise(prompt);

  return {
    analise: analise,
    meta: {
      modelo: modeloAtivo(),
      periodo: dados.periodo || null,
      geradoEm: new Date().toISOString()
    }
  };
}

module.exports = { analisarFinancas, validarPayload, montarPrompt };
