import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  inputTokens,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type {
  FinanceTransactionCreateInput,
  TransactionCategory,
  TransactionKind,
} from '../../types/finance';
import { Button } from '../ui/Button';

interface PropertyOption {
  id: string;
  name: string;
}

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: FinanceTransactionCreateInput) => Promise<{ error: Error | null } | void>;
  properties: PropertyOption[];
  initialPropertyId?: string | null;
}

const INCOME_CATEGORIES: TransactionCategory[] = ['reservation', 'other_income'];
const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'laundry',
  'cleaning',
  'utilities',
  'platform_fee',
  'tax',
  'supplies',
  'other_expense',
];

function categoriesForKind(kind: TransactionKind): TransactionCategory[] {
  return kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreateTransactionModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  initialPropertyId,
}: CreateTransactionModalProps) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [category, setCategory] = useState<TransactionCategory>('laundry');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [occurredOn, setOccurredOn] = useState(todayYmd());
  const [propertyId, setPropertyId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allowedCategories = useMemo(() => categoriesForKind(kind), [kind]);

  useEffect(() => {
    if (!isOpen) return;
    setKind('expense');
    setCategory('laundry');
    setAmount('');
    setCurrency('EUR');
    setOccurredOn(todayYmd());
    setPropertyId(initialPropertyId ?? '');
    setDescription('');
    setNotes('');
    setError(null);
    setSubmitting(false);
  }, [initialPropertyId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (allowedCategories.includes(category)) return;
    setCategory(allowedCategories[0] ?? 'other_expense');
  }, [allowedCategories, category, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError(fr.finance.create.missingAmount);
      return;
    }
    if (!category) {
      setError(fr.finance.create.missingCategory);
      return;
    }
    if (!occurredOn) {
      setError(fr.finance.create.missingDate);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        kind,
        category,
        amount: parsedAmount,
        currency: currency.trim().toUpperCase() || 'EUR',
        occurred_on: occurredOn,
        property_id: propertyId || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      });

      if (result && 'error' in result && result.error) {
        setError(fr.finance.create.createError);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setError(fr.finance.create.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-transaction-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-transaction-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.finance.create.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={fr.common.close}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="finance-create-kind" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.kind}
              </label>
              <select
                id="finance-create-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as TransactionKind)}
                className={inputTokens.base}
              >
                <option value="income">{fr.finance.kind.income}</option>
                <option value="expense">{fr.finance.kind.expense}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="finance-create-category" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.category}
              </label>
              <select
                id="finance-create-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as TransactionCategory)}
                className={inputTokens.base}
              >
                {allowedCategories.map((value) => (
                  <option key={value} value={value}>
                    {fr.finance.category[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="finance-create-amount" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.amount}
              </label>
              <input
                id="finance-create-amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="finance-create-currency" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.currency}
              </label>
              <input
                id="finance-create-currency"
                type="text"
                value={currency}
                maxLength={3}
                onChange={(event) => setCurrency(event.target.value)}
                className={inputTokens.base}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="finance-create-date" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.occurred_on}
              </label>
              <input
                id="finance-create-date"
                type="date"
                value={occurredOn}
                onChange={(event) => setOccurredOn(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="finance-create-property" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.property}
              </label>
              <select
                id="finance-create-property"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className={inputTokens.base}
              >
                <option value="">{fr.finance.filters.noProperty}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="finance-create-description" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.finance.create.description}
            </label>
            <input
              id="finance-create-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputTokens.base}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="finance-create-notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.finance.create.notes}
            </label>
            <textarea
              id="finance-create-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={clsx(inputTokens.base, 'resize-none')}
            />
          </div>

          {error ? (
            <p className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>{error}</p>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.common.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {fr.finance.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
