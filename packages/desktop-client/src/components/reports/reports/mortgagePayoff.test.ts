import { describe, expect, it } from 'vitest';

import {
  calculateMortgagePayoff,
  getMortgagePrincipal,
} from './mortgagePayoff';

describe('calculateMortgagePayoff', () => {
  it('only treats a negative account balance as mortgage principal', () => {
    expect(getMortgagePrincipal(-100_000)).toBe(100_000);
    expect(getMortgagePrincipal(100_000)).toBeNull();
    expect(getMortgagePrincipal(0)).toBeNull();
    expect(getMortgagePrincipal(null)).toBeNull();
    expect(getMortgagePrincipal(undefined)).toBeNull();
    expect(getMortgagePrincipal(NaN)).toBeNull();
    expect(getMortgagePrincipal(-Infinity)).toBeNull();
  });

  it('pays off a zero-interest balance in the expected number of months', () => {
    expect(calculateMortgagePayoff(100_000, 0, 10_000)).toEqual({
      months: 10,
      totalInterest: 0,
    });
  });

  it('includes the interest paid over the life of the loan', () => {
    const estimate = calculateMortgagePayoff(100_000, 12, 10_000);

    // Closed-form balance after ten payments, followed by a partial final
    // payment: 10 * 10000 + 5840.087129915919 * 1.01 - 100000.
    expect(estimate).toEqual({ months: 11, totalInterest: 5898 });
  });

  it('returns no estimate when the payment does not cover interest', () => {
    expect(calculateMortgagePayoff(100_000, 12, 100)).toBeNull();
    expect(calculateMortgagePayoff(100_000, 12, 1_000)).toBeNull();
  });

  it.each([NaN, Infinity, -Infinity, -1])(
    'rejects invalid assumptions: %s',
    invalid => {
      expect(calculateMortgagePayoff(invalid, 12, 10_000)).toBeNull();
      expect(calculateMortgagePayoff(100_000, invalid, 10_000)).toBeNull();
      expect(calculateMortgagePayoff(100_000, 12, invalid)).toBeNull();
      expect(calculateMortgagePayoff(100_000, 12, 10_000, invalid)).toBeNull();
    },
  );

  it('rejects a missing principal or base monthly payment', () => {
    expect(calculateMortgagePayoff(0, 12, 10_000)).toBeNull();
    expect(calculateMortgagePayoff(100_000, 12, 0)).toBeNull();
  });

  it('caps a genuinely amortizing loan at 100 years', () => {
    expect(calculateMortgagePayoff(100_000, 0, 1)).toBeNull();
    expect(calculateMortgagePayoff(1_200, 0, 1)).toEqual({
      months: 1_200,
      totalInterest: 0,
    });
    expect(calculateMortgagePayoff(1_201, 0, 1)).toBeNull();
  });

  it('rejects arithmetic overflow from otherwise finite values', () => {
    expect(
      calculateMortgagePayoff(100_000, 0, Number.MAX_VALUE, Number.MAX_VALUE),
    ).toBeNull();
  });

  it('reduces the payoff term when an extra payment is configured', () => {
    const regular = calculateMortgagePayoff(100_000, 12, 10_000);
    const extra = calculateMortgagePayoff(100_000, 12, 10_000, 5_000);

    expect(extra?.months).toBeLessThan(regular?.months ?? Infinity);
    expect(extra?.totalInterest).toBeLessThan(
      regular?.totalInterest ?? Infinity,
    );
  });
});
