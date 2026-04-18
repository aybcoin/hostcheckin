import { useEffect, useState, type FormEvent } from 'react';
import { X, Plus, QrCode, PenLine } from 'lucide-react';
import { Property, APP_BASE_URL, Reservation, ReservationCreateInput } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

interface ReservationMutationError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface ReservationMutationResult {
  data: Reservation[] | null;
  error: ReservationMutationError | null;
}

interface CreateReservationModalProps {
  properties: Property[];
  onAdd: (reservation: ReservationCreateInput) => Promise<ReservationMutationResult>;
  onClose: () => void;
}

export function CreateReservationModal({ properties, onAdd, onClose }: CreateReservationModalProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [blacklistWarning, setBlacklistWarning] = useState<string | null>(null);
  const [hostBlacklist, setHostBlacklist] = useState<Array<{
    id: string;
    full_name: string;
    email?: string | null;
    phone?: string | null;
    document_number?: string | null;
    reason: string;
  }>>([]);
  const [formData, setFormData] = useState({
    property_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 1,
    smart_lock_code: '',
    verification_type: 'simple' as 'simple' | 'complete',
    verification_mode: 'simple' as 'simple' | 'complete',
    notes: '',
  });

  const selectedProp = properties.find((p) => p.id === formData.property_id);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const syncVerificationMode = (nextPropertyId: string) => {
    const property = properties.find((item) => item.id === nextPropertyId);
    const defaultMode = property?.verification_mode || 'simple';
    setFormData((previous) => ({
      ...previous,
      property_id: nextPropertyId,
      verification_type: defaultMode,
      verification_mode: defaultMode,
    }));
  };

  const loadBlacklistForProperty = async (propertyId: string) => {
    const property = properties.find((item) => item.id === propertyId);
    if (!property?.host_id) {
      setHostBlacklist([]);
      return;
    }

    const { data, error } = await supabase
      .from('blacklisted_guests')
      .select('id, full_name, email, phone, document_number, reason')
      .eq('host_id', property.host_id);

    if (error) {
      setHostBlacklist([]);
      return;
    }
    setHostBlacklist((data || []) as Array<{
      id: string;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      document_number?: string | null;
      reason: string;
    }>);
  };

  const computeBlacklistMatch = (
    guestName: string,
    guestEmail: string,
    guestPhone: string,
  ): string | null => {
    const normalizedName = guestName.trim().toLowerCase();
    const normalizedEmail = guestEmail.trim().toLowerCase();
    const normalizedPhone = guestPhone.replace(/\s+/g, '');

    const matched = hostBlacklist.find((item) => {
      const itemName = item.full_name.trim().toLowerCase();
      const itemEmail = (item.email || '').trim().toLowerCase();
      const itemPhone = (item.phone || '').replace(/\s+/g, '');
      const byEmail = normalizedEmail && itemEmail && normalizedEmail === itemEmail;
      const byPhone = normalizedPhone && itemPhone && normalizedPhone === itemPhone;
      const byName = normalizedName && itemName && normalizedName === itemName;
      return byEmail || byPhone || byName;
    });

    if (!matched) return null;
    return `Invité potentiellement blacklisté (${matched.reason}).`;
  };

  const generateBookingRef = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = '';
    for (let i = 0; i < 4; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
    return ref + '#' + Math.floor(Math.random() * 10);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const match = computeBlacklistMatch(formData.guest_name, formData.guest_email, formData.guest_phone);
    if (match) {
      setBlacklistWarning(match);
      alert("Création bloquée : cet invité correspond à un profil blacklisté.");
      return;
    }
    setLoading(true);
    try {
      // Email is optional. When provided, upsert by email so the same guest
      // is not duplicated. When absent, always insert a fresh row with email
      // explicitly set to null (Postgres allows multiple NULLs in a UNIQUE
      // index, so this never conflicts).
      const rawEmail = (formData.guest_email || '').trim();
      const email = rawEmail.length > 0 ? rawEmail : null;
      const guestPayload = {
        full_name: formData.guest_name.trim(),
        phone: formData.guest_phone?.trim() || null,
        email,
      };
      const query = email
        ? supabase.from('guests').upsert(guestPayload, { onConflict: 'email' })
        : supabase.from('guests').insert(guestPayload);
      const { data: guestData, error: guestError } = await query.select().single();
      if (guestError) {
        console.error('Supabase error (guests):', guestError);
        alert(
          `Erreur lors de la création de l'invité :\n` +
          `${guestError.message}` +
          (guestError.details ? `\nDétails : ${guestError.details}` : '') +
          (guestError.hint ? `\nIndice : ${guestError.hint}` : '') +
          (guestError.code ? `\nCode: ${guestError.code}` : '')
        );
        return;
      }

      const reservationPayload: ReservationCreateInput = {
        property_id: formData.property_id,
        guest_id: guestData.id,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        number_of_guests: formData.number_of_guests,
        booking_reference: generateBookingRef(),
        status: 'pending',
        verification_type: formData.verification_type,
        verification_mode: formData.verification_mode,
        smart_lock_code: formData.smart_lock_code || null,
        notes: formData.notes,
      };
      const addResult = await onAdd(reservationPayload);
      if (addResult && addResult.error) {
        const resError = addResult.error;
        console.error('Supabase error (reservations):', resError);
        alert(
          `Erreur lors de la création de la réservation :\n` +
          `${resError.message}` +
          (resError.details ? `\nDétails : ${resError.details}` : '') +
          (resError.hint ? `\nIndice : ${resError.hint}` : '') +
          (resError.code ? `\nCode: ${resError.code}` : '')
        );
        return;
      }
      onClose();
    } catch (err: unknown) {
      console.error('Unexpected error (reservation create):', err);
      const errorLike = err as {
        message?: string;
        error_description?: string;
        error?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      const supaMsg = errorLike.message || errorLike.error_description || errorLike.error || JSON.stringify(err);
      alert(
        `Erreur lors de la création de la réservation :\n${supaMsg}` +
        (errorLike.details ? `\nDétails : ${errorLike.details}` : '') +
        (errorLike.hint ? `\nIndice : ${errorLike.hint}` : '') +
        (errorLike.code ? `\nCode: ${errorLike.code}` : '')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-200" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl transition-transform duration-200 animate-[fadeIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nouvelle réservation</h2>
          <button onClick={onClose} aria-label="Fermer la création de réservation" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('auto')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'auto' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <QrCode size={16} />
              Réservations automatiques
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'manual' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PenLine size={16} />
              Réservation manuelle
            </button>
          </div>

          {mode === 'auto' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border-l-4 border-slate-900 p-4 rounded">
                <p className="text-sm text-slate-700">
                  Les réservations automatiques génèrent un lien réutilisable par propriété avec un QR code. Partagez ce lien avec vos invités pour qu'ils complètent automatiquement leur check-in.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriété</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => {
                    syncVerificationMode(e.target.value);
                    void loadBlacklistForProperty(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                >
                  <option value="">Sélectionner une propriété</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {selectedProp && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <div className="w-40 h-40 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-3">
                    <QrCode size={80} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">QR Code pour "{selectedProp.name}"</p>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200 max-w-md mx-auto">
                    <span className="text-xs text-gray-500 truncate flex-1">{APP_BASE_URL}/auto/{selectedProp.id}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${APP_BASE_URL}/auto/${selectedProp.id}`)}
                      className="shrink-0 px-2 py-1 text-xs bg-slate-900 text-white rounded hover:bg-slate-800"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriété</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => {
                    syncVerificationMode(e.target.value);
                    void loadBlacklistForProperty(e.target.value);
                  }}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                >
                  <option value="">Sélectionner une propriété</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'arrivée</label>
                  <input
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de départ</label>
                  <input
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Informations de l'invité</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={formData.guest_name}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, guest_name: nextValue });
                        setBlacklistWarning(computeBlacklistMatch(nextValue, formData.guest_email, formData.guest_phone));
                      }}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, guest_email: nextValue });
                        setBlacklistWarning(computeBlacklistMatch(formData.guest_name, nextValue, formData.guest_phone));
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, guest_phone: nextValue });
                        setBlacklistWarning(computeBlacklistMatch(formData.guest_name, formData.guest_email, nextValue));
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de voyageurs</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.number_of_guests}
                      onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) || 1 })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                    />
                  </div>
                </div>
                {blacklistWarning ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {blacklistWarning}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code de serrure connectée</label>
                  <input
                    type="text"
                    value={formData.smart_lock_code}
                    onChange={(e) => setFormData({ ...formData, smart_lock_code: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                    placeholder="Ex : 1234#"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ce code sera affiché automatiquement à votre invité après sa vérification d'identité réussie.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de vérification</label>
                  <select
                    value={formData.verification_type}
                    onChange={(e) => {
                      const nextMode = e.target.value as 'simple' | 'complete';
                      setFormData({
                        ...formData,
                        verification_type: nextMode,
                        verification_mode: nextMode,
                      });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                  >
                    <option value="simple">Simple</option>
                    <option value="complete">Complète</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Plus size={16} />
                  {loading ? 'Création...' : 'Créer la réservation'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
