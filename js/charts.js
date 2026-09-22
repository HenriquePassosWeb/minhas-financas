// Gerenciador de gráficos

const Charts = {
  categoryChart: null,
  dailyChart: null,

  // Inicializa ou atualiza gráfico de categorias (pizza)
  renderCategoryChart(transactions) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Agrupa gastos por categoria (só saídas, ignora pagamento de fatura)
    const expenses = transactions.filter(t => t.type === 'expense' && t.category !== 'pagamento_fatura');
    const byCategory = {};
    
    expenses.forEach(t => {
      const cat = t.category || 'outros';
      byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
    });
    
    // Ordena por valor
    const sorted = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1]);
    
    const labels = sorted.map(([catId]) => getCategory(catId).name);
    const data = sorted.map(([, value]) => value);
    const colors = sorted.map(([catId]) => getCategory(catId).color);
    
    if (this.categoryChart) {
      this.categoryChart.destroy();
    }
    
    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = data.reduce((a, b) => a + b, 0);
                const percent = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  },

  // Gráfico de evolução diária
  renderDailyChart(transactions) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    
    // Agrupa por dia
    const byDay = {};
    
    transactions.forEach(t => {
      const dateKey = t.date.toISOString().split('T')[0];
      if (!byDay[dateKey]) {
        byDay[dateKey] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        byDay[dateKey].income += t.amount;
      } else {
        byDay[dateKey].expense += Math.abs(t.amount);
      }
    });
    
    // Ordena por data
    const sortedDays = Object.keys(byDay).sort();
    
    const labels = sortedDays.map(d => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}`;
    });
    
    const incomeData = sortedDays.map(d => byDay[d].income);
    const expenseData = sortedDays.map(d => byDay[d].expense);
    
    if (this.dailyChart) {
      this.dailyChart.destroy();
    }
    
    this.dailyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Entradas',
            data: incomeData,
            backgroundColor: '#22c55e',
            borderRadius: 4
          },
          {
            label: 'Saídas',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => formatCurrency(value, true)
            }
          }
        }
      }
    });
  },

  // Renderiza ambos os gráficos
  renderAll(transactions) {
    this.renderCategoryChart(transactions);
    this.renderDailyChart(transactions);
  }
};

// Formata valor como moeda
function formatCurrency(value, compact = false) {
  if (compact && Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Formata data
function formatDate(date) {
  return date.toLocaleDateString('pt-BR');
}
