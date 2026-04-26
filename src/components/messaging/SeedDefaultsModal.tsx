import { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Button } from '../ui/Button';

interface SeedDefaultsModalProps {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SeedDefaultsModal({
  isOpen,
  loading = false,
  onClose,
  onConfirm,
}: SeedDefaultsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="seed-default-templates-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={clsx(modalTokens.panel, 'max-w-lg')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="seed-default-templates-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.messaging.seed.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={fr.common.close}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-5">
          <p className={clsx('text-sm', textTokens.body)}>{fr.messaging.seed.description}</p>
          <p className={clsx('text-sm', textTokens.muted)}>{fr.messaging.seed.helper}</p>
        </div>

        <div className={clsx('flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4', borderTokens.default)}>
          <Button variant="secondary" onClick={onClose}>
            {fr.common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? fr.messaging.seed.loading : fr.messaging.seed.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
