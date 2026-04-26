/**
 * Formatting helpers shared across modules.
 * Single source of truth — modules should import from here rather than duplicate.
 */

/**
 * Formats a numeric amount as a localized currency string (fr-FR locale).
 *
 * @param value Amount to format. `null` / `undefined` / `NaN` / non-finite all render as the
 *   neutral em-dash placeholder (`—`).
 * @param currency ISO 4217 code (default `'EUR'`). Lowercase is normalized to uppercase.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'EUR',
): string {
  if (value == null) return '—';
  if (!Number.isFinite(value)) return '—';
  const code = (currency || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback for unsupported currency codes — render with code suffix.
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)} ${code}`;
  }
}

/**
 * Formats a date-only string (YYYY-MM-DD) as a short French date (e.g. "12 mars").
 * Falls back to the input on parsing errors so the UI never crashes.
 */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/**
 * Formats a timestamp as a date+time string ("12 mars, 14:30").
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
