// Integração do Consultor Financeiro IA com o backend.
// Monta o payload a partir das transações filtradas, chama o endpoint /api/analise
// e renderiza a análise retornada pelo Gemini.

// URL do backend: vazio = mesma origem que serve o app (frontend e API juntos).
// Funciona tanto local (servido pelo backend em :3000) quanto em produção (Render).
const API_BASE_URL = '';

// Monta o payload de análise a partir das transações filtradas (somente gastos)
function montarPayloadAnalise(transacoes) {
  const gastos = transacoes.filter(t =>
    t.type === 'expense' && t.category !== 'pagamento_fatura'
  );

  const totalGasto = gastos.reduce((soma, t) => soma + Math.abs(t.amount), 0);

  // Agrupa por categoria
  const porCategoria = {};
  gastos.forEach(t => {
    if (!porCategoria[t.category]) {
      porCategoria[t.category] = { total: 0, quantidade: 0 };
    }
    porCategoria[t.category].total += Math.abs(t.amount);
    porCategoria[t.category].quantidade += 1;
  });

  const categorias = Object.keys(porCategoria).map(id => ({
    categoria: id,
    nome: getCategory(id).name,
    total: Number(porCategoria[id].total.toFixed(2)),
    quantidade: porCategoria[id].quantidade
  }));

  // Agrupa por estabelecimento (descrição) e pega o top 10
  const porEstabelecimento = {};
  gastos.forEach(t => {
    const nome = (t.description || 'Outros').trim().toUpperCase();
    if (!porEstabelecimento[nome]) {
      porEstabelecimento[nome] = { total: 0, quantidade: 0, categoria: t.category };
    }
    porEstabelecimento[nome].total += Math.abs(t.amount);
    porEstabelecimento[nome].quantidade += 1;
  });

  const estabelecimentos = Object.keys(porEstabelecimento)
    .map(nome => ({
      nome: nome,
      categoria: porEstabelecimento[nome].categoria,
      total: Number(porEstabelecimento[nome].total.toFixed(2)),
      quantidade: porEstabelecimento[nome].quantidade
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const periodoSelecionado = document.getElementById('periodFilter').value || '';

  return {
    periodo: periodoSelecionado,
    resumo: {
      totalGasto: Number(totalGasto.toFixed(2)),
      quantidadeTransacoes: gastos.length,
      quantidadeCategorias: categorias.length
    },
    categorias: categorias,
    estabelecimentos: estabelecimentos
  };
}

// Aciona a análise pela IA
async function analyzeWithAI() {
  const btn = document.getElementById('btnAnalyze');
  const content = document.getElementById('consultorContent');

  const dados = montarPayloadAnalise(filteredTransactions);

  if (!dados.categorias.length) {
    content.innerHTML = '<p class="consultor-erro">Importe uma fatura antes de solicitar a análise.</p>';
    return;
  }

  // Garante que o card esteja expandido para mostrar o resultado
  document.getElementById('consultorSection').classList.remove('recolhido');

  btn.disabled = true;
  const pararLoading = iniciarLoading(content);

  try {
    const resposta = await fetch(`${API_BASE_URL}/api/analise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    const json = await resposta.json();

    if (!json.sucesso) {
      content.innerHTML = `<p class="consultor-erro">${json.erro}</p>`;
      return;
    }

    content.innerHTML = `<div class="consultor-resultado">${renderMarkdown(json.analise)}</div>`;
  } catch (erro) {
    content.innerHTML = '<p class="consultor-erro">Não foi possível conectar ao serviço de análise. Tente novamente em instantes.</p>';
  } finally {
    pararLoading();
    btn.disabled = false;
  }
}

// Mostra um indicador de carregamento com spinner e mensagens que evoluem,
// para o usuário perceber que a análise continua em andamento (não travou).
// Retorna uma função que encerra o loading (para o timer).
function iniciarLoading(content) {
  const mensagens = [
    'Analisando seus gastos...',
    'Organizando as categorias...',
    'Identificando padrões de consumo...',
    'Preparando as sugestões de economia...',
    'Quase lá, finalizando a análise...'
  ];

  let indice = 0;

  const render = () => {
    content.innerHTML = `
      <div class="consultor-loading">
        <span class="consultor-spinner" aria-hidden="true"></span>
        <span class="consultor-loading-texto">${mensagens[indice]}</span>
      </div>`;
  };

  render();

  // Troca a mensagem a cada 4s enquanto a análise não termina
  const timer = setInterval(() => {
    indice = (indice + 1) % mensagens.length;
    render();
  }, 4000);

  return () => clearInterval(timer);
}

// Escapa HTML para evitar injeção
function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Aplica formatação inline: negrito (**), itálico (*), preservando valores em R$
function formatarInline(texto) {
  let t = escaparHtml(texto);
  // Negrito primeiro (** ou __)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Itálico (* ou _) - evita casar com o que já virou <strong>
  t = t.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  return t;
}

// Converte markdown simples para HTML (títulos, negrito, itálico, listas, parágrafos)
function renderMarkdown(texto) {
  const linhas = texto.split('\n');
  const html = [];
  let emLista = false;

  const fecharLista = () => {
    if (emLista) {
      html.push('</ul>');
      emLista = false;
    }
  };

  linhas.forEach(linha => {
    const l = linha.trim();

    if (l === '') {
      fecharLista();
      return;
    }

    if (l.startsWith('### ')) {
      fecharLista();
      html.push(`<h4>${formatarInline(l.slice(4))}</h4>`);
    } else if (l.startsWith('## ')) {
      fecharLista();
      html.push(`<h3>${formatarInline(l.slice(3))}</h3>`);
    } else if (l.startsWith('# ')) {
      fecharLista();
      html.push(`<h3>${formatarInline(l.slice(2))}</h3>`);
    } else if (l.startsWith('- ') || l.startsWith('* ')) {
      if (!emLista) {
        html.push('<ul>');
        emLista = true;
      }
      html.push(`<li>${formatarInline(l.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(l)) {
      // Item numerado vira um parágrafo com destaque (mantém o número)
      fecharLista();
      html.push(`<p class="item-numerado">${formatarInline(l)}</p>`);
    } else {
      fecharLista();
      html.push(`<p>${formatarInline(l)}</p>`);
    }
  });

  fecharLista();
  return html.join('');
}

// Expande ou recolhe o conteúdo do consultor
function toggleConsultor() {
  const secao = document.getElementById('consultorSection');
  secao.classList.toggle('recolhido');
}
