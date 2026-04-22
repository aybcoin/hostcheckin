import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Camera, Check, Building2, AlertCircle, ChevronRight, ChevronLeft,
  ShieldCheck, ShieldX, Loader2, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  ctaTokens,
  inputTokens,
  stateFillTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface VerificationPageProps {
  uniqueLink: string;
}

type LoadState = 'loading' | 'loaded' | 'not_found' | 'error';

interface GuestIdentity {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
}

interface VerificationReservation {
  id: string;
  booking_reference: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  guest_id: string;
  property_id?: string;
  smart_lock_code?: string | null;
  guests?: GuestIdentity | null;
}

interface VerificationProperty {
  id: string;
  host_id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  max_guests?: number;
  rooms_count?: number;
  check_in_time?: string;
  check_out_time?: string;
}

interface KycResult {
  status: string;
  confidence: number;
  is_valid_document: boolean;
  rejection_reason: string | null;
}

async function logAuditEvent(params: {
  contractId?: string;
  reservationId: string;
  eventType: string;
  signerRole: string;
  signerEmail?: string;
  signerName?: string;
  consentText?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  // All audit events go through the edge function so IP and user agent
  // are captured server-side (probative value). Client-side insert is
  // disabled by RLS — never trust the browser for legal evidence.
  //
  // Retry up to 2 times with exponential back-off — audit logging is a
  // legal compliance requirement and must not silently fail.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const MAX_RETRIES = 2;

  const payload = JSON.stringify({
    contract_id: params.contractId || null,
    reservation_id: params.reservationId,
    event_type: params.eventType,
    signer_role: params.signerRole,
    signer_email: params.signerEmail || null,
    signer_name: params.signerName || null,
    consent_text: params.consentText || null,
    metadata: {
      ...(params.metadata || {}),
      client_ua: navigator.userAgent,
      client_time: new Date().toISOString(),
    },
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/log-audit-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: payload,
      });
      if (resp.ok) return true;
      console.warn(`Audit log attempt ${attempt + 1} failed (HTTP ${resp.status})`);
    } catch (err) {
      console.warn(`Audit log attempt ${attempt + 1} network error:`, err);
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  console.error(`Audit log FAILED after ${MAX_RETRIES + 1} attempts for event: ${params.eventType}`);
  return false;
}

export function VerificationPage({ uniqueLink }: VerificationPageProps) {
  const isDemoMode = uniqueLink === 'demo-preview';
  const [step, setStep] = useState(1);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<VerificationReservation | null>(null);
  const [property, setProperty] = useState<VerificationProperty | null>(null);
  const [contractTemplate, setContractTemplate] = useState<string | null>(null);
  const [idType, setIdType] = useState('');
  const [declaredName, setDeclaredName] = useState('');
  const [declaredEmail, setDeclaredEmail] = useState('');
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [kycResult, setKycResult] = useState<KycResult | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchReservation();
  }, [uniqueLink]);

  useEffect(() => {
    if (idFrontFile) {
      const url = URL.createObjectURL(idFrontFile);
      setIdFrontPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setIdFrontPreview(null);
  }, [idFrontFile]);

  useEffect(() => {
    if (selfieFile) {
      const url = URL.createObjectURL(selfieFile);
      setSelfiePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setSelfiePreview(null);
  }, [selfieFile]);

  const fetchReservation = async () => {
    if (isDemoMode) {
      setReservation({
        id: 'demo-reservation',
        booking_reference: 'DEMO#1',
        check_in_date: new Date().toISOString().slice(0, 10),
        check_out_date: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
        number_of_guests: 2,
        guest_id: 'demo-guest',
        smart_lock_code: '1234#',
        guests: {
          full_name: 'Voyageur Démo',
          email: 'demo@hostcheckin.app',
          phone: '+212600000000',
        },
      });
      setProperty({
        id: 'demo-property',
        host_id: 'demo-host',
        name: 'Appartement Démo HostCheckIn',
        address: 'Témara Centre',
        city: 'Témara',
        country: 'Maroc',
        max_guests: 4,
        rooms_count: 2,
        check_in_time: '15:00',
        check_out_time: '11:00',
      });
      setContractTemplate(null);
      setLoadState('loaded');
      return;
    }

    try {
      setLoadState('loading');

      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select('*, guests(*)')
        .eq('unique_link', uniqueLink)
        .maybeSingle();

      if (resError) {
        setLoadState('error');
        return;
      }

      if (!resData) {
        setLoadState('not_found');
        return;
      }

      setReservation(resData as VerificationReservation);
      // Pre-fill the declared identity fields from the reservation so returning
      // guests see their data, while still allowing them to edit it.
      setDeclaredName(resData?.guests?.full_name || '');
      setDeclaredEmail(resData?.guests?.email || '');

      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', resData.property_id)
        .maybeSingle();

      if (propData) {
        setProperty(propData as VerificationProperty);

        const { data: templateData } = await supabase
          .from('contract_templates')
          .select('content')
          .eq('host_id', propData.host_id)
          .eq('is_default', true)
          .maybeSingle();

        if (templateData?.content) {
          setContractTemplate(templateData.content);
        }
      }

      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  };

  const getPointerPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, []);

  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#0f2da8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [isDrawing]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const renderContractContent = () => {
    if (!reservation || !property) return '';

    if (contractTemplate) {
      return contractTemplate
        .replace(/\{\{property_name\}\}/g, property.name)
        .replace(/\{\{property_address\}\}/g, `${property.address}, ${property.city}`)
        .replace(/\{\{property_city\}\}/g, property.city)
        .replace(/\{\{property_country\}\}/g, property.country)
        .replace(/\{\{guest_name\}\}/g, reservation.guests?.full_name || '')
        .replace(/\{\{guest_email\}\}/g, reservation.guests?.email || '')
        .replace(/\{\{guest_phone\}\}/g, reservation.guests?.phone || '')
        .replace(/\{\{check_in_date\}\}/g, new Date(reservation.check_in_date).toLocaleDateString('fr-FR'))
        .replace(/\{\{check_out_date\}\}/g, new Date(reservation.check_out_date).toLocaleDateString('fr-FR'))
        .replace(/\{\{number_of_guests\}\}/g, String(reservation.number_of_guests))
        .replace(/\{\{booking_reference\}\}/g, reservation.booking_reference)
        .replace(/\{\{max_guests\}\}/g, String(property.max_guests))
        .replace(/\{\{rooms_count\}\}/g, String(property.rooms_count))
        .replace(/\{\{check_in_time\}\}/g, property.check_in_time || '15:00')
        .replace(/\{\{check_out_time\}\}/g, property.check_out_time || '11:00')
        .replace(/\{\{today_date\}\}/g, new Date().toLocaleDateString('fr-FR'));
    }

    // No custom template — generate a default contract text
    return `CONTRAT DE LOCATION COURTE DURÉE

Logement : ${property.name}
Adresse : ${property.address}, ${property.city}
Arrivée : ${new Date(reservation.check_in_date).toLocaleDateString('fr-FR')}
Départ : ${new Date(reservation.check_out_date).toLocaleDateString('fr-FR')}
Voyageurs : ${reservation.number_of_guests}
Référence : ${reservation.booking_reference}

Règles :
- Respect du voisinage
- Interdiction de fumer à l'intérieur
- Pas de fêtes ni événements
- Maintenir les lieux propres

Date : ${new Date().toLocaleDateString('fr-FR')}`;
  };

  const MAX_FILE_SIZE_MB = 10;
  const OCR_MAX_KB = 950; // OCR.space free = 1024 KB, keep margin

  // HEIC/HEIF detection — iOS 11+ cameras produce these by default. Most
  // Android browsers CANNOT decode them via <img>, which used to silently
  // break mobile OCR. We detect by MIME type AND by filename extension
  // (some browsers advertise an empty MIME for HEIC).
  const isHeicLike = (f: File): boolean => {
    const t = (f.type || '').toLowerCase();
    const n = (f.name || '').toLowerCase();
    return t === 'image/heic' || t === 'image/heif'
      || n.endsWith('.heic') || n.endsWith('.heif');
  };

  // Compress image to fit OCR.space 1 MB limit using Canvas API.
  // Returns a JPEG Blob ≤ OCR_MAX_KB. Non-image files pass through.
  // For HEIC on browsers that can't decode it, throws so the caller shows a
  // clear error instead of silently uploading an un-OCR-able HEIC blob.
  const compressImage = (file: File, maxKB: number): Promise<File> => {
    if (!file.type.startsWith('image/') || file.type === 'application/pdf') {
      return Promise.resolve(file);
    }
    // Always go through the canvas pipeline for images so we can normalise
    // HEIC -> JPEG where the browser supports it. Small JPEGs below maxKB
    // still skip compression to preserve original quality.
    if (!isHeicLike(file) && file.size <= maxKB * 1024) {
      return Promise.resolve(file);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      let settled = false;
      const safeResolve = (v: File) => { if (!settled) { settled = true; URL.revokeObjectURL(url); resolve(v); } };
      const safeReject = (e: Error) => { if (!settled) { settled = true; URL.revokeObjectURL(url); reject(e); } };

      img.onload = () => {
        // Scale down so longest side ≤ 1600px (good OCR quality, small size)
        const MAX_DIM = 1600;
        let { width, height } = img;
        if (!width || !height) {
          safeReject(new Error('Image vide ou illisible.'));
          return;
        }
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          safeReject(new Error('Canvas indisponible sur cet appareil.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const tryQuality = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { safeReject(new Error('Echec de la compression JPEG.')); return; }
              if (blob.size <= maxKB * 1024 || q <= 0.3) {
                safeResolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                tryQuality(q - 0.1);
              }
            },
            'image/jpeg',
            q,
          );
        };
        tryQuality(0.8);
      };
      img.onerror = () => {
        if (isHeicLike(file)) {
          safeReject(new Error(
            "Format HEIC/HEIF non pris en charge par ce navigateur. Sur iPhone, activez Réglages -> Appareil photo -> Formats -> Le plus compatible, ou envoyez la photo en JPEG/PNG.",
          ));
        } else {
          safeReject(new Error(
            "Impossible de lire l'image. Le fichier est peut-être corrompu ou dans un format non supporté.",
          ));
        }
      };
      img.src = url;
    });
  };

  const uploadFile = async (file: File, folder: string, label: string): Promise<string | null> => {
    if (!reservation) {
      return null;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`Le fichier "${label}" dépasse la taille maximale autorisée (${MAX_FILE_SIZE_MB} Mo).`);
      return null;
    }
    // Accept common mobile-camera variants. Some Android browsers advertise
    // `image/heif` for iPhone photos; empty MIME is also possible — in that
    // case we fall back to the filename extension check inside compressImage.
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'application/pdf', '',
    ];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const extOk = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf'].includes(ext);
    if (!allowedTypes.includes(file.type) && !extOk) {
      alert(`Type de fichier non accepté pour "${label}". Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.`);
      return null;
    }

    // Compress for OCR compatibility (< 1 MB). Any decode / format error is
    // surfaced clearly to the guest instead of silently producing an
    // un-readable upload that the edge function would then reject.
    let compressed: File;
    try {
      compressed = await compressImage(file, OCR_MAX_KB);
    } catch (e) {
      console.error(`compressImage failed for ${label}:`, e);
      alert(`${label} : ${(e as Error).message}`);
      return null;
    }

    const finalExt = compressed.name.split('.').pop() || 'jpg';
    const path = `${reservation.id}/${folder}_${Date.now()}.${finalExt}`;
    const { error } = await supabase.storage
      .from('checkin-files')
      .upload(path, compressed, { contentType: compressed.type, upsert: true });
    if (error) {
      console.error(`Upload error (${label}):`, error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('checkin-files').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleStep1Continue = async () => {
    if (isDemoMode) {
      setKycResult({
        status: 'approved',
        confidence: 0.94,
        is_valid_document: true,
        rejection_reason: null,
      });
      setStep(2);
      return;
    }

    if (!idType || !idFrontFile || !reservation) return;
    const currentReservation = reservation;
    const trimmedName = (declaredName || '').trim();
    if (!trimmedName) {
      alert("Renseignez votre nom complet.");
      return;
    }
    setKycLoading(true);
    setKycResult(null);

    try {
      // Persist any edits the guest made to their own name / email back onto
      // the guests row so the contract, PDF and audit trail reflect the
      // identity they just declared. We don't fail the flow if this update
      // errors — the KYC step is what matters most here.
      const trimmedEmail = (declaredEmail || '').trim();
      try {
        const guestUpdate: Record<string, string> = { full_name: trimmedName };
        if (trimmedEmail) guestUpdate.email = trimmedEmail;
        if (currentReservation.guest_id) {
          await supabase.from('guests').update(guestUpdate).eq('id', currentReservation.guest_id);
        }
        // Mirror locally so downstream code (contract render, audit payloads)
        // immediately sees the updated name/email.
        setReservation((prev) => prev ? {
          ...prev,
          guests: { ...(prev.guests || {}), full_name: trimmedName, email: trimmedEmail || prev.guests?.email || null },
        } : prev);
      } catch (updateErr) {
        console.warn('Guest profile update failed (non-fatal):', updateErr);
      }

      const frontUrl = await uploadFile(idFrontFile, 'id_front', 'ID front');
      const backUrl = idBackFile ? await uploadFile(idBackFile, 'id_back', 'ID back') : null;

      if (!frontUrl) {
        alert("Erreur lors de l'envoi du document. Réessayez.");
        setKycLoading(false);
        return;
      }

      // The edge function creates the identity_verification record server-side
      // (service_role bypasses RLS). No client-side INSERT needed.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const kycResponse = await fetch(`${supabaseUrl}/functions/v1/verify-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          reservation_id: reservation.id,
          guest_id: currentReservation.guest_id,
          id_document_url: frontUrl,
          id_back_url: backUrl,
          declared_name: trimmedName,
          id_type: idType,
        }),
      });

      if (!kycResponse.ok) {
        // Try to surface the actual reason from the edge function rather than
        // always showing a generic "service indisponible" message — this is
        // especially important on mobile where users land via QR codes with
        // incomplete guest data and were hitting silent 400 "Missing required
        // fields" responses before.
        let serverReason: string | null = null;
        try {
          const errBody = await kycResponse.json();
          serverReason = errBody?.error || errBody?.rejection_reason || null;
        } catch {
          /* body wasn't JSON — keep serverReason null */
        }

        let message: string;
        if (kycResponse.status === 400) {
          message = serverReason
            ? `Données incomplètes : ${serverReason}. Vérifiez votre nom et la photo du document.`
            : "Données incomplètes. Vérifiez votre nom et la photo du document.";
        } else if (kycResponse.status === 413 || kycResponse.status === 414) {
          message = "La photo du document est trop volumineuse. Essayez avec une photo plus petite ou mieux cadrée.";
        } else if (kycResponse.status >= 500) {
          message = serverReason
            ? `Erreur du service : ${serverReason}. Réessayez dans quelques instants.`
            : "Le service de vérification est momentanément indisponible. Réessayez dans quelques instants.";
        } else {
          message = serverReason
            || "Le service de vérification a refusé la demande. Réessayez.";
        }

        console.error('KYC verification HTTP error:', {
          status: kycResponse.status,
          serverReason,
          platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        });

        setKycResult({
          status: 'rejected',
          confidence: 0,
          is_valid_document: false,
          rejection_reason: message,
        });
        setKycLoading(false);
        return;
      }

      const kycData = await kycResponse.json();

      // The edge function now creates the record and returns its ID
      if (kycData.verification_id) {
        setVerificationId(kycData.verification_id);
      }

      setKycResult({
        status: kycData.status || 'rejected',
        confidence: kycData.confidence || 0,
        is_valid_document: kycData.is_valid_document ?? false,
        rejection_reason: kycData.rejection_reason || null,
      });

      // Only hard block on explicit rejection.
      // Pending responses include manual-review fallbacks when OCR is unavailable.
      if (kycData.status === 'rejected') {
        setKycLoading(false);
        return;
      }

      await logAuditEvent({
        reservationId: currentReservation.id,
        eventType: 'identity_submitted',
        signerRole: 'guest',
        signerEmail: currentReservation.guests?.email || undefined,
        signerName: currentReservation.guests?.full_name || undefined,
        metadata: {
          id_type: idType,
          kyc_confidence: kycData.confidence,
          kyc_status: kycData.status,
          name_match_score: kycData.name_match_score,
        },
      });

      setStep(2);
    } catch (err) {
      console.error('KYC verification error:', err);
      // Fail-closed: network/parse error → reject, do not advance
      setKycResult({
        status: 'rejected',
        confidence: 0,
        is_valid_document: false,
        rejection_reason:
          "Erreur réseau pendant la vérification. Réessayez.",
      });
    } finally {
      setKycLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isDemoMode) {
      setStep(4);
      return;
    }

    if (!reservation) return;
    const currentReservation = reservation;
    if (!consentChecked) return;
    setSubmitting(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas?.toDataURL() || '';

      const selfieUrl = selfieFile ? await uploadFile(selfieFile, 'selfie', 'Selfie') : null;

      // Fix #2: Don't update identity_verification directly (anon UPDATE
      // policy was dropped for security). The selfie file is safely stored in
      // the checkin-files bucket, and we record its URL in the audit trail
      // below — this provides the same probative value without re-opening a
      // dangerous RLS policy that would let anon users set status='approved'.

      const renderedContract = contractContent || '';

      // Fix #9: Guard against signing an empty contract — this would
      // produce a legally worthless document.
      if (!renderedContract.trim()) {
        alert("Le contrat n'a pas pu être chargé. Rafraîchissez la page puis réessayez.");
        setSubmitting(false);
        return;
      }

      const consentText =
        "Je certifie que les informations fournies sont exactes. J'accepte que ma signature électronique, mon adresse IP, et l'horodatage soient enregistrés conformément à la loi marocaine n° 53-05 du 30 novembre 2007 relative à l'échange électronique de données juridiques.";
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await logAuditEvent({
        reservationId: currentReservation.id,
        eventType: 'consent_given',
        signerRole: 'guest',
        signerEmail: currentReservation.guests?.email || undefined,
        signerName: currentReservation.guests?.full_name || undefined,
        consentText,
        metadata: {
          timestamp: new Date().toISOString(),
          selfie_url: selfieUrl || null,
          verification_id: verificationId || null,
        },
      });

      const signedAt = new Date().toISOString();
      const contractResponse = await fetch(`${supabaseUrl}/functions/v1/save-guest-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          reservation_id: currentReservation.id,
          unique_link: uniqueLink,
          guest_signature_url: signatureDataUrl,
          contract_content: renderedContract,
          signed_at: signedAt,
        }),
      });

      if (!contractResponse.ok) {
        const errorBody = await contractResponse.text().catch(() => '');
        let errorMessage = 'Erreur lors de l\'enregistrement du contrat.';
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage = errorBody;
          }
        }
        console.error(`Guest contract save failed (HTTP ${contractResponse.status}):`, errorMessage);
        alert(errorMessage);
        setSubmitting(false);
        return;
      }

      const contractData = await contractResponse.json();
      const contractId = contractData.contract_id as string | undefined;

      if (!contractId) {
        alert("Le contrat n'a pas pu être enregistré. Réessayez.");
        setSubmitting(false);
        return;
      }

      if (contractId) {
        await logAuditEvent({
          contractId,
          reservationId: currentReservation.id,
          eventType: 'contract_signed',
          signerRole: 'guest',
          signerEmail: currentReservation.guests?.email || undefined,
          signerName: currentReservation.guests?.full_name || undefined,
          metadata: {
            signature_method: 'canvas_draw',
            contract_has_content: !!renderedContract,
          },
        });

        // Fix #3: PDF generation — don't silently swallow errors.
        // This runs in the background (we don't block step transition)
        // but we log failures for debuggability.
        fetch(`${supabaseUrl}/functions/v1/generate-contract-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            contract_id: contractId,
            reservation_id: currentReservation.id,
          }),
        })
          .then(async (pdfResp) => {
            if (!pdfResp.ok) {
              const errBody = await pdfResp.text().catch(() => 'unknown');
              console.error(`PDF generation failed (HTTP ${pdfResp.status}):`, errBody);
            }
          })
          .catch((pdfErr) => {
            console.error('PDF generation network error:', pdfErr);
          });
      }

      setStep(4);
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Erreur lors de la soumission. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-lg">Chargement de votre réservation...</p>
        </div>
      </div>
    );
  }

  if (loadState === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <Card variant="highlight" padding="lg" className="w-full max-w-md text-center">
          <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", stateFillTokens.danger)}>
            <AlertCircle className={clsx("w-8 h-8", textTokens.danger)} />
          </div>
          <h1 className={clsx("text-2xl font-bold mb-2", textTokens.title)}>Lien invalide</h1>
          <p className={textTokens.muted}>
            Ce lien de check-in n'est pas valide ou la réservation n'existe plus.
            Contactez votre hôte pour obtenir un nouveau lien.
          </p>
        </Card>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <Card variant="highlight" padding="lg" className="w-full max-w-md text-center">
          <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", stateFillTokens.warning)}>
            <AlertCircle className={clsx("w-8 h-8", textTokens.warning)} />
          </div>
          <h1 className={clsx("text-2xl font-bold mb-2", textTokens.title)}>Erreur de chargement</h1>
          <p className={clsx("mb-6", textTokens.muted)}>
            Impossible de charger votre réservation. Vérifiez votre connexion internet.
          </p>
          <Button onClick={fetchReservation} variant="primary">
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <Card variant="highlight" padding="lg" className="w-full max-w-md text-center">
          <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", stateFillTokens.neutral)}>
            <Check className={clsx("w-8 h-8", textTokens.body)} />
          </div>
          <h1 className={clsx("text-2xl font-bold mb-2", textTokens.title)}>Check-in terminé !</h1>
          <p className={clsx("mb-4", textTokens.muted)}>
            Merci d'avoir complété votre check-in. Votre hôte a été notifié.
          </p>
          {kycResult && (
            <div className="mb-4 flex items-center justify-center gap-2">
              {kycResult.confidence >= 0.7 ? (
                <ShieldCheck className={clsx("w-5 h-5", textTokens.body)} />
              ) : (
                <ShieldCheck className={clsx("w-5 h-5", textTokens.warning)} />
              )}
              <span className={clsx("text-sm", textTokens.muted)}>
                Vérification d'identité : {Math.round(kycResult.confidence * 100)} % de confiance
              </span>
            </div>
          )}
          <div className={clsx("border rounded-lg p-4", surfaceTokens.subtle, borderTokens.default)}>
            <p className={clsx("text-sm", textTokens.body)}>
              Conservez ce lien au cas où vous auriez besoin de le consulter.
            </p>
          </div>
          {reservation?.smart_lock_code ? (
            <div className={clsx("mt-4 rounded-lg border p-4 text-left", borderTokens.default, surfaceTokens.subtle)}>
              <p className={clsx("text-xs font-medium uppercase tracking-wide", textTokens.subtle)}>
                Félicitations, voici votre code d’accès
              </p>
              <p className={clsx("mt-2 text-2xl font-bold", textTokens.title)}>
                {reservation.smart_lock_code}
              </p>
              <p className={clsx("mt-1 text-xs", textTokens.subtle)}>
                Ce code est activé pour la période de votre séjour.
              </p>
            </div>
          ) : null}
          <p className={clsx("text-[11px] mt-4", textTokens.subtle)}>
            Votre adresse IP, navigateur et horodatage ont été enregistrés conformément à la loi marocaine n° 53-05 du 30 novembre 2007 relative à l'échange électronique de données juridiques.
          </p>
        </Card>
      </div>
    );
  }

  const contractContent = renderContractContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-4">
      <div className="max-w-lg mx-auto py-4 sm:py-8">
        <Card variant="highlight" padding="sm" className="overflow-hidden p-0">
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-7 h-7" />
              <h1 className="text-xl font-bold">HostCheckIn</h1>
            </div>
            <h2 className="text-lg font-semibold">{property?.name}</h2>
            <p className="text-white/80 text-sm mt-1">
              Réf. : {reservation?.booking_reference}
            </p>
            <div className="flex gap-4 mt-3 text-sm text-white/80">
              <span>Du {reservation ? new Date(reservation.check_in_date).toLocaleDateString('fr-FR') : '—'}</span>
              <span>au {reservation ? new Date(reservation.check_out_date).toLocaleDateString('fr-FR') : '—'}</span>
            </div>
          </div>

          <div className={clsx("px-4 py-3 border-b", surfaceTokens.subtle, borderTokens.default)}>
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Identité' },
                { num: 2, label: 'Selfie' },
                { num: 3, label: 'Contrat' },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center">
                  {i > 0 && (
                    <div className={clsx("w-8 sm:w-12 h-0.5 mx-1", step >= s.num ? stateFillTokens.neutral : surfaceTokens.muted)} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={clsx(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      step > s.num
                        ? `${stateFillTokens.neutral} ${textTokens.inverse}`
                        : step === s.num
                          ? ctaTokens.primary
                          : `${surfaceTokens.muted} ${textTokens.muted}`,
                    )}>
                      {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span className={clsx("text-xs font-medium hidden sm:inline", step >= s.num ? textTokens.body : textTokens.subtle)}>
                      {s.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className={clsx("text-lg font-bold mb-1", textTokens.title)}>Vos informations</h3>
                  <p className={clsx("text-sm", textTokens.muted)}>Confirmez votre identité avant la vérification du document</p>
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-1.5", textTokens.body)}>
                    Nom complet <span className={textTokens.danger}>*</span>
                  </label>
                  <input
                    type="text"
                    value={declaredName}
                    onChange={(e) => setDeclaredName(e.target.value)}
                    placeholder="Tel qu'indiqué sur votre pièce d'identité"
                    className={clsx(inputTokens.base, "text-base")}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-1.5", textTokens.body)}>
                    Email <span className={clsx("font-normal", textTokens.subtle)}>(optionnel)</span>
                  </label>
                  <input
                    type="email"
                    value={declaredEmail}
                    onChange={(e) => setDeclaredEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className={clsx(inputTokens.base, "text-base")}
                    autoComplete="email"
                  />
                </div>

                <div className={clsx("pt-2 border-t", borderTokens.default)}>
                  <h3 className={clsx("text-lg font-bold mb-1", textTokens.title)}>Pièce d'identité</h3>
                  <p className={clsx("text-sm", textTokens.muted)}>Votre document sera vérifié automatiquement</p>
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-1.5", textTokens.body)}>
                    Type de document
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => { setIdType(e.target.value); setKycResult(null); }}
                    className={clsx(inputTokens.base, "text-base")}
                  >
                    <option value="">Sélectionner</option>
                    <option value="cin">Carte d'identité nationale</option>
                    <option value="passport">Passeport</option>
                    <option value="driver_license">Permis de conduire</option>
                    <option value="sejour">Titre de séjour</option>
                  </select>
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-1.5", textTokens.body)}>
                    Photo recto
                  </label>
                  <label
                    htmlFor="id-front"
                    className={clsx(
                      "block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                      idFrontFile
                        ? `${borderTokens.strong} ${surfaceTokens.muted}`
                        : `${borderTokens.strong} hover:opacity-90`,
                    )}
                  >
                    {idFrontPreview ? (
                      <div className="space-y-2">
                        <img src={idFrontPreview} alt="Aperçu" className="max-h-32 mx-auto rounded-lg object-contain" />
                        <div className={clsx("flex items-center justify-center gap-2", textTokens.body)}>
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">{idFrontFile?.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdFrontFile(null); setKycResult(null); }}
                          className={clsx("text-xs hover:opacity-90", textTokens.danger)}
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className={clsx("w-10 h-10 mx-auto mb-2", textTokens.subtle)} />
                        <span className={clsx("font-medium text-sm", textTokens.body)}>
                          Prendre une photo ou choisir un fichier
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => { setIdFrontFile(e.target.files?.[0] || null); setKycResult(null); }}
                      className="hidden"
                      id="id-front"
                    />
                  </label>
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-1.5", textTokens.body)}>
                    Photo verso <span className={clsx("font-normal", textTokens.subtle)}>(optionnel)</span>
                  </label>
                  <label
                    htmlFor="id-back"
                    className={clsx(
                      "block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                      idBackFile
                        ? `${borderTokens.strong} ${surfaceTokens.muted}`
                        : `${borderTokens.strong} hover:opacity-90`,
                    )}
                  >
                    {idBackFile ? (
                      <div className={clsx("flex items-center justify-center gap-2", textTokens.body)}>
                        <Check className="w-5 h-5" />
                        <span className="font-medium text-sm">{idBackFile.name}</span>
                      </div>
                    ) : (
                      <span className={clsx("text-sm", textTokens.subtle)}>Ajouter le verso si applicable</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdBackFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="id-back"
                    />
                  </label>
                </div>

                {kycResult && kycResult.status === 'rejected' && (
                  <div className={clsx("rounded-lg p-4", statusTokens.danger)}>
                    <div className="flex items-start gap-3">
                      <ShieldX className={clsx("w-5 h-5 shrink-0 mt-0.5", textTokens.danger)} />
                      <div>
                        <p className={clsx("font-semibold text-sm", textTokens.danger)}>Document rejeté</p>
                        <p className={clsx("text-sm mt-1", textTokens.danger)}>
                          {kycResult.rejection_reason || "Le document soumis n'a pas pu être vérifié. Réessayez avec une photo plus nette."}
                        </p>
                        <p className={clsx("text-xs mt-2", textTokens.danger)}>
                          Score de confiance : {Math.round(kycResult.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStep1Continue}
                  disabled={(!isDemoMode && (!idType || !idFrontFile || !declaredName.trim())) || kycLoading}
                  className={clsx(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium",
                    ctaTokens.primary,
                  )}
                >
                  {kycLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Vérification en cours...
                    </>
                  ) : kycResult?.status === 'rejected' ? (
                    <>
                      Réessayer la vérification
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Continuer
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className={clsx("text-lg font-bold mb-1", textTokens.title)}>Photo selfie</h3>
                  <p className={clsx("text-sm", textTokens.muted)}>Optionnel - pour confirmer votre identité par comparaison faciale</p>
                </div>

                <label
                  htmlFor="selfie"
                  className={clsx(
                    "block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    selfieFile
                      ? `${borderTokens.strong} ${surfaceTokens.muted}`
                      : `${borderTokens.strong} hover:opacity-90`,
                  )}
                >
                  {selfiePreview ? (
                    <div className="space-y-2">
                      <img src={selfiePreview} alt="Selfie" className="max-h-40 mx-auto rounded-lg object-contain" />
                      <div className={clsx("flex items-center justify-center gap-2", textTokens.body)}>
                        <Check className="w-5 h-5" />
                        <span className="font-medium text-sm">{selfieFile?.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelfieFile(null); }}
                        className={clsx("text-xs hover:opacity-90", textTokens.danger)}
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera className={clsx("w-14 h-14 mx-auto mb-3", textTokens.subtle)} />
                      <span className={clsx("font-medium", textTokens.body)}>Prendre un selfie</span>
                      <p className={clsx("text-xs mt-1", textTokens.subtle)}>ou choisir une photo existante</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="selfie"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-1 py-3 rounded-lg transition-colors font-medium",
                      ctaTokens.secondary,
                    )}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      if (!reservation) return;
                      if (!isDemoMode) {
                        void logAuditEvent({
                          reservationId: reservation.id,
                          eventType: 'contract_viewed',
                          signerRole: 'guest',
                          signerEmail: reservation.guests?.email || undefined,
                          signerName: reservation.guests?.full_name || undefined,
                        });
                      }
                      setStep(3);
                    }}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-1 py-3 rounded-lg transition-colors font-medium",
                      ctaTokens.primary,
                    )}
                  >
                    {selfieFile ? 'Continuer' : 'Passer'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className={clsx("text-lg font-bold mb-1", textTokens.title)}>Contrat de location</h3>
                  <p className={clsx("text-sm", textTokens.muted)}>Lisez et signez le contrat ci-dessous</p>
                </div>

                <div className={clsx("rounded-lg p-4 max-h-64 overflow-y-auto text-sm", surfaceTokens.subtle, textTokens.body)}>
                  {contractContent ? (
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">{contractContent}</pre>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-bold text-base">CONTRAT DE LOCATION COURTE DURÉE</h4>
                      <p><strong>Logement :</strong> {property?.name}</p>
                      <p><strong>Adresse :</strong> {property?.address}, {property?.city}</p>
                      <p><strong>Arrivée :</strong> {reservation ? new Date(reservation.check_in_date).toLocaleDateString('fr-FR') : '—'}</p>
                      <p><strong>Départ :</strong> {reservation ? new Date(reservation.check_out_date).toLocaleDateString('fr-FR') : '—'}</p>
                      <p><strong>Voyageurs :</strong> {reservation?.number_of_guests}</p>
                      <div className="mt-3 space-y-1">
                        <p className="font-semibold">Règles :</p>
                        <ul className={clsx("list-disc list-inside space-y-0.5 ml-2", textTokens.muted)}>
                          <li>Respect du voisinage</li>
                          <li>Interdiction de fumer à l'intérieur</li>
                          <li>Pas de fêtes ni événements</li>
                          <li>Maintenir les lieux propres</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className={clsx("border rounded-lg p-3", surfaceTokens.subtle, borderTokens.default)}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className={clsx(
                        "mt-0.5 w-4 h-4 rounded focus:ring-slate-400",
                        textTokens.body,
                        borderTokens.strong,
                      )}
                    />
                    <span className={clsx("text-xs leading-relaxed", textTokens.body)}>
                      Je certifie que les informations fournies sont exactes. J'accepte que ma signature électronique,
                      mon adresse IP et l'horodatage soient enregistrés conformément à la loi marocaine n° 53-05
                      du 30 novembre 2007 relative à l'échange électronique de données juridiques.
                    </span>
                  </label>
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-2", textTokens.body)}>
                    Votre signature
                  </label>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    className={clsx("border-2 rounded-lg w-full", borderTokens.strong, surfaceTokens.panel)}
                    style={{ touchAction: 'none' }}
                  />
                  <button
                    onClick={clearSignature}
                    className={clsx("mt-1.5 px-3 py-1.5 text-xs rounded", ctaTokens.secondary)}
                  >
                    Effacer la signature
                  </button>
                </div>

                <div className={clsx("flex items-start gap-2 text-[11px]", textTokens.subtle)}>
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    En signant, votre adresse IP, navigateur, et l'horodatage exact seront enregistrés
                    dans une piste d'audit sécurisée pour garantir la conformité légale de ce document.
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-1 py-3 rounded-lg transition-colors font-medium",
                      ctaTokens.secondary,
                    )}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (!consentChecked && !isDemoMode)}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors disabled:opacity-50 font-medium",
                      ctaTokens.primary,
                    )}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        Signer et terminer
                        <Check className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
