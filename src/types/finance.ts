export type TransactionKind = 'income' | 'expense';

export type TransactionCategory =
  | 'reservation'
  | 'laundry'
  | 'cleaning'
  | 'utilities'
  | 'platform_fee'
  | 'tax'
  | 'supplies'
  | 'other_income'
  | 'other_expense';

export const TRANSACTION_KINDS = [
  'income',
  'expense',
] as const satisfies readonly TransactionKind[];

export const TRANSACTION_CATEGORIES = [
  'reservation',
  'laundry',
  'cleaning',
  'utilities',
  'platform_fee',
  'tax',
  'supplies',
  'other_income',
  'other_expense',
] as const satisfies readonly TransactionCategory[];

export interface FinanceTransaction {
  id: string;
  host_id: string;
  property_id: string | null;
  kind: TransactionKind;
  category: TransactionCategory;
  amount: number;
  currency: string;
  occurred_on: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransactionWithRelations extends FinanceTransaction {
  property_name?: string;
}

export interface FinanceTransactionCreateInput {
  property_id?: string | null;
  kind: TransactionKind;
  category: TransactionCategory;
  amount: number;
  currency?: string;
  occurred_on: string;
  description?: string | null;
  notes?: string | null;
}

export interface Period {
  start: string;
  end: string;
}

export type PeriodPreset =
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom';

export interface PnLSummary {
  revenue: number;
  expenses: number;
  net: number;
  transactions: number;
  byCategory: Record<TransactionCategory, number>;
  byProperty: Array<{
    property_id: string;
    property_name: string;
    revenue: number;
    expenses: number;
    net: number;
  }>;
  byMonth: Array<{
    month: string;
    revenue: number;
    expenses: number;
    net: number;
  }>;
}
