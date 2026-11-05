import type { BankParser, ParsedTransaction } from '../BankParserInterface';

export class PicPayParser implements BankParser {
  packageName = 'com.picpay';
  bankName = 'PicPay';

  parse(title: string, text: string): ParsedTransaction | null {
    const raw = `${title} ${text}`.trim();

    const payMatch = raw.match(
      /voc(?:ê|e)\s+pagou\s+r\$\s*([\d.,]+)\s+(?:para|em)\s+(.+)/i,
    );
    if (payMatch) {
      const amount = this.parseAmount(payMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'EXPENSE',
        paymentMethod: 'PIX',
        merchant: payMatch[2].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    const cardMatch = raw.match(
      /compra\s+(?:aprovada\s+)?de\s+r\$\s*([\d.,]+)\s+em\s+(.+)/i,
    );
    if (cardMatch) {
      const amount = this.parseAmount(cardMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'EXPENSE',
        paymentMethod: 'CREDIT',
        merchant: cardMatch[2].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    const receivedMatch = raw.match(
      /recebeu\s+(?:um\s+pix|um\s+pagamento)\s+de\s+r\$\s*([\d.,]+)\s+de\s+(.+)/i,
    );
    if (receivedMatch) {
      const amount = this.parseAmount(receivedMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: receivedMatch[2].replace(/\.$/, '').trim(),
        bankName: this.bankName,
      };
    }

    const tePagouMatch = raw.match(
      /(?:^|.*?\s+)?(.+?)\s+te\s+pagou\s+r\$\s*([\d.,]+)/i,
    );
    if (tePagouMatch) {
      const amount = this.parseAmount(tePagouMatch[2]);
      if (amount <= 0) {
        return null;
      }
      const rawSender = tePagouMatch[1]
        .replace(/^(?:picpay|alerta|notifica[çc][ãa]o)[\s:-]*/i, '')
        .replace(/\.$/, '')
        .trim();

      return {
        amount,
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: rawSender || 'Transferência PicPay',
        bankName: this.bankName,
      };
    }

    const directReceivedMatch = raw.match(
      /voc(?:ê|e)\s+recebeu\s+r\$\s*([\d.,]+)\s+de\s+(.+)/i,
    );
    if (directReceivedMatch) {
      const amount = this.parseAmount(directReceivedMatch[1]);
      if (amount <= 0) {
        return null;
      }
      return {
        amount,
        type: 'INCOME',
        paymentMethod: 'PIX',
        merchant: directReceivedMatch[2].replace(/\.$/, '').trim(),
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
