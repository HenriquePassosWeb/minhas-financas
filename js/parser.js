// Parser de CSV para diferentes formatos de bancos

const CSVParser = {
  // Detecta o formato do banco pelo conteúdo do CSV
  detectFormat(content) {
    const firstLine = content.split('\n')[0].toLowerCase();
    
    // Nubank: date,title,amount
    if (firstLine.includes('date') && firstLine.includes('title') && firstLine.includes('amount')) {
      return 'nubank';
    }
    
    // C6 Bank: Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)
    if (firstLine.includes('data de compra') && firstLine.includes('nome no cart')) {
      return 'c6';
    }
    if (firstLine.includes('final do cart') || firstLine.includes('valor (em r$)')) {
      return 'c6';
    }
    
    // Verifica outras palavras-chave no conteúdo
    const firstLines = content.split('\n').slice(0, 5).join('\n').toLowerCase();
    
    if (firstLines.includes('nubank') || firstLines.includes('nu pagamentos')) {
      return 'nubank';
    }
    if (firstLines.includes('inter') || firstLines.includes('banco inter')) {
      return 'inter';
    }
    if (firstLines.includes('itau') || firstLines.includes('itaú')) {
      return 'itau';
    }
    if (firstLines.includes('bradesco')) {
      return 'bradesco';
    }
    
    return 'generic';
  },

  // Parser principal
  parse(content, format = 'auto') {
    // Remove BOM se existir
    content = content.replace(/^\uFEFF/, '');
    
    if (format === 'auto') {
      format = this.detectFormat(content);
    }

    const parsers = {
      nubank: this.parseNubank,
      c6: this.parseC6,
      inter: this.parseInter,
      itau: this.parseItau,
      bradesco: this.parseBradesco,
      generic: this.parseGeneric
    };

    const parser = parsers[format] || parsers.generic;
    return parser.call(this, content);
  },

  // Nubank formato: date,title,amount
  parseNubank(content) {
    const lines = this.csvToArray(content);
    const transactions = [];
    
    if (lines.length === 0) return transactions;
    
    console.log('Linhas parseadas:', lines.length);
    console.log('Primeira linha (header):', lines[0]);
    if (lines[1]) console.log('Segunda linha (dados):', lines[1]);
    
    // Pula header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 3) continue;
      
      const [date, title, amount] = line;
      
      if (!date || !title) continue;
      
      const parsedAmount = this.parseAmount(amount);
      
      // No Nubank cartão de crédito:
      // - Valores positivos = compras (gastos)
      // - Valores negativos = pagamentos/estornos (entradas de crédito)
      const isIncome = parsedAmount < 0;
      
      transactions.push({
        id: crypto.randomUUID(),
        date: this.parseDate(date),
        description: title,
        originalCategory: '',
        amount: parsedAmount,
        type: isIncome ? 'income' : 'expense'
      });
    }
    
    return transactions;
  },

  // C6 Bank formato: Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)
  // Separador: ;
  parseC6(content) {
    // C6 usa ; como separador
    const lines = content.split('\n').map(line => {
      // Parse simples por ; (C6 não usa aspas com ; dentro)
      return line.split(';').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
    
    const transactions = [];
    
    if (lines.length === 0) return transactions;
    
    console.log('C6 - Linhas:', lines.length);
    console.log('C6 - Header:', lines[0]);
    
    // Mapeamento de categorias do C6 para as nossas
    const c6CategoryMap = {
      'restaurante': 'alimentacao',
      'lanchonete': 'alimentacao',
      'bar': 'alimentacao',
      'supermercado': 'alimentacao',
      'mercearia': 'alimentacao',
      'padaria': 'alimentacao',
      'conveniência': 'alimentacao',
      'transporte': 'transporte',
      'automotivo': 'transporte',
      'uber': 'transporte',
      'combustível': 'transporte',
      'posto': 'transporte',
      'vestuário': 'compras',
      'roupas': 'compras',
      'varejo': 'compras',
      'tv por assinatura': 'assinaturas',
      'serviços de rádio': 'assinaturas',
      'telecomunicações': 'servicos',
      'assistência médica': 'saude',
      'odontológica': 'saude',
      'drogaria': 'saude',
      'farmácia': 'saude',
      'recreativo': 'lazer',
      'construção': 'moradia',
      'empresa para empresa': 'outros',
      'marketing direto': 'compras'
    };
    
    // Função para mapear categoria do C6
    const mapC6Category = (c6Cat) => {
      if (!c6Cat || c6Cat === '-') return null;
      const lower = c6Cat.toLowerCase();
      for (const [key, value] of Object.entries(c6CategoryMap)) {
        if (lower.includes(key)) {
          return value;
        }
      }
      return null;
    };
    
    // Pula header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 9) continue;
      
      // Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)
      // 0              1              2               3         4         5       6              7               8
      const date = line[0];
      const c6Category = line[3];
      const description = line[4];
      const parcela = line[5];
      const valorBRL = line[8];
      
      if (!date || !description) continue;
      
      const parsedAmount = this.parseAmount(valorBRL);
      
      // C6: valores negativos são pagamentos/estornos
      const isIncome = parsedAmount < 0;
      
      // Monta descrição com parcela se houver
      let fullDescription = description.trim();
      if (parcela && parcela !== 'Única' && parcela !== '-') {
        fullDescription += ` (${parcela})`;
      }
      
      transactions.push({
        id: crypto.randomUUID(),
        date: this.parseDate(date),
        description: fullDescription,
        originalCategory: c6Category,
        c6Category: mapC6Category(c6Category),
        amount: parsedAmount,
        type: isIncome ? 'income' : 'expense'
      });
    }
    
    return transactions;
  },

  // Inter: Data,Descrição,Valor,Saldo
  parseInter(content) {
    const lines = this.csvToArray(content);
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 3) continue;
      
      const [date, description, amount] = line;
      
      transactions.push({
        id: crypto.randomUUID(),
        date: this.parseDate(date),
        description: description,
        originalCategory: '',
        amount: this.parseAmount(amount),
        type: this.parseAmount(amount) < 0 ? 'expense' : 'income'
      });
    }
    
    return transactions;
  },

  // Itaú: data;historico;valor;saldo
  parseItau(content) {
    // Itaú usa ; como separador
    const lines = content.split('\n').map(line => line.split(';'));
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 3) continue;
      
      const [date, description, amount] = line;
      
      transactions.push({
        id: crypto.randomUUID(),
        date: this.parseDate(date),
        description: description?.trim() || '',
        originalCategory: '',
        amount: this.parseAmount(amount),
        type: this.parseAmount(amount) < 0 ? 'expense' : 'income'
      });
    }
    
    return transactions;
  },

  // Bradesco: similar ao Itaú
  parseBradesco(content) {
    return this.parseItau(content);
  },

  // Formato genérico: tenta detectar colunas automaticamente
  parseGeneric(content) {
    const lines = this.csvToArray(content);
    const transactions = [];
    
    if (lines.length === 0) return transactions;
    
    // Tenta detectar as colunas pelo header
    const header = lines[0]?.map(h => h?.toLowerCase?.().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '') || [];
    console.log('Header genérico detectado:', header);
    
    let dateIdx = header.findIndex(h => h.includes('data') || h.includes('date'));
    let descIdx = header.findIndex(h => h.includes('descri') || h.includes('title') || h.includes('historico') || h.includes('lancamento'));
    let amountIdx = header.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value') || h.includes('quantia'));
    
    // Fallback para posições padrão se não encontrou pelo nome
    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) {
      // Procura a coluna com texto mais longo (provavelmente é a descrição)
      descIdx = lines[1] ? lines[1].reduce((maxIdx, val, idx) => {
        if (idx === dateIdx || idx === amountIdx) return maxIdx;
        return (val?.length || 0) > (lines[1][maxIdx]?.length || 0) ? idx : maxIdx;
      }, 1) : 1;
    }
    if (amountIdx === -1) {
      // Procura coluna com número/valor monetário
      amountIdx = header.length > 2 ? 2 : 1;
    }
    
    console.log('Índices genérico - data:', dateIdx, 'desc:', descIdx, 'valor:', amountIdx);
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.length < 2) continue;
      
      const date = line[dateIdx];
      const description = line[descIdx];
      const amount = line[amountIdx];
      
      if (!date && !description) continue;
      
      const parsedAmount = this.parseAmount(amount);
      
      // Pula linha se não tem valor
      if (parsedAmount === 0 && !amount) continue;
      
      transactions.push({
        id: crypto.randomUUID(),
        date: this.parseDate(date),
        description: description || 'Sem descrição',
        originalCategory: '',
        amount: parsedAmount,
        type: parsedAmount < 0 ? 'expense' : 'income'
      });
    }
    
    return transactions;
  },

  // Converte CSV para array respeitando aspas
  csvToArray(content, delimiter = ',') {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Última linha
    if (currentField || currentLine.length) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f)) {
        lines.push(currentLine);
      }
    }
    
    return lines;
  },

  // Parse de data em vários formatos
  parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    dateStr = dateStr.trim();
    
    // DD/MM/YYYY ou DD-MM-YYYY
    let match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match) {
      let [_, day, month, year] = match;
      if (year.length === 2) {
        year = '20' + year;
      }
      return new Date(year, month - 1, day);
    }
    
    // YYYY-MM-DD
    match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [_, year, month, day] = match;
      return new Date(year, month - 1, day);
    }
    
    // Tenta parse nativo
    const parsed = new Date(dateStr);
    return isNaN(parsed) ? new Date() : parsed;
  },

  // Parse de valor monetário
  parseAmount(amountStr) {
    if (!amountStr) return 0;
    if (typeof amountStr === 'number') return amountStr;
    
    amountStr = amountStr.trim();
    
    // Remove aspas
    amountStr = amountStr.replace(/"/g, '');
    
    // Remove R$, espaços extras
    amountStr = amountStr.replace(/[R$]/g, '').trim();
    
    // Detecta sinal negativo (pode ter espaço: "- 1.295,31")
    const isNegative = amountStr.includes('-');
    amountStr = amountStr.replace(/-/g, '').trim();
    
    // Detecta formato brasileiro (1.234,56) ou americano (1,234.56)
    // Brasileiro: ponto como milhar, vírgula como decimal
    // Americano: vírgula como milhar, ponto como decimal
    const lastComma = amountStr.lastIndexOf(',');
    const lastDot = amountStr.lastIndexOf('.');
    
    let value;
    
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.234,56 -> vírgula é decimal
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Formato americano: 1,234.56 -> ponto é decimal
      amountStr = amountStr.replace(/,/g, '');
    } else if (lastComma !== -1 && lastDot === -1) {
      // Só tem vírgula: 19,90 -> vírgula é decimal
      amountStr = amountStr.replace(',', '.');
    }
    // Se só tem ponto ou nenhum, mantém como está
    
    value = parseFloat(amountStr) || 0;
    
    return isNegative ? -value : value;
  }
};
