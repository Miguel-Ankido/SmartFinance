import { BANK_CONFIGS, getBankColor } from '../src/utils/bankColors';
import { Account } from '../src/types/finance';

describe('Bank Colors & Configs', () => {
  it('should have predefined brand colors for major banks', () => {
    expect(BANK_CONFIGS.length).toBeGreaterThanOrEqual(8);
    const nubank = BANK_CONFIGS.find(b => b.name === 'Nubank');
    expect(nubank?.color).toBe('#820AD1');

    const picpay = BANK_CONFIGS.find(b => b.name === 'PicPay');
    expect(picpay?.color).toBe('#11C76F');

    const inter = BANK_CONFIGS.find(b => b.name === 'Banco Inter');
    expect(inter?.color).toBe('#FF7A00');

    const itau = BANK_CONFIGS.find(b => b.name === 'Itaú');
    expect(itau?.color).toBe('#EC7000');
  });

  it('getBankColor should return brand colors for known bank and fallback for unknown', () => {
    expect(getBankColor('Nubank').color).toBe('#820AD1');
    expect(getBankColor('PicPay').color).toBe('#11C76F');
    expect(getBankColor('UnknownBank').color).toBe('#a855f7');
    expect(getBankColor(undefined).color).toBe('#a855f7');
  });
});

describe('Wallet Bank Linkage', () => {
  it('should allow attaching a bank to an Account model', () => {
    const account: Account = {
      id: 'acc-1',
      name: 'Conta Nubank',
      type: 'CHECKING',
      bank: 'Nubank',
      color: '#820AD1',
      initialBalance: 1500,
      initial_balance: 1500,
      isActive: true,
      is_active: true,
    };

    expect(account.bank).toBe('Nubank');
    expect(account.color).toBe('#820AD1');
  });
});
