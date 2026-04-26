import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  cardTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { formatCurrency } from '../../lib/finance-logic';
import { fr } from '../../lib/i18n/fr';
import type { PnLSummary } from '../../types/finance';

type PropertyRow = PnLSummary['byProperty'][number];
type SortKey = 'property_name' | 'revenue' | 'expenses' | 'net';
type SortDirection = 'asc' | 'desc';

interface PerPropertyTableProps {
  data: PnLSummary['byProperty'];
}

function compareRows(a: PropertyRow, b: PropertyRow, key: SortKey, direction: SortDirection) {
  if (key === 'property_name') {
    const value = a.property_name.localeCompare(b.property_name, 'fr-FR');
    return direction === 'asc' ? value : -value;
  }

  const raw = a[key] - b[key];
  return direction === 'asc' ? raw : -raw;
}

export function PerPropertyTable({ data }: PerPropertyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const divideDefaultClass = borderTokens.default.replace('border-', 'divide-');
  const divideSubtleClass = borderTokens.subtle.replace('border-', 'divide-');

  const sortedData = useMemo(() => {
    return data.slice().sort((a, b) => compareRows(a, b, sortKey, direction));
  }, [data, direction, sortKey]);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setDirection(nextKey === 'property_name' ? 'asc' : 'desc');
  };

  return (
    <div className={clsx(cardTokens.base, cardTokens.variants.default, 'overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className={clsx('min-w-full divide-y text-sm', divideDefaultClass)}>
          <thead className={surfaceTokens.subtle}>
            <tr>
              <HeaderCell
                label={fr.finance.table.property}
                active={sortKey === 'property_name'}
                onClick={() => handleSort('property_name')}
              />
              <HeaderCell
                label={fr.finance.table.revenue}
                active={sortKey === 'revenue'}
                onClick={() => handleSort('revenue')}
              />
              <HeaderCell
                label={fr.finance.table.expenses}
                active={sortKey === 'expenses'}
                onClick={() => handleSort('expenses')}
              />
              <HeaderCell
                label={fr.finance.table.net}
                active={sortKey === 'net'}
                onClick={() => handleSort('net')}
              />
            </tr>
          </thead>
          <tbody className={clsx('divide-y', divideSubtleClass)}>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={4} className={clsx('px-4 py-6 text-center text-sm', textTokens.muted)}>
                  {fr.finance.empty.description}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr key={row.property_id}>
                  <td className={clsx('px-4 py-3 font-medium', textTokens.title)}>{row.property_name}</td>
                  <td className={clsx('px-4 py-3', textTokens.body)}>{formatCurrency(row.revenue)}</td>
                  <td className={clsx('px-4 py-3', textTokens.body)}>{formatCurrency(row.expenses)}</td>
                  <td
                    className={clsx(
                      'px-4 py-3 font-medium',
                      row.net < 0 ? textTokens.danger : textTokens.success,
                    )}
                  >
                    {formatCurrency(row.net)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface HeaderCellProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function HeaderCell({ label, active, onClick }: HeaderCellProps) {
  return (
    <th scope="col" className="px-4 py-2 text-left">
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2',
          active ? textTokens.title : textTokens.subtle,
        )}
      >
        {label}
        <ArrowDownUp size={12} />
      </button>
    </th>
  );
}
