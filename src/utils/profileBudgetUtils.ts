export interface BudgetExtrapolationEvaluation {
  hasLimit: boolean;
  isSpentExtrapolated: boolean;
  spentExcessAmount: number;
  isSingleLimitOverIncome: boolean;
  singleIncomeExcessAmount: number;
  isTotalBudgetOverIncome: boolean;
  totalIncomeExcessAmount: number;
  isAnyExtrapolated: boolean;
}

/**
 * Checks whether an avatar string represents a visual image URI rather than an emoji or initial.
 */
export function isImageAvatarUri(value?: string | null): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://')
  );
}

/**
 * Evaluates all limit-extrapolation conditions for a single budget category
 * (spending over ceiling, category ceiling over monthly income, or total limits over income).
 */
export function evaluateBudgetExtrapolation(
  spent: number,
  budgetLimit: number,
  totalBudgetLimit: number,
  monthlyIncome: number,
): BudgetExtrapolationEvaluation {
  const hasLimit = budgetLimit > 0;
  const isSpentExtrapolated = hasLimit && spent > budgetLimit;
  const spentExcessAmount = isSpentExtrapolated ? spent - budgetLimit : 0;

  const isSingleLimitOverIncome = hasLimit && monthlyIncome > 0 && budgetLimit > monthlyIncome;
  const singleIncomeExcessAmount = isSingleLimitOverIncome ? budgetLimit - monthlyIncome : 0;

  const isTotalBudgetOverIncome =
    hasLimit && monthlyIncome > 0 && totalBudgetLimit > monthlyIncome;
  const totalIncomeExcessAmount = isTotalBudgetOverIncome ? totalBudgetLimit - monthlyIncome : 0;

  return {
    hasLimit,
    isSpentExtrapolated,
    spentExcessAmount,
    isSingleLimitOverIncome,
    singleIncomeExcessAmount,
    isTotalBudgetOverIncome,
    totalIncomeExcessAmount,
    isAnyExtrapolated:
      isSpentExtrapolated || isSingleLimitOverIncome || isTotalBudgetOverIncome,
  };
}

/**
 * Normalizes a numeric OTP/verification code typed or pasted by the user.
 */
export function normalizeOtpCode(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/[^0-9]/g, '').trim();
}
