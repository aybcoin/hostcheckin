import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Download, Link2, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { APP_BASE_URL, Property, PropertyAutoLink, supabase } from '../lib/supabase';

interface AutoLinkGeneratorProps {
  property: Property | null;
  hostId: string | null;
  onBack: () => void;
}

function createToken(): string {
  return Array.from({ length: 22 })
    .map(() => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)])
    .join('');
}

/**
 * Convert a canvas to a PNG data-URL. Used both for download and for
 * embedding the QR in the printable poster without any network call.
 */
function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

export function AutoLinkGenerator({ property, hostId, onBack }: AutoLinkGeneratorProps) {
  const [autoLink, setAutoLink] = useState<PropertyAutoLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchAutoLink = async () => {
      if (!property?.id || !hostId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('property_auto_links')
        .select('*')
        .eq('property_id', property.id)
        .maybeSingle();

      if (fetchError) {
        setError('Impossible de charger le lien automatique.');
        setLoading(false);
        return;
      }

      setError(null);
      setActionError(null);
      setAutoLink((data || null) as PropertyAutoLink | null);
      setLoading(false);
    };

    void fetchAutoLink();
  }, [hostId, property?.id]);

  const bookingLink = useMemo(() => {
    if (!autoLink?.property_token) return '';
    return `${APP_BASE_URL}/book/${autoLink.property_token}`;
  }, [autoLink?.property_token]);

  const handleCreate = async () => {
    if (!property?.id || !hostId) return;
    setCreating(true);
    const payload = {
      property_id: property.id,
      host_id: hostId,
      property_token: createToken(),
      is_active: true,
    };

    const { data, error: insertError } = await supabase
      .from('property_auto_links')
      .insert(payload)
      .select()
      .maybeSingle();

    if (insertError) {
      setError('Impossible de générer le lien automatique.');
      setCreating(false);
      return;
    }

    setAutoLink(data as PropertyAutoLink);
    setError(null);
    setActionError(null);
    setCreating(false);
  };

  const handleCopy = async () => {
    if (!bookingLink) return;
    setActionError(null);
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setActionError('Impossible de copier le lien pour le moment.');
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !property) return;
    setActionError(null);
    try {
      const dataUrl = canvasToPngDataUrl(canvas);
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `qr-checkin-${property.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      setActionError('Téléchargement du QR code impossible pour le moment.');
    }
  };

  const handlePrintPoster = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !property || !bookingLink) return;
    setActionError(null);
    const dataUrl = canvasToPngDataUrl(canvas);
    const poster = window.open('', '_blank', 'width=900,height=1200');
    if (!poster) {
      setActionError('La fenêtre d’impression a été bloquée par le navigateur.');
      return;
    }
    poster.document.write(`
      <html>
        <head>
          <title>Affiche Check-in - ${property.name}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
            .page { width: 210mm; height: 297mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
            h1 { font-size: 34px; margin: 0; }
            h2 { font-size: 18px; margin: 0; font-weight: 500; color: #475569; }
            img { width: 420px; height: 420px; border: 10px solid #f8fafc; }
            p { margin: 0; font-size: 14px; color: #475569; max-width: 640px; text-align: center; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="page">
            <h1>Scannez pour votre check-in</h1>
            <h2>${property.name}</h2>
            <img src="${dataUrl}" alt="QR code check-in" />
            <p>${bookingLink}</p>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    poster.document.close();
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Retour aux propriétés
      </button>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Réservations automatiques</h1>
        <p className="mt-1 text-sm text-slate-600">
          Lien permanent et QR code pour {property?.name || 'la propriété sélectionnée'}.
        </p>
      </header>

      {!property ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Propriété introuvable. Revenez à la liste des propriétés puis réessayez.
        </div>
      ) : null}

      {property && loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-10 w-full rounded bg-slate-100" />
            <div className="h-9 w-40 rounded bg-slate-200" />
          </div>
        </div>
      ) : property && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : property && !autoLink ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Aucun lien automatique n'est encore généré pour cette propriété.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 size={16} aria-hidden="true" />
            {creating ? 'Génération…' : 'Générer le lien permanent'}
          </button>
        </div>
      ) : property && autoLink ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Lien permanent</h2>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="break-all text-sm text-slate-700">{bookingLink}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                aria-live="polite"
              >
                <Copy size={16} aria-hidden="true" />
                {copied ? 'Copié' : 'Copier le lien'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">QR code</h2>
            <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-lg bg-white">
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={bookingLink}
                  size={1024}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  marginSize={2}
                  aria-label={`QR code pour ${property.name}`}
                  role="img"
                  style={{ width: 240, height: 240 }}
                />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                HostCheckIn
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <Download size={16} aria-hidden="true" />
                Télécharger le QR code (PNG)
              </button>
              <button
                type="button"
                onClick={handlePrintPoster}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <Printer size={16} aria-hidden="true" />
                Télécharger l'affiche imprimable
              </button>
            </div>

            {actionError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {actionError}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
