export interface BankConfig {
  name: string;
  color: string;
  textColor: string;
}

export const BANK_CONFIGS: BankConfig[] = [
  { name: 'Nubank', color: '#820AD1', textColor: '#ffffff' },
  { name: 'PicPay', color: '#11C76F', textColor: '#ffffff' },
  { name: 'Banco Inter', color: '#FF7A00', textColor: '#ffffff' },
  { name: 'Itaú', color: '#EC7000', textColor: '#ffffff' },
  { name: 'Bradesco', color: '#CC0000', textColor: '#ffffff' },
  { name: 'Santander', color: '#EA1D2C', textColor: '#ffffff' },
  { name: 'C6 Bank', color: '#242424', textColor: '#ffffff' },
  { name: 'Caixa', color: '#0066B3', textColor: '#ffffff' },
  { name: 'Banco do Brasil', color: '#F8D117', textColor: '#003882' },
  { name: 'Dinheiro', color: '#10B981', textColor: '#ffffff' },
];

export const BANK_COLOR_MAP: Record<string, { color: string; textColor: string }> = BANK_CONFIGS.reduce(
  (acc, b) => {
    acc[b.name] = { color: b.color, textColor: b.textColor };
    return acc;
  },
  {} as Record<string, { color: string; textColor: string }>,
);

export function getBankColor(bankName?: string): { color: string; textColor: string } {
  if (!bankName) return { color: '#a855f7', textColor: '#ffffff' };
  return BANK_COLOR_MAP[bankName] || { color: '#a855f7', textColor: '#ffffff' };
}
