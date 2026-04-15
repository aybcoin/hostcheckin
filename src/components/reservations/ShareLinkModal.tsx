import { useState } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';

interface ShareLinkModalProps {
  link: string;
  guestName: string;
  propertyName: string;
  onClose: () => void;
}

type Language = 'fr' | 'en' | 'ar' | 'es';
type Template = 'standard' | 'security' | 'custom';

const LANGUAGES: { key: Language; label: string }[] = [
  { key: 'fr', label: 'Francais' },
  { key: 'en', label: 'English' },
  { key: 'ar', label: 'العربية' },
  { key: 'es', label: 'Espanol' },
];

const TEMPLATES: { key: Template; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'security', label: 'Securite & Code' },
  { key: 'custom', label: 'Personnalise' },
];

function getMessage(lang: Language, template: Template, guestName: string, propertyName: string, link: string, custom: string): string {
  const messages: Record<Language, Record<Exclude<Template, 'custom'>, string>> = {
    fr: {
      standard: `Bonjour ${guestName},\n\nVotre hebergement "${propertyName}" vous attend ! Pour finaliser votre reservation, veuillez completer votre verification en ligne :\n\n[LIEN]\n\nMerci et a bientot !`,
      security: `Bonjour ${guestName},\n\nPour des raisons de securite, nous vous demandons de verifier votre identite avant votre arrivee a "${propertyName}".\n\nCliquez ici pour completer la verification :\n[LIEN]\n\nVotre code d'acces vous sera communique apres verification.\n\nCordialement.`,
    },
    en: {
      standard: `Hello ${guestName},\n\nYour accommodation "${propertyName}" is ready! Please complete your online verification:\n\n[LIEN]\n\nThank you and see you soon!`,
      security: `Hello ${guestName},\n\nFor security purposes, please verify your identity before arriving at "${propertyName}".\n\nClick here to complete the verification:\n[LIEN]\n\nYour access code will be shared after verification.\n\nBest regards.`,
    },
    ar: {
      standard: `مرحبا ${guestName}،\n\nإقامتك "${propertyName}" بانتظارك! يرجى إكمال التحقق عبر الإنترنت:\n\n[LIEN]\n\nشكرا لك!`,
      security: `مرحبا ${guestName}،\n\nلأسباب أمنية، يرجى التحقق من هويتك قبل وصولك إلى "${propertyName}".\n\nانقر هنا لإكمال التحقق:\n[LIEN]\n\nسيتم مشاركة رمز الدخول بعد التحقق.\n\nتحياتنا.`,
    },
    es: {
      standard: `Hola ${guestName},\n\nSu alojamiento "${propertyName}" le espera! Complete la verificacion en linea:\n\n[LIEN]\n\nGracias y hasta pronto!`,
      security: `Hola ${guestName},\n\nPor razones de seguridad, verifique su identidad antes de llegar a "${propertyName}".\n\nHaga clic aqui para completar la verificacion:\n[LIEN]\n\nSu codigo de acceso se compartira despues de la verificacion.\n\nSaludos.`,
    },
  };

  if (template === 'custom') {
    return custom.replace('[LIEN]', link);
  }
  return messages[lang][template].replace('[LIEN]', link);
}

export function ShareLinkModal({ link, guestName, propertyName, onClose }: ShareLinkModalProps) {
  const [language, setLanguage] = useState<Language>('fr');
  const [template, setTemplate] = useState<Template>('standard');
  const [customMessage, setCustomMessage] = useState(`Bonjour,\n\nVeuillez completer votre verification :\n[LIEN]\n\nMerci !`);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  const message = getMessage(language, template, guestName, propertyName, link, customMessage);

  const handleCopy = (text: string, type: 'link' | 'message') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Partager le lien de verification</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lien de verification</label>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <input type="text" value={link} readOnly className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0" />
              <button
                onClick={() => handleCopy(link, 'link')}
                className="shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
              >
                {copied === 'link' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
              </button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 hover:bg-gray-200 rounded transition-colors">
                <ExternalLink size={16} className="text-gray-500" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Langue du message</label>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLanguage(l.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    language === l.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Modele de message</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    template === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {template === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message personnalise</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Utilisez [LIEN] pour inserer le lien..."
              />
              <p className="text-xs text-gray-500 mt-1">Utilisez [LIEN] pour inserer automatiquement le lien de verification.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Apercu du message</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{message}</pre>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleCopy(message, 'message')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {copied === 'message' ? <Check size={16} /> : <Copy size={16} />}
              {copied === 'message' ? 'Copie !' : 'Copier le message'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Partager
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
