import { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Property } from '../../lib/supabase';
import { fr } from '../../lib/i18n/fr';
import { ctaTokens } from '../../lib/design-tokens';

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
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{fr.reservationsFilters.checkIn}</label>
          <input
            type="date"
            value={local.checkInDate}
            onChange={(e) => setLocal({ ...local, checkInDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{fr.reservationsFilters.checkOut}</label>
          <input
            type="date"
            value={local.checkOutDate}
            onChange={(e) => setLocal({ ...local, checkOutDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{fr.reservationsFilters.property}</label>
          <select
            value={local.propertyId}
            onChange={(e) => setLocal({ ...local, propertyId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
          >
            <option value="">{fr.reservationsFilters.all}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{fr.reservationsFilters.status}</label>
          <select
            value={local.status}
            onChange={(e) => setLocal({ ...local, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
          >
            <option value="all">{fr.reservationsFilters.all}</option>
            <option value="pending">{fr.reservations.statusPending}</option>
            <option value="checked_in">{fr.reservations.statusCheckedIn}</option>
            <option value="completed">{fr.reservations.statusCompleted}</option>
            <option value="cancelled">{fr.reservations.statusCancelled}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{fr.reservationsFilters.verification}</label>
          <select
            value={local.verification}
            onChange={(e) => setLocal({ ...local, verification: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
          >
            <option value="all">{fr.reservationsFilters.allFeminine}</option>
            <option value="checked_in">{fr.reservations.statusCheckedIn}</option>
            <option value="pending">{fr.reservations.statusPending}</option>
            <option value="not_started">{fr.reservationsFilters.notStarted}</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApply}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${ctaTokens.primary}`}
        >
          <Filter size={14} />
          {fr.reservationsFilters.apply}
        </button>
        <button
          onClick={handleReset}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${ctaTokens.secondary}`}
        >
          <RotateCcw size={14} />
          {fr.common.reset}
        </button>
      </div>
    </div>
  );
}
