import type { BankParser, ParsedTransaction } from './BankParserInterface';
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
];

function normalizeForSecurity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function parseNotification(
  packageName: string,
  title: string,
  text: string,
): ParsedTransaction | null {
  const notificationContent = normalizeForSecurity(`${title} ${text}`);

  if (SECURITY_BLACKLIST.some(term => notificationContent.includes(term))) {
    return null;
  }

  const parser = parsers[packageName];
  if (!parser) {
    return null;
  }

  return parser.parse(title, text);
}

export type { BankParser, ParsedTransaction } from './BankParserInterface';
