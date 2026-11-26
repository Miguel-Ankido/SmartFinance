import {
  evaluateBudgetExtrapolation,
  isImageAvatarUri,
  normalizeOtpCode,
} from '../src/utils/profileBudgetUtils';
import { translateMobileAuthError } from '../src/context/AuthContext';

describe('Avatar URI Detection (Home & Perfil)', () => {
  it('recognizes http, https, data:image, file, and content URIs as image photos', () => {
    expect(isImageAvatarUri('https://example.com/photo.jpg')).toBe(true);
    expect(isImageAvatarUri('http://example.com/photo.png')).toBe(true);
    expect(isImageAvatarUri('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(isImageAvatarUri('file:///storage/emulated/0/avatar.jpg')).toBe(true);
    expect(isImageAvatarUri('content://media/external/images/media/42')).toBe(true);
  });

  it('rejects emoji presets, blank strings, and undefined', () => {
    expect(isImageAvatarUri('🚀')).toBe(false);
    expect(isImageAvatarUri('💼')).toBe(false);
    expect(isImageAvatarUri('')).toBe(false);
    expect(isImageAvatarUri(undefined)).toBe(false);
    expect(isImageAvatarUri(null)).toBe(false);
  });
});

describe('Extrapolação de Limites em Metas', () => {
  it('identifica quando apenas os gastos extrapolam o teto da categoria', () => {
    const res = evaluateBudgetExtrapolation(950, 800, 3000, 5000);
    expect(res.hasLimit).toBe(true);
    expect(res.isSpentExtrapolated).toBe(true);
    expect(res.spentExcessAmount).toBe(150);
    expect(res.isSingleLimitOverIncome).toBe(false);
    expect(res.isTotalBudgetOverIncome).toBe(false);
    expect(res.isAnyExtrapolated).toBe(true);
  });

  it('permite identificar quando uma meta individual extrapola a renda mensal', () => {
    const res = evaluateBudgetExtrapolation(200, 4500, 6000, 4000);
    expect(res.isSpentExtrapolated).toBe(false);
    expect(res.isSingleLimitOverIncome).toBe(true);
    expect(res.singleIncomeExcessAmount).toBe(500);
    expect(res.isTotalBudgetOverIncome).toBe(true);
    expect(res.totalIncomeExcessAmount).toBe(2000);
    expect(res.isAnyExtrapolated).toBe(true);
  });

  it('identifica quando a soma das metas extrapola a renda sem nenhuma meta isolada ultrapassar', () => {
    const res = evaluateBudgetExtrapolation(100, 1500, 4200, 3500);
    expect(res.isSpentExtrapolated).toBe(false);
    expect(res.isSingleLimitOverIncome).toBe(false);
    expect(res.isTotalBudgetOverIncome).toBe(true);
    expect(res.totalIncomeExcessAmount).toBe(700);
    expect(res.isAnyExtrapolated).toBe(true);
  });

  it('retorna sem extrapolação quando tudo está dentro da renda e do teto', () => {
    const res = evaluateBudgetExtrapolation(500, 1000, 3000, 4000);
    expect(res.isAnyExtrapolated).toBe(false);
    expect(res.spentExcessAmount).toBe(0);
    expect(res.singleIncomeExcessAmount).toBe(0);
    expect(res.totalIncomeExcessAmount).toBe(0);
  });
});

describe('OTP Normalization & Auth Error Translation', () => {
  it('normalizes pasted OTP codes keeping only digits', () => {
    expect(normalizeOtpCode(' 482 910 ')).toBe('482910');
    expect(normalizeOtpCode('482-910')).toBe('482910');
    expect(normalizeOtpCode('abc123456xyz')).toBe('123456');
  });

  it('translates common Supabase recovery and password errors cleanly', () => {
    expect(translateMobileAuthError('Token has expired or is invalid')).toContain('Código inválido ou expirado');
    expect(translateMobileAuthError('New password should be different from the old password.')).toContain('diferente');
    expect(translateMobileAuthError('For security purposes, you can only request this after 45 seconds.')).toContain('Aguarde');
  });
});
