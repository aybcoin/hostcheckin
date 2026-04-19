import { useState } from 'react';
import { User, Mail, Phone, Building2, Save } from 'lucide-react';
import { Host, Property } from '../lib/supabase';
import { OnboardingChecklist } from './OnboardingChecklist';
import { AppPage } from '../lib/navigation';
import { fr } from '../lib/i18n/fr';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ProfilePageProps {
  host: Host | null;
  onUpdate: (updates: Partial<Host>) => Promise<void>;
  properties: Property[];
  onNavigate: (page: AppPage) => void;
}

type AccountSection = 'details' | 'checkin' | 'legal' | 'contracts' | 'billing';

interface AccountSectionConfig {
  id: AccountSection;
  label: string;
}

export function ProfilePage({
  host,
  onUpdate,
  properties,
  onNavigate,
}: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<AccountSection>('details');
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

  const accountSections: AccountSectionConfig[] = [
    { id: 'details', label: fr.profile.sections.details },
    { id: 'checkin', label: fr.profile.sections.checkin },
    { id: 'legal', label: fr.profile.sections.legal },
    { id: 'contracts', label: fr.profile.sections.contracts },
    { id: 'billing', label: fr.profile.sections.billing },
  ];

  const renderDetailsSection = () => (
    <div className="space-y-6">
      <Card variant="default" padding="lg" className="p-4 sm:p-8">
        <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-slate-900 rounded-full flex items-center justify-center shrink-0">
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
                  <span>{fr.profile.fullName}</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-slate-300 outline-none text-base"
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
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-slate-300 outline-none text-base"
                placeholder={fr.profile.phonePlaceholder}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 size={16} />
                  <span>{fr.profile.companyName}</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(event) => setFormData({ ...formData, company_name: event.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-600 focus:ring-2 focus:ring-slate-300 outline-none text-base"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {!isEditing ? (
              <Button
                variant="primary"
                fullWidth
                onClick={() => setIsEditing(true)}
              >
                <User size={18} />
                <span>{fr.profile.edit}</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSave}
                  disabled={loading}
                >
                  <Save size={18} />
                  <span>{loading ? fr.profile.saving : fr.common.save}</span>
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      full_name: host?.full_name || '',
                      email: host?.email || '',
                      phone: host?.phone || '',
                      company_name: host?.company_name || '',
                    });
                  }}
                >
                  {fr.common.cancel}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <OnboardingChecklist
        hostId={host?.id || null}
        properties={properties}
        onNavigate={onNavigate}
      />
    </div>
  );

  const renderSimpleSection = (
    description: string,
    buttonLabel: string,
    targetPage: AppPage,
  ) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
      <p className="text-sm sm:text-base text-slate-700">{description}</p>
      <Button
        variant="primary"
        onClick={() => onNavigate(targetPage)}
        className="mt-5"
      >
        {buttonLabel}
      </Button>
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === 'details') return renderDetailsSection();
    if (activeSection === 'checkin') return renderSimpleSection(fr.profile.sectionDescriptions.checkin, fr.profile.openCheckin, 'checkins');
    if (activeSection === 'legal') return renderSimpleSection(fr.profile.sectionDescriptions.legal, fr.profile.openLegal, 'help');
    if (activeSection === 'contracts') return renderSimpleSection(fr.profile.sectionDescriptions.contracts, fr.profile.openContracts, 'contracts');
    return renderSimpleSection(fr.profile.sectionDescriptions.billing, fr.profile.openBilling, 'pricing');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{fr.profile.title}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2">{fr.profile.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card as="aside" variant="default" padding="sm" className="h-fit">
          <nav aria-label={fr.profile.accountNavigationLabel} className="space-y-1">
            {accountSections.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                    isActive
                      ? 'text-slate-900 underline decoration-2 underline-offset-4'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <section>
          {renderActiveSection()}
        </section>
      </div>
    </div>
  );
}
