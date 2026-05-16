import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { clsx } from '../../lib/clsx';
import type { Toast, ToastVariant } from '../../lib/toast';

const iconByVariant: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColorByVariant: Record<ToastVariant, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-sky-400',
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
      className="animate-slide-in-right w-full rounded-xl bg-stone-900 px-3.5 py-3 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] flex items-start gap-3 ring-1 ring-stone-800"
    >
      <Icon
        className={clsx('mt-0.5 h-4 w-4 shrink-0', iconColorByVariant[toast.variant])}
        aria-hidden="true"
        strokeWidth={2}
      />
      <p className="flex-1 text-sm text-stone-100 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Fermer la notification"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-stone-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
      >
        <X size={14} aria-hidden="true" />
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
