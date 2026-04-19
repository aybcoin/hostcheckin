import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { APP_BASE_URL } from '../lib/supabase';
import { iconButtonToken } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';

interface GuestPreviewModalProps {
  onClose: () => void;
}

export function GuestPreviewModal({ onClose }: GuestPreviewModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-preview-title"
    >
      <div className="flex h-full w-full translate-y-0 flex-col overflow-hidden bg-white transition-transform duration-200">
        <div className="bg-violet-700 px-4 py-2 text-center text-sm font-medium text-white">
          {fr.guestPreview.banner}
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="guest-preview-title" className="text-lg font-semibold text-slate-900">{fr.guestPreview.title}</h2>
            <p className="text-xs text-slate-500">{fr.guestPreview.hint}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={fr.guestPreview.closeAria}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <iframe
          title={fr.guestPreview.iframeTitle}
          src={`${APP_BASE_URL}/checkin/demo-preview`}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
