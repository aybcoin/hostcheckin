import en from './en';
import es from './es';
import fr from './fr';

export type GuestLocale = 'fr' | 'en' | 'es';
export const GUEST_LOCALES: readonly GuestLocale[] = ['fr', 'en', 'es'] as const;
export type GuestBundle = typeof import('./fr').default;
export const guestI18n: Record<GuestLocale, GuestBundle> = { fr, en, es };
export const DEFAULT_GUEST_LOCALE: GuestLocale = 'fr';
