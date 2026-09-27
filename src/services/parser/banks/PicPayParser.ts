import type { BankParser, ParsedTransaction } from '../BankParserInterface';

export class PicPayParser implements BankParser {
  packageName = 'com.picpay';
  bankName = 'PicPay';

  parse(title: string, text: string): ParsedTransaction | null {
    const raw = `${title} ${text}`.trim();

    const payMatch = raw.match(
      /voc(?:\u00ea|e) pagou r\$\s*([\d.,]+)\s+para\s+(.+)/i,
    );
    if (payMatch) {
      return {
        amount: this.parseAmount(payMatch[1]),
        type: 'EXPENSE',
        paymentMethod: 'PIX',
        merchant: payMatch[2].trim(),
        bankName: this.bankName,
      };
    }

    const receivedMatch = raw.match(
      /recebeu um pix de r\$\s*([\d.,]+)\s+de\s+(.+)/i,
    );
    if (receivedMatch) {
      return {
        amount: this.parseAmount(receivedMatch[1]),
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: receivedMatch[2].trim(),
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
