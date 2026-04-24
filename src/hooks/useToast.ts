import { useEffect, useState } from 'react';
import { toastStore } from '../lib/toast';
import type { Toast } from '../lib/toast';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastStore.getToasts());

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  return {
    toasts,
    dismiss: toastStore.remove,
  };
}
