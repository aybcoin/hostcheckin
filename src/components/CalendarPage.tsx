import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { Reservation, Property } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { CalendarGrid } from './calendar/CalendarGrid';
import { CalendarStats } from './calendar/CalendarStats';
import { fr } from '../lib/i18n/fr';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { borderTokens, iconButtonToken, inputTokens, modalTokens, statusTokens, textTokens } from '../lib/design-tokens';

interface CalendarPageProps {
  reservations: Reservation[];
  properties: Property[];
  onNavigateToReservation: () => void;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const FILTER_TABS = [
  { key: 'all', label: fr.calendar.tabs.all },
  { key: 'confirmed', label: fr.calendar.tabs.confirmed },
  { key: 'pending', label: fr.calendar.tabs.pending },
  { key: 'checkin', label: fr.calendar.tabs.checkin },
  { key: 'checkout', label: fr.calendar.tabs.checkout },
  { key: 'cancelled', label: fr.calendar.tabs.cancelled },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CalendarPage({ reservations, properties, onNavigateToReservation }: CalendarPageProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [guests, setGuests] = useState<Record<string, { full_name: string; email: string | null }>>({});

  useEffect(() => {
    if (reservations.length > 0) {
      const guestIds = [...new Set(reservations.map((r) => r.guest_id))];
      supabase
        .from('guests')
        .select('id, full_name, email')
        .in('id', guestIds)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, { full_name: string; email: string | null }> = {};
            data.forEach((guest: { id: string; full_name: string; email: string | null }) => {
              map[guest.id] = guest;
            });
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

  const getPropertyName = (id: string) =>
    properties.find((p) => p.id === id)?.name || fr.calendar.unknownProperty;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            aria-label="Mois précédent"
            className={iconButtonToken}
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="month"
            value={monthInputValue}
            onChange={(e) => handleMonthInput(e.target.value)}
            className={inputTokens.base}
          />
          <button
            onClick={goToNextMonth}
            aria-label="Mois suivant"
            className={iconButtonToken}
          >
            <ChevronRight size={18} />
          </button>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className={inputTokens.base}
          >
            <option value="">{fr.calendar.allProperties}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            variant={filter === tab.key ? 'primary' : 'secondary'}
            size="sm"
          >
            {tab.label}
          </Button>
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
        <div className={modalTokens.overlay} onClick={() => setSelectedReservation(null)}>
          <div className={`${modalTokens.panel} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className={clsx('p-5 border-b flex items-center justify-between', borderTokens.default)}>
              <h2 className={clsx('text-lg font-bold', textTokens.title)}>{fr.calendar.detailsTitle}</h2>
              <button
                onClick={() => setSelectedReservation(null)}
                aria-label="Fermer le détail de la réservation"
                className={iconButtonToken}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={clsx('text-xs', textTokens.subtle)}>{fr.calendar.fields.reference}</p>
                  <p className={clsx('text-sm font-bold', textTokens.title)}>{selectedReservation.booking_reference}</p>
                </div>
                <div>
                  <p className={clsx('text-xs', textTokens.subtle)}>{fr.calendar.fields.property}</p>
                  <p className={clsx('text-sm font-medium', textTokens.title)}>{getPropertyName(selectedReservation.property_id)}</p>
                </div>
                <div>
                  <p className={clsx('text-xs', textTokens.subtle)}>{fr.calendar.fields.checkIn}</p>
                  <p className={clsx('text-sm font-medium', textTokens.title)}>{formatDate(selectedReservation.check_in_date)}</p>
                </div>
                <div>
                  <p className={clsx('text-xs', textTokens.subtle)}>{fr.calendar.fields.checkOut}</p>
                  <p className={clsx('text-sm font-medium', textTokens.title)}>{formatDate(selectedReservation.check_out_date)}</p>
                </div>
                <div>
                  <p className={clsx('text-xs', textTokens.subtle)}>{fr.calendar.fields.guests}</p>
                  <p className={clsx('text-sm font-medium', textTokens.title)}>{selectedReservation.number_of_guests}</p>
                </div>
                <div>
                  <p className={clsx('text-xs', textTokens.subtle)}>{fr.calendar.fields.status}</p>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                    selectedReservation.status === 'checked_in' ? statusTokens.success
                    : selectedReservation.status === 'completed' ? statusTokens.neutral
                    : selectedReservation.status === 'cancelled' ? statusTokens.danger
                    : statusTokens.pending
                  }`}>
                    {selectedReservation.status === 'checked_in' ? 'Vérifiée'
                    : selectedReservation.status === 'completed' ? 'Terminée'
                    : selectedReservation.status === 'cancelled' ? 'Annulée'
                    : 'En attente'}
                  </span>
                </div>
              </div>
              {selectedReservation.guest_id && guests[selectedReservation.guest_id] && (
                <Card variant="ghost" padding="sm">
                  <p className={clsx('text-xs mb-1', textTokens.subtle)}>{fr.calendar.fields.guest}</p>
                  <p className={clsx('text-sm font-medium', textTokens.title)}>{guests[selectedReservation.guest_id].full_name}</p>
                  <p className={clsx('text-xs', textTokens.subtle)}>{guests[selectedReservation.guest_id].email}</p>
                </Card>
              )}
              <Button
                onClick={() => { setSelectedReservation(null); onNavigateToReservation(); }}
                variant="primary"
                className="w-full"
              >
                <ExternalLink size={14} />
                {fr.calendar.openDetails}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
