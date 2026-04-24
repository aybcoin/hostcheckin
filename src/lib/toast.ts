export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms, défaut 4000
}

let toasts: Toast[] = [];
const listeners: Array<(items: Toast[]) => void> = [];

function emit(nextToasts: Toast[]) {
  listeners.forEach((listener) => listener(nextToasts));
}

function createToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const toastStore = {
  getToasts: () => toasts,
  subscribe: (fn: (items: Toast[]) => void) => {
    listeners.push(fn);
    return () => {
      const index = listeners.indexOf(fn);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  },
  add: (toast: Omit<Toast, 'id'>) => {
    const nextToast: Toast = { ...toast, id: createToastId() };
    toasts = [...toasts, nextToast];
    emit(toasts);
    setTimeout(() => {
      toastStore.remove(nextToast.id);
    }, toast.duration ?? 4000);
    return nextToast.id;
  },
  remove: (id: string) => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit(toasts);
  },
};

export const toast = {
  success: (message: string) => toastStore.add({ message, variant: 'success' }),
  error: (message: string) => toastStore.add({ message, variant: 'error' }),
  warning: (message: string) => toastStore.add({ message, variant: 'warning' }),
  info: (message: string) => toastStore.add({ message, variant: 'info' }),
};
