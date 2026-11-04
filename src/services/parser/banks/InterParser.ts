import type { BankParser, ParsedTransaction } from '../BankParserInterface';

export class InterParser implements BankParser {
  packageName = 'br.com.intermedium';
  bankName = 'Banco Inter';

  parse(title: string, text: string): ParsedTransaction | null {
    const raw = `${title} ${text}`.trim();

    const purchaseMatch = raw.match(
      /compra\s+aprovada(?:\s+no\s+(d[eé]bito|cr[eé]dito))?.+?r\$\s*([\d.,]+)\s+em\s+(.+)/i,
    );
    if (purchaseMatch) {
      const amount = this.parseAmount(purchaseMatch[2]);
      if (amount <= 0) {
        return null;
      }
      const mode = (purchaseMatch[1] || '').toLowerCase();
      const paymentMethod = mode.startsWith('d') ? 'DEBIT' : 'CREDIT';

      return {
        amount,
        type: 'EXPENSE',
        paymentMethod,
        merchant: purchaseMatch[3].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    const pixOutMatch = raw.match(
      /pix\s+(?:realizado|enviado)\s+(?:com\s+sucesso\s+)?no\s+valor\s+de\s+r\$\s*([\d.,]+)\s+para\s+(.+)/i,
    );
    if (pixOutMatch) {
      const amount = this.parseAmount(pixOutMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'EXPENSE',
        paymentMethod: 'PIX',
        merchant: pixOutMatch[2].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    const pixInMatch = raw.match(
      /(?:voc[eê]\s+)?recebeu\s+um\s+pix\s+(?:no\s+valor\s+)?de\s+r\$\s*([\d.,]+)\s+de\s+(.+)/i,
    );
    if (pixInMatch) {
      const amount = this.parseAmount(pixInMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: pixInMatch[2].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    return null;
  }

  private parseAmount(value: string): number {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const amount = Number.parseFloat(normalized);

    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }
}
