// Categorias pré-definidas com cores e ícones
const CATEGORIES = {
  alimentacao: {
    id: 'alimentacao',
    name: 'Alimentação',
    icon: '🍔',
    color: '#f97316',
    bgColor: '#fff7ed'
  },
  transporte: {
    id: 'transporte',
    name: 'Transporte',
    icon: '🚗',
    color: '#3b82f6',
    bgColor: '#eff6ff'
  },
  moradia: {
    id: 'moradia',
    name: 'Moradia',
    icon: '🏠',
    color: '#8b5cf6',
    bgColor: '#f5f3ff'
  },
  saude: {
    id: 'saude',
    name: 'Saúde',
    icon: '💊',
    color: '#ef4444',
    bgColor: '#fef2f2'
  },
  educacao: {
    id: 'educacao',
    name: 'Educação',
    icon: '📚',
    color: '#06b6d4',
    bgColor: '#ecfeff'
  },
  lazer: {
    id: 'lazer',
    name: 'Lazer',
    icon: '🎮',
    color: '#ec4899',
    bgColor: '#fdf2f8'
  },
  compras: {
    id: 'compras',
    name: 'Compras',
    icon: '🛒',
    color: '#f59e0b',
    bgColor: '#fffbeb'
  },
  servicos: {
    id: 'servicos',
    name: 'Serviços',
    icon: '⚡',
    color: '#10b981',
    bgColor: '#ecfdf5'
  },
  assinaturas: {
    id: 'assinaturas',
    name: 'Assinaturas',
    icon: '📺',
    color: '#6366f1',
    bgColor: '#eef2ff'
  },
  investimentos: {
    id: 'investimentos',
    name: 'Investimentos',
    icon: '📈',
    color: '#22c55e',
    bgColor: '#f0fdf4'
  },
  salario: {
    id: 'salario',
    name: 'Salário',
    icon: '💰',
    color: '#22c55e',
    bgColor: '#f0fdf4'
  },
  transferencia: {
    id: 'transferencia',
    name: 'Transferência',
    icon: '↔️',
    color: '#64748b',
    bgColor: '#f8fafc'
  },
  pix: {
    id: 'pix',
    name: 'PIX',
    icon: '⚡',
    color: '#00bdae',
    bgColor: '#e6faf9'
  },
  outros: {
    id: 'outros',
    name: 'Outros',
    icon: '📦',
    color: '#6b7280',
    bgColor: '#f9fafb'
  },
  pagamento_fatura: {
    id: 'pagamento_fatura',
    name: 'Pagamento de Fatura',
    icon: '💳',
    color: '#94a3b8',
    bgColor: '#f1f5f9',
    ignore: true // Não entra nos cálculos de gasto/renda
  }
};

// Função para obter uma categoria
function getCategory(id) {
  return CATEGORIES[id] || CATEGORIES.outros;
}

// Função para obter todas as categorias
function getAllCategories() {
  return Object.values(CATEGORIES);
}

// Função para renderizar badge de categoria
function renderCategoryBadge(categoryId, onClick) {
  const cat = getCategory(categoryId);
  const badge = document.createElement('span');
  badge.className = 'category-badge';
  badge.style.backgroundColor = cat.bgColor;
  badge.style.color = cat.color;
  badge.innerHTML = `${cat.icon} ${cat.name}`;
  if (onClick) {
    badge.onclick = onClick;
    badge.title = 'Clique para alterar';
  }
  return badge;
}
