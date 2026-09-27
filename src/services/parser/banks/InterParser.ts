import type { BankParser, ParsedTransaction } from '../BankParserInterface';

export class InterParser implements BankParser {
  packageName = 'br.com.intermedium';
  bankName = 'Banco Inter';

  parse(title: string, text: string): ParsedTransaction | null {
    const raw = `${title} ${text}`.trim();

    const purchaseMatch = raw.match(
      /compra aprovada.+?r\$\s*([\d.,]+)\s+em\s+(.+)/i,
    );
    if (purchaseMatch) {
      return {
        amount: this.parseAmount(purchaseMatch[1]),
        type: 'EXPENSE',
        paymentMethod: 'CREDIT',
        merchant: purchaseMatch[2].trim(),
        bankName: this.bankName,
      };
    }

    const pixOutMatch = raw.match(
      /pix realizado com sucesso no valor de r\$\s*([\d.,]+)\s+para\s+(.+)/i,
    );
    if (pixOutMatch) {
      return {
        amount: this.parseAmount(pixOutMatch[1]),
        type: 'EXPENSE',
        paymentMethod: 'PIX',
        merchant: pixOutMatch[2].trim(),
        bankName: this.bankName,
      };
    }

    return null;
  }

  private parseAmount(value: string): number {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const amount = Number.parseFloat(normalized);

    return Number.isFinite(amount) ? amount : 0;
  }
}
