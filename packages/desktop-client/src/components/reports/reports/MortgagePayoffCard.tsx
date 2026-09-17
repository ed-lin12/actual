import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  MortgagePayoffWidget,
} from '@actual-app/core/types/models';

import { Link } from '#components/common/Link';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { NON_DRAGGABLE_AREA_CLASS_NAME } from '#components/reports/constants';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { FinancialInput } from '#components/util/FinancialInput';
import { PercentInput } from '#components/util/PercentInput';
import { useAccountBalances } from '#hooks/useAccountBalances';
import { useFormat } from '#hooks/useFormat';

import {
  calculateMortgagePayoff,
  getMortgagePrincipal,
} from './mortgagePayoff';
import { useMortgagePayoffMeta } from './useMortgagePayoffMeta';

type MortgagePayoffCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: MortgagePayoffWidget['meta'];
  onMetaChange: (newMeta: MortgagePayoffWidget['meta']) => void;
};

function formatTerm(months: number, yearsLabel: string, monthsLabel: string) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} ${monthsLabel}`;
  }
  if (remainingMonths === 0) {
    return `${years} ${yearsLabel}`;
  }
  return `${years} ${yearsLabel}, ${remainingMonths} ${monthsLabel}`;
}

export function MortgagePayoffCard({
  widgetId,
  isEditing,
  accounts,
  meta: savedMeta,
  onMetaChange,
}: MortgagePayoffCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [meta, updateMeta] = useMortgagePayoffMeta(savedMeta, onMetaChange);
  // PercentInput reinitializes its text when this callback changes.
  const updateInterestRate = useCallback(
    (annualInterestRate: number) => updateMeta({ annualInterestRate }),
    [updateMeta],
  );

  const accountOptions = useMemo(
    () =>
      accounts
        .filter(account => !account.closed)
        .map(account => [account.id, account.name] as const),
    [accounts],
  );
  const accountIds = useMemo(
    () => accountOptions.map(([accountId]) => accountId),
    [accountOptions],
  );
  const accountBalances = useAccountBalances(accountIds);

  // Never infer an account from its balance: a payoff must not silently move
  // these assumptions onto another debt.
  const selectedAccountId = meta.accountId ?? '';
  const selectedAccount = accounts.find(
    account => account.id === selectedAccountId,
  );
  const selectedBalance = selectedAccountId
    ? accountBalances[selectedAccountId]
    : null;
  const principal = getMortgagePrincipal(selectedBalance);
  const estimate =
    principal != null &&
    meta?.annualInterestRate != null &&
    meta.monthlyPayment != null
      ? calculateMortgagePayoff(
          principal,
          meta.annualInterestRate,
          meta.monthlyPayment,
          meta.extraMonthlyPayment ?? 0,
        )
      : null;
  const hasAccount = selectedAccount != null;
  const hasNegativeBalance = principal != null;
  const hasAssumptions =
    meta?.annualInterestRate != null && meta.monthlyPayment != null;

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      onRename={() => setNameMenuOpen(true)}
    >
      <View
        style={{
          flex: 1,
          padding: 20,
          gap: 12,
          overflowY: 'auto',
          overflowWrap: 'anywhere',
          '& > *': { flexShrink: 0 },
        }}
      >
        <ReportCardName
          name={meta?.name || t('Mortgage payoff')}
          isEditing={nameMenuOpen}
          onChange={newName => {
            updateMeta({ name: newName });
            setNameMenuOpen(false);
          }}
          onClose={() => setNameMenuOpen(false)}
        />

        <View
          className={NON_DRAGGABLE_AREA_CLASS_NAME}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          <View style={{ flex: '1 1 150px', maxWidth: '100%' }}>
            <label
              htmlFor={`mortgage-account-${widgetId}`}
              style={{ ...styles.smallText, color: theme.pageTextLight }}
            >
              <Trans>Mortgage account</Trans>
            </label>
            <Select
              id={`mortgage-account-${widgetId}`}
              value={selectedAccountId}
              defaultLabel={t('Select an account')}
              options={accountOptions}
              onChange={accountId => updateMeta({ accountId })}
              style={{ width: '100%', minWidth: 0, marginTop: 4 }}
            />
          </View>
          <View style={{ flex: '1 1 120px', maxWidth: '100%' }}>
            <label
              htmlFor={`mortgage-rate-${widgetId}`}
              style={{ ...styles.smallText, color: theme.pageTextLight }}
            >
              <Trans>Annual interest rate</Trans>
            </label>
            <PercentInput
              id={`mortgage-rate-${widgetId}`}
              value={meta?.annualInterestRate ?? 0}
              onUpdatePercent={updateInterestRate}
              style={{ width: '100%', minWidth: 0, marginTop: 4 }}
            />
          </View>
          <View style={{ flex: '1 1 120px', maxWidth: '100%' }}>
            <label
              htmlFor={`mortgage-payment-${widgetId}`}
              style={{ ...styles.smallText, color: theme.pageTextLight }}
            >
              <Trans>Monthly payment</Trans>
            </label>
            <FinancialInput
              id={`mortgage-payment-${widgetId}`}
              value={meta?.monthlyPayment ?? 0}
              onUpdate={monthlyPayment => updateMeta({ monthlyPayment })}
              style={{ width: '100%', minWidth: 0, marginTop: 4 }}
            />
          </View>
          <View style={{ flex: '1 1 120px', maxWidth: '100%' }}>
            <label
              htmlFor={`mortgage-extra-payment-${widgetId}`}
              style={{ ...styles.smallText, color: theme.pageTextLight }}
            >
              <Trans>Extra payment</Trans>
            </label>
            <FinancialInput
              id={`mortgage-extra-payment-${widgetId}`}
              value={meta?.extraMonthlyPayment ?? 0}
              onUpdate={extraMonthlyPayment =>
                updateMeta({ extraMonthlyPayment })
              }
              style={{ width: '100%', minWidth: 0, marginTop: 4 }}
            />
          </View>
        </View>

        {!hasAccount ? (
          <EmptyState>
            <Trans>
              Select a mortgage account to estimate when it could be paid off.
            </Trans>
          </EmptyState>
        ) : !hasNegativeBalance ? (
          <EmptyState>
            <Trans>
              This account has no negative balance. Select a liability account
              with a current balance to estimate payoff.
            </Trans>
          </EmptyState>
        ) : !hasAssumptions ? (
          <EmptyState>
            <Trans>
              Enter the interest rate and monthly payment to see an estimated
              payoff timeline.
            </Trans>
          </EmptyState>
        ) : !estimate ? (
          <EmptyState>
            <Trans>
              Unable to estimate payoff. Use a nonnegative annual rate and extra
              payment, and a monthly payment above zero that covers interest and
              repays the balance within 100 years.
            </Trans>
          </EmptyState>
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
              <Metric label={t('Current principal')}>
                <PrivacyFilter>
                  <FinancialText as="span">
                    {format(principal, 'financial')}
                  </FinancialText>
                </PrivacyFilter>
              </Metric>
              <Metric label={t('Estimated payoff')}>
                <span>
                  {formatTerm(estimate.months, t('years'), t('months'))}
                </span>
              </Metric>
              <Metric label={t('Estimated interest')}>
                <PrivacyFilter>
                  <FinancialText as="span">
                    {format(estimate.totalInterest, 'financial')}
                  </FinancialText>
                </PrivacyFilter>
              </Metric>
            </View>
            <View style={{ fontSize: 12, color: theme.pageTextLight }}>
              <Trans>
                Estimate based on the current balance in{' '}
                {{ accountName: selectedAccount.name }} and the assumptions
                above.
              </Trans>
            </View>
          </View>
        )}
        <View style={{ fontSize: 12, color: theme.pageTextLight }}>
          <Trans>
            Principal and interest only; escrow, taxes, and insurance are
            excluded.
          </Trans>
        </View>
        <View
          className={NON_DRAGGABLE_AREA_CLASS_NAME}
          style={{
            marginTop: 'auto',
            fontSize: 12,
            color: theme.pageTextLight,
            alignItems: 'flex-start',
          }}
        >
          <Link variant="external" to="https://replit.com" linkColor="muted">
            <Trans>Made with Replit</Trans>
          </Link>
        </View>
      </View>
    </ReportCard>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <View style={{ fontSize: 12, color: theme.pageTextLight }}>{label}</View>
      <View style={{ ...styles.mediumText, marginTop: 2 }}>{children}</View>
    </View>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <View
      role="status"
      style={{
        minHeight: 52,
        justifyContent: 'center',
        color: theme.pageTextLight,
        fontSize: 13,
      }}
    >
      {children}
    </View>
  );
}
