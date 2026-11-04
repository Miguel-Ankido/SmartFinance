import type { PaymentMethod, TransactionType } from '../../types/database';
import type { CategoryId } from '../../types/finance';

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  merchant: string;
  bankName: string;
  category?: CategoryId;
}

export interface BankParser {
  packageName: string;
  bankName: string;
  parse(title: string, text: string): ParsedTransaction | null;
}
