import { useEffect, useState, type FormEvent } from 'react';
import { X, Plus, QrCode, PenLine } from 'lucide-react';
import { Property, APP_BASE_URL, Reservation, ReservationCreateInput } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { fr } from '../../lib/i18n/fr';
import { ctaTokens, iconButtonToken, inputTokens, modalTokens, statusTokens } from '../../lib/design-tokens';

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
  const modalTitleId = 'create-reservation-title';
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
      alert(fr.reservationCreate.blacklistBlockedAlert);
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
          `${fr.reservationCreate.guestCreateErrorPrefix} :\n` +
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
          `${fr.reservationCreate.reservationCreateErrorPrefix} :\n` +
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
        `${fr.reservationCreate.reservationCreateErrorPrefix} :\n${supaMsg}` +
        (errorLike.details ? `\nDétails : ${errorLike.details}` : '') +
        (errorLike.hint ? `\nIndice : ${errorLike.hint}` : '') +
        (errorLike.code ? `\nCode: ${errorLike.code}` : '')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${modalTokens.overlay} transition-opacity duration-200`} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className={`${modalTokens.panel} max-w-2xl transition-transform duration-200 animate-[fadeIn_0.2s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 id={modalTitleId} className="text-xl font-bold text-slate-900">{fr.reservationCreate.title}</h2>
          <button type="button" onClick={onClose} aria-label={fr.reservationCreate.closeAria} className={iconButtonToken}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'auto' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <QrCode size={16} />
              {fr.reservationCreate.autoModeLabel}
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'manual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <PenLine size={16} />
              {fr.reservationCreate.manualModeLabel}
            </button>
          </div>

          {mode === 'auto' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border-l-4 border-slate-900 p-4 rounded">
                <p className="text-sm text-slate-700">
                  {fr.reservationCreate.autoHelp}
                </p>
              </div>
              <div>
                <label htmlFor="auto-property-id" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.propertyLabel}</label>
                <select
                  id="auto-property-id"
                  value={formData.property_id}
                  onChange={(e) => {
                    syncVerificationMode(e.target.value);
                    void loadBlacklistForProperty(e.target.value);
                  }}
                  className={inputTokens.base}
                >
                  <option value="">{fr.reservationCreate.selectProperty}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {selectedProp && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                  <div className="w-40 h-40 mx-auto bg-white border-2 border-slate-300 rounded-lg flex items-center justify-center mb-3">
                    <QrCode size={80} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{fr.reservationCreate.qrForProperty(selectedProp.name)}</p>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 max-w-md mx-auto">
                    <span className="text-xs text-slate-500 truncate flex-1">{APP_BASE_URL}/auto/{selectedProp.id}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(`${APP_BASE_URL}/auto/${selectedProp.id}`)}
                      className={`shrink-0 rounded px-2 py-1 text-xs ${ctaTokens.primary}`}
                    >
                      {fr.reservationCreate.copyLink}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reservation-property-id" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.propertyLabel}</label>
                <select
                  id="reservation-property-id"
                  value={formData.property_id}
                  onChange={(e) => {
                    syncVerificationMode(e.target.value);
                    void loadBlacklistForProperty(e.target.value);
                  }}
                  required
                  className={inputTokens.base}
                >
                  <option value="">{fr.reservationCreate.selectProperty}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reservation-checkin" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.checkInDateLabel}</label>
                  <input
                    id="reservation-checkin"
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    required
                    className={inputTokens.base}
                  />
                </div>
                <div>
                  <label htmlFor="reservation-checkout" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.checkOutDateLabel}</label>
                  <input
                    id="reservation-checkout"
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    required
                    className={inputTokens.base}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{fr.reservationCreate.guestInfoSection}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="guest-name" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.fullNameLabel}</label>
                    <input
                      id="guest-name"
                      type="text"
                      value={formData.guest_name}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, guest_name: nextValue });
                        setBlacklistWarning(computeBlacklistMatch(nextValue, formData.guest_email, formData.guest_phone));
                      }}
                      required
                      className={inputTokens.base}
                      placeholder={fr.reservationCreate.fullNamePlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-email" className="block text-sm font-medium text-slate-700 mb-1">
                      {fr.reservationCreate.emailLabel} <span className="font-normal text-slate-400">{fr.reservationCreate.optionalLabel}</span>
                    </label>
                    <input
                      id="guest-email"
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, guest_email: nextValue });
                        setBlacklistWarning(computeBlacklistMatch(formData.guest_name, nextValue, formData.guest_phone));
                      }}
                      className={inputTokens.base}
                      placeholder={fr.reservationCreate.emailPlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-phone" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.phoneLabel}</label>
                    <input
                      id="guest-phone"
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setFormData({ ...formData, guest_phone: nextValue });
                        setBlacklistWarning(computeBlacklistMatch(formData.guest_name, formData.guest_email, nextValue));
                      }}
                      className={inputTokens.base}
                      placeholder={fr.profile.phonePlaceholder}
                    />
                  </div>
                  <div>
                    <label htmlFor="guests-count" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.guestsCountLabel}</label>
                    <input
                      id="guests-count"
                      type="number"
                      min="1"
                      value={formData.number_of_guests}
                      onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) || 1 })}
                      required
                      className={inputTokens.base}
                    />
                  </div>
                </div>
                {blacklistWarning ? (
                  <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${statusTokens.danger}`}>
                    {blacklistWarning}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label htmlFor="smart-lock-code" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.lockCodeLabel}</label>
                  <input
                    id="smart-lock-code"
                    type="text"
                    value={formData.smart_lock_code}
                    onChange={(e) => setFormData({ ...formData, smart_lock_code: e.target.value })}
                    className={inputTokens.base}
                    placeholder={fr.reservationCreate.lockCodePlaceholder}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {fr.reservationCreate.lockCodeHelp}
                  </p>
                </div>
                <div>
                  <label htmlFor="verification-mode" className="block text-sm font-medium text-slate-700 mb-1">{fr.reservationCreate.verificationModeLabel}</label>
                  <select
                    id="verification-mode"
                    value={formData.verification_type}
                    onChange={(e) => {
                      const nextMode = e.target.value as 'simple' | 'complete';
                      setFormData({
                        ...formData,
                        verification_type: nextMode,
                        verification_mode: nextMode,
                      });
                    }}
                    className={inputTokens.base}
                  >
                    <option value="simple">{fr.reservationCreate.verificationSimple}</option>
                    <option value="complete">{fr.reservationCreate.verificationComplete}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50 ${ctaTokens.primary}`}
                >
                  <Plus size={16} />
                  {loading ? fr.reservationCreate.submitLoading : fr.reservationCreate.submitLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 rounded-lg py-3 text-sm font-medium transition-colors ${ctaTokens.subtle}`}
                >
                  {fr.reservationCreate.cancelLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
