// Aplicação principal

let transactions = [];
let filteredTransactions = [];
let selectedTransaction = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupUpload();
  setupFilters();
  setupPeriodFilter();
  setupReferenceYear();
  populateCategoryFilter();
  populateModalCategories();
  
  // Carrega dados do usuário (Supabase)
  loadSavedData();
});

// Exibe/oculta o overlay de carregamento
function showLoading() {
  document.getElementById('loadingOverlay').classList.add('visivel');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visivel');
}

// Traduz um erro de domínio (db.js) em mensagem amigável
function mensagemDeErro(erro) {
  if (erro instanceof DB.ESessaoAusente) {
    return 'Sua sessão expirou. Faça login novamente.';
  }
  if (erro instanceof DB.EFalhaDeRede) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

// Configura filtro de período principal
function setupPeriodFilter() {
  const periodFilter = document.getElementById('periodFilter');
  
  periodFilter.addEventListener('change', () => {
    applyPeriodFilter();
  });
}

// Aplica filtro de período em todas as transações
function applyPeriodFilter() {
  const selectedPeriod = document.getElementById('periodFilter').value;
  
  // Filtra só gastos (nunca mostra pagamentos ou valores positivos)
  let filtered = transactions.filter(t => 
    t.type === 'expense' && t.category !== 'pagamento_fatura'
  );
  
  // Filtra por período se selecionado
  if (selectedPeriod) {
    filtered = filtered.filter(t => 
      `${t.referenceMonth}/${t.referenceYear}` === selectedPeriod
    );
  }
  
  filteredTransactions = filtered;
  
  // Atualiza tudo
  updateSummary();
  updatePeriodSummaryInfo();
  renderBankSummary();
  Charts.renderAll(filteredTransactions);
  renderTopExpenses();
  renderGroupedExpenses();
  renderTransactions();

  // Busca a análise salva para o período selecionado (se houver)
  if (typeof carregarAnaliseSalva === 'function') {
    carregarAnaliseSalva();
  }
  
  // Sincroniza com o filtro da tabela
  document.getElementById('referenceFilter').value = selectedPeriod;
}

// Configura os anos disponíveis para seleção
function setupReferenceYear() {
  const yearSelect = document.getElementById('referenceYear');
  const currentYear = new Date().getFullYear();
  
  // Últimos 5 anos + ano atual
  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
  
  // Seleciona ano atual por padrão
  yearSelect.value = currentYear;
}

// Valida se mês de referência foi informado
function validateReferenceMonth() {
  const month = document.getElementById('referenceMonth').value;
  const year = document.getElementById('referenceYear').value;
  const section = document.querySelector('.reference-month-section');
  
  if (!month || !year) {
    section.classList.add('error');
    return null;
  }
  
  section.classList.remove('error');
  return { month, year };
}

// Valida se banco foi selecionado
function validateBank() {
  const select = document.getElementById('bankSelect');
  const section = document.querySelector('.bank-section');
  
  if (!select.value) {
    section.classList.add('error');
    return null;
  }
  
  section.classList.remove('error');
  return select.value;
}

// Retorna o mês de referência selecionado
function getReferenceMonth() {
  const month = document.getElementById('referenceMonth').value;
  const year = document.getElementById('referenceYear').value;
  return { month, year, label: `${month}/${year}` };
}

// Retorna o banco selecionado
function getSelectedBank() {
  return document.getElementById('bankSelect').value;
}

// Configura área de upload
function setupUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  
  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });
  
  // Click para selecionar. Um único ponto de abertura do seletor evita o
  // duplo disparo (botão + área) que trava o file picker em navegadores mobile.
  const abrirSeletor = () => {
    // Reseta o valor para permitir reimportar o mesmo arquivo e evitar estados
    // travados do input em alguns navegadores mobile.
    fileInput.value = '';
    fileInput.click();
  };

  uploadArea.addEventListener('click', abrirSeletor);
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  });
}

