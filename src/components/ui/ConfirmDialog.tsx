import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, modalTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  typeToConfirm?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  typeToConfirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTypedValue('');
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmable = !typeToConfirm || typedValue === typeToConfirm;
  const toneClass =
    variant === 'danger'
      ? statusTokens.danger
      : variant === 'warning'
        ? statusTokens.warning
        : statusTokens.info;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className={modalTokens.overlay}
      onClick={() => !busy && onCancel()}
    >
      <div
        className={clsx(modalTokens.panel, 'max-w-md')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={clsx('flex items-start gap-3 border-b p-5', borderTokens.default)}>
          <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClass)}>
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className={clsx('text-lg font-semibold', textTokens.title)}>
              {title}
            </h2>
            {description ? (
              <p className={clsx('mt-1 text-sm', textTokens.body)}>{description}</p>
            ) : null}
          </div>
        </div>

        {typeToConfirm ? (
          <div className={clsx('space-y-2 px-5 pt-4', surfaceTokens.panel)}>
            <p className={clsx('text-xs', textTokens.muted)}>
              Pour confirmer, tapez{' '}
              <code className={clsx('rounded px-1 py-0.5 font-mono', surfaceTokens.subtle, textTokens.title)}>
                {typeToConfirm}
              </code>{' '}
              ci-dessous.
            </p>
            <input
              type="text"
              autoFocus
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              className={clsx(
                'w-full rounded-lg border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300',
                borderTokens.default,
              )}
              aria-label={`Tapez ${typeToConfirm} pour confirmer`}
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 p-5">
          <Button variant="subtle" size="md" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            size="md"
            disabled={!confirmable || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'En cours…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
