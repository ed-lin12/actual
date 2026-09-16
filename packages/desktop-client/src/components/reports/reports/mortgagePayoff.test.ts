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
  });

  it('pays off a zero-interest balance in the expected number of months', () => {
    expect(calculateMortgagePayoff(100_000, 0, 10_000)).toEqual({
      months: 10,
      totalInterest: 0,
    });
  });

  it('includes the interest paid over the life of the loan', () => {
    const estimate = calculateMortgagePayoff(100_000, 12, 10_000);

    expect(estimate).not.toBeNull();
    expect(estimate?.months).toBe(11);
    expect(estimate?.totalInterest).toBeGreaterThan(0);
  });

  it('returns no estimate when the payment does not cover interest', () => {
    expect(calculateMortgagePayoff(100_000, 12, 100)).toBeNull();
  });

  it('rejects invalid assumptions and an unreasonably long horizon', () => {
    expect(calculateMortgagePayoff(100_000, -1, 10_000)).toBeNull();
    expect(calculateMortgagePayoff(100_000, 12, -1)).toBeNull();
    expect(calculateMortgagePayoff(Infinity, 12, 10_000)).toBeNull();
    expect(calculateMortgagePayoff(100_000, 1, 1)).toBeNull();
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
