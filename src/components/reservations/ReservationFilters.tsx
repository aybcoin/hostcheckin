import { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Property } from '../../lib/supabase';
import { fr } from '../../lib/i18n/fr';
import { inputTokens } from '../../lib/design-tokens';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface FilterValues {
  checkInDate: string;
  checkOutDate: string;
  propertyId: string;
  status: string;
  verification: string;
}

interface ReservationFiltersProps {
  properties: Property[];
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
}

export const EMPTY_FILTERS: FilterValues = {
  checkInDate: '',
  checkOutDate: '',
  propertyId: '',
  status: 'all',
  verification: 'all',
};

export function ReservationFilters({ properties, filters, onApply, onReset }: ReservationFiltersProps) {
  const [local, setLocal] = useState<FilterValues>(filters);

  const handleApply = () => onApply(local);

  const handleReset = () => {
    setLocal(EMPTY_FILTERS);
    onReset();
  };

  return (
    <Card variant="default" padding="sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label htmlFor="filter-checkin" className="mb-1 block text-xs font-medium text-slate-600">{fr.reservationsFilters.checkIn}</label>
          <input
            id="filter-checkin"
            type="date"
            value={local.checkInDate}
            onChange={(e) => setLocal({ ...local, checkInDate: e.target.value })}
            className={inputTokens.base}
          />
        </div>
        <div>
          <label htmlFor="filter-checkout" className="mb-1 block text-xs font-medium text-slate-600">{fr.reservationsFilters.checkOut}</label>
          <input
            id="filter-checkout"
            type="date"
            value={local.checkOutDate}
            onChange={(e) => setLocal({ ...local, checkOutDate: e.target.value })}
            className={inputTokens.base}
          />
        </div>
        <div>
          <label htmlFor="filter-property" className="mb-1 block text-xs font-medium text-slate-600">{fr.reservationsFilters.property}</label>
          <select
            id="filter-property"
            value={local.propertyId}
            onChange={(e) => setLocal({ ...local, propertyId: e.target.value })}
            className={inputTokens.base}
          >
            <option value="">{fr.reservationsFilters.all}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-slate-600">{fr.reservationsFilters.status}</label>
          <select
            id="filter-status"
            value={local.status}
            onChange={(e) => setLocal({ ...local, status: e.target.value })}
            className={inputTokens.base}
          >
            <option value="all">{fr.reservationsFilters.all}</option>
            <option value="pending">{fr.reservations.statusPending}</option>
            <option value="checked_in">{fr.reservations.statusCheckedIn}</option>
            <option value="completed">{fr.reservations.statusCompleted}</option>
            <option value="cancelled">{fr.reservations.statusCancelled}</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-verification" className="mb-1 block text-xs font-medium text-slate-600">{fr.reservationsFilters.verification}</label>
          <select
            id="filter-verification"
            value={local.verification}
            onChange={(e) => setLocal({ ...local, verification: e.target.value })}
            className={inputTokens.base}
          >
            <option value="all">{fr.reservationsFilters.allFeminine}</option>
            <option value="checked_in">{fr.reservations.statusCheckedIn}</option>
            <option value="pending">{fr.reservations.statusPending}</option>
            <option value="not_started">{fr.reservationsFilters.notStarted}</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
        >
          <Filter size={14} />
          {fr.reservationsFilters.apply}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
        >
          <RotateCcw size={14} />
          {fr.common.reset}
        </Button>
      </div>
    </Card>
  );
}
