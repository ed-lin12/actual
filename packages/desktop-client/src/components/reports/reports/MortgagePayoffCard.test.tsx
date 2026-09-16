import type { ReactNode } from 'react';

import type {
  AccountEntity,
  MortgagePayoffWidget,
} from '@actual-app/core/types/models';
import { fireEvent, render, screen } from '@testing-library/react';

import { useAccountBalances } from '#hooks/useAccountBalances';
import { TestProviders } from '#mocks';

import { MortgagePayoffCard } from './MortgagePayoffCard';

vi.mock('#components/reports/ReportCard', () => ({
  ReportCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('#hooks/useAccountBalances', () => ({
  useAccountBalances: vi.fn(() => ({})),
}));

describe('MortgagePayoffCard assumptions', () => {
  it('keeps rapid edits together while saved metadata is still stale', () => {
    const onMetaChange = vi.fn();
    const renderCard = (meta: MortgagePayoffWidget['meta']) => (
      <TestProviders>
        <MortgagePayoffCard
          widgetId="mortgage"
          accounts={[]}
          meta={meta}
          onMetaChange={onMetaChange}
        />
      </TestProviders>
    );
    const { rerender } = render(renderCard({}));
    const rate = screen.getByLabelText('Annual interest rate');
    const payment = screen.getByLabelText('Monthly payment');
    const extra = screen.getByLabelText('Extra payment');

    fireEvent.focus(rate);
    fireEvent.change(rate, { target: { value: '6' } });
    fireEvent.blur(rate);
    fireEvent.focus(payment);
    fireEvent.change(payment, { target: { value: '2500' } });
    fireEvent.blur(payment);

    expect(onMetaChange).toHaveBeenLastCalledWith({
      annualInterestRate: 6,
      monthlyPayment: 250_000,
    });

    // The first save arrives after the second edit, before its save.
    rerender(renderCard({ annualInterestRate: 6 }));
    fireEvent.focus(extra);
    fireEvent.change(extra, { target: { value: '250' } });
    fireEvent.blur(extra);

    expect(onMetaChange).toHaveBeenLastCalledWith({
      annualInterestRate: 6,
      monthlyPayment: 250_000,
      extraMonthlyPayment: 25_000,
    });

    // Once the draft is acknowledged, later external changes are respected.
    rerender(renderCard(onMetaChange.mock.lastCall?.[0]));
    rerender(
      renderCard({
        annualInterestRate: 5,
        monthlyPayment: 200_000,
        extraMonthlyPayment: 0,
      }),
    );
    fireEvent.focus(rate);
    expect(rate).toHaveValue('5');
    fireEvent.blur(rate);
    expect(onMetaChange).toHaveBeenLastCalledWith({
      annualInterestRate: 5,
      monthlyPayment: 200_000,
      extraMonthlyPayment: 0,
    });
  });

  it('does not reset an uncommitted rate on unrelated parent renders', () => {
    const onMetaChange = vi.fn();
    const renderCard = () => (
      <TestProviders>
        <MortgagePayoffCard
          widgetId="mortgage"
          accounts={[]}
          meta={{}}
          onMetaChange={meta => onMetaChange(meta)}
        />
      </TestProviders>
    );
    const { rerender } = render(renderCard());
    const rate = screen.getByLabelText('Annual interest rate');
    fireEvent.focus(rate);
    fireEvent.change(rate, { target: { value: '6' } });
    rerender(renderCard());
    fireEvent.blur(rate);

    expect(onMetaChange).toHaveBeenLastCalledWith({
      annualInterestRate: 6,
    });
  });
});

describe('MortgagePayoffCard account binding', () => {
  const mortgage: AccountEntity = {
    id: 'mortgage',
    name: 'Mortgage',
    offbudget: 1,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_group_id: null,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
  };
  const accounts = [
    mortgage,
    { ...mortgage, id: 'other-debt', name: 'Other debt' },
  ];
  const assumptions = { annualInterestRate: 6, monthlyPayment: 250_000 };
  const renderCard = (accountId?: string) => (
    <TestProviders>
      <MortgagePayoffCard
        widgetId="mortgage"
        accounts={accounts}
        meta={{ ...assumptions, accountId }}
        onMetaChange={vi.fn()}
      />
    </TestProviders>
  );

  it('requires explicit account selection even when negative balances exist', () => {
    vi.mocked(useAccountBalances).mockReturnValue({
      mortgage: -10_000_000,
      'other-debt': -20_000_000,
    });
    render(renderCard());
    expect(screen.getByRole('status')).toHaveTextContent(
      'Select a mortgage account',
    );
    expect(screen.queryByText('Estimated payoff')).not.toBeInTheDocument();
  });

  it('does not switch to another debt when the chosen mortgage is paid off', () => {
    vi.mocked(useAccountBalances).mockReturnValue({
      mortgage: -10_000_000,
      'other-debt': -20_000_000,
    });
    const { rerender } = render(renderCard('mortgage'));
    expect(screen.getByText('Estimated payoff')).toBeInTheDocument();

    vi.mocked(useAccountBalances).mockReturnValue({
      mortgage: 0,
      'other-debt': -20_000_000,
    });
    rerender(renderCard('mortgage'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'This account has no negative balance',
    );
    expect(screen.queryByText('Estimated payoff')).not.toBeInTheDocument();
  });
});
