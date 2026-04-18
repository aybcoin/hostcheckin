import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { Reservation, Property } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { CalendarGrid } from './calendar/CalendarGrid';
import { CalendarStats } from './calendar/CalendarStats';

interface CalendarPageProps {
  reservations: Reservation[];
  properties: Property[];
  onNavigateToReservation: () => void;
}

const MONTH_NAMES = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

const FILTER_TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'confirmed', label: 'Confirmes' },
  { key: 'pending', label: 'En attente' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'checkout', label: 'Check-out' },
  { key: 'cancelled', label: 'Annules' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CalendarPage({ reservations, properties, onNavigateToReservation }: CalendarPageProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [guests, setGuests] = useState<Record<string, { full_name: string; email: string }>>({});

  useEffect(() => {
    if (reservations.length > 0) {
      const guestIds = [...new Set(reservations.map((r) => r.guest_id))];
      supabase
        .from('guests')
        .select('id, full_name, email')
        .in('id', guestIds)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, { full_name: string; email: string }> = {};
            data.forEach((g: any) => { map[g.id] = g; });
            setGuests(map);
          }
        });
    }
  }, [reservations]);

  const filteredByProperty = useMemo(() => {
    if (!propertyFilter) return reservations;
    return reservations.filter((r) => r.property_id === propertyFilter);
  }, [reservations, propertyFilter]);

  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleMonthInput = (value: string) => {
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    setCurrentMonth(new Date(y, m - 1, 1));
  };

  const monthInputValue = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  const getPropertyName = (id: string) => properties.find((p) => p.id === id)?.name || 'Inconnu';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
            <ChevronLeft size={18} />
          </button>
          <input
            type="month"
            value={monthInputValue}
            onChange={(e) => handleMonthInput(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
            <ChevronRight size={18} />
          </button>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Toutes les proprietes</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <CalendarGrid
          currentMonth={currentMonth}
          reservations={filteredByProperty}
          guests={guests}
          filter={filter}
          onReservationClick={setSelectedReservation}
        />
        <div className="hidden xl:block">
          <CalendarStats reservations={filteredByProperty} currentMonth={currentMonth} />
        </div>
      </div>

      <div className="xl:hidden">
        <CalendarStats reservations={filteredByProperty} currentMonth={currentMonth} />
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReservation(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Détails de la réservation</h2>
              <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Référence</p>
                  <p className="text-sm font-bold text-gray-900">{selectedReservation.booking_reference}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Propriété</p>
                  <p className="text-sm font-medium text-gray-900">{getPropertyName(selectedReservation.property_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Arrivée</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedReservation.check_in_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Départ</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedReservation.check_out_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Voyageurs</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReservation.number_of_guests}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    selectedReservation.status === 'checked_in' ? 'bg-green-100 text-green-800'
                    : selectedReservation.status === 'completed' ? 'bg-gray-100 text-gray-700'
                    : selectedReservation.status === 'cancelled' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedReservation.status === 'checked_in' ? 'Vérifiée'
                    : selectedReservation.status === 'completed' ? 'Terminée'
                    : selectedReservation.status === 'cancelled' ? 'Annulée'
                    : 'En attente'}
                  </span>
                </div>
              </div>
              {guests[selectedReservation.guest_id] && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Invité</p>
                  <p className="text-sm font-medium text-gray-900">{guests[selectedReservation.guest_id].full_name}</p>
                  <p className="text-xs text-gray-500">{guests[selectedReservation.guest_id].email}</p>
                </div>
              )}
              <button
                onClick={() => { setSelectedReservation(null); onNavigateToReservation(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <ExternalLink size={14} />
                Ouvrir les détails
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
