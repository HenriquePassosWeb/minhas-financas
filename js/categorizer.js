// Categorizador automático baseado em palavras-chave

const Categorizer = {
  // Regras de categorização por palavras-chave
  rules: {
    alimentacao: [
      'ifood', 'rappi', 'uber eats', 'zé delivery', 'aiqfome',
      'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria',
      'mcdonalds', 'burger king', 'bk ', 'subway', 'habib',
      'padaria', 'confeitaria', 'sorveteria',
      'mercado', 'supermercado', 'carrefour', 'extra', 'pão de açucar',
      'atacadao', 'assai', 'big', 'nacional', 'zaffari',
      'hortifruti', 'sacolao', 'feira',
      'starbucks', 'cafe', 'cafeteria',
      'bar ', 'boteco', 'choperia'
    ],
    transporte: [
      'uber', '99 ', '99app', 'cabify', 'lyft',
      'posto', 'combustivel', 'gasolina', 'etanol', 'shell', 'ipiranga', 'petrobras',
      'estacionamento', 'estapar', 'zona azul',
      'pedagio', 'sem parar', 'conectcar', 'veloe',
      'metrô', 'metro', 'onibus', 'bilhete unico', 'sptrans',
      'oficina', 'mecanico', 'pneu', 'troca de oleo',
      'aluguel de carro', 'localiza', 'movida', 'unidas'
    ],
    moradia: [
      'aluguel', 'condominio', 'iptu',
      'luz', 'energia', 'enel', 'cpfl', 'cemig', 'eletropaulo',
      'agua', 'sabesp', 'copasa', 'saneago',
      'gas', 'comgas', 'supergasbras',
      'internet', 'vivo fibra', 'claro net', 'tim live', 'oi fibra',
      'telefone', 'celular',
      'seguro residencial'
    ],
    saude: [
      'farmacia', 'drogaria', 'droga raia', 'drogasil', 'pacheco', 'pague menos',
      'hospital', 'clinica', 'laboratorio', 'exame',
      'medico', 'consulta', 'dentista', 'psicologo',
      'plano de saude', 'unimed', 'bradesco saude', 'sulamerica', 'amil', 'hapvida',
      'academia', 'smartfit', 'bluefit', 'bodytech'
    ],
    educacao: [
      'escola', 'colegio', 'faculdade', 'universidade',
      'curso', 'udemy', 'coursera', 'alura', 'rocketseat',
      'livro', 'livraria', 'saraiva', 'amazon kindle',
      'material escolar', 'papelaria',
      'mensalidade', 'matricula'
    ],
    lazer: [
      'cinema', 'cinemark', 'cinepolis', 'uci',
      'netflix', 'disney', 'hbo max', 'amazon prime', 'star+', 'globoplay',
      'spotify', 'deezer', 'youtube music', 'apple music',
      'teatro', 'show', 'ingresso', 'ticketmaster', 'sympla',
      'parque', 'zoologico',
      'hotel', 'airbnb', 'booking', 'decolar',
      'viagem', 'passagem aerea', 'gol', 'latam', 'azul',
      'playstation', 'xbox', 'steam', 'nintendo',
      'bar', 'balada', 'festa'
    ],
    compras: [
      'amazon', 'mercado livre', 'magalu', 'magazine luiza',
      'americanas', 'submarino', 'shopee', 'aliexpress', 'shein',
      'casas bahia', 'ponto frio', 'fast shop',
      'renner', 'riachuelo', 'c&a', 'zara', 'hm ',
      'centauro', 'netshoes', 'decathlon',
      'shopping', 'loja'
    ],
    servicos: [
      'luz', 'energia', 'agua', 'gas',
      'seguro', 'porto seguro', 'bradesco seguros', 'itau seguros',
      'imposto', 'taxa', 'tarifa',
      'manutencao', 'reparo', 'conserto',
      'limpeza', 'diarista', 'faxineira',
      'pet shop', 'veterinario'
    ],
    assinaturas: [
      'netflix', 'spotify', 'disney', 'hbo', 'amazon prime',
      'youtube premium', 'apple', 'icloud', 'google one',
      'playstation plus', 'xbox game pass',
      'notion', 'dropbox', 'canva',
      'gym pass', 'total pass'
    ],
    investimentos: [
      'nuinvest', 'xp ', 'rico', 'clear', 'btg',
      'tesouro direto', 'cdb', 'lci', 'lca',
      'acao', 'acoes', 'fii', 'etf',
      'criptomoeda', 'bitcoin', 'ethereum',
      'aplicacao', 'resgate', 'rendimento'
    ],
    salario: [
      'salario', 'remuneracao',
      'pro-labore', 'prolabore',
      'ferias', 'decimo terceiro', '13o',
      'bonus', 'comissao', 'participacao nos lucros', 'plr'
    ],
    transferencia: [
      'transferencia', 'ted', 'doc',
      'deposito',
      'saque', 'caixa eletronico', 'atm'
    ],
    pix: [
      'pix'
    ]
  },

  // Regras personalizadas do usuário (persistidas)
  customRules: {},

  // Carrega regras do Supabase (com fallback de cache local)
  async loadCustomRules() {
    try {
      this.customRules = await DB.carregarRegras();
    } catch (e) {
      console.warn('Erro ao carregar regras do Supabase, usando cache:', e);
      this.customRules = DB.lerCacheRegras() || {};
    }
  },

  // Salva regra customizada no Supabase (mantém cache em memória atualizado)
  async saveCustomRule(description, categoryId) {
    const key = this.normalizeText(description);
    this.customRules[key] = categoryId;
    await DB.salvarRegra(key, categoryId);
  },

  // Normaliza texto para comparação
  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .trim();
  },

  // Categoriza uma transação
  categorize(description) {
    const normalized = this.normalizeText(description);
    
    // 0. Detecta pagamento de fatura de cartão (não é renda!)
    const faturaKeywords = ['pagamento recebido', 'pagamento de fatura', 'pagto fatura', 'pgto fatura', 'credito pagamento'];
    for (const keyword of faturaKeywords) {
      if (normalized.includes(keyword)) {
        return 'pagamento_fatura';
      }
    }
    
    // 1. Primeiro, verifica regras customizadas (prioridade)
    if (this.customRules[normalized]) {
      return this.customRules[normalized];
    }
    
    // 2. Verifica regras parciais customizadas
    for (const [key, categoryId] of Object.entries(this.customRules)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return categoryId;
      }
    }
    
    // 3. Verifica regras padrão
    for (const [categoryId, keywords] of Object.entries(this.rules)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword.toLowerCase())) {
          return categoryId;
        }
      }
    }
    
    // 4. Fallback
    return 'outros';
  },

  // Categoriza lista de transações.
  // As regras customizadas já estão em memória (carregadas no início da sessão
  // via loadCustomRules e atualizadas ao salvar uma nova regra).
  categorizeAll(transactions) {
    return transactions.map(t => ({
      ...t,
      // Usa categoria do C6 se disponível, senão categoriza automaticamente
      category: t.category || t.c6Category || this.categorize(t.description)
    }));
  },

  // Atualiza categoria de transação e opcionalmente cria regra
  updateCategory(transaction, newCategoryId, createRule = false) {
    transaction.category = newCategoryId;
    
    if (createRule) {
      this.saveCustomRule(transaction.description, newCategoryId);
    }
    
    return transaction;
  }
};
