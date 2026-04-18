import { useEffect } from 'react';
import { X } from 'lucide-react';
import { APP_BASE_URL } from '../lib/supabase';

interface GuestPreviewModalProps {
  onClose: () => void;
}

export function GuestPreviewModal({ onClose }: GuestPreviewModalProps) {
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 transition-opacity duration-200" role="dialog" aria-modal="true">
      <div className="flex h-full w-full translate-y-0 flex-col overflow-hidden bg-white transition-transform duration-200">
        <div className="bg-violet-700 px-4 py-2 text-center text-sm font-medium text-white">
          Mode démo — aucune donnée n'est enregistrée
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Aperçu invité (démo)</h2>
            <p className="text-xs text-slate-500">Navigation libre sur les 3 étapes : Identité, Selfie, Contrat.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l’aperçu invité"
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <iframe
          title="Aperçu invité"
          src={`${APP_BASE_URL}/checkin/demo-preview`}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
