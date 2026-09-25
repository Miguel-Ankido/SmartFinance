import { Transaction } from '../types/finance';

const CATEGORY_NAMES: Record<string, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  entertainment: 'Lazer',
  bills: 'Contas Fixas',
  shopping: 'Compras',
  salary: 'Salário/Renda',
  others: 'Diversos',
};

const escapeCsvField = (field: string | number | undefined): string => {
  if (field === undefined || field === null) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
};

export const generateTransactionsCsv = (
  transactions: Transaction[],
  userName?: string
): string => {
  // Byte Order Mark (BOM) UTF-8 para o Excel abrir sem quebrar caracteres acentuados
  let csv = '\uFEFF';

  // Cabeçalho de Metadados
  csv += `# Relatório Financeiro SmartFinance\n`;
  csv += `# Titular: ${userName || 'Usuário SmartFinance'}\n`;
  csv += `# Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
  csv += `# Total de registros: ${transactions.length}\n\n`;

  // Cabeçalhos de Colunas (padrão com separador ponto e vírgula)
  const headers = [
    'Data',
    'Hora',
    'Descrição / Estabelecimento',
    'Categoria',
    'Instituição / Banco',
    'Tipo',
    'Valor (R$)',
    'Observações',
  ];
  csv += headers.join(';') + '\n';

  // Linhas das Transações ordenadas por data
  const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach(t => {
    const dateObj = new Date(t.timestamp);
    const dateStr = dateObj.toLocaleDateString('pt-BR');
    const timeStr = t.timeFormatted || dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const categoryLabel = CATEGORY_NAMES[t.category] || 'Diversos';
    const typeLabel = t.type === 'INCOME' ? 'Receita (+)' : 'Despesa (-)';
    const formattedAmount = t.amount.toFixed(2).replace('.', ',');

    const row = [
      escapeCsvField(dateStr),
      escapeCsvField(timeStr),
      escapeCsvField(t.title),
      escapeCsvField(categoryLabel),
      escapeCsvField(t.bankName),
      escapeCsvField(typeLabel),
      escapeCsvField(formattedAmount),
      escapeCsvField(t.note || ''),
    ];

    csv += row.join(';') + '\n';
  });

  return csv;
};