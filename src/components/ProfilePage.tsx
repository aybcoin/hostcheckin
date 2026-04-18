import { useState } from 'react';
import { User, Mail, Phone, Building2, Save } from 'lucide-react';
import { Host, Property, Reservation } from '../lib/supabase';
import { OnboardingChecklist } from './OnboardingChecklist';
import { AppPage } from '../lib/navigation';

interface ProfilePageProps {
  host: Host | null;
  onUpdate: (updates: Partial<Host>) => Promise<void>;
  properties: Property[];
  reservations: Reservation[];
  userEmailVerified: boolean;
  onNavigate: (page: AppPage) => void;
}

export function ProfilePage({
  host,
  onUpdate,
  properties,
  reservations,
  userEmailVerified,
  onNavigate,
}: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: host?.full_name || '',
    email: host?.email || '',
    phone: host?.phone || '',
    company_name: host?.company_name || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profil</h1>
        <p className="text-gray-600 mt-1 sm:mt-2">Gérez vos informations personnelles</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-8">
        <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-teal-500 rounded-full flex items-center justify-center shrink-0">
            <User className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{host?.full_name}</h2>
            <p className="text-gray-600 text-sm sm:text-base truncate">{host?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span>Nom complet</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>Email</span>
                </div>
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 outline-none text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>Téléphone</span>
                </div>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 size={16} />
                  <span>Nom de l'entreprise</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none text-base"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <User size={18} />
                <span>Éditer le profil</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Save size={18} />
                  <span>{loading ? 'Sauvegarde...' : 'Enregistrer'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      full_name: host?.full_name || '',
                      email: host?.email || '',
                      phone: host?.phone || '',
                      company_name: host?.company_name || '',
                    });
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <OnboardingChecklist
        host={host}
        properties={properties}
        reservations={reservations}
        userEmailVerified={userEmailVerified}
        onNavigate={onNavigate}
      />
    </div>
  );
}
