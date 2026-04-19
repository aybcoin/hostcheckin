import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';
import { fr } from '../../lib/i18n/fr';
import { ctaTokens, iconButtonToken, inputTokens, modalTokens } from '../../lib/design-tokens';
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
  const modalTitleId = 'share-link-modal-title';

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

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
    void navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={modalTokens.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className={`${modalTokens.panel} max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 id={modalTitleId} className="text-lg font-bold text-slate-900">{fr.shareLink.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={fr.common.close}
            className={iconButtonToken}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="share-link-value" className="mb-1.5 block text-sm font-medium text-slate-700">{fr.shareLink.linkLabel}</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <input id="share-link-value" type="text" value={link} readOnly className={`${inputTokens.readOnly} min-w-0 flex-1 border-none bg-transparent px-0 py-0`} />
              <button
                type="button"
                onClick={() => handleCopy(link, 'link')}
                className={iconButtonToken}
                aria-label={`${fr.common.copy} le lien`}
              >
                {copied === 'link' ? <Check size={16} className="text-slate-700" /> : <Copy size={16} className="text-slate-500" />}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${fr.common.details} du lien`}
                className={iconButtonToken}
              >
                <ExternalLink size={16} className="text-slate-500" />
              </a>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{fr.shareLink.languageLabel}</label>
            <div className="flex gap-2">
              {messageTemplateLocales.map((l) => (
                <button
                  type="button"
                  key={l.key}
                  onClick={() => setLanguage(l.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    language === l.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{fr.shareLink.templateLabel}</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'standard', label: fr.shareLink.templates.standard },
                { key: 'security', label: fr.shareLink.templates.security },
                { key: 'custom', label: fr.shareLink.templates.custom },
              ] as Array<{ key: Template; label: string }>).map((t) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    template === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {template === 'custom' && (
            <div>
              <label htmlFor="share-custom-message" className="mb-1.5 block text-sm font-medium text-slate-700">{fr.shareLink.customLabel}</label>
              <textarea
                id="share-custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                className={`${inputTokens.base} min-h-[120px]`}
                placeholder={fr.shareLink.customHelp}
                dir={isRtl ? 'rtl' : 'ltr'}
              />
              <p className="mt-1 text-xs text-slate-500">{fr.shareLink.customHelp}</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{fr.shareLink.previewLabel}</label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
              <pre
                className={`whitespace-pre-wrap font-sans text-sm text-slate-700 ${isRtl ? 'text-right' : ''}`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {message}
              </pre>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
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
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${ctaTokens.secondary}`}
            >
              {fr.shareLink.share}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
