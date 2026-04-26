import { clsx } from '../../lib/clsx';
import { borderTokens, cardTokens, ctaTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Property } from '../../lib/supabase';

interface PropertySelectorProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onChange: (id: string | null) => void;
  loading?: boolean;
}

const pillBaseClassName = 'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors';

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
            selectedPropertyId === null ? ctaTokens.primary : cardTokens.base,
            pillBaseClassName,
            selectedPropertyId === null
              ? undefined
              : [borderTokens.default, surfaceTokens.panel, textTokens.body],
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
              selectedPropertyId === property.id ? ctaTokens.primary : cardTokens.base,
              pillBaseClassName,
              selectedPropertyId === property.id
                ? undefined
                : [borderTokens.default, surfaceTokens.panel, textTokens.body],
            )}
          >
            {property.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