// Processa arquivo CSV
function processFile(file) {
  // Valida mês de referência primeiro
  const reference = validateReferenceMonth();
  if (!reference) {
    alert('Por favor, informe o mês de referência da fatura antes de importar.');
    return;
  }
  
  // Valida banco selecionado
  const selectedBank = validateBank();
  if (!selectedBank) {
    alert('Por favor, selecione o banco do cartão antes de importar.');
    return;
  }
  
  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Por favor, selecione um arquivo CSV');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      
      console.log('Conteúdo do arquivo (primeiras 500 chars):', content.substring(0, 500));
      console.log('Banco selecionado:', selectedBank);
      
      // Usa o banco selecionado para parsear
      const parsed = CSVParser.parse(content, selectedBank);
      
      console.log('Transações parseadas:', parsed.length);
      
      if (parsed.length === 0) {
        alert('Nenhuma transação encontrada no arquivo. Verifique se o formato está correto.\n\nPrimeiras linhas do arquivo:\n' + content.substring(0, 300));
        return;
      }
      
      // Adiciona mês de referência e banco a cada transação
      const withReference = parsed.map(t => ({
        ...t,
        referenceMonth: reference.month,
        referenceYear: reference.year,
        bank: selectedBank
      }));
      
      // Categoriza automaticamente
      const categorized = Categorizer.categorizeAll(withReference);
      
      // Adiciona às transações existentes (sem duplicar)
      const newTransactions = categorized.filter(newT => {
        return !transactions.some(existingT => 
          existingT.date.getTime() === newT.date.getTime() &&
          existingT.description === newT.description &&
          existingT.amount === newT.amount &&
          existingT.referenceMonth === newT.referenceMonth &&
          existingT.referenceYear === newT.referenceYear
        );
      });
      
      if (newTransactions.length === 0) {
        alert('Todas as transações deste arquivo já foram importadas.');
        return;
      }

      // Persiste no Supabase (com retry em caso de falha)
      await persistirImportacao(newTransactions, reference);

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo: ' + error.message + '\n\nVerifique o console (F12) para mais detalhes.');
    }
  };
  
  reader.readAsText(file, 'UTF-8');
}

// Persiste as transações importadas no Supabase, com opção de retry em falha
async function persistirImportacao(newTransactions, reference) {
  showLoading();
  try {
    const inseridas = await DB.inserirTransacoes(newTransactions);
    // Usa as transações com id retornado pelo banco
    transactions = [...transactions, ...inseridas];
    filteredTransactions = [...transactions];
    DB.gravarCacheTransacoes(transactions);
    showResults();
    alert(`${inseridas.length} transações importadas para a fatura de ${reference.month}/${reference.year}`);
  } catch (erro) {
    console.error('Falha ao salvar importação:', erro);
    const tentarNovamente = confirm(mensagemDeErro(erro) + '\n\nDeseja tentar novamente?');
    if (tentarNovamente) {
      await persistirImportacao(newTransactions, reference);
    }
  } finally {
    hideLoading();
  }
}

// Mostra resultados
function showResults() {
  // Mostra seções ocultas
  document.getElementById('periodFilterSection').style.display = 'block';
  document.getElementById('summarySection').style.display = 'grid';
  document.getElementById('bankSummarySection').style.display = 'block';
  document.getElementById('chartsSection').style.display = 'grid';
  document.getElementById('topExpensesSection').style.display = 'block';
  document.getElementById('groupedExpensesSection').style.display = 'block';
  document.getElementById('transactionsSection').style.display = 'block';
  document.getElementById('consultorSection').style.display = 'block';
  
  // Atualiza filtro de período principal
  updatePeriodFilter();
  
  // Atualiza filtro de meses na tabela
  updateReferenceFilter();
  
  // Atualiza resumo
  updateSummary();
  
  // Atualiza resumo por banco/mês
  renderBankSummary();
  
  // Atualiza gráficos
  Charts.renderAll(filteredTransactions);
  
  // Atualiza lista de maiores gastos
  renderTopExpenses();
  
  // Atualiza lista agrupada por estabelecimento
  renderGroupedExpenses();
  
  // Atualiza tabela
  renderTransactions();

  // Busca e exibe automaticamente a análise salva do período (se houver)
  if (typeof carregarAnaliseSalva === 'function') {
    carregarAnaliseSalva();
  }
}

