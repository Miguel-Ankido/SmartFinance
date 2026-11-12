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

  it('parses an incoming PicPay transfer (te pagou)', () => {
    expect(
      parseNotification(
        'com.picpay',
        'PicPay',
        'Joao te pagou R$ 35,00',
      ),
    ).toMatchObject({
      amount: 35,
      type: 'INCOME',
      paymentMethod: 'PIX',
      merchant: 'Joao',
      bankName: 'PicPay',
    });
  });

  it('parses an incoming PicPay transfer sent via shell/emulator', () => {
    expect(
      parseNotification(
        'com.android.shell',
        'PicPay',
        'Joao te pagou R$ 35,00',
      ),
    ).toMatchObject({
      amount: 35,
      type: 'INCOME',
      paymentMethod: 'PIX',
      merchant: 'Joao',
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

  describe('Promotional, Marketing & Non-Transaction notifications filtering', () => {
    it('discards PicPay cashback and promotion notifications', () => {
      expect(
        parseNotification(
          'com.picpay',
          'PicPay',
          'Você ganhou R$ 10,00 de cashback! Aproveite no PicPay Shop.',
        ),
      ).toBeNull();

      expect(
        parseNotification(
          'com.picpay',
          'Promoção Imperdível',
          'Ganhe até R$ 20 de volta comprando hoje!',
        ),
      ).toBeNull();
    });

    it('discards loan and pre-approved limit offers', () => {
      expect(
        parseNotification(
          'com.nu.production',
          'Nubank',
          'Empréstimo pré-aprovado de R$ 5.000,00 liberado para você. Aproveite!',
        ),
      ).toBeNull();

      expect(
        parseNotification(
          'br.com.intermedium',
          'Banco Inter',
          'Você tem limite extra pré-aprovado no cartão de crédito.',
        ),
      ).toBeNull();
    });

    it('discards invoice statements (fatura fechada)', () => {
      expect(
        parseNotification(
          'com.nu.production',
          'Nubank',
          'Sua fatura fechou no valor de R$ 1.250,00. Pague até o vencimento.',
        ),
      ).toBeNull();

      expect(
        parseNotification(
          'com.picpay',
          'PicPay Card',
          'A sua fatura do cartão fechou. Confira o boleto no app.',
        ),
      ).toBeNull();
    });

    it('discards coupons, discounts, and rewards campaigns', () => {
      expect(
        parseNotification(
          'com.picpay',
          'Cupom de desconto',
          'Use o cupom PIC10 e ganhe 10% de desconto na sua próxima compra.',
        ),
      ).toBeNull();

      expect(
        parseNotification(
          'br.com.intermedium',
          'Inter Shop',
          'Ofertas especiais de até 50% off com cashback direto na conta!',
        ),
      ).toBeNull();

      expect(
        parseNotification(
          'com.nu.production',
          'Nubank',
          'Indique um amigo e concorra a prêmios exclusivos neste mês.',
        ),
      ).toBeNull();
    });
  });
});
