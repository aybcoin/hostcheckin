import { Home, X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Property } from '../../lib/supabase';

interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
}

export function PropertyDetailModal({ property, onClose }: PropertyDetailModalProps) {
  return (
    <div className={modalTokens.overlay}>
      <div className={clsx(modalTokens.panel, 'max-w-2xl')}>
        <div className={clsx('flex items-start justify-between gap-4 border-b p-6', borderTokens.default)}>
          <div className="min-w-0">
            <p className={clsx('text-sm', textTokens.muted)}>{fr.propertiesPage.detailTitle}</p>
            <h2 className={clsx('text-2xl font-semibold', textTokens.title)}>{property.name}</h2>
            <p className={clsx('mt-1 text-sm', textTokens.muted)}>
              {property.city}, {property.country}
            </p>
          </div>

          <button
            type="button"
            aria-label={fr.a11y.close}
            onClick={onClose}
            className={clsx(iconButtonToken, 'shrink-0')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className={clsx('flex items-center gap-2 text-sm', textTokens.muted)}>
            <Home size={16} aria-hidden="true" />
            <span>{property.address}</span>
          </div>

          <div>
            <h3 className={clsx('text-sm font-semibold', textTokens.title)}>{fr.propertiesPage.descriptionLabel}</h3>
            <p className={clsx('mt-2 whitespace-pre-line text-sm leading-6', textTokens.body)}>
              {property.description || fr.propertiesPage.emptyDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
