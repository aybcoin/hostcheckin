import { clsx } from '../../lib/clsx';
import { chipTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Property } from '../../lib/supabase';

interface PropertySelectorProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onChange: (id: string | null) => void;
  loading?: boolean;
}

const pillBaseClassName =
  'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2';

export function PropertySelector({
  properties,
  selectedPropertyId,
  onChange,
  loading = false,
}: PropertySelectorProps) {
  if (properties.length <= 1) {
    return null;
  }

  return (
    <nav aria-label={fr.portfolio.propertySelector} aria-busy={loading || undefined}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          disabled={loading}
          aria-pressed={selectedPropertyId === null}
          onClick={() => onChange(null)}
          className={clsx(
            pillBaseClassName,
            selectedPropertyId === null ? chipTokens.active : chipTokens.primary,
          )}
        >
          {fr.portfolio.allProperties}
        </button>

        {properties.map((property) => (
          <button
            key={property.id}
            type="button"
            disabled={loading}
            aria-pressed={selectedPropertyId === property.id}
            onClick={() => onChange(property.id)}
            className={clsx(
              pillBaseClassName,
              selectedPropertyId === property.id ? chipTokens.active : chipTokens.primary,
            )}
          >
            {property.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
