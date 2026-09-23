// Camada de acesso a dados - Supabase.
// Única porta de entrada para o banco: encapsula queries, conversão de formato
// (camelCase/Date <-> snake_case/ISO) e tradução de erros em exceções de domínio.
// Mantém também um cache de leitura no localStorage (fallback).

// ---- Classes de erro de domínio ----
class ESessaoAusente extends Error {
  constructor(mensagem) {
    super(mensagem || 'Sua sessão expirou. Faça login novamente.');
    this.name = 'ESessaoAusente';
  }
}

class EFalhaDeRede extends Error {
  constructor(mensagem) {
    super(mensagem || 'Sem conexão com o servidor. Verifique sua internet e tente novamente.');
    this.name = 'EFalhaDeRede';
  }
}

class EFalhaSupabase extends Error {
  constructor(mensagem) {
    super(mensagem || 'Não foi possível concluir a operação. Tente novamente.');
    this.name = 'EFalhaSupabase';
  }
}

// Chaves de cache no localStorage
const CACHE_TRANSACOES = 'financasTransactions';
const CACHE_REGRAS = 'customCategorizationRules';

// ---- Conversão de formato ----

// JS (camelCase, Date) -> linha do banco (snake_case, ISO)
function paraLinha(t, userId) {
  return {
    user_id: userId,
    date: t.date instanceof Date ? t.date.toISOString().slice(0, 10) : String(t.date).slice(0, 10),
    description: t.description,
    amount: t.amount,
    category: t.category,
    type: t.type,
    bank: t.bank,
    reference_month: t.referenceMonth,
    reference_year: t.referenceYear
  };
}

// Linha do banco (snake_case) -> JS (camelCase, Date)
function paraTransacao(linha) {
  return {
    id: linha.id,
    date: new Date(linha.date),
    description: linha.description,
    amount: Number(linha.amount),
    category: linha.category,
    type: linha.type,
    bank: linha.bank,
    referenceMonth: linha.reference_month,
    referenceYear: linha.reference_year
  };
}

// Decide qual exceção de domínio lançar a partir de um erro do Supabase/rede
function traduzirErro(erro) {
  if (!erro) {
    return new EFalhaSupabase();
  }
  const msg = (erro.message || '').toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch')) {
    return new EFalhaDeRede();
  }
  if (msg.includes('jwt') || msg.includes('session') || msg.includes('token')) {
    return new ESessaoAusente();
  }
  return new EFalhaSupabase(erro.message);
}

