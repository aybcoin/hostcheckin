import { Bath, BedDouble, Home, Link2, Pencil, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Property } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { PropertyDetailModal } from './PropertyDetailModal';

interface PropertyCardProps {
  property: Property;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  onOpenAutoLink?: (property: Property) => void;
}

export function PropertyCard({
  property,
  onEdit,
  onDelete,
  onOpenAutoLink,
}: PropertyCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <>
      <Card variant="highlight" padding="sm" interactive className="overflow-hidden p-0">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.name}
            className={clsx('aspect-video w-full object-cover', borderTokens.default)}
          />
        ) : (
          <div className={clsx('flex aspect-video flex-col items-center justify-center gap-2 border-b', borderTokens.default)}>
            <Home size={48} aria-hidden="true" className={textTokens.subtle} />
            <p className={clsx('text-sm', textTokens.muted)}>{fr.propertiesPage.noPhoto}</p>
          </div>
        )}

        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={clsx('truncate text-lg font-semibold', textTokens.title)}>{property.name}</h3>
                <p className={clsx('text-sm', textTokens.muted)}>
                  {property.city}, {property.country}
                </p>
              </div>
              <StatusBadge variant={property.auto_link_active ? 'success' : 'neutral'}>
                {property.auto_link_active ? fr.propertiesPage.statusActive : fr.propertiesPage.statusInactive}
              </StatusBadge>
            </div>

            <div>
              <p className={clsx('line-clamp-2 text-sm', textTokens.body)}>
                {property.description || fr.propertiesPage.emptyDescription}
              </p>
              {property.description ? (
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(true)}
                  className={clsx(
                    'mt-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
                    textTokens.body,
                  )}
                >
                  {fr.propertiesPage.viewMore}
                </button>
              ) : null}
            </div>
          </div>

          <div className={clsx('flex flex-wrap gap-4 border-t pt-4', borderTokens.subtle)}>
            <div className={clsx('inline-flex items-center gap-2 text-sm', textTokens.muted)}>
              <BedDouble size={16} aria-hidden="true" />
              <span>{property.rooms_count}</span>
            </div>
            <div className={clsx('inline-flex items-center gap-2 text-sm', textTokens.muted)}>
              <Bath size={16} aria-hidden="true" />
              <span>{property.bathrooms_count}</span>
            </div>
            <div className={clsx('inline-flex items-center gap-2 text-sm', textTokens.muted)}>
              <Users size={16} aria-hidden="true" />
              <span>{property.max_guests}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label={fr.a11y.edit}
              onClick={() => onEdit?.(property)}
              className={iconButtonToken}
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={fr.a11y.share}
              onClick={() => onOpenAutoLink?.(property)}
              className={iconButtonToken}
            >
              <Link2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={fr.a11y.delete}
              onClick={() => onDelete?.(property)}
              className={iconButtonToken}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </Card>

      {isDetailOpen ? (
        <PropertyDetailModal property={property} onClose={() => setIsDetailOpen(false)} />
      ) : null}
    </>
  );
}
