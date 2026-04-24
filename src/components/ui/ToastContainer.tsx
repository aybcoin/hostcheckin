import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { clsx } from '../../lib/clsx';
import { stateFillTokens, textTokens } from '../../lib/design-tokens';
import type { Toast, ToastVariant } from '../../lib/toast';

const iconByVariant: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const surfaceByVariant: Record<ToastVariant, string> = {
  success: stateFillTokens.success,
  error: stateFillTokens.danger,
  warning: stateFillTokens.warning,
  info: stateFillTokens.neutral,
};

function ariaLiveByVariant(variant: ToastVariant): 'assertive' | 'polite' {
  if (variant === 'success' || variant === 'error') {
    return 'assertive';
  }
  return 'polite';
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const Icon = iconByVariant[toast.variant];
  return (
    <div
      role="alert"
      aria-live={ariaLiveByVariant(toast.variant)}
      className={clsx(
        'animate-slide-in-right w-full rounded-lg px-3 py-2.5 shadow-sm',
        'flex items-start gap-2',
        surfaceByVariant[toast.variant],
        textTokens.inverse,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className={clsx('flex-1 text-sm', textTokens.inverse)}>{toast.message}</p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Fermer la notification"
        className={clsx(
          'inline-flex h-5 w-5 items-center justify-center rounded text-sm leading-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          textTokens.inverse,
        )}
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItem toast={item} onClose={dismiss} />
        </div>
      ))}
    </div>
  );
}
