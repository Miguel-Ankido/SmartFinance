import type { BankParser, ParsedTransaction } from '../BankParserInterface';

export class NubankParser implements BankParser {
  packageName = 'com.nu.production';
  bankName = 'Nubank';

  parse(title: string, text: string): ParsedTransaction | null {
    const raw = `${title} ${text}`.trim();

    const cardMatch = raw.match(
      /compra(?:\s+no\s+(d[eé]bito|cr[eé]dito))?\s+de\s+r\$\s*([\d.,]+)\s+(?:no|em)\s+(.+?)\s*(?:aprovada|processada)\b/i,
    );
    if (cardMatch) {
      const amount = this.parseAmount(cardMatch[2]);
      if (amount <= 0) {
        return null;
      }
      const mode = (cardMatch[1] || '').toLowerCase();
      const paymentMethod = mode.startsWith('d') ? 'DEBIT' : 'CREDIT';

      return {
        amount,
        type: 'EXPENSE',
        paymentMethod,
        merchant: cardMatch[3].trim(),
        bankName: this.bankName,
      };
    }

    const pixSentMatch = raw.match(
      /(?:transfer(?:ência|encia)|pix)\s+de\s+r\$\s*([\d.,]+)\s+enviad[oa]\s+para\s+(.+)/i,
    );
    if (pixSentMatch) {
      const amount = this.parseAmount(pixSentMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'EXPENSE',
        paymentMethod: 'PIX',
        merchant: pixSentMatch[2].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    const pixReceivedMatch = raw.match(
      /(?:voc(?:ê|e)\s+)?recebeu\s+(?:uma transfer(?:ência|encia)|um pix)\s+de\s+r\$\s*([\d.,]+)\s+de\s+(.+)/i,
    );
    if (pixReceivedMatch) {
      const amount = this.parseAmount(pixReceivedMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: pixReceivedMatch[2].replace(/\.$/, '').trim(),
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
