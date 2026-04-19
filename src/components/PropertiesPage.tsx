import { useState, type FormEvent } from 'react';
import { Plus, CreditCard as Edit, Trash2, MapPin, Users, Link as LinkIcon, QrCode, X } from 'lucide-react';
import { Property, PropertyCreateInput } from '../lib/supabase';
import { inputTokens } from '../lib/design-tokens';
import { VerificationModeCard } from './properties/VerificationModeCard';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface PropertiesPageProps {
  properties: Property[];
  onAdd: (property: PropertyCreateInput) => Promise<void>;
  onEdit: (id: string, updates: Partial<Property>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenAutoLink: (propertyId: string) => void;
}

export function PropertiesPage({ properties, onAdd, onEdit, onDelete, onOpenAutoLink }: PropertiesPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [showAirbnbImport, setShowAirbnbImport] = useState(false);
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingVerificationById, setSavingVerificationById] = useState<Record<string, boolean>>({});
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

  const parseAirbnbUrl = (url: string) => {
    const listingIdMatch = url.match(/\/rooms\/(\d+)/);
    return listingIdMatch ? listingIdMatch[1] : null;
  };

  const handleAirbnbImport = async () => {
    setImporting(true);
    try {
      const listingId = parseAirbnbUrl(airbnbUrl);

      if (!listingId) {
        alert('URL Airbnb invalide. Veuillez fournir un lien valide.');
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
      alert('Erreur lors de l\'importation depuis Airbnb. Veuillez réessayer.');
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
      console.error('Erreur lors de l\'ajout/modification de propriété:', error);
      alert('Erreur: ' + (error instanceof Error ? error.message : 'Impossible d\'ajouter la propriété'));
    }
  };

  const handleVerificationModeChange = async (propertyId: string, mode: 'simple' | 'complete') => {
    setSavingVerificationById((previous) => ({ ...previous, [propertyId]: true }));
    try {
      await onEdit(propertyId, { verification_mode: mode });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mode de vérification :', error);
      alert('Impossible de mettre à jour le mode de vérification.');
    } finally {
      setSavingVerificationById((previous) => ({ ...previous, [propertyId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Propriétés</h1>
          <p className="text-gray-600 mt-1">{properties.length} / 3 propriétés</p>
        </div>
        {canAddMore && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAirbnbImport(true)}
              className="border-2 border-slate-900 text-slate-900"
            >
              <LinkIcon size={18} />
              <span className="hidden sm:inline">Importer Airbnb</span>
              <span className="sm:hidden">Airbnb</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Ajouter manuellement</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        )}
      </div>

      {showAirbnbImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card variant="highlight" padding="sm" className="max-w-lg w-full shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Importer depuis Airbnb</h2>
              <Button
                variant="tertiary"
                onClick={() => setShowAirbnbImport(false)}
                aria-label="Fermer la fenêtre d’import Airbnb"
                className="p-2 no-underline hover:no-underline"
              >
                <X size={24} />
              </Button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <p className="text-gray-600 mb-4">
                  Collez le lien de votre annonce Airbnb pour importer automatiquement les détails
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-slate-700 break-all">
                    Exemple: https://www.airbnb.com/rooms/12345678
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lien Airbnb
                </label>
                <input
                  type="url"
                  value={airbnbUrl}
                  onChange={(e) => setAirbnbUrl(e.target.value)}
                  placeholder="https://www.airbnb.com/rooms/..."
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
                  {importing ? 'Importation...' : 'Importer'}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setShowAirbnbImport(false);
                    setAirbnbUrl('');
                  }}
                >
                  Annuler
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
                placeholder="Nom de la propriété"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="text"
                placeholder="Adresse"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="text"
                placeholder="Ville"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="text"
                placeholder="Pays"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
                className={inputTokens.base}
              />
              <input
                type="number"
                min="1"
                placeholder="Chambres"
                value={formData.rooms_count}
                onChange={(e) => setFormData({ ...formData, rooms_count: parseInt(e.target.value) })}
                className={inputTokens.base}
              />
              <input
                type="number"
                min="1"
                placeholder="Salles de bain"
                value={formData.bathrooms_count}
                onChange={(e) => setFormData({ ...formData, bathrooms_count: parseInt(e.target.value) })}
                className={inputTokens.base}
              />
              <input
                type="number"
                min="1"
                placeholder="Nombre max d'hôtes"
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
                <option value="simple">Vérification simple</option>
                <option value="complete">Vérification complète</option>
              </select>
            </div>
            <textarea
              placeholder="Description (optionnel)"
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
                {editingId ? 'Mettre à jour' : 'Ajouter'}
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
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {properties.map((property) => (
          <Card key={property.id} variant="highlight" padding="sm" interactive className="overflow-hidden p-0">
            {property.image_url && (
              <img src={property.image_url} alt={property.name} className="w-full h-36 sm:h-48 object-cover" />
            )}
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{property.name}</h3>
              <div className="flex items-center gap-2 text-gray-600 mt-2">
                <MapPin size={16} />
                <span className="text-sm">{property.city}, {property.country}</span>
              </div>

              <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 py-3 sm:py-4 border-y border-gray-200">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-700" />
                  <span className="text-sm text-gray-600">{property.max_guests} hôtes max</span>
                </div>
                <div className="text-sm text-gray-600">
                  {property.rooms_count} ch. / {property.bathrooms_count} SdB
                </div>
              </div>

              {property.description && (
                <p className="text-gray-600 text-sm mt-3 sm:mt-4 line-clamp-2">{property.description}</p>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingId(property.id);
                    setFormData({
                      name: property.name,
                      address: property.address,
                      city: property.city,
                      country: property.country,
                      rooms_count: property.rooms_count,
                      bathrooms_count: property.bathrooms_count,
                    max_guests: property.max_guests,
                    description: property.description || '',
                    verification_mode: property.verification_mode || 'simple',
                  });
                  setShowForm(true);
                }}
                  className="flex-1 justify-center border-slate-900 text-slate-900"
                >
                  <Edit size={16} />
                  <span>Éditer</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAutoLink(property.id)}
                  className="flex-1 justify-center"
                >
                  <QrCode size={16} />
                  <span>Lien auto</span>
                </Button>
                <Button
                  variant="dangerSoft"
                  size="sm"
                  onClick={() => onDelete(property.id)}
                  className="flex-1 justify-center"
                >
                  <Trash2 size={16} />
                  <span>Supprimer</span>
                </Button>
              </div>

              <VerificationModeCard
                property={property}
                saving={Boolean(savingVerificationById[property.id])}
                onChange={(mode) => {
                  void handleVerificationModeChange(property.id, mode);
                }}
              />
            </div>
          </Card>
        ))}
      </div>

      {!canAddMore && properties.length === 3 && (
        <Card variant="ghost" padding="sm" className="text-center text-slate-700">
          Vous avez atteint le maximum de 3 propriétés
        </Card>
      )}
    </div>
  );
}
