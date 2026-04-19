import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Languages, PencilLine } from "lucide-react";
import { fr } from "../lib/i18n/fr";
import {
  interpolateMessageTemplate,
  messageTemplateLocales,
  messageTemplates,
  MessageLocale,
} from "../lib/checkin-message-templates";

type TemplateId = "standard" | "reminder24h" | "withLockCode";

interface CheckinMessageTemplatesProps {
  checkinLink: string;
  guestName?: string;
  propertyName?: string;
  smartLockCode?: string | null;
}

const templateIds: TemplateId[] = ["standard", "reminder24h", "withLockCode"];

export function CheckinMessageTemplates({
  checkinLink,
  guestName,
  propertyName,
  smartLockCode,
}: CheckinMessageTemplatesProps) {
  const [locale, setLocale] = useState<MessageLocale>("fr");
  const [templateId, setTemplateId] = useState<TemplateId>("standard");
  const [isEditing, setIsEditing] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const message = useMemo(() => {
    const values = {
      link: checkinLink,
      guestName: guestName || "Client",
      propertyName: propertyName || "votre hébergement",
      lockCode: smartLockCode || "non communiqué",
    };
    return interpolateMessageTemplate(messageTemplates[locale][templateId], values);
  }, [checkinLink, guestName, locale, propertyName, smartLockCode, templateId]);

  useEffect(() => {
    if (!isEditing) {
      setEditorValue(message);
    }
  }, [isEditing, message]);

  const handleCopy = async () => {
    if (!checkinLink) {
      setCopyError("Lien indisponible");
      return;
    }
    try {
      await navigator.clipboard.writeText(editorValue);
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("Copie impossible");
    }
  };

  if (!checkinLink) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Lien de check-in indisponible.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {fr.checkins.templatesTitle}
          </h3>
          <p className="text-xs text-slate-600">{fr.checkins.templatesSubtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Languages size={14} className="text-slate-600" aria-hidden="true" />
          <label className="text-xs text-slate-600" htmlFor="template-locale">
            {fr.checkins.localeLabel}
          </label>
          <select
            id="template-locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value as MessageLocale)}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none"
          >
            {messageTemplateLocales.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {templateIds.map((id) => {
          const label =
            id === "standard"
              ? fr.checkins.templateStandard
              : id === "reminder24h"
                ? fr.checkins.templateReminder
                : fr.checkins.templateWithLock;
          const active = templateId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTemplateId(id);
                setIsEditing(false);
              }}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {smartLockCode ? null : (
        <p className="text-xs text-amber-700">{fr.checkins.missingLockCodeHint}</p>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        {isEditing ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700" htmlFor="template-editor">
              {fr.checkins.editorLabel}
            </label>
            <textarea
              id="template-editor"
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              rows={8}
              className={`w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-300 ${
                locale === "ar" ? "text-right" : ""
              }`}
              dir={locale === "ar" ? "rtl" : "ltr"}
            />
            <p className="text-[11px] text-slate-500">{fr.checkins.editorHint}</p>
          </div>
        ) : (
          <pre
            className={`whitespace-pre-wrap break-words font-sans text-sm text-slate-700 ${
              locale === "ar" ? "text-right" : ""
            }`}
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {editorValue}
          </pre>
        )}
      </div>

      {copyError ? <p className="text-xs text-red-600">{copyError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span>{fr.checkins.copyMessage}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsEditing((previous) => !previous)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <PencilLine size={16} aria-hidden="true" />
          <span>
            {isEditing ? fr.checkins.cancelCustomize : fr.checkins.customize}
          </span>
        </button>
      </div>
    </div>
  );
}
