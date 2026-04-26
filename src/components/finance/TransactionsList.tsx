import { useEffect, useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  cardTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { formatCurrency, sortTransactions } from '../../lib/finance-logic';
import { fr } from '../../lib/i18n/fr';
import type {
  FinanceTransactionWithRelations,
  TransactionCategory,
} from '../../types/finance';
import { Button } from '../ui/Button';

interface TransactionsListProps {
  transactions: FinanceTransactionWithRelations[];
  onEdit: (transaction: FinanceTransactionWithRelations) => void;
  onDelete: (transaction: FinanceTransactionWithRelations) => void;
}

const PAGE_SIZE = 20;

const CATEGORY_TONE: Record<TransactionCategory, string> = {
  reservation: statusTokens.success,
  laundry: statusTokens.warning,
  cleaning: statusTokens.warning,
  utilities: statusTokens.danger,
  platform_fee: statusTokens.neutral,
  tax: statusTokens.neutral,
  supplies: statusTokens.warning,
  other_income: statusTokens.info,
  other_expense: statusTokens.danger,
};

export function TransactionsList({
  transactions,
  onEdit,
  onDelete,
}: TransactionsListProps) {
  const [page, setPage] = useState(1);
  const divideSubtleClass = borderTokens.subtle.replace('border-', 'divide-');

  const orderedTransactions = useMemo(
    () => sortTransactions(transactions),
    [transactions],
  );

  const totalPages = Math.max(1, Math.ceil(orderedTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const currentPageItems = orderedTransactions.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [transactions]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className={clsx(cardTokens.base, cardTokens.variants.default, 'overflow-hidden')}>
      {orderedTransactions.length === 0 ? (
        <p className={clsx('px-4 py-8 text-center text-sm', textTokens.muted)}>
          {fr.finance.empty.description}
        </p>
      ) : (
        <>
          <ul className={clsx('divide-y', divideSubtleClass)}>
            {currentPageItems.map((transaction) => (
              <li key={transaction.id} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center md:gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('rounded-full border px-2 py-0.5 text-[11px] font-medium', CATEGORY_TONE[transaction.category])}>
                      {fr.finance.category[transaction.category]}
                    </span>
                    <span
                      className={clsx(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        transaction.kind === 'income' ? statusTokens.success : statusTokens.danger,
                      )}
                    >
                      {fr.finance.kind[transaction.kind]}
                    </span>
                  </div>
                  <p className={clsx('mt-1 truncate text-sm', textTokens.title)}>
                    {transaction.description || fr.finance.table.noDescription}
                  </p>
                  <p className={clsx('truncate text-xs', textTokens.muted)}>
                    {transaction.property_name || fr.finance.filters.noProperty}
                  </p>
                </div>

                <span className={clsx('text-sm font-medium', textTokens.title)}>
                  {formatCurrency(transaction.amount, transaction.currency)}
                </span>

                <span className={clsx('text-xs', textTokens.muted)}>{transaction.occurred_on}</span>

                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                >
                  {fr.finance.update.action}
                </Button>
                <Button
                  variant="dangerSoft"
                  size="sm"
                  onClick={() => onDelete(transaction)}
                >
                  {fr.common.delete}
                </Button>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className={clsx('flex items-center justify-between border-t px-4 py-3', borderTokens.default)}>
              <span className={clsx('text-xs', textTokens.muted)}>
                {fr.finance.table.page(safePage, totalPages)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {fr.finance.table.previous}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  {fr.finance.table.next}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
