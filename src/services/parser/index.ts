import type { BankParser, ParsedTransaction } from './BankParserInterface';
import type { CategoryId } from '../../types/finance';
import type { TransactionType } from '../../types/database';
import { NubankParser } from './banks/NubankParser';
import { PicPayParser } from './banks/PicPayParser';
import { InterParser } from './banks/InterParser';

const parsers: Record<string, BankParser> = {
  'com.nu.production': new NubankParser(),
  'com.picpay': new PicPayParser(),
  'br.com.intermedium': new InterParser(),
};

const SECURITY_BLACKLIST = [
  'codigo',
  'token',
  'senha',
  'verificacao',
  'seguranca',
  'chave de seguranca',
  'autenticacao',
  '2fa',
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function inferCategoryFromMerchant(
  merchant: string,
  type: TransactionType,
): CategoryId {
  if (type === 'INCOME') {
    return 'salary';
  }

  const normalized = normalizeText(merchant);

  if (
    /supermercado|mercado|padaria|ifood|restaurante|lanchonete|burger|pizza|cafe|acai|hortifruti|atacadao|assai|carrefour|pao de acucar/.test(
      normalized,
    )
  ) {
    return 'food';
  }

  if (
    /uber|99pop|99app|99\*|posto|ipiranga|shell|petrobras|metro|cptm|bilhete unico|pedagio|sem parar|veloe|estacionamento|onibus/.test(
      normalized,
    )
  ) {
    return 'transport';
  }

  if (
    /netflix|spotify|cinema|cinemark|ingresso|steam|playstation|xbox|nintendo|prime video|disney|hbo|youtube|show|bar\b|evento/.test(
      normalized,
    )
  ) {
    return 'entertainment';
  }

  if (
    /sabesp|enel|claro|vivo|tim\b|oi\b|internet|aluguel|condominio|energia|luz\b|agua\b|gas\b|seguro|faculdade|senac|escola/.test(
      normalized,
    )
  ) {
    return 'bills';
  }

  if (
    /amazon|mercado livre|mercadolivre|shopee|magalu|magazine|shein|aliexpress|renner|riachuelo|cea\b|zara|farmacia|drogasil|raia/.test(
      normalized,
    )
  ) {
    return 'shopping';
  }

  return 'others';
}

export function parseNotification(
  packageName: string,
  title: string,
  text: string,
): ParsedTransaction | null {
  const notificationContent = normalizeText(`${title} ${text}`);

  if (SECURITY_BLACKLIST.some(term => notificationContent.includes(term))) {
    return null;
  }

  const parser = parsers[packageName];
  if (!parser) {
    return null;
  }

  const parsed = parser.parse(title, text);
  if (!parsed || !Number.isFinite(parsed.amount) || parsed.amount <= 0) {
    return null;
  }

  return {
    ...parsed,
    category: parsed.category ?? inferCategoryFromMerchant(parsed.merchant, parsed.type),
  };
}

export type { BankParser, ParsedTransaction } from './BankParserInterface';
