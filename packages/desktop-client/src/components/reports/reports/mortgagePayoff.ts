export type MortgagePayoffEstimate = {
  months: number;
  totalInterest: number;
};

export function getMortgagePrincipal(
  balance: number | null | undefined,
): number | null {
  if (balance == null || !Number.isFinite(balance) || balance >= 0) {
    return null;
  }

  return Math.abs(balance);
}

/**
 * Calculates a fixed-payment mortgage payoff estimate.
 *
 * Amounts are integer currency units (the same units used by account
 * balances), while the interest rate is a percentage such as 6.5.
 */
export function calculateMortgagePayoff(
  principal: number,
  annualInterestRate: number,
  monthlyPayment: number,
  extraMonthlyPayment = 0,
): MortgagePayoffEstimate | null {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualInterestRate) ||
    !Number.isFinite(monthlyPayment) ||
    !Number.isFinite(extraMonthlyPayment) ||
    principal <= 0 ||
    annualInterestRate < 0 ||
    monthlyPayment <= 0 ||
    extraMonthlyPayment < 0
  ) {
    return null;
  }

  const payment = monthlyPayment + extraMonthlyPayment;
  const monthlyRate = annualInterestRate / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;

  // A 100-year cap prevents malformed assumptions from locking the UI.
  while (balance > 0 && months < 1200) {
    const interest = balance * monthlyRate;
    const principalPayment = payment - interest;

    if (principalPayment <= 0) {
      return null;
    }

    totalInterest += interest;
    balance -= principalPayment;
    months += 1;
  }

  if (balance > 0) {
    return null;
  }

  return {
    months,
    totalInterest: Math.round(totalInterest),
  };
}
