import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase, Host, Property, Reservation } from '../lib/supabase';
import { AppPage } from '../lib/navigation';

interface OnboardingChecklistProps {
  host: Host | null;
  properties: Property[];
  reservations: Reservation[];
  userEmailVerified: boolean;
  onNavigate: (page: AppPage) => void;
  className?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  targetPage: AppPage;
}

export function OnboardingChecklist({
  host,
  properties,
  reservations,
  userEmailVerified,
  onNavigate,
  className = '',
}: OnboardingChecklistProps) {
  const [contractTemplatesCount, setContractTemplatesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!host?.id) {
        setContractTemplatesCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('contract_templates')
        .select('id', { count: 'exact' })
        .eq('host_id', host.id);

      if (fetchError) {
        setError('Impossible de charger la progression des contrats.');
        setLoading(false);
        return;
      }

      setError(null);
      setContractTemplatesCount(data?.length || 0);
      setLoading(false);
    };

    void fetchTemplates();
  }, [host?.id]);

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        id: 'full_name',
        label: 'Nom complet renseigné',
        done: Boolean(host?.full_name?.trim()),
        targetPage: 'profile',
      },
      {
        id: 'email',
        label: 'E-mail vérifié',
        done: userEmailVerified,
        targetPage: 'profile',
      },
      {
        id: 'phone',
        label: 'Téléphone renseigné',
        done: Boolean(host?.phone?.trim()),
        targetPage: 'profile',
      },
      {
        id: 'company',
        label: 'Entreprise renseignée',
        done: Boolean(host?.company_name?.trim()),
        targetPage: 'profile',
      },
      {
        id: 'property',
        label: 'Première propriété ajoutée',
        done: properties.length > 0,
        targetPage: 'properties',
      },
      {
        id: 'contract',
        label: 'Premier contrat configuré',
        done: contractTemplatesCount > 0,
        targetPage: 'contracts',
      },
      {
        id: 'checkin',
        label: 'Premier check-in reçu',
        done: reservations.some((reservation) =>
          reservation.status === 'checked_in' || reservation.status === 'completed'),
        targetPage: 'checkins',
      },
    ],
    [contractTemplatesCount, host?.company_name, host?.full_name, host?.phone, properties.length, reservations, userEmailVerified],
  );

  const doneCount = items.filter((item) => item.done).length;
  const progress = Math.round((doneCount / items.length) * 100);

  if (!loading && progress >= 100) {
    return null;
  }

  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Progression de votre profil</h3>
          <p className="text-sm text-slate-600">Finalisez ces étapes pour activer tout le potentiel de HostCheckIn.</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-slate-900">{progress}%</p>
          <p className="text-xs text-slate-500">{doneCount}/{items.length}</p>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {loading ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Chargement de la checklist…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.targetPage)}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm text-slate-700">
                {item.done ? (
                  <CheckCircle2 size={16} className="text-slate-800" />
                ) : (
                  <Circle size={16} className="text-slate-400" />
                )}
                {item.label}
              </span>
              <span className={`text-xs font-medium ${item.done ? 'text-slate-800' : 'text-slate-500'}`}>
                {item.done ? 'Terminé' : 'À faire'}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
