import { clsx } from '../../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { MessageLocale } from '../../types/messaging';

interface LocaleFlagProps {
  locale: MessageLocale;
  showLabel?: boolean;
  className?: string;
}

const flagByLocale: Record<MessageLocale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇸🇦',
  darija: '🇲🇦',
};

const fallbackByLocale: Record<MessageLocale, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'AR',
  darija: 'MA',
};

export function LocaleFlag({ locale, showLabel = false, className }: LocaleFlagProps) {
  const flag = flagByLocale[locale] ?? fallbackByLocale[locale];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium',
        borderTokens.default,
        surfaceTokens.subtle,
        textTokens.body,
        className,
      )}
      title={fr.messaging.locales[locale]}
      aria-label={fr.messaging.locales[locale]}
    >
      <span aria-hidden="true">{flag}</span>
      {showLabel ? <span>{fr.messaging.locales[locale]}</span> : null}
    </span>
  );
}
