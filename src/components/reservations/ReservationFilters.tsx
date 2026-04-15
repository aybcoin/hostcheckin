import { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Property } from '../../lib/supabase';

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
          <label className="block text-xs font-medium text-gray-600 mb-1">Date d'arrivee</label>
          <input
            type="date"
            value={local.checkInDate}
            onChange={(e) => setLocal({ ...local, checkInDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date de depart</label>
          <input
            type="date"
            value={local.checkOutDate}
            onChange={(e) => setLocal({ ...local, checkOutDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hebergement</label>
          <select
            value={local.propertyId}
            onChange={(e) => setLocal({ ...local, propertyId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Tous</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
          <select
            value={local.status}
            onChange={(e) => setLocal({ ...local, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="checked_in">Verifiee</option>
            <option value="completed">Terminee</option>
            <option value="cancelled">Annulee</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Verification</label>
          <select
            value={local.verification}
            onChange={(e) => setLocal({ ...local, verification: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Toutes</option>
            <option value="checked_in">Verifiee</option>
            <option value="pending">En attente</option>
            <option value="not_started">Non commencee</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApply}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Filter size={14} />
          Filtrer
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <RotateCcw size={14} />
          Reinitialiser
        </button>
      </div>
    </div>
  );
}
