import { useState } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';
import { fr } from '../../lib/i18n/fr';
import { ctaTokens } from '../../lib/design-tokens';
import {
  interpolateMessageTemplate,
  messageTemplateLocales,
  messageTemplates,
  MessageLocale,
} from '../../lib/checkin-message-templates';

interface ShareLinkModalProps {
  link: string;
  guestName: string;
  propertyName: string;
  onClose: () => void;
}

type Template = 'standard' | 'security' | 'custom';

export function ShareLinkModal({ link, guestName, propertyName, onClose }: ShareLinkModalProps) {
  const [language, setLanguage] = useState<MessageLocale>('fr');
  const [template, setTemplate] = useState<Template>('standard');
  const [customMessage, setCustomMessage] = useState(`Bonjour,\n\nVeuillez compléter votre vérification :\n[LIEN]\n\nMerci.`);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  const message = template === 'custom'
    ? customMessage.replace('[LIEN]', link)
    : interpolateMessageTemplate(messageTemplates[language][template], {
      link,
      guestName,
      propertyName,
      lockCode: 'non communiqué',
    });

  const isRtl = language === 'ar';

  const handleCopy = (text: string, type: 'link' | 'message') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{fr.shareLink.title}</h2>
          <button
            onClick={onClose}
            aria-label={fr.common.close}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{fr.shareLink.linkLabel}</label>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <input type="text" value={link} readOnly className="flex-1 bg-transparent text-sm text-gray-700 outline-none min-w-0" />
              <button
                onClick={() => handleCopy(link, 'link')}
                className="shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
                aria-label={`${fr.common.copy} le lien`}
              >
                {copied === 'link' ? <Check size={16} className="text-emerald-700" /> : <Copy size={16} className="text-gray-500" />}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${fr.common.details} du lien`}
                className="shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
              >
                <ExternalLink size={16} className="text-gray-500" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{fr.shareLink.languageLabel}</label>
            <div className="flex gap-2">
              {messageTemplateLocales.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLanguage(l.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    language === l.key ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{fr.shareLink.templateLabel}</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'standard', label: fr.shareLink.templates.standard },
                { key: 'security', label: fr.shareLink.templates.security },
                { key: 'custom', label: fr.shareLink.templates.custom },
              ] as Array<{ key: Template; label: string }>).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    template === t.key ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {template === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{fr.shareLink.customLabel}</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                placeholder={fr.shareLink.customHelp}
                dir={isRtl ? 'rtl' : 'ltr'}
              />
              <p className="text-xs text-gray-500 mt-1">{fr.shareLink.customHelp}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{fr.shareLink.previewLabel}</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre
                className={`text-sm text-gray-700 whitespace-pre-wrap font-sans ${isRtl ? 'text-right' : ''}`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {message}
              </pre>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleCopy(message, 'message')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${ctaTokens.primary}`}
            >
              {copied === 'message' ? <Check size={16} /> : <Copy size={16} />}
              {copied === 'message' ? fr.common.copied : fr.shareLink.copyMessage}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${ctaTokens.success}`}
            >
              {fr.shareLink.share}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
