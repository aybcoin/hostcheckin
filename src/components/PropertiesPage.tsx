import { useState, type FormEvent } from 'react';
import { Plus, Link as LinkIcon, X } from 'lucide-react';
import { Property, PropertyCreateInput } from '../lib/supabase';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  inputTokens,
  modalTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { ErrorState } from './ui/ErrorState';
import { PropertyCard } from './properties/PropertyCard';

interface PropertiesPageProps {
  properties: Property[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAdd: (property: PropertyCreateInput) => Promise<void>;
  onEdit: (id: string, updates: Partial<Property>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenAutoLink: (propertyId: string) => void;
}

function PropertiesPageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[1, 2, 3].map((index) => (
        <Card key={index} variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
          <Skeleton variant="rect" className="h-5 w-1/3" />
          <Skeleton variant="rect" className="h-20 w-full rounded-lg" />
          <Skeleton variant="text" className="h-4 w-5/6" />
          <Skeleton variant="text" className="h-4 w-2/3" />
        </Card>
      ))}
    </div>
  );
}

export function PropertiesPage({
  properties,
  isLoading = false,
  error = null,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
  onOpenAutoLink,
}: PropertiesPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [showAirbnbImport, setShowAirbnbImport] = useState(false);
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    rooms_count: 1,
    bathrooms_count: 1,
    max_guests: 2,
    description: '',
    verification_mode: 'simple' as 'simple' | 'complete',
  });

  const canAddMore = properties.length < 3;

  if (isLoading) {
    return <PropertiesPageSkeleton />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }

  const parseAirbnbUrl = (url: string) => {
    const listingIdMatch = url.match(/\/rooms\/(\d+)/);
    return listingIdMatch ? listingIdMatch[1] : null;
  };

  const handleAirbnbImport = async () => {
    setImporting(true);
    try {
      const listingId = parseAirbnbUrl(airbnbUrl);

      if (!listingId) {
        alert(fr.propertiesPage.importInvalidUrl);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/airbnb-scraper`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ listingId }),
        }
      );

      if (!response.ok) {
        throw new Error('Échec de l\'importation');
      }

      const airbnbData = await response.json();

      setFormData({
        name: airbnbData.name,
        address: airbnbData.address,
        city: airbnbData.city,
        country: airbnbData.country,
        rooms_count: airbnbData.rooms_count,
        bathrooms_count: airbnbData.bathrooms_count,
        max_guests: airbnbData.max_guests,
        description: airbnbData.description,
        verification_mode: 'simple',
      });

      setShowAirbnbImport(false);
      setShowForm(true);
      setAirbnbUrl('');

    } catch (error) {
      console.error('Error importing from Airbnb:', error);
      alert(fr.propertiesPage.importFailed);
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (editingId) {
        await onEdit(editingId, formData);
        setEditingId(null);
      } else {
        await onAdd(formData);
      }

      setFormData({
        name: '',
        address: '',
        city: '',
        country: '',
        rooms_count: 1,
        bathrooms_count: 1,
        max_guests: 2,
        description: '',
        verification_mode: 'simple',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout/modification de logement:', error);
      alert(
        error instanceof Error && error.message
          ? `${fr.propertiesPage.saveFailedPrefix}: ${error.message}`
          : fr.propertiesPage.saveFailed,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>{fr.propertiesPage.title}</h1>
          <p className={clsx('mt-1', textTokens.muted)}>
            {fr.propertiesPage.countLabel(properties.length, 3)}
          </p>
        </div>
        {canAddMore && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAirbnbImport(true)}
              className={clsx('border-2', borderTokens.strong, textTokens.title)}
            >
              <LinkIcon size={18} />
              <span className="hidden sm:inline">{fr.propertiesPage.importAirbnb}</span>
              <span className="sm:hidden">{fr.propertiesPage.airbnbShort}</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{fr.propertiesPage.addManual}</span>
              <span className="sm:hidden">{fr.propertiesPage.addShort}</span>
            </Button>
          </div>
        )}
      </div>

      {showAirbnbImport && (
        <div className={modalTokens.overlay}>
          <Card variant="highlight" padding="sm" className="max-w-lg w-full shadow-2xl">
            <div className={clsx('p-4 sm:p-6 border-b flex items-center justify-between', borderTokens.default)}>
              <h2 className={clsx('text-xl sm:text-2xl font-bold', textTokens.title)}>{fr.propertiesPage.importTitle}</h2>
              <Button
                variant="tertiary"
                onClick={() => setShowAirbnbImport(false)}
                aria-label={fr.propertiesPage.closeImport}
                className="p-2 no-underline hover:no-underline"
              >
                <X size={24} />
              </Button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <p className={clsx('mb-4', textTokens.muted)}>
                  {fr.propertiesPage.importDescription}
                </p>
                <div className={clsx('border rounded-lg p-3 mb-4', surfaceTokens.subtle, borderTokens.default)}>
                  <p className={clsx('text-sm break-all', textTokens.body)}>
                    {fr.propertiesPage.importExample}
                  </p>
                </div>
              </div>

              <div>
                <label className={clsx('block text-sm font-medium mb-2', textTokens.body)}>
                  {fr.propertiesPage.airbnbLinkLabel}
                </label>
                <input
                  type="url"
                  value={airbnbUrl}
                  onChange={(e) => setAirbnbUrl(e.target.value)}
                  placeholder={fr.propertiesPage.airbnbLinkPlaceholder}
                  className={inputTokens.base}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleAirbnbImport}
                  disabled={!airbnbUrl || importing}
                >
                  {importing ? fr.propertiesPage.importing : fr.propertiesPage.importCta}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setShowAirbnbImport(false);
                    setAirbnbUrl('');
                  }}
                >
                  {fr.common.cancel}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showForm && (
        <Card variant="default" padding="lg" className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder={fr.propertiesPage.form.name}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="text"
                placeholder={fr.propertiesPage.form.address}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="text"
                placeholder={fr.propertiesPage.form.city}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="text"
                placeholder={fr.propertiesPage.form.country}
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="number"
                min="1"
                placeholder={fr.propertiesPage.form.rooms}
                value={formData.rooms_count}
                onChange={(e) => setFormData({ ...formData, rooms_count: parseInt(e.target.value) })}
                className={inputTokens.base}
              />
              <input
                type="number"
                min="1"
                placeholder={fr.propertiesPage.form.bathrooms}
                value={formData.bathrooms_count}
                onChange={(e) => setFormData({ ...formData, bathrooms_count: parseInt(e.target.value) })}
                className={inputTokens.base}
              />
              <input
                type="number"
                min="1"
                placeholder={fr.propertiesPage.form.maxGuests}
                value={formData.max_guests}
                onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) })}
                className={inputTokens.base}
              />
              <select
                value={formData.verification_mode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    verification_mode: e.target.value as 'simple' | 'complete',
                  })
                }
                className={inputTokens.base}
              >
                <option value="simple">{fr.propertiesPage.form.verificationSimple}</option>
                <option value="complete">{fr.propertiesPage.form.verificationComplete}</option>
              </select>
            </div>
            <textarea
              placeholder={fr.propertiesPage.form.description}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={inputTokens.base}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
              >
                {editingId ? fr.propertiesPage.form.update : fr.propertiesPage.form.create}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                variant="secondary"
                fullWidth
              >
                {fr.common.cancel}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {properties.length === 0 ? (
        <EmptyState
          icon={<Plus size={24} aria-hidden="true" />}
          title={fr.propertiesPage.emptyTitle}
          description={fr.propertiesPage.emptyDescriptionPage}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onEdit={(selectedProperty) => {
              setEditingId(selectedProperty.id);
              setFormData({
                name: selectedProperty.name,
                address: selectedProperty.address,
                city: selectedProperty.city,
                country: selectedProperty.country,
                rooms_count: selectedProperty.rooms_count,
                bathrooms_count: selectedProperty.bathrooms_count,
                max_guests: selectedProperty.max_guests,
                description: selectedProperty.description || '',
                verification_mode: selectedProperty.verification_mode || 'simple',
              });
              setShowForm(true);
            }}
            onDelete={(selectedProperty) => void onDelete(selectedProperty.id)}
            onOpenAutoLink={(selectedProperty) => onOpenAutoLink(selectedProperty.id)}
          />
        ))}
      </div>

      {!canAddMore && properties.length === 3 && (
        <Card variant="ghost" padding="sm" className={clsx('text-center', textTokens.body)}>
          {fr.propertiesPage.limitReached}
        </Card>
      )}
    </div>
  );
}
