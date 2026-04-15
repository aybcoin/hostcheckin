import { useState, useEffect } from 'react';
import {
  Calendar, Copy, Check, Clock, Plus, ChevronDown, ChevronUp, Trash2,
  Link2, Star, ClipboardList, FileSearch, Share2, Eye, Lock, Users, Shield
} from 'lucide-react';
import { Reservation, Property } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { ReservationDocuments } from './ReservationDocuments';
import { ReservationFilters, FilterValues, EMPTY_FILTERS } from './reservations/ReservationFilters';
import { ShareLinkModal } from './reservations/ShareLinkModal';
import { RatingModal } from './reservations/RatingModal';
import { CreateReservationModal } from './reservations/CreateReservationModal';

interface GuestInfo {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

interface VerificationInfo {
  id: string;
  status: string;
  id_type: string;
  id_document_url: string;
  id_back_url?: string;
  selfie_url?: string;
  document_confidence?: number;
  detected_document_type?: string;
  rejection_reason?: string;
}

interface ContractInfo {
  id: string;
  signed_by_guest: boolean;
  guest_signature_url?: string;
  contract_content?: string;
  pdf_storage_path?: string;
}

interface ReservationsPageProps {
  reservations: Reservation[];
  properties: Property[];
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<any>;
  onAdd: (reservation: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  checked_in: { label: 'Verifiee', color: 'bg-green-100 text-green-800', icon: Check },
  completed: { label: 'Terminee', color: 'bg-gray-100 text-gray-700', icon: ClipboardList },
  cancelled: { label: 'Annulee', color: 'bg-red-100 text-red-700', icon: Trash2 },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ReservationsPage({ reservations, properties, onUpdate, onAdd, onDelete }: ReservationsPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingDocuments, setViewingDocuments] = useState<{ id: string; ref: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ link: string; guestName: string; propertyName: string } | null>(null);
  const [ratingModal, setRatingModal] = useState<{ id: string; ref: string; rating?: number } | null>(null);
  const [guests, setGuests] = useState<Record<string, GuestInfo>>({});
  const [verifications, setVerifications] = useState<Record<string, VerificationInfo>>({});
  const [contracts, setContracts] = useState<Record<string, ContractInfo>>({});

  useEffect(() => {
    if (reservations.length > 0) {
      fetchGuestsAndVerifications();
    }
  }, [reservations]);

  const fetchGuestsAndVerifications = async () => {
    const guestIds = [...new Set(reservations.map((r) => r.guest_id))];
    const resIds = reservations.map((r) => r.id);

    try {
      const [guestRes, verRes, contractRes] = await Promise.all([
        supabase.from('guests').select('id, full_name, email, phone').in('id', guestIds),
        supabase.from('identity_verification').select('id, reservation_id, status, id_type, id_document_url, id_back_url, selfie_url, document_confidence, detected_document_type, rejection_reason').in('reservation_id', resIds),
        supabase.from('contracts').select('id, reservation_id, signed_by_guest, guest_signature_url, contract_content, pdf_storage_path').in('reservation_id', resIds),
      ]);

      if (guestRes.error) console.error('Failed to fetch guests:', guestRes.error);
      if (verRes.error) console.error('Failed to fetch verifications:', verRes.error);
      if (contractRes.error) console.error('Failed to fetch contracts:', contractRes.error);

      if (guestRes.data) {
        const map: Record<string, GuestInfo> = {};
        guestRes.data.forEach((g: GuestInfo) => { map[g.id] = g; });
        setGuests(map);
      }
      if (verRes.data) {
        const map: Record<string, VerificationInfo> = {};
        verRes.data.forEach((v: any) => { map[v.reservation_id] = v; });
        setVerifications(map);
      }
      if (contractRes.data) {
        const map: Record<string, ContractInfo> = {};
        contractRes.data.forEach((c: any) => { map[c.reservation_id] = c; });
        setContracts(map);
      }
    } catch (err) {
      console.error('Failed to load reservation details:', err);
    }
  };

  const getPropertyName = (propertyId: string) => properties.find((p) => p.id === propertyId)?.name || 'Inconnu';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette reservation ?')) return;
    await onDelete(id);
  };

  const handleRate = async (rating: number) => {
    if (!ratingModal) return;
    await onUpdate(ratingModal.id, { guest_rating: rating });
    setRatingModal(null);
  };

