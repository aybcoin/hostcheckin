import { Calendar, CheckCircle2, Home, Sparkles } from 'lucide-react';
import { Host, Property, Reservation } from '../lib/supabase';
import { AppPage } from '../lib/navigation';
import { CheckinsTrendChart } from './dashboard/CheckinsTrendChart';
import { RecentActivities } from './dashboard/RecentActivities';
import { OnboardingChecklist } from './OnboardingChecklist';

interface DashboardProps {
  host: Host | null;
  properties: Property[];
  reservations: Reservation[];
  userEmailVerified: boolean;
  loading: boolean;
  onNavigate: (page: AppPage) => void;
}

interface StatCard {
  label: string;
  value: number;
  icon: typeof Home;
}

function Stat({ label, value, icon: Icon }: StatCard) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{label}</p>
        <div className="rounded-lg bg-slate-100 p-2">
          <Icon size={16} className="text-slate-700" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

export function Dashboard({
  host,
  properties,
  reservations,
  userEmailVerified,
  loading,
  onNavigate,
}: DashboardProps) {
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Chargement du tableau de bord…</p>
      </div>
    );
  }

  const now = new Date();
  const stats: StatCard[] = [
    {
      label: 'Propriétés actives',
      value: properties.length,
      icon: Home,
    },
    {
      label: 'Réservations totales',
      value: reservations.length,
      icon: Calendar,
    },
    {
      label: 'Check-ins validés',
      value: reservations.filter((reservation) =>
        reservation.status === 'checked_in' || reservation.status === 'completed').length,
      icon: CheckCircle2,
    },
    {
      label: 'Arrivées à venir',
      value: reservations.filter((reservation) => new Date(reservation.check_in_date) >= now).length,
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600">
          Bienvenue {host?.full_name || 'sur HostCheckIn'}, voici la synthèse de votre activité.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CheckinsTrendChart reservations={reservations} />
        <RecentActivities reservations={reservations} />
      </div>

      <OnboardingChecklist
        host={host}
        properties={properties}
        reservations={reservations}
        userEmailVerified={userEmailVerified}
        onNavigate={onNavigate}
      />
    </div>
  );
}