// Atualiza o filtro de período principal
function updatePeriodFilter() {
  const select = document.getElementById('periodFilter');
  const currentValue = select.value;
  
  // Coleta períodos únicos (mês/ano + banco)
  const periods = new Map();
  
  transactions.forEach(t => {
    if (t.referenceMonth && t.referenceYear) {
      const key = `${t.referenceMonth}/${t.referenceYear}`;
      if (!periods.has(key)) {
        periods.set(key, { banks: new Set(), count: 0, expense: 0 });
      }
      const period = periods.get(key);
      if (t.bank) period.banks.add(t.bank);
      period.count++;
      if (t.type === 'expense' && t.category !== 'pagamento_fatura') {
        period.expense += Math.abs(t.amount);
      }
    }
  });
  
  // Ordena (mais recente primeiro)
  const sorted = Array.from(periods.entries()).sort((a, b) => {
    const [mA, yA] = a[0].split('/');
    const [mB, yB] = b[0].split('/');
    return (parseInt(yB) * 12 + parseInt(mB)) - (parseInt(yA) * 12 + parseInt(mA));
  });
  
  // Atualiza select
  select.innerHTML = '<option value="">📊 Todos os meses</option>';
  sorted.forEach(([key, data]) => {
    const bankNames = Array.from(data.banks).map(b => getBankDisplayName(b)).join(' + ');
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${getMonthName(key)} — ${formatCurrency(data.expense)}`;
    select.appendChild(option);
  });
  
  // Restaura seleção
  if (currentValue && Array.from(periods.keys()).includes(currentValue)) {
    select.value = currentValue;
  }
  
  // Atualiza info do período
  updatePeriodSummaryInfo();
}

// Retorna nome do mês
function getMonthName(monthYear) {
  const [month, year] = monthYear.split('/');
  const months = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(month)]}/${year}`;
}

// Retorna nome do banco para exibição
function getBankDisplayName(bankId) {
  const names = {
    nubank: 'Nubank',
    c6: 'C6 Bank',
    inter: 'Inter',
    itau: 'Itaú',
    bradesco: 'Bradesco',
    generic: 'Outro'
  };
  return names[bankId] || bankId;
}

// Atualiza info resumida do período
function updatePeriodSummaryInfo() {
  const container = document.getElementById('periodSummaryInfo');
  const selectedPeriod = document.getElementById('periodFilter').value;
  
  let data = filteredTransactions;
  
  // Coleta bancos únicos
  const banks = new Set();
  data.forEach(t => { if (t.bank) banks.add(t.bank); });
  
  const bankNames = Array.from(banks).map(b => getBankDisplayName(b)).join(', ');
  
  container.innerHTML = `
    <span class="period-summary-item banks">🏦 ${banks.size > 0 ? bankNames : 'Nenhum banco'}</span>
    <span class="period-summary-item transactions">📋 ${data.length} transações</span>
  `;
}

// Renderiza resumo por banco e mês
function renderBankSummary() {
  const container = document.getElementById('bankSummaryList');
  
  // Agrupa por banco + mês (usando TODAS as transações, não só filtradas)
  const groups = {};
  
  transactions.forEach(t => {
    // Só conta gastos
    if (t.type !== 'expense' || t.category === 'pagamento_fatura') return;
    
    const bank = t.bank || 'generic';
    const period = `${t.referenceMonth}/${t.referenceYear}`;
    const key = `${bank}-${period}`;
    
    if (!groups[key]) {
      groups[key] = {
        bank,
        period,
        count: 0,
        expense: 0
      };
    }
    
    groups[key].count++;
    groups[key].expense += Math.abs(t.amount);
  });
  
  // Ordena por período (mais recente) e depois por banco
  const sorted = Object.values(groups).sort((a, b) => {
    const [mA, yA] = a.period.split('/');
    const [mB, yB] = b.period.split('/');
    const dateCompare = (parseInt(yB) * 12 + parseInt(mB)) - (parseInt(yA) * 12 + parseInt(mA));
    if (dateCompare !== 0) return dateCompare;
    return a.bank.localeCompare(b.bank);
  });
  
  if (sorted.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">Nenhuma transação importada</p>';
    return;
  }
  
  container.innerHTML = sorted.map(group => {
    const bankName = getBankDisplayName(group.bank);
    const monthName = getMonthName(group.period);
    
    return `
      <div class="bank-summary-item ${group.bank}">
        <div class="bank-summary-info">
          <div class="bank-logo ${group.bank}">${bankName.substring(0, 2).toUpperCase()}</div>
          <div class="bank-details">
            <h4>${bankName}</h4>
            <p>Fatura ${monthName}</p>
          </div>
        </div>
        <div class="bank-summary-actions">
          <div class="bank-summary-values">
            <div class="bank-summary-expense">- ${formatCurrency(group.expense)}</div>
            <div class="bank-summary-count">${group.count} transações</div>
          </div>
          <button class="btn-delete-fatura" onclick="confirmDeleteFatura('${group.bank}', '${group.period}')" title="Excluir esta fatura">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Confirma exclusão de fatura
function confirmDeleteFatura(bank, period) {
  const bankName = getBankDisplayName(bank);
  const monthName = getMonthName(period);
  
  const count = transactions.filter(t => 
    t.bank === bank && 
    `${t.referenceMonth}/${t.referenceYear}` === period
  ).length;
  
  if (confirm(`Deseja excluir a fatura?\n\n🏦 ${bankName}\n📅 ${monthName}\n📋 ${count} transações\n\nEssa ação não pode ser desfeita.`)) {
    deleteFatura(bank, period);
  }
}

// Exclui fatura (todas as transações daquele banco/período)
// Só remove da tela após a confirmação da exclusão no Supabase.
async function deleteFatura(bank, period) {
  const [referenceMonth, referenceYear] = period.split('/');
  showLoading();
  try {
    await DB.excluirTransacoesDaFatura(bank, referenceMonth, referenceYear);
  } catch (erro) {
    console.error('Falha ao excluir fatura:', erro);
    alert(mensagemDeErro(erro) + '\n\nA fatura foi mantida.');
    return; // mantém a fatura visível
  } finally {
    hideLoading();
  }

  // Sucesso confirmado: remove do estado em memória
  transactions = transactions.filter(t =>
    !(t.bank === bank && `${t.referenceMonth}/${t.referenceYear}` === period)
  );
  filteredTransactions = transactions.filter(t =>
    t.type === 'expense' && t.category !== 'pagamento_fatura'
  );
  DB.gravarCacheTransacoes(transactions);

  // Atualiza UI
  if (transactions.length > 0) {
    showResults();
  } else {
    document.getElementById('periodFilterSection').style.display = 'none';
    document.getElementById('summarySection').style.display = 'none';
    document.getElementById('bankSummarySection').style.display = 'none';
    document.getElementById('chartsSection').style.display = 'none';
    document.getElementById('topExpensesSection').style.display = 'none';
    document.getElementById('groupedExpensesSection').style.display = 'none';
    document.getElementById('transactionsSection').style.display = 'none';
  }
}

// Atualiza cards de resumo
function updateSummary() {
  // Só considera gastos (ignora pagamentos de fatura)
  const expenses = filteredTransactions
    .filter(t => t.type === 'expense' && t.category !== 'pagamento_fatura');
  
  const totalExpense = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  // Conta categorias únicas
  const categories = new Set(expenses.map(t => t.category));
  
  document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
  document.getElementById('totalTransactions').textContent = expenses.length;
  document.getElementById('totalCategories').textContent = categories.size;
}

// Renderiza maiores gastos (agrupados por estabelecimento)
function renderTopExpenses() {
  const container = document.getElementById('topExpensesList');
  
  // Agrupa por descrição (nome do estabelecimento)
  const grouped = {};
  
  filteredTransactions
    .filter(t => t.type === 'expense' && t.category !== 'pagamento_fatura')
    .forEach(t => {
      const key = t.description.toLowerCase().trim();
      if (!grouped[key]) {
        grouped[key] = {
          name: t.description,
          category: t.category,
          transactions: [],
          total: 0
        };
      }
      grouped[key].transactions.push(t);
      grouped[key].total += Math.abs(t.amount);
    });
  
  // Top 5 por total
  const topGroups = Object.values(grouped)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  container.innerHTML = topGroups.map(group => {
    const cat = getCategory(group.category);
    const count = group.transactions.length;
    const countText = count > 1 ? `${count}x` : '';
    
    return `
      <div class="expense-item">
        <div class="expense-item-info">
          <div class="expense-item-category" style="background: ${cat.bgColor}">
            ${cat.icon}
          </div>
          <div>
            <div class="expense-item-description">${group.name} ${countText ? `<span class="expense-count">${countText}</span>` : ''}</div>
            <div class="expense-item-date">${cat.name}</div>
          </div>
        </div>
        <div class="expense-item-value">- ${formatCurrency(group.total)}</div>
      </div>
    `;
  }).join('');
}

// Renderiza gastos agrupados por estabelecimento
function renderGroupedExpenses() {
  const container = document.getElementById('groupedExpensesList');

  const gastos = filteredTransactions
    .filter(t => t.type === 'expense' && t.category !== 'pagamento_fatura');

  // Total geral (para calcular o % de cada categoria)
  const totalGeral = gastos.reduce((soma, t) => soma + Math.abs(t.amount), 0);

  // 1) Agrupa por estabelecimento (descrição), guardando a categoria
  const porEstabelecimento = {};
  gastos.forEach(t => {
    const key = t.description.toLowerCase().trim();
    if (!porEstabelecimento[key]) {
      porEstabelecimento[key] = {
        name: t.description,
        category: t.category,
        transactions: [],
        total: 0
      };
    }
    porEstabelecimento[key].transactions.push(t);
    porEstabelecimento[key].total += Math.abs(t.amount);
  });

  // 2) Agrupa os estabelecimentos por categoria
  const porCategoria = {};
  Object.values(porEstabelecimento).forEach(est => {
    if (!porCategoria[est.category]) {
      porCategoria[est.category] = { category: est.category, estabelecimentos: [], total: 0 };
    }
    porCategoria[est.category].estabelecimentos.push(est);
    porCategoria[est.category].total += est.total;
  });

  // Ordena categorias por total (maior primeiro)
  const categoriasOrdenadas = Object.values(porCategoria).sort((a, b) => b.total - a.total);

  if (categoriasOrdenadas.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">Nenhum gasto no período.</p>';
    return;
  }

  let idxEst = 0; // índice global dos estabelecimentos (para o toggle)

  container.innerHTML = categoriasOrdenadas.map((grupoCat, idxCat) => {
    const cat = getCategory(grupoCat.category);
    const pct = totalGeral > 0 ? Math.round((grupoCat.total / totalGeral) * 100) : 0;

    // Estabelecimentos da categoria, ordenados por valor
    const estabelecimentosHtml = grupoCat.estabelecimentos
      .sort((a, b) => b.total - a.total)
      .map(est => {
        const idAtual = idxEst++;
        const transacoesHtml = est.transactions
          .sort((a, b) => b.date - a.date)
          .map(t => `
            <div class="grouped-transaction">
              <span class="grouped-transaction-date">${formatDate(t.date)}</span>
              <span class="grouped-transaction-value">- ${formatCurrency(Math.abs(t.amount))}</span>
            </div>
          `).join('');

        return `
          <div class="grouped-item" onclick="toggleGroupedItem(${idAtual})">
            <div class="grouped-item-info">
              <div class="grouped-item-details">
                <div class="grouped-item-name">${est.name}</div>
                <div class="grouped-item-meta">
                  <span>${est.transactions.length} transação(ões)</span>
                </div>
              </div>
            </div>
            <div class="grouped-item-values">
              <div class="grouped-item-total">- ${formatCurrency(est.total)}</div>
            </div>
          </div>
          <div class="grouped-item-transactions" id="grouped-${idAtual}">
            ${transacoesHtml}
          </div>
        `;
      }).join('');

    return `
      <div class="categoria-grupo">
        <div class="categoria-header" onclick="toggleCategoria(${idxCat})">
          <div class="categoria-header-info">
            <div class="categoria-header-icon" style="background: ${cat.bgColor}">${cat.icon}</div>
            <div>
              <div class="categoria-header-nome">${cat.name}</div>
              <div class="categoria-header-meta">${grupoCat.estabelecimentos.length} estabelecimento(s) · ${pct}% do total</div>
            </div>
          </div>
          <div class="categoria-header-total">- ${formatCurrency(grupoCat.total)}</div>
        </div>
        <div class="categoria-estabelecimentos" id="categoria-${idxCat}">
          ${estabelecimentosHtml}
        </div>
      </div>
    `;
  }).join('');
}

// Expande/colapsa detalhes de um estabelecimento (transações)
function toggleGroupedItem(idx) {
  const details = document.getElementById(`grouped-${idx}`);
  if (details) details.classList.toggle('show');
  event.stopPropagation();
}

// Expande/colapsa uma categoria inteira
function toggleCategoria(idx) {
  const grupo = document.getElementById(`categoria-${idx}`);
  if (grupo) grupo.classList.toggle('recolhido');
}

// Renderiza tabela de transações
function renderTransactions() {
  const tbody = document.getElementById('transactionsBody');
  
  tbody.innerHTML = filteredTransactions.map((t, index) => {
    const cat = getCategory(t.category);
    const valueClass = t.type === 'income' ? 'value-positive' : 'value-negative';
    const valuePrefix = t.type === 'income' ? '+' : '-';
    const reference = t.referenceMonth && t.referenceYear 
      ? `${t.referenceMonth}/${t.referenceYear}` 
      : '-';
    const bankName = getBankDisplayName(t.bank || 'generic');
    
    return `
      <tr>
        <td>${bankName}</td>
        <td><span class="reference-badge">${reference}</span></td>
        <td>${formatDate(t.date)}</td>
        <td>${t.description}</td>
        <td>
          <span class="category-badge" 
                style="background: ${cat.bgColor}; color: ${cat.color}"
                onclick="openCategoryModal(${index})">
            ${cat.icon} ${cat.name}
          </span>
        </td>
        <td class="text-right ${valueClass}">
          ${valuePrefix} ${formatCurrency(Math.abs(t.amount))}
        </td>
      </tr>
    `;
  }).join('');
}

// Configura filtros
function setupFilters() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const referenceFilter = document.getElementById('referenceFilter');
  
  const applyFilters = () => {
    const search = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const reference = referenceFilter.value;
    
    filteredTransactions = transactions.filter(t => {
      // Só mostra gastos (nunca mostra pagamentos de fatura ou valores positivos)
      if (t.type !== 'expense' || t.category === 'pagamento_fatura') {
        return false;
      }
      
      const matchSearch = !search || t.description.toLowerCase().includes(search);
      const matchCategory = !category || t.category === category;
      const matchReference = !reference || `${t.referenceMonth}/${t.referenceYear}` === reference;
      
      return matchSearch && matchCategory && matchReference;
    });
    
    showResults();
  };
  
  searchInput.addEventListener('input', applyFilters);
  categoryFilter.addEventListener('change', applyFilters);
  referenceFilter.addEventListener('change', applyFilters);
}

// Atualiza filtro de meses de referência
function updateReferenceFilter() {
  const select = document.getElementById('referenceFilter');
  const currentValue = select.value;
  
  // Coleta meses únicos
  const months = new Set();
  transactions.forEach(t => {
    if (t.referenceMonth && t.referenceYear) {
      months.add(`${t.referenceMonth}/${t.referenceYear}`);
    }
  });
  
  // Ordena (mais recente primeiro)
  const sorted = Array.from(months).sort((a, b) => {
    const [mA, yA] = a.split('/');
    const [mB, yB] = b.split('/');
    return (yB * 12 + parseInt(mB)) - (yA * 12 + parseInt(mA));
  });
  
  // Atualiza select
  select.innerHTML = '<option value="">Todas as faturas</option>';
  sorted.forEach(m => {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = `Fatura ${m}`;
    select.appendChild(option);
  });
  
  // Restaura seleção se ainda existir
  if (currentValue && sorted.includes(currentValue)) {
    select.value = currentValue;
  }
}

// Popula filtro de categorias
function populateCategoryFilter() {
  const select = document.getElementById('categoryFilter');
  const categories = getAllCategories();
  
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.icon} ${cat.name}`;
    select.appendChild(option);
  });
}

// Popula select do modal
function populateModalCategories() {
  const select = document.getElementById('modalCategorySelect');
  const categories = getAllCategories();
  
  select.innerHTML = categories.map(cat => 
    `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
  ).join('');
}

// Abre modal de categoria
function openCategoryModal(index) {
  selectedTransaction = filteredTransactions[index];
  
  document.getElementById('modalDescription').textContent = selectedTransaction.description;
  document.getElementById('modalCategorySelect').value = selectedTransaction.category || 'outros';
  document.getElementById('applyToAll').checked = false;
  
  document.getElementById('categoryModal').classList.add('active');
}

// Fecha modal
function closeModal() {
  document.getElementById('categoryModal').classList.remove('active');
  selectedTransaction = null;
}

// Salva categoria
async function saveCategory() {
  if (!selectedTransaction) return;

  const newCategory = document.getElementById('modalCategorySelect').value;
  const applyToAll = document.getElementById('applyToAll').checked;
  const alvo = selectedTransaction;

  showLoading();
  try {
    if (applyToAll) {
      // Transações com descrição similar
      const normalizedDesc = Categorizer.normalizeText(alvo.description);
      const similares = transactions.filter(t =>
        Categorizer.normalizeText(t.description) === normalizedDesc
      );

      // Atualiza cada uma no Supabase
      for (const t of similares) {
        await DB.atualizarCategoriaTransacao(t.id, newCategory);
      }
      // Salva a regra para futuras importações
      await Categorizer.saveCustomRule(alvo.description, newCategory);

      // Atualiza em memória após sucesso
      similares.forEach(t => { t.category = newCategory; });
    } else {
      // Apenas essa transação
      await DB.atualizarCategoriaTransacao(alvo.id, newCategory);
      const original = transactions.find(t => t.id === alvo.id);
      if (original) {
        original.category = newCategory;
      }
    }

    // Ressincroniza filteredTransactions com o estado atualizado
    filteredTransactions = filteredTransactions.map(t => {
      const original = transactions.find(o => o.id === t.id);
      return original || t;
    });

    DB.gravarCacheTransacoes(transactions);
    showResults();
    closeModal();
  } catch (erro) {
    console.error('Falha ao salvar categoria:', erro);
    alert(mensagemDeErro(erro));
  } finally {
    hideLoading();
  }
}

// Migração única do localStorage legado para o Supabase (primeiro login pós-atualização)
async function migrarLocalStorageSeNecessario() {
  const FLAG = 'supabaseMigracaoConcluida';
  if (localStorage.getItem(FLAG) === 'true') {
    return; // já migrado
  }

  // Lê dados legados (formato antigo do localStorage)
  let legadoTransacoes = [];
  let legadoRegras = {};
  try {
    const brutoT = localStorage.getItem('financasTransactions');
    if (brutoT) {
      legadoTransacoes = JSON.parse(brutoT)
        .filter(t => !t.id) // só migra o que ainda não veio do banco
        .map(t => ({ ...t, date: new Date(t.date) }));
    }
    const brutoR = localStorage.getItem('customCategorizationRules');
    if (brutoR) {
      legadoRegras = JSON.parse(brutoR);
    }
  } catch (e) {
    return; // dados legados corrompidos: ignora
  }

  if (legadoTransacoes.length === 0 && Object.keys(legadoRegras).length === 0) {
    localStorage.setItem(FLAG, 'true'); // nada a migrar
    return;
  }

  // Envia ao Supabase
  if (legadoTransacoes.length > 0) {
    await DB.inserirTransacoes(legadoTransacoes);
  }
  for (const [palavra, categoria] of Object.entries(legadoRegras)) {
    await DB.salvarRegra(palavra, categoria);
  }

  // Marca como concluída (idempotência)
  localStorage.setItem(FLAG, 'true');
}

// Carrega os dados do usuário a partir do Supabase (com fallback de cache local)
async function loadSavedData() {
  showLoading();
  try {
    // Migração única de dados legados (best-effort, não bloqueia o fluxo)
    try {
      await migrarLocalStorageSeNecessario();
    } catch (erroMigracao) {
      console.warn('Falha na migração do localStorage (dados legados preservados):', erroMigracao);
    }

    // Carrega regras de categorização e transações da nuvem
    await Categorizer.loadCustomRules();
    transactions = await DB.carregarTransacoes();

    filteredTransactions = transactions.filter(t =>
      t.type === 'expense' && t.category !== 'pagamento_fatura'
    );

    if (transactions.length > 0) {
      showResults();
    }
  } catch (erro) {
    console.warn('Falha ao carregar do Supabase:', erro);
    // Fallback: usa o cache local para permitir uso parcial
    const cache = DB.lerCacheTransacoes();
    if (cache && cache.length > 0) {
      transactions = cache;
      filteredTransactions = transactions.filter(t =>
        t.type === 'expense' && t.category !== 'pagamento_fatura'
      );
      showResults();
    }
    alert(mensagemDeErro(erro) + '\n\nExibindo dados locais quando disponíveis.');
  } finally {
    hideLoading();
  }
}

// Fecha modal ao clicar fora
document.getElementById('categoryModal').addEventListener('click', (e) => {
  if (e.target.id === 'categoryModal') {
    closeModal();
  }
});
