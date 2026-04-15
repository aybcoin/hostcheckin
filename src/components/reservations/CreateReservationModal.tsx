import { useState } from 'react';
import { X, Plus, QrCode, PenLine } from 'lucide-react';
import { Property } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

interface CreateReservationModalProps {
  properties: Property[];
  onAdd: (reservation: any) => Promise<any>;
  onClose: () => void;
}

export function CreateReservationModal({ properties, onAdd, onClose }: CreateReservationModalProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
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
    notes: '',
  });

  const generateBookingRef = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = '';
    for (let i = 0; i < 4; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
    return ref + '#' + Math.floor(Math.random() * 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .upsert({ email: formData.guest_email, full_name: formData.guest_name, phone: formData.guest_phone }, { onConflict: 'email' })
        .select()
        .single();
      if (guestError) throw guestError;

      await onAdd({
        property_id: formData.property_id,
        guest_id: guestData.id,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        number_of_guests: formData.number_of_guests,
        booking_reference: generateBookingRef(),
        status: 'pending',
        verification_type: formData.verification_type,
        smart_lock_code: formData.smart_lock_code || null,
        notes: formData.notes,
      });
      onClose();
    } catch {
      alert('Erreur lors de la creation de la reservation');
    } finally {
      setLoading(false);
    }
  };

  const selectedProp = properties.find((p) => p.id === formData.property_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nouvelle reservation</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('auto')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <QrCode size={16} />
              Reservations automatiques
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PenLine size={16} />
              Reservation manuelle
            </button>
          </div>

          {mode === 'auto' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                  Les reservations automatiques generent un lien reutilisable par propriete avec un QR code. Partagez ce lien avec vos invites pour qu'ils completent automatiquement leur check-in.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriete</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selectionner une propriete</option>
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
                    <span className="text-xs text-gray-500 truncate flex-1">{window.location.origin}/auto/{selectedProp.id}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/auto/${selectedProp.id}`)}
                      className="shrink-0 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Propriete</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selectionner une propriete</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'arrivee</label>
                  <input
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de depart</label>
                  <input
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Informations de l'invite</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={formData.guest_name}
                      onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code serrure connectee</label>
                  <input
                    type="text"
                    value={formData.smart_lock_code}
                    onChange={(e) => setFormData({ ...formData, smart_lock_code: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de verification</label>
                  <select
                    value={formData.verification_type}
                    onChange={(e) => setFormData({ ...formData, verification_type: e.target.value as 'simple' | 'complete' })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="simple">Simple</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Plus size={16} />
                  {loading ? 'Creation...' : 'Creer la reservation'}
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
