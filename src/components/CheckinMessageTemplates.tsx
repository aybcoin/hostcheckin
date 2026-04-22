import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Languages, PencilLine } from "lucide-react";
import { clsx } from "../lib/clsx";
import { borderTokens, inputTokens, surfaceTokens, textTokens } from "../lib/design-tokens";
import { fr } from "../lib/i18n/fr";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
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
      propertyName: propertyName || "votre logement",
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
      <Card variant="ghost" padding="sm" className={clsx("text-sm", textTokens.muted)}>
        Lien de check-in indisponible.
      </Card>
    );
  }

  return (
    <Card variant="default" padding="md" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={clsx("text-sm font-semibold", textTokens.title)}>
            {fr.checkins.templatesTitle}
          </h3>
          <p className={clsx("text-xs", textTokens.muted)}>{fr.checkins.templatesSubtitle}</p>
        </div>
        <div className={clsx("inline-flex items-center gap-2 rounded-lg border px-3 py-2", borderTokens.default)}>
          <Languages size={14} className={textTokens.muted} aria-hidden="true" />
          <label className={clsx("text-xs", textTokens.muted)} htmlFor="template-locale">
            {fr.checkins.localeLabel}
          </label>
          <select
            id="template-locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value as MessageLocale)}
            className={clsx("bg-transparent text-xs font-semibold outline-none", textTokens.body)}
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
              className={clsx(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                active
                  ? clsx(borderTokens.strong, surfaceTokens.panel, textTokens.title)
                  : clsx(borderTokens.default, surfaceTokens.subtle, textTokens.body, "hover:bg-white/70"),
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {smartLockCode ? null : (
        <p className={clsx("text-xs", textTokens.warning)}>{fr.checkins.missingLockCodeHint}</p>
      )}

      <div className={clsx("rounded-lg border p-3", borderTokens.default, surfaceTokens.subtle)}>
        {isEditing ? (
          <div className="space-y-2">
            <label className={clsx("block text-xs font-medium", textTokens.body)} htmlFor="template-editor">
              {fr.checkins.editorLabel}
            </label>
            <textarea
              id="template-editor"
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              rows={8}
              className={clsx(inputTokens.base, "resize-y", locale === "ar" && "text-right")}
              dir={locale === "ar" ? "rtl" : "ltr"}
            />
            <p className={clsx("text-[11px]", textTokens.subtle)}>{fr.checkins.editorHint}</p>
          </div>
        ) : (
          <pre
            className={clsx(`whitespace-pre-wrap break-words font-sans text-sm ${
              locale === "ar" ? "text-right" : ""
            }`, textTokens.body)}
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {editorValue}
          </pre>
        )}
      </div>

      {copyError ? <p className={clsx("text-xs", textTokens.danger)}>{copyError}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          onClick={handleCopy}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span>{fr.checkins.copyMessage}</span>
        </Button>
        <Button
          variant="secondary"
          onClick={() => setIsEditing((previous) => !previous)}
        >
          <PencilLine size={16} aria-hidden="true" />
          <span>
            {isEditing ? fr.checkins.cancelCustomize : fr.checkins.customize}
          </span>
        </Button>
      </div>
    </Card>
  );
}