const DB = {
  ESessaoAusente,
  EFalhaDeRede,
  EFalhaSupabase,

  // Retorna o user_id da sessão atual ou lança ESessaoAusente
  async obterUserId() {
    let data;
    try {
      const resultado = await supabaseClient.auth.getUser();
      data = resultado.data;
      if (resultado.error) {
        throw traduzirErro(resultado.error);
      }
    } catch (erro) {
      if (erro instanceof ESessaoAusente || erro instanceof EFalhaDeRede || erro instanceof EFalhaSupabase) {
        throw erro;
      }
      throw new EFalhaDeRede();
    }
    if (!data || !data.user) {
      throw new ESessaoAusente();
    }
    return data.user.id;
  },

  // ---- Transações ----

  // Carrega todas as transações do usuário. Atualiza o cache em sucesso.
  async carregarTransacoes() {
    const userId = await this.obterUserId();
    const { data, error } = await supabaseClient
      .from('transacoes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      throw traduzirErro(error);
    }

    const transacoes = (data || []).map(paraTransacao);
    this.gravarCacheTransacoes(transacoes);
    return transacoes;
  },

  // Insere transações em lote. Retorna as linhas com ids gerados (formato JS).
  async inserirTransacoes(transacoes) {
    if (!Array.isArray(transacoes) || transacoes.length === 0) {
      return [];
    }
    const userId = await this.obterUserId();
    const linhas = transacoes.map((t) => paraLinha(t, userId));

    const { data, error } = await supabaseClient
      .from('transacoes')
      .insert(linhas)
      .select('*');

    if (error) {
      throw traduzirErro(error);
    }
    return (data || []).map(paraTransacao);
  },

  // Atualiza a categoria de uma transação pelo id.
  async atualizarCategoriaTransacao(id, category) {
    const userId = await this.obterUserId();
    const { error } = await supabaseClient
      .from('transacoes')
      .update({ category: category })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw traduzirErro(error);
    }
  },

  // Exclui todas as transações do usuário para o banco + período informado.
  async excluirTransacoesDaFatura(bank, referenceMonth, referenceYear) {
    const userId = await this.obterUserId();
    const { error } = await supabaseClient
      .from('transacoes')
      .delete()
      .eq('user_id', userId)
      .eq('bank', bank)
      .eq('reference_month', referenceMonth)
      .eq('reference_year', referenceYear);

    if (error) {
      throw traduzirErro(error);
    }
  },

  // ---- Regras de categorização ----

  // Carrega as regras do usuário como mapa { palavraChave: category }.
  async carregarRegras() {
    const userId = await this.obterUserId();
    const { data, error } = await supabaseClient
      .from('regras_categorizacao')
      .select('palavra_chave, category')
      .eq('user_id', userId);

    if (error) {
      throw traduzirErro(error);
    }

    const mapa = {};
    (data || []).forEach((linha) => {
      mapa[linha.palavra_chave] = linha.category;
    });
    this.gravarCacheRegras(mapa);
    return mapa;
  },

  // Cria/atualiza (upsert) uma regra por (user_id, palavra_chave).
  async salvarRegra(palavraChave, category) {
    const userId = await this.obterUserId();
    const { error } = await supabaseClient
      .from('regras_categorizacao')
      .upsert(
        { user_id: userId, palavra_chave: palavraChave, category: category },
        { onConflict: 'user_id,palavra_chave' }
      );

    if (error) {
      throw traduzirErro(error);
    }
  },

  // ---- Análises do consultor IA ----

  // Carrega a análise salva para um período (ou null se não houver).
  async carregarAnalise(periodo) {
    const userId = await this.obterUserId();
    const { data, error } = await supabaseClient
      .from('analises')
      .select('analise, modelo, gerado_em')
      .eq('user_id', userId)
      .eq('periodo', periodo || '')
      .maybeSingle();

    if (error) {
      throw traduzirErro(error);
    }
    if (!data) {
      return null;
    }
    return { analise: data.analise, modelo: data.modelo, geradoEm: data.gerado_em };
  },

  // Salva (upsert) a análise de um período. Substitui a anterior do mesmo período.
  async salvarAnalise(periodo, analise, modelo) {
    const userId = await this.obterUserId();
    const { error } = await supabaseClient
      .from('analises')
      .upsert(
        {
          user_id: userId,
          periodo: periodo || '',
          analise: analise,
          modelo: modelo || null,
          gerado_em: new Date().toISOString()
        },
        { onConflict: 'user_id,periodo' }
      );

    if (error) {
      throw traduzirErro(error);
    }
  },

  // ---- Cache de fallback (leitura) ----

  lerCacheTransacoes() {
    try {
      const bruto = localStorage.getItem(CACHE_TRANSACOES);
      if (!bruto) return null;
      return JSON.parse(bruto).map((t) => ({ ...t, date: new Date(t.date) }));
    } catch (e) {
      return null;
    }
  },

  gravarCacheTransacoes(transacoes) {
    try {
      const dados = transacoes.map((t) => ({
        ...t,
        date: t.date instanceof Date ? t.date.toISOString() : t.date
      }));
      localStorage.setItem(CACHE_TRANSACOES, JSON.stringify(dados));
    } catch (e) {
      // cache é best-effort; ignora falha
    }
  },

  lerCacheRegras() {
    try {
      const bruto = localStorage.getItem(CACHE_REGRAS);
      return bruto ? JSON.parse(bruto) : null;
    } catch (e) {
      return null;
    }
  },

  gravarCacheRegras(regras) {
    try {
      localStorage.setItem(CACHE_REGRAS, JSON.stringify(regras));
    } catch (e) {
      // ignora
    }
  }
};
