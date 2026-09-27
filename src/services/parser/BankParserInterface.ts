import type { PaymentMethod, TransactionType } from '../../types/database';

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  merchant: string;
  bankName: string;
}

export interface BankParser {
  packageName: string;
  bankName: string;
  parse(title: string, text: string): ParsedTransaction | null;
}
