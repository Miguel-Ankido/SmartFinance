import { createCapturedBankTransaction } from '../src/services/notificationListener';

describe('createCapturedBankTransaction', () => {
  it('returns only the sanitized transaction fields', () => {
    const transaction = createCapturedBankTransaction('user-123', {
      packageName: 'com.nu.production',
      title: 'Nubank',
      text: 'Compra de R$ 45,90 no Supermercado aprovada',
      postTime: 1_700_000_000_000,
    });

    expect(transaction).toEqual(
      expect.objectContaining({
        user_id: 'user-123',
        amount: 45.9,
        type: 'EXPENSE',
        payment_method: 'CREDIT',
        merchant: 'Supermercado',
        bankName: 'Nubank',
      }),
    );
    expect(transaction).not.toHaveProperty('text');
    expect(transaction).not.toHaveProperty('title');
  });

  it('discards notifications containing security credentials', () => {
    const transaction = createCapturedBankTransaction('user-123', {
      packageName: 'com.nu.production',
      title: 'Codigo de seguranca',
      text: 'Token 123456',
    });

    expect(transaction).toBeNull();
  });
});
