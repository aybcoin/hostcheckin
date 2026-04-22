import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, Check } from 'lucide-react';
import { fr } from '../../lib/i18n/fr';
import { iconButtonToken, inputTokens, modalTokens } from '../../lib/design-tokens';
import {
  interpolateMessageTemplate,
  messageTemplateLocales,
  messageTemplates,
  MessageLocale,
} from '../../lib/checkin-message-templates';
import { Button } from '../ui/Button';

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
  const [customMessage, setCustomMessage] = useState(`Bonjour,\n\nComplétez votre vérification :\n[LIEN]\n\nMerci.`);
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
                <Button
                  key={l.key}
                  onClick={() => setLanguage(l.key)}
                  variant={language === l.key ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {l.label}
                </Button>
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
                <Button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  variant={template === t.key ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {t.label}
                </Button>
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
            <Button
              onClick={() => handleCopy(message, 'message')}
              variant="primary"
              className="flex-1"
            >
              {copied === 'message' ? <Check size={16} /> : <Copy size={16} />}
              {copied === 'message' ? fr.common.copied : fr.shareLink.copyMessage}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              {fr.shareLink.share}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
