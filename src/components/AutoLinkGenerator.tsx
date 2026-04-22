import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Download, Link2, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { clsx } from '../lib/clsx';
import { borderTokens, stateFillTokens, statusTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { APP_BASE_URL, Property, PropertyAutoLink, supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

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
  const [regeneratedAt, setRegeneratedAt] = useState<string | null>(property?.auto_link_regenerated_at || null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setRegeneratedAt(property?.auto_link_regenerated_at || null);
  }, [property?.auto_link_regenerated_at]);

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

  const syncPropertyAutoLinkState = async (updates: {
    auto_link_active: boolean;
    auto_link_regenerated_at?: string | null;
  }) => {
    if (!property?.id) return;
    const { error: propertyError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', property.id);

    // Migration may not yet be applied on every environment.
    if (propertyError) {
      console.warn('Property auto-link sync skipped:', propertyError.message);
    }
  };

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
    setRegeneratedAt(null);
    await syncPropertyAutoLinkState({
      auto_link_active: true,
      auto_link_regenerated_at: null,
    });
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

  const handleRegenerateLink = async () => {
    if (!autoLink || !property) return;
    const confirmed = window.confirm(
      "Cette action invalidera l'ancien lien et les QR codes déjà imprimés. Confirmer ?",
    );
    if (!confirmed) return;

    setActionError(null);
    const now = new Date().toISOString();
    const nextToken = createToken();

    const { data, error: updateError } = await supabase
      .from('property_auto_links')
      .update({
        property_token: nextToken,
        is_active: true,
        updated_at: now,
      })
      .eq('id', autoLink.id)
      .select()
      .maybeSingle();

    if (updateError || !data) {
      setActionError("Impossible de régénérer le lien pour le moment.");
      return;
    }

    setAutoLink(data as PropertyAutoLink);
    setRegeneratedAt(now);
    await syncPropertyAutoLinkState({
      auto_link_active: true,
      auto_link_regenerated_at: now,
    });
  };

  const handleDeactivateLink = async () => {
    if (!autoLink || !property) return;
    const confirmed = window.confirm(
      "Le lien sera désactivé. Aucune nouvelle réservation ne pourra être créée via ce lien. Confirmer ?",
    );
    if (!confirmed) return;

    setActionError(null);
    const { data, error: updateError } = await supabase
      .from('property_auto_links')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', autoLink.id)
      .select()
      .maybeSingle();

    if (updateError || !data) {
      setActionError("Impossible de désactiver le lien pour le moment.");
      return;
    }

    setAutoLink(data as PropertyAutoLink);
    await syncPropertyAutoLinkState({
      auto_link_active: false,
      auto_link_regenerated_at: property.auto_link_regenerated_at || null,
    });
  };

  return (
    <div className="space-y-6">
      <Button
        variant="secondary"
        size="sm"
        onClick={onBack}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Retour aux logements
      </Button>

      <header>
        <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>Réservations automatiques</h1>
        <p className={clsx('mt-1 text-sm', textTokens.muted)}>
          Lien permanent et QR code pour {property?.name || 'le logement sélectionné'}.
        </p>
      </header>

      {!property ? (
        <Card variant="danger" padding="md" className={clsx('text-sm', textTokens.danger)}>
          Logement introuvable. Revenez à la liste des logements puis réessayez.
        </Card>
      ) : null}

      {property && loading ? (
        <Card variant="default" padding="md">
          <div className="animate-pulse space-y-3">
            <div className={clsx('h-4 w-1/3 rounded', stateFillTokens.neutral)} />
            <div className={clsx('h-10 w-full rounded', surfaceTokens.muted)} />
            <div className={clsx('h-9 w-40 rounded', stateFillTokens.neutral)} />
          </div>
        </Card>
      ) : property && error ? (
        <Card variant="danger" padding="md" className={clsx('text-sm', textTokens.danger)}>
          {error}
        </Card>
      ) : property && !autoLink ? (
        <Card variant="default" padding="lg">
          <p className={clsx('text-sm', textTokens.muted)}>
            Aucun lien automatique n'est encore généré pour ce logement.
          </p>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={creating}
            className="mt-4"
          >
            <Link2 size={16} aria-hidden="true" />
            {creating ? 'Génération…' : 'Générer le lien permanent'}
          </Button>
        </Card>
      ) : property && autoLink ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
          <Card as="section" variant="default" padding="md">
            <h2 className={clsx('text-lg font-semibold', textTokens.title)}>Lien permanent</h2>
            <p className={clsx('mt-1 text-xs', textTokens.subtle)}>
              Statut : {autoLink.is_active ? 'Actif' : 'Désactivé'}
            </p>
            <div className={clsx('mt-3 rounded-lg border p-3', borderTokens.default, surfaceTokens.subtle)}>
              <p className={clsx('break-all text-sm', textTokens.body)}>{bookingLink}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                aria-live="polite"
              >
                <Copy size={16} aria-hidden="true" />
                {copied ? 'Copié' : 'Copier le lien'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerateLink}
              >
                Régénérer le lien
              </Button>
              <Button
                variant="dangerSoft"
                size="sm"
                onClick={handleDeactivateLink}
                disabled={!autoLink.is_active}
              >
                Désactiver le lien
              </Button>
            </div>
            {regeneratedAt ? (
              <p className={clsx('mt-2 text-xs', textTokens.subtle)}>
                Dernière régénération : {new Date(regeneratedAt).toLocaleString('fr-FR')}
              </p>
            ) : null}
          </Card>

          <Card as="section" variant="default" padding="md">
            <h2 className={clsx('text-lg font-semibold', textTokens.title)}>QR code</h2>
            <div className={clsx('relative mt-3 overflow-hidden rounded-xl border p-3', borderTokens.default, surfaceTokens.subtle)}>
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
              <div className={clsx('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold shadow-sm', textTokens.body)}>
                HostCheckIn
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={handleDownloadQr}
              >
                <Download size={16} aria-hidden="true" />
                Télécharger le QR code (PNG)
              </Button>
              <Button
                variant="primary"
                onClick={handlePrintPoster}
              >
                <Printer size={16} aria-hidden="true" />
                Télécharger l'affiche imprimable
              </Button>
            </div>

            {actionError ? (
              <p className={clsx('mt-3 rounded-lg px-3 py-2 text-sm', statusTokens.danger)} role="alert">
                {actionError}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
