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

export const SECURITY_BLACKLIST = [
  'codigo',
  'token',
  'senha',
  'verificacao',
  'seguranca',
  'chave de seguranca',
  'autenticacao',
  '2fa',
];

export const PROMOTIONAL_BLACKLIST = [
  'promocao',
  'promocoes',
  'oferta',
  'ofertas',
  'desconto',
  'descontos',
  'cashback',
  'de volta',
  'cupom',
  'cupons',
  'aproveite',
  'aproveitar',
  'garanta',
  'imperdivel',
  'imperdiveis',
  'emprestimo',
  'emprestimos',
  'pre-aprovado',
  'pre aprovado',
  'limite aumentado',
  'aumento de limite',
  'limite extra',
  'aumente seu limite',
  'rendimento',
  'rendeu',
  'investimento',
  'investimentos',
  'cdi',
  'cripto',
  'nucoin',
  'bonus',
  'sorteio',
  'sorteios',
  'premio',
  'premios',
  'indique e ganhe',
  'indique um amigo',
  'convide amigos',
  'seguro celular',
  'seguro de vida',
  'fatura fechada',
  'fatura do seu cartao fechou',
  'fatura fechou',
  'fatura disponivel',
  'sua fatura vence',
  'lembrete de fatura',
  'novidade no app',
  'conheca as vantagens',
  'conheca o novo',
  'experimente o novo',
  'compre com desconto',
  'parcelamento de fatura',
  'renegocie sua divida',
  'renegociacao',
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

  if (PROMOTIONAL_BLACKLIST.some(term => notificationContent.includes(term))) {
    return null;
  }

  let parser = parsers[packageName];
  if (!parser) {
    const hint = `${packageName} ${title}`.toLowerCase();
    if (hint.includes('picpay')) {
      parser = parsers['com.picpay'];
    } else if (hint.includes('nu') || hint.includes('nubank')) {
      parser = parsers['com.nu.production'];
    } else if (hint.includes('inter')) {
      parser = parsers['br.com.intermedium'];
    }
  }

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
