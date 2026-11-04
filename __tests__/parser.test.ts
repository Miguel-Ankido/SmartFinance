import { parseNotification } from '../src/services/parser';

describe('parseNotification', () => {
  it('parses an approved Nubank purchase and infers category', () => {
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
      category: 'food',
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
      category: 'food',
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
      category: 'others',
    });
  });

  it('parses an incoming Banco Inter Pix transfer', () => {
    expect(
      parseNotification(
        'br.com.intermedium',
        'Banco Inter',
        'Você recebeu um Pix no valor de R$ 150,00 de Ana Silva',
      ),
    ).toMatchObject({
      amount: 150,
      type: 'INCOME',
      paymentMethod: 'PIX',
      merchant: 'Ana Silva',
      bankName: 'Banco Inter',
      category: 'salary',
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
