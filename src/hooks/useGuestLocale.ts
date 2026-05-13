import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_GUEST_LOCALE,
  GUEST_LOCALES,
  guestI18n,
} from '../lib/i18n/guest';
import type { GuestBundle, GuestLocale } from '../lib/i18n/guest';

const GUEST_LOCALE_STORAGE_KEY = 'hostcheckin:guest:locale:v1';
const guestLocaleSet = new Set<string>(GUEST_LOCALES);

function isGuestLocale(value: string | null): value is GuestLocale {
  return value !== null && guestLocaleSet.has(value);
}

function resolveNavigatorLocale(): GuestLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_GUEST_LOCALE;
  }

  const languagePrefix = navigator.language.toLowerCase().split('-')[0] ?? '';
  return isGuestLocale(languagePrefix) ? languagePrefix : DEFAULT_GUEST_LOCALE;
}

function resolveInitialLocale(): GuestLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_GUEST_LOCALE;
  }

  try {
    const storedLocale = window.localStorage.getItem(GUEST_LOCALE_STORAGE_KEY);
    if (isGuestLocale(storedLocale)) {
      return storedLocale;
    }
  } catch {
    return resolveNavigatorLocale();
  }

  return resolveNavigatorLocale();
}

export function useGuestLocale(): { locale: GuestLocale; setLocale: (locale: GuestLocale) => void; t: GuestBundle } {
  const [locale, setLocaleState] = useState<GuestLocale>(resolveInitialLocale);

  const setLocale = useCallback((nextLocale: GuestLocale) => {
    setLocaleState(nextLocale);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(GUEST_LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      return;
    }
  }, []);

  const t = guestI18n[locale];

  return useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );
}
