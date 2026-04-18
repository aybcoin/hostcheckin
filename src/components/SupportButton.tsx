import { useEffect, useRef, useState } from "react";
import { MessageCircleMore, MessageSquareText, Mail } from "lucide-react";
import { fr } from "../lib/i18n/fr";

const getSupportConfig = () => {
  const env = import.meta.env as Record<string, string | undefined>;
  const whatsapp = env.NEXT_PUBLIC_SUPPORT_WHATSAPP || env.VITE_SUPPORT_WHATSAPP || "";
  const email = env.NEXT_PUBLIC_SUPPORT_EMAIL || env.VITE_SUPPORT_EMAIL || "";
  return { whatsapp, email };
};

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { whatsapp, email } = getSupportConfig();

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`
    : undefined;
  const emailHref = email ? `mailto:${email}` : undefined;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label={fr.sidebar.supportAria}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="support-menu"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/70 text-slate-100 hover:bg-slate-700 transition-colors border border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <MessageCircleMore size={18} />
        <span className="text-sm font-medium">{fr.support.title}</span>
      </button>

      {open && (
        <div
          id="support-menu"
          role="menu"
          className="absolute left-0 right-0 bottom-14 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
        >
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              aria-label={fr.support.whatsappHelp}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <MessageSquareText size={16} className="text-slate-700" />
              <span>{fr.support.whatsapp}</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed bg-slate-50"
            >
              <MessageSquareText size={16} />
              <span>{fr.support.missingWhatsApp}</span>
            </button>
          )}

          {emailHref ? (
            <a
              href={emailHref}
              role="menuitem"
              aria-label={fr.support.emailHelp}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
            >
              <Mail size={16} className="text-slate-700" />
              <span>{fr.support.email}</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed bg-slate-50 border-t border-slate-100"
            >
              <Mail size={16} />
              <span>{fr.support.missingEmail}</span>
            </button>
          )}

          <button
            type="button"
            disabled
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed bg-slate-50 border-t border-slate-100"
            aria-label={fr.support.chatHelp}
          >
            <MessageCircleMore size={16} />
            <span>{fr.support.chat}</span>
            <span className="ml-auto text-[11px]">{fr.common.soon}</span>
          </button>
        </div>
      )}
    </div>
  );
}
