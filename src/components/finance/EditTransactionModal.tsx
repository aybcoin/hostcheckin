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
  FinanceTransactionWithRelations,
  TransactionCategory,
  TransactionKind,
} from '../../types/finance';
import { Button } from '../ui/Button';

interface PropertyOption {
  id: string;
  name: string;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: FinanceTransactionWithRelations | null;
  onClose: () => void;
  onSubmit: (
    id: string,
    patch: {
      property_id?: string | null;
      kind?: TransactionKind;
      category?: TransactionCategory;
      amount?: number;
      currency?: string;
      occurred_on?: string;
      description?: string | null;
      notes?: string | null;
    },
  ) => Promise<{ error: Error | null } | void>;
  properties: PropertyOption[];
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

export function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
  onSubmit,
  properties,
}: EditTransactionModalProps) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [category, setCategory] = useState<TransactionCategory>('laundry');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [occurredOn, setOccurredOn] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allowedCategories = useMemo(() => categoriesForKind(kind), [kind]);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    setKind(transaction.kind);
    setCategory(transaction.category);
    setAmount(String(transaction.amount));
    setCurrency(transaction.currency || 'EUR');
    setOccurredOn(transaction.occurred_on);
    setPropertyId(transaction.property_id ?? '');
    setDescription(transaction.description || '');
    setNotes(transaction.notes || '');
    setError(null);
    setSubmitting(false);
  }, [isOpen, transaction]);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    if (allowedCategories.includes(category)) return;
    setCategory(allowedCategories[0] ?? 'other_expense');
  }, [allowedCategories, category, isOpen, transaction]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

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
      const result = await onSubmit(transaction.id, {
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
        setError(fr.finance.update.error);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setError(fr.finance.update.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-transaction-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="edit-transaction-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.finance.update.title}
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
              <label htmlFor="finance-edit-kind" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.kind}
              </label>
              <select
                id="finance-edit-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as TransactionKind)}
                className={inputTokens.base}
              >
                <option value="income">{fr.finance.kind.income}</option>
                <option value="expense">{fr.finance.kind.expense}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="finance-edit-category" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.category}
              </label>
              <select
                id="finance-edit-category"
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
              <label htmlFor="finance-edit-amount" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.amount}
              </label>
              <input
                id="finance-edit-amount"
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
              <label htmlFor="finance-edit-currency" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.currency}
              </label>
              <input
                id="finance-edit-currency"
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
              <label htmlFor="finance-edit-date" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.occurred_on}
              </label>
              <input
                id="finance-edit-date"
                type="date"
                value={occurredOn}
                onChange={(event) => setOccurredOn(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="finance-edit-property" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.finance.create.property}
              </label>
              <select
                id="finance-edit-property"
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
            <label htmlFor="finance-edit-description" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.finance.create.description}
            </label>
            <input
              id="finance-edit-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputTokens.base}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="finance-edit-notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.finance.create.notes}
            </label>
            <textarea
              id="finance-edit-notes"
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
            {fr.finance.update.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
