import type { BankParser, ParsedTransaction } from '../BankParserInterface';

export class NubankParser implements BankParser {
  packageName = 'com.nu.production';
  bankName = 'Nubank';

  parse(title: string, text: string): ParsedTransaction | null {
    const raw = `${title} ${text}`.trim();

    const cardMatch = raw.match(
      /compra de r\$\s*([\d.,]+)\s+no\s+(.+?)\s*(?:aprovada|processada)\b/i,
    );
    if (cardMatch) {
      return {
        amount: this.parseAmount(cardMatch[1]),
        type: 'EXPENSE',
        paymentMethod: 'CREDIT',
        merchant: cardMatch[2].trim(),
        bankName: this.bankName,
      };
    }

    const pixSentMatch = raw.match(
      /(?:transfer(?:\u00eancia|encia)|pix) de r\$\s*([\d.,]+)\s+enviad[oa]\s+para\s+(.+)/i,
    );
    if (pixSentMatch) {
      return {
        amount: this.parseAmount(pixSentMatch[1]),
        type: 'EXPENSE',
        paymentMethod: 'PIX',
        merchant: pixSentMatch[2].trim(),
        bankName: this.bankName,
      };
    }

    const pixReceivedMatch = raw.match(
      /(?:voc(?:\u00ea|e)\s+)?recebeu\s+(?:uma transfer(?:\u00eancia|encia)|um pix)\s+de r\$\s*([\d.,]+)\s+de\s+(.+)/i,
    );
    if (pixReceivedMatch) {
      return {
        amount: this.parseAmount(pixReceivedMatch[1]),
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: pixReceivedMatch[2].trim(),
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
