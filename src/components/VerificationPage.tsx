import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Camera, Check, Building2, AlertCircle, ChevronRight, ChevronLeft,
  ShieldCheck, ShieldX, Loader2, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VerificationPageProps {
  uniqueLink: string;
}

type LoadState = 'loading' | 'loaded' | 'not_found' | 'error';

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
  const [reservation, setReservation] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
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
          full_name: 'Invité Démo',
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

      setReservation(resData);
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
        setProperty(propData);

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
    return `CONTRAT DE LOCATION COURTE DUREE

Propriete : ${property.name}
Adresse : ${property.address}, ${property.city}
Arrivee : ${new Date(reservation.check_in_date).toLocaleDateString('fr-FR')}
Depart : ${new Date(reservation.check_out_date).toLocaleDateString('fr-FR')}
Invites : ${reservation.number_of_guests}
Reference : ${reservation.booking_reference}

Regles :
- Respect du voisinage
- Interdiction de fumer a l'interieur
- Pas de fetes ni evenements
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
            "Format HEIC/HEIF non pris en charge par ce navigateur. Sur iPhone, activez Reglages -> Appareil photo -> Formats -> Le plus compatible, ou envoyez la photo en JPEG/PNG.",
          ));
        } else {
          safeReject(new Error(
            "Impossible de lire l'image. Le fichier est peut-etre corrompu ou dans un format non supporte.",
          ));
        }
      };
      img.src = url;
    });
  };

  const uploadFile = async (file: File, folder: string, label: string): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`Le fichier "${label}" depasse la taille maximale autorisee (${MAX_FILE_SIZE_MB} Mo).`);
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
      alert(`Type de fichier non accepte pour "${label}". Formats acceptes: JPEG, PNG, WebP, HEIC, PDF.`);
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
    const trimmedName = (declaredName || '').trim();
    if (!trimmedName) {
      alert("Veuillez renseigner votre nom complet.");
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
        if (reservation.guest_id) {
          await supabase.from('guests').update(guestUpdate).eq('id', reservation.guest_id);
        }
        // Mirror locally so downstream code (contract render, audit payloads)
        // immediately sees the updated name/email.
        setReservation((prev: any) => prev ? {
          ...prev,
          guests: { ...(prev.guests || {}), full_name: trimmedName, email: trimmedEmail || prev.guests?.email || null },
        } : prev);
      } catch (updateErr) {
        console.warn('Guest profile update failed (non-fatal):', updateErr);
      }

      const frontUrl = await uploadFile(idFrontFile, 'id_front', 'ID front');
      const backUrl = idBackFile ? await uploadFile(idBackFile, 'id_back', 'ID back') : null;

      if (!frontUrl) {
        alert("Erreur lors de l'envoi du document. Veuillez reessayer.");
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
          guest_id: reservation.guest_id,
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
            ? `Donnees incompletes : ${serverReason}. Verifiez votre nom et la photo du document.`
            : "Donnees incompletes. Verifiez votre nom et la photo du document.";
        } else if (kycResponse.status === 413 || kycResponse.status === 414) {
          message = "La photo du document est trop volumineuse. Essayez avec une photo plus petite ou mieux cadree.";
        } else if (kycResponse.status >= 500) {
          message = serverReason
            ? `Erreur du service : ${serverReason}. Veuillez reessayer dans quelques instants.`
            : "Le service de verification est momentanement indisponible. Veuillez reessayer dans quelques instants.";
        } else {
          message = serverReason
            || "Le service de verification a refuse la demande. Veuillez reessayer.";
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
        reservationId: reservation.id,
        eventType: 'identity_submitted',
        signerRole: 'guest',
        signerEmail: reservation.guests?.email,
        signerName: reservation.guests?.full_name,
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
          "Erreur reseau pendant la verification. Veuillez reessayer.",
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
        alert("Le contrat n'a pas pu etre charge. Veuillez rafraichir la page et reessayer.");
        setSubmitting(false);
        return;
      }

      const consentText =
        "Je certifie que les informations fournies sont exactes. J'accepte que ma signature electronique, mon adresse IP, et l'horodatage soient enregistres conformement a la loi marocaine n° 53-05 du 30 novembre 2007 relative a l'echange electronique de donnees juridiques.";
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await logAuditEvent({
        reservationId: reservation.id,
        eventType: 'consent_given',
        signerRole: 'guest',
        signerEmail: reservation.guests?.email,
        signerName: reservation.guests?.full_name,
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
          reservation_id: reservation.id,
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
        alert("Le contrat n'a pas pu etre enregistre. Veuillez reessayer.");
        setSubmitting(false);
        return;
      }

      if (contractId) {
        await logAuditEvent({
          contractId,
          reservationId: reservation.id,
          eventType: 'contract_signed',
          signerRole: 'guest',
          signerEmail: reservation.guests?.email,
          signerName: reservation.guests?.full_name,
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
            reservation_id: reservation.id,
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
      alert('Erreur lors de la soumission. Veuillez reessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-lg">Chargement de votre reservation...</p>
        </div>
      </div>
    );
  }

  if (loadState === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600">
            Ce lien de check-in n'est pas valide ou la reservation n'existe plus.
            Contactez votre hote pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur de chargement</h1>
          <p className="text-gray-600 mb-6">
            Impossible de charger votre reservation. Verifiez votre connexion internet.
          </p>
          <button
            onClick={fetchReservation}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check-in termine !</h1>
          <p className="text-gray-600 mb-4">
            Merci d'avoir complete votre check-in. Votre hote a ete notifie.
          </p>
          {kycResult && (
            <div className="mb-4 flex items-center justify-center gap-2">
              {kycResult.confidence >= 0.7 ? (
                <ShieldCheck className="w-5 h-5 text-green-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              )}
              <span className="text-sm text-gray-600">
                Verification d'identite : {Math.round(kycResult.confidence * 100)}% de confiance
              </span>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Conservez ce lien au cas ou vous auriez besoin de le consulter.
            </p>
          </div>
          {reservation?.smart_lock_code ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Félicitations, voici votre code d’accès
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {reservation.smart_lock_code}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ce code est activé pour la période de votre séjour.
              </p>
            </div>
          ) : null}
          <p className="text-[11px] text-gray-400 mt-4">
            Votre adresse IP, navigateur et horodatage ont ete enregistres conformement a la loi marocaine n° 53-05 du 30 novembre 2007 relative a l'echange electronique de donnees juridiques.
          </p>
        </div>
      </div>
    );
  }

  const contractContent = renderContractContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-lg mx-auto py-4 sm:py-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-7 h-7" />
              <h1 className="text-xl font-bold">HostCheckIn</h1>
            </div>
            <h2 className="text-lg font-semibold">{property?.name}</h2>
            <p className="text-blue-100 text-sm mt-1">
              Ref: {reservation?.booking_reference}
            </p>
            <div className="flex gap-4 mt-3 text-sm text-blue-100">
              <span>Du {new Date(reservation?.check_in_date).toLocaleDateString('fr-FR')}</span>
              <span>au {new Date(reservation?.check_out_date).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Identite' },
                { num: 2, label: 'Selfie' },
                { num: 3, label: 'Contrat' },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center">
                  {i > 0 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 ${step >= s.num ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step > s.num
                        ? 'bg-green-500 text-white'
                        : step === s.num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${
                      step >= s.num ? 'text-blue-600' : 'text-gray-400'
                    }`}>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Vos informations</h3>
                  <p className="text-sm text-gray-600">Confirmez votre identite avant la verification du document</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={declaredName}
                    onChange={(e) => setDeclaredName(e.target.value)}
                    placeholder="Tel qu'indique sur votre piece d'identite"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="email"
                    value={declaredEmail}
                    onChange={(e) => setDeclaredEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    autoComplete="email"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Piece d'identite</h3>
                  <p className="text-sm text-gray-600">Votre document sera verifie automatiquement</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type de document
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => { setIdType(e.target.value); setKycResult(null); }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                  >
                    <option value="">Selectionner</option>
                    <option value="cin">Carte d'identite nationale</option>
                    <option value="passport">Passeport</option>
                    <option value="driver_license">Permis de conduire</option>
                    <option value="sejour">Titre de sejour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Photo recto
                  </label>
                  <label
                    htmlFor="id-front"
                    className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      idFrontFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {idFrontPreview ? (
                      <div className="space-y-2">
                        <img src={idFrontPreview} alt="Apercu" className="max-h-32 mx-auto rounded-lg object-contain" />
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">{idFrontFile?.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdFrontFile(null); setKycResult(null); }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <span className="text-blue-600 font-medium text-sm">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Photo verso <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <label
                    htmlFor="id-back"
                    className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      idBackFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {idBackFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <Check className="w-5 h-5" />
                        <span className="font-medium text-sm">{idBackFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Ajouter le verso si applicable</span>
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
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ShieldX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-800 text-sm">Document rejete</p>
                        <p className="text-sm text-red-700 mt-1">
                          {kycResult.rejection_reason || "Le document soumis n'a pas pu etre verifie. Veuillez reessayer avec une photo plus nette."}
                        </p>
                        <p className="text-xs text-red-500 mt-2">
                          Score de confiance : {Math.round(kycResult.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStep1Continue}
                  disabled={(!isDemoMode && (!idType || !idFrontFile || !declaredName.trim())) || kycLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  {kycLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verification en cours...
                    </>
                  ) : kycResult?.status === 'rejected' ? (
                    <>
                      Reessayer la verification
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
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Photo selfie</h3>
                  <p className="text-sm text-gray-600">Optionnel - pour confirmer votre identite par comparaison faciale</p>
                </div>

                <label
                  htmlFor="selfie"
                  className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selfieFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {selfiePreview ? (
                    <div className="space-y-2">
                      <img src={selfiePreview} alt="Selfie" className="max-h-40 mx-auto rounded-lg object-contain" />
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <Check className="w-5 h-5" />
                        <span className="font-medium text-sm">{selfieFile?.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelfieFile(null); }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-14 h-14 text-gray-400 mx-auto mb-3" />
                      <span className="text-blue-600 font-medium">Prendre un selfie</span>
                      <p className="text-xs text-gray-500 mt-1">ou choisir une photo existante</p>
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
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      if (!isDemoMode) {
                        void logAuditEvent({
                          reservationId: reservation.id,
                          eventType: 'contract_viewed',
                          signerRole: 'guest',
                          signerEmail: reservation.guests?.email,
                          signerName: reservation.guests?.full_name,
                        });
                      }
                      setStep(3);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Contrat de location</h3>
                  <p className="text-sm text-gray-600">Lisez et signez le contrat ci-dessous</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-gray-700">
                  {contractContent ? (
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">{contractContent}</pre>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-bold text-base">CONTRAT DE LOCATION COURTE DUREE</h4>
                      <p><strong>Propriete :</strong> {property?.name}</p>
                      <p><strong>Adresse :</strong> {property?.address}, {property?.city}</p>
                      <p><strong>Arrivee :</strong> {new Date(reservation?.check_in_date).toLocaleDateString('fr-FR')}</p>
                      <p><strong>Depart :</strong> {new Date(reservation?.check_out_date).toLocaleDateString('fr-FR')}</p>
                      <p><strong>Invites :</strong> {reservation?.number_of_guests}</p>
                      <div className="mt-3 space-y-1">
                        <p className="font-semibold">Regles :</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2 text-gray-600">
                          <li>Respect du voisinage</li>
                          <li>Interdiction de fumer a l'interieur</li>
                          <li>Pas de fetes ni evenements</li>
                          <li>Maintenir les lieux propres</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-blue-800 leading-relaxed">
                      Je certifie que les informations fournies sont exactes. J'accepte que ma signature electronique,
                      mon adresse IP et l'horodatage soient enregistres conformement a la loi marocaine n° 53-05
                      du 30 novembre 2007 relative a l'echange electronique de donnees juridiques.
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="border-2 border-gray-300 rounded-lg w-full bg-white"
                    style={{ touchAction: 'none' }}
                  />
                  <button
                    onClick={clearSignature}
                    className="mt-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    Effacer la signature
                  </button>
                </div>

                <div className="flex items-start gap-2 text-[11px] text-gray-400">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    En signant, votre adresse IP, navigateur, et l'horodatage exact seront enregistres
                    dans une piste d'audit securisee pour garantir la conformite legale de ce document.
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (!consentChecked && !isDemoMode)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
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
        </div>
      </div>
    </div>
  );
}
