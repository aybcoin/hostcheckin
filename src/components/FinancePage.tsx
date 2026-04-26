import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Wallet } from 'lucide-react';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  inputTokens,
  statusTokens,
  textTokens,
} from '../lib/design-tokens';
import { formatCurrency, isWithinPeriod, resolvePeriod } from '../lib/finance-logic';
import { fr } from '../lib/i18n/fr';
import { toast } from '../lib/toast';
import type {
  FinanceTransactionCreateInput,
  FinanceTransactionWithRelations,
  Period,
  PeriodPreset,
  TransactionCategory,
} from '../types/finance';
import { useFinanceData } from '../hooks/useFinanceData';
import { CategoryDonut } from './finance/CategoryDonut';
import { CreateTransactionModal } from './finance/CreateTransactionModal';
import { EditTransactionModal } from './finance/EditTransactionModal';
import { KpiCard } from './finance/KpiCard';
import { PerPropertyTable } from './finance/PerPropertyTable';
import { PeriodFilter } from './finance/PeriodFilter';
import { PnLBarChart } from './finance/PnLBarChart';
import { TransactionsList } from './finance/TransactionsList';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface FinancePageProps {
  hostId: string;
}

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'laundry',
  'cleaning',
  'utilities',
  'platform_fee',
  'tax',
  'supplies',
  'other_expense',
];

export function FinancePage({ hostId }: FinancePageProps) {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customPeriod, setCustomPeriod] = useState<Period>(resolvePeriod('this_month'));
  const [propertyFilter, setPropertyFilter] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransactionWithRelations | null>(null);

  const period = useMemo(() => resolvePeriod(periodPreset, customPeriod), [customPeriod, periodPreset]);

  const {
    transactions,
    pnl,
    properties,
    loading,
    error,
    refresh,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinanceData(hostId, period, propertyFilter);

  const filteredTransactions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return transactions
      .filter((transaction) => isWithinPeriod(transaction.occurred_on, period))
      .filter((transaction) => (propertyFilter === 'all' ? true : transaction.property_id === propertyFilter))
      .filter((transaction) => {
        if (!searchTerm) return true;
        const haystack = [
          transaction.description,
          transaction.notes,
          transaction.property_name,
          fr.finance.category[transaction.category],
          fr.finance.kind[transaction.kind],
          transaction.occurred_on,
          String(transaction.amount),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTerm);
      });
  }, [period, propertyFilter, search, transactions]);

  const monthlyChartData = useMemo(
    () =>
      pnl.byMonth
        .slice(-12)
        .map((entry) => ({
          month: entry.month,
          revenue: entry.revenue,
          expenses: entry.expenses,
        })),
    [pnl.byMonth],
  );

  const donutData = useMemo(
    () =>
      EXPENSE_CATEGORIES
        .map((category) => ({
          category,
          amount: pnl.byCategory[category],
        }))
        .filter((entry) => entry.amount > 0),
    [pnl.byCategory],
  );

  const handleCreate = async (input: FinanceTransactionCreateInput) => {
    const result = await createTransaction(input);
    if (result.error) {
      toast.error(fr.finance.create.createError);
      return { error: result.error };
    }
    toast.success(fr.finance.create.created);
    return { error: null };
  };

  const handleUpdate = async (
    id: string,
    patch: Partial<FinanceTransactionCreateInput>,
  ) => {
    const result = await updateTransaction(id, patch);
    if (result.error) {
      toast.error(fr.finance.update.error);
      return { error: result.error };
    }
    toast.success(fr.finance.update.updated);
    return { error: null };
  };

  const handleDelete = async (transaction: FinanceTransactionWithRelations) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.finance.delete.confirm)) {
      return;
    }

    const result = await deleteTransaction(transaction.id);
    if (result.error) {
      toast.error(fr.finance.delete.error);
      return;
    }
    toast.info(fr.finance.delete.deleted);
  };

  const isEmptyState = !loading
    && !error
    && filteredTransactions.length === 0
    && pnl.revenue === 0
    && pnl.expenses === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.finance.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.finance.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.finance.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.finance.addTransaction}
          </Button>
        </div>
      </header>

      <PeriodFilter
        preset={periodPreset}
        custom={customPeriod}
        onPresetChange={setPeriodPreset}
        onCustomChange={setCustomPeriod}
      />

      <section className={clsx('flex flex-wrap items-center gap-2 rounded-xl border p-3', borderTokens.default)}>
        <select
          value={propertyFilter}
          onChange={(event) => setPropertyFilter(event.target.value as string | 'all')}
          className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
          aria-label={fr.finance.filters.property}
        >
          <option value="all">{fr.finance.filters.allProperties}</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={fr.finance.filters.searchPlaceholder}
          className={clsx(inputTokens.base, 'ml-auto w-72 max-w-full py-1.5 text-xs')}
          aria-label={fr.finance.filters.searchPlaceholder}
        />
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {fr.finance.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={92} />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton height={300} />
            <Skeleton height={300} />
          </div>
          <Skeleton height={240} />
          <Skeleton height={320} />
        </div>
      ) : isEmptyState ? (
        <EmptyState
          icon={<Wallet size={20} />}
          title={fr.finance.empty.title}
          description={fr.finance.empty.description}
          action={(
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden size={14} />
              {fr.finance.empty.cta}
            </Button>
          )}
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label={fr.finance.kpi.revenue}
              value={formatCurrency(pnl.revenue)}
              tone="success"
            />
            <KpiCard
              label={fr.finance.kpi.expenses}
              value={formatCurrency(pnl.expenses)}
              tone="danger"
            />
            <KpiCard
              label={fr.finance.kpi.net}
              value={formatCurrency(pnl.net)}
              tone={pnl.net >= 0 ? 'success' : 'danger'}
            />
            <KpiCard
              label={fr.finance.kpi.transactions}
              value={String(filteredTransactions.length)}
              tone="neutral"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
              <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.finance.chart.pnlTitle}</h2>
              <PnLBarChart data={monthlyChartData} />
            </Card>

            <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
              <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.finance.chart.categoriesTitle}</h2>
              <div className="flex justify-center">
                <CategoryDonut data={donutData} total={pnl.expenses} />
              </div>
            </Card>
          </section>

          <section className="space-y-2">
            <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.finance.table.byPropertyTitle}</h2>
            <PerPropertyTable data={pnl.byProperty} />
          </section>

          <section className="space-y-2">
            <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.finance.table.transactionsTitle}</h2>
            <TransactionsList
              transactions={filteredTransactions}
              onEdit={(transaction) => setEditingTransaction(transaction)}
              onDelete={(transaction) => {
                void handleDelete(transaction);
              }}
            />
          </section>
        </>
      )}

      <CreateTransactionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        properties={properties}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSubmit={handleUpdate}
        properties={properties}
      />
    </div>
  );
}
