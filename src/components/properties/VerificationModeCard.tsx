import { ShieldCheck } from 'lucide-react';
import { Property } from '../../lib/supabase';

interface VerificationModeCardProps {
  property: Property;
  saving: boolean;
  onChange: (mode: 'simple' | 'complete') => void;
}

export function VerificationModeCard({ property, saving, onChange }: VerificationModeCardProps) {
  const mode = property.verification_mode || 'simple';

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck size={16} className="text-slate-700" />
        <h4 className="text-sm font-semibold text-slate-900">Type de vérification</h4>
      </div>
      <p className="text-xs text-slate-600">
        Choisissez le niveau par défaut appliqué aux nouvelles réservations de cette propriété.
      </p>

      <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => onChange('simple')}
          disabled={saving}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'simple'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Vérification simple
        </button>
        <button
          type="button"
          onClick={() => onChange('complete')}
          disabled={saving}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === 'complete'
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Vérification complète
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase text-slate-500">
          <span>Mode</span>
          <span>Invité principal</span>
          <span>Tous les adultes</span>
        </div>
        <div className="grid grid-cols-3 px-3 py-2 text-xs text-slate-700">
          <span>Simple</span>
          <span>Oui</span>
          <span>Non</span>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-200 px-3 py-2 text-xs text-slate-700">
          <span>Complète</span>
          <span>Oui</span>
          <span>Oui</span>
        </div>
      </div>
    </section>
  );
}
