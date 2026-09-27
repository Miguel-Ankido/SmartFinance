import { parseNotification } from '../src/services/parser';

describe('parseNotification', () => {
  it('parses an approved Nubank purchase', () => {
    expect(
      parseNotification(
        'com.nu.production',
        'Nubank',
        'Compra de R$ 45,90 no Supermercado aprovada',
      ),
    ).toEqual({
      amount: 45.9,
      type: 'EXPENSE',
      paymentMethod: 'CREDIT',
      merchant: 'Supermercado',
      bankName: 'Nubank',
    });
  });

  it('parses a PicPay payment', () => {
    expect(
      parseNotification(
        'com.picpay',
        'PicPay',
        'Voc\u00ea pagou R$ 25,00 para Padaria Central',
      ),
    ).toMatchObject({
      amount: 25,
      type: 'EXPENSE',
      paymentMethod: 'PIX',
      merchant: 'Padaria Central',
      bankName: 'PicPay',
    });
  });

  it('parses a Banco Inter Pix transfer', () => {
    expect(
      parseNotification(
        'br.com.intermedium',
        'Banco Inter',
        'Pix realizado com sucesso no valor de R$ 30,00 para Carlos',
      ),
    ).toMatchObject({
      amount: 30,
      type: 'EXPENSE',
      paymentMethod: 'PIX',
      merchant: 'Carlos',
      bankName: 'Banco Inter',
    });
  });

  it('discards notifications containing security codes or tokens', () => {
    expect(
      parseNotification(
        'com.nu.production',
        'C\u00f3digo de seguran\u00e7a',
        'Use o token 123456 para confirmar.',
      ),
    ).toBeNull();
  });
});
