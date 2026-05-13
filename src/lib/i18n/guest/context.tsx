import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useGuestLocale } from '../../../hooks/useGuestLocale';
import type { GuestBundle, GuestLocale } from './index';

const GuestLocaleContext = createContext<{
  locale: GuestLocale;
  setLocale: (locale: GuestLocale) => void;
  t: GuestBundle;
} | null>(null);

export function GuestLocaleProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useGuestLocale();
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <GuestLocaleContext.Provider value={value}>{children}</GuestLocaleContext.Provider>;
}

export function useGuestT(): GuestBundle {
  const context = useContext(GuestLocaleContext);

  if (!context) {
    throw new Error('useGuestT must be used within GuestLocaleProvider');
  }

  return context.t;
}

export function useGuestLocaleCtx(): { locale: GuestLocale; setLocale: (locale: GuestLocale) => void } {
  const context = useContext(GuestLocaleContext);

  if (!context) {
    throw new Error('useGuestLocaleCtx must be used within GuestLocaleProvider');
  }

  return {
    locale: context.locale,
    setLocale: context.setLocale,
  };
}