  const filtered = reservations.filter((r) => {
    if (filters.checkInDate && r.check_in_date < filters.checkInDate) return false;
    if (filters.checkOutDate && r.check_out_date > filters.checkOutDate) return false;
    if (filters.propertyId && r.property_id !== filters.propertyId) return false;
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.verification !== 'all') {
      const v = verifications[r.id];
      if (filters.verification === 'checked_in' && v?.status !== 'approved') return false;
      if (filters.verification === 'pending' && v?.status !== 'pending') return false;
      if (filters.verification === 'not_started' && v) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-600 mt-1">{reservations.length} reservation(s)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Eye size={16} />
            Filtres
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nouvelle reservation
          </button>
        </div>
      </div>

      {showFilters && (
        <ReservationFilters
          properties={properties}
          filters={filters}
          onApply={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune reservation trouvee</p>
          </div>
        ) : (
          filtered.map((reservation) => {
            const isExpanded = expandedId === reservation.id;
            const status = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
            const StatusIcon = status.icon;
            const guest = guests[reservation.guest_id];
            const verification = verifications[reservation.id];
            const contract = contracts[reservation.id];
            const checkinLink = `${window.location.origin}/checkin/${reservation.unique_link}`;

            return (
              <div key={reservation.id} className="bg-white rounded-xl shadow-sm border overflow-hidden transition-shadow hover:shadow-md">
                <div
                  className="p-4 sm:p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : reservation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                        <span className="font-bold text-gray-900 text-sm sm:text-base">{reservation.booking_reference}</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {reservation.verification_type === 'complete' ? 'Complete' : 'Simple'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
                      <span className="text-sm text-gray-600 hidden sm:block">{getPropertyName(reservation.property_id)}</span>
                      {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRatingModal({ id: reservation.id, ref: reservation.booking_reference, rating: reservation.guest_rating }); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
                    >
                      <Star size={12} />
                      {reservation.guest_rating ? `${reservation.guest_rating}/5` : 'Noter'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareModal({ link: checkinLink, guestName: guest?.full_name || 'Invite', propertyName: getPropertyName(reservation.property_id) });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <Share2 size={12} />
                      Lien de verification
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewingDocuments({ id: reservation.id, ref: reservation.booking_reference }); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <FileSearch size={12} />
                      Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : reservation.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <ClipboardList size={12} />
                      Resume
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(reservation.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-5 space-y-5 animate-[fadeIn_0.2s_ease-out]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Date d'arrivee</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(reservation.check_in_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Date de depart</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(reservation.check_out_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Voyageurs</p>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          <Users size={14} />
                          {reservation.number_of_guests}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Verification</p>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          <Shield size={14} />
                          {reservation.verification_type === 'complete' ? 'Complete' : 'Simple'}
                        </p>
                      </div>
                    </div>

                    {reservation.smart_lock_code && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <Lock size={16} className="text-amber-600" />
                        <span className="text-sm text-amber-800">Code smart lock : <strong>{reservation.smart_lock_code}</strong></span>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Lien de check-in unique</p>
                      <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-gray-200">
                        <Link2 size={14} className="text-gray-400 shrink-0" />
                        <input type="text" value={checkinLink} readOnly className="flex-1 bg-transparent text-sm text-gray-600 outline-none min-w-0" />
                        <button
                          onClick={() => copyToClipboard(checkinLink, reservation.id)}
                          className="shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors"
                        >
                          {copiedId === reservation.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    {contract && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Contrat signe par l'invite</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${contract.signed_by_guest ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {contract.signed_by_guest ? 'Signe' : 'Non signe'}
                          </span>
                          <button
                            onClick={() => setViewingDocuments({ id: reservation.id, ref: reservation.booking_reference })}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Previsualiser
                          </button>
                          {contract.pdf_storage_path && (
                            <span className="text-xs text-green-600 font-medium">PDF disponible</span>
                          )}
                        </div>
                      </div>
                    )}

                    {guest && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Informations de l'invite</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Nom :</span>{' '}
                            <span className="font-medium text-gray-900">{guest.full_name}</span>
                          </div>
                          {verification && (
                            <div>
                              <span className="text-gray-500">Document :</span>{' '}
                              <span className="font-medium text-gray-900">
                                {verification.id_type === 'passport' ? 'Passeport' : verification.id_type === 'cin' ? 'CIN' : verification.id_type}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Verification :</span>{' '}
                            <span className={`font-medium ${verification?.status === 'approved' ? 'text-green-700' : verification?.status === 'rejected' ? 'text-red-600' : verification?.status === 'pending' ? 'text-amber-700' : 'text-gray-500'}`}>
                              {verification?.status === 'approved' ? 'Approuvee' : verification?.status === 'rejected' ? 'Rejetee' : verification?.status === 'pending' ? 'En attente' : 'Non commencee'}
                            </span>
                            {verification?.document_confidence != null && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({Math.round(verification.document_confidence * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {verification && (verification.id_document_url?.startsWith('http') || verification.selfie_url?.startsWith('http')) && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Identite</p>
                        <div className="flex gap-3 flex-wrap">
                          {verification.id_document_url?.startsWith('http') && (
                            <div className="relative group">
                              <img
                                src={verification.id_document_url}
                                alt="ID recto"
                                className="w-28 h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-gray-400 font-bold rotate-[-30deg] opacity-50 select-none">CONFIDENTIEL</span>
                              </div>
                            </div>
                          )}
                          {verification.id_back_url?.startsWith('http') && (
                            <div className="relative group">
                              <img
                                src={verification.id_back_url}
                                alt="ID verso"
                                className="w-28 h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-gray-400 font-bold rotate-[-30deg] opacity-50 select-none">CONFIDENTIEL</span>
                              </div>
                            </div>
                          )}
                          {verification.selfie_url?.startsWith('http') && (
                            <div className="relative group">
                              <img
                                src={verification.selfie_url}
                                alt="Selfie"
                                className="w-28 h-20 object-cover rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {reservation.status === 'pending' && (
                        <button
                          onClick={() => onUpdate(reservation.id, { status: 'checked_in' })}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Valider le check-in
                        </button>
                      )}
                      {reservation.status === 'checked_in' && (
                        <button
                          onClick={() => onUpdate(reservation.id, { status: 'completed' })}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Marquer comme termine
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCreateModal && (
        <CreateReservationModal
          properties={properties}
          onAdd={onAdd}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {viewingDocuments && (
        <ReservationDocuments
          reservationId={viewingDocuments.id}
          bookingReference={viewingDocuments.ref}
          onClose={() => setViewingDocuments(null)}
        />
      )}

      {shareModal && (
        <ShareLinkModal
          link={shareModal.link}
          guestName={shareModal.guestName}
          propertyName={shareModal.propertyName}
          onClose={() => setShareModal(null)}
        />
      )}

      {ratingModal && (
        <RatingModal
          bookingReference={ratingModal.ref}
          currentRating={ratingModal.rating}
          onSave={handleRate}
          onClose={() => setRatingModal(null)}
        />
      )}
    </div>
  );
}
