import { useState, useEffect } from 'react';
import {
  X, FileText, User, Camera, PenTool, Download, ExternalLink, Loader2,
  AlertCircle, ShieldCheck, ShieldX, Clock, Activity, Hash
} from 'lucide-react';
import { clsx } from '../lib/clsx';
import { supabase } from '../lib/supabase';
import { SecurityNotice } from './SecurityNotice';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  stateFillTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';

interface VerificationData {
  id: string;
  id_type: string;
  id_document_url: string;
  id_back_url?: string;
  selfie_url?: string;
  status: string;
  created_at: string;
  ocr_data?: {
    declared_name?: string;
    extracted_name?: string;
    document_number?: string;
    confidence?: number;
    face_match?: boolean;
    face_match_score?: number;
    rejection_reasons?: string[];
  };
  document_confidence?: number;
  face_match_score?: number;
  rejection_reason?: string;
  detected_document_type?: string;
}

interface ContractData {
  id: string;
  signed_by_guest: boolean;
  signed_by_host: boolean;
  guest_signature_url?: string;
  host_signature_url?: string;
  contract_content?: string;
  signed_at?: string;
  created_at: string;
  pdf_storage_path?: string;
  content_hash?: string;
}

interface AuditEntry {
  id: string;
  event_type: string;
  signer_role: string;
  signer_email?: string;
  ip_address?: string;
  created_at: string;
  consent_text?: string;
}

interface ReservationDocumentsProps {
  reservationId: string;
  bookingReference: string;
  onClose: () => void;
}

const ID_TYPE_LABELS: Record<string, string> = {
  cin: "Carte nationale d'identité",
  passport: 'Passeport',
  driver_license: 'Permis de conduire',
  sejour: 'Titre de séjour',
  carte_identite: "Carte nationale d'identité",
  passeport: 'Passeport',
  permis_conduire: 'Permis de conduire',
  titre_sejour: 'Titre de séjour',
};

const EVENT_LABELS: Record<string, string> = {
  identity_submitted: "Pièce d'identité soumise",
  contract_viewed: 'Contrat consulté',
  consent_given: 'Consentement exprimé',
  contract_signed: 'Signature électronique du locataire apposée',
  pdf_generated: 'PDF généré',
  host_emitted_contract: 'Consentement du bailleur matérialisé par émission',
};

const SIGNER_ROLE_LABELS: Record<string, string> = {
  guest: 'Locataire',
  host: 'Bailleur',
  system: 'Système',
};

export function ReservationDocuments({ reservationId, bookingReference, onClose }: ReservationDocumentsProps) {
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'identity' | 'contract' | 'audit'>('identity');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [reservationId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const [verRes, contractRes, auditRes] = await Promise.all([
      supabase
        .from('identity_verification')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('contracts')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('signature_audit_log')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: true }),
    ]);

    if (verRes.data) setVerification(verRes.data);
    if (contractRes.data) setContract(contractRes.data);
    if (auditRes.data) setAuditTrail(auditRes.data);
    setLoading(false);
  };

  const isValidUrl = (url?: string | null) => {
    if (!url) return false;
    return url.startsWith('http') && url !== 'uploaded';
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleDownloadPdf = async () => {
    if (!contract?.id) return;
    setDownloadingPdf(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const resp = await fetch(
        `${supabaseUrl}/functions/v1/download-contract-pdf?contract_id=${contract.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 409) {
          alert("Erreur d'intégrité : le PDF semble avoir été modifié. Contactez le support.");
        } else {
          alert(err.error || 'Erreur lors du téléchargement du PDF.');
        }
        console.error(`PDF download failed (${resp.status}):`, err);
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat_${bookingReference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Erreur réseau lors du téléchargement. Vérifiez votre connexion.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const hasIdentityDocs = verification && (isValidUrl(verification.id_document_url) || isValidUrl(verification.selfie_url));
  const hasContract = contract && (contract.contract_content || contract.guest_signature_url || contract.host_signature_url);
  const confidencePercent = verification?.document_confidence
    ? Math.round(verification.document_confidence * 100)
    : verification?.ocr_data?.confidence
    ? Math.round(verification.ocr_data.confidence * 100)
    : null;

  return (
    <>
      <div className={modalTokens.overlay} onClick={onClose}>
        <div
          className={`${modalTokens.panel} max-w-3xl flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={clsx('p-4 sm:p-5 border-b flex items-center justify-between shrink-0', borderTokens.default)}>
            <div>
              <h2 className={clsx('text-lg sm:text-xl font-bold', textTokens.title)}>Documents du check-in</h2>
              <p className={clsx('text-sm mt-0.5', textTokens.subtle)}>Réservation {bookingReference}</p>
            </div>
            <button onClick={onClose} className={iconButtonToken} aria-label="Fermer les documents">
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className={clsx('w-8 h-8 animate-spin', textTokens.muted)} />
            </div>
          ) : !hasIdentityDocs && !hasContract && auditTrail.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center mb-4', surfaceTokens.muted)}>
                <AlertCircle className={clsx('w-7 h-7', textTokens.subtle)} />
              </div>
              <p className={clsx('text-center font-medium', textTokens.muted)}>Aucun document soumis</p>
              <p className={clsx('text-sm text-center mt-1', textTokens.subtle)}>
                Le client n'a pas encore complété son check-in en ligne.
              </p>
            </div>
          ) : (
            <>
              <div className={clsx('flex gap-1 p-1 mx-4 sm:mx-5 mt-4 rounded-lg shrink-0', surfaceTokens.muted)}>
                <Button
                  onClick={() => setActiveTab('identity')}
                  variant={activeTab === 'identity' ? 'secondary' : 'tertiary'}
                  size="sm"
                  className="flex-1"
                >
                  <User size={16} />
                  <span>Identité</span>
                </Button>
                <Button
                  onClick={() => setActiveTab('contract')}
                  variant={activeTab === 'contract' ? 'secondary' : 'tertiary'}
                  size="sm"
                  className="flex-1"
                >
                  <FileText size={16} />
                  <span>Contrat</span>
                </Button>
                <Button
                  onClick={() => setActiveTab('audit')}
                  variant={activeTab === 'audit' ? 'secondary' : 'tertiary'}
                  size="sm"
                  className="flex-1"
                >
                  <Activity size={16} />
                  <span>Audit</span>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {activeTab === 'identity' && (
                  <div className="space-y-5">
                    {verification ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                            verification.status === 'approved'
                              ? statusTokens.success
                              : verification.status === 'rejected'
                              ? statusTokens.danger
                              : statusTokens.pending
                          }`}>
                          {verification.status === 'approved' ? (
                              <><ShieldCheck size={12} /> Vérifiée</>
                            ) : verification.status === 'rejected' ? (
                              <><ShieldX size={12} /> Rejetée</>
                            ) : (
                              <><Clock size={12} /> En attente</>
                            )}
                          </span>
                          <span className={clsx('text-sm', textTokens.subtle)}>
                            {ID_TYPE_LABELS[verification.id_type] || ID_TYPE_LABELS[verification.detected_document_type || ''] || verification.id_type}
                          </span>
                          <span className={clsx('text-xs', textTokens.subtle)}>
                            Soumis le {formatDate(verification.created_at)}
                          </span>
                        </div>

                        {confidencePercent !== null && (
                          <Card variant="ghost" padding="sm" className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={clsx('text-sm font-medium', textTokens.body)}>Score de confiance KYC</span>
                              <span className={clsx(
                                'text-sm font-bold',
                                confidencePercent >= 70 ? textTokens.success : confidencePercent >= 40 ? textTokens.warning : textTokens.danger,
                              )}>
                                {confidencePercent}%
                              </span>
                            </div>
                            <div className={clsx('w-full h-2 rounded-full overflow-hidden', surfaceTokens.elevated)}>
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all duration-500',
                                  confidencePercent >= 70 ? stateFillTokens.success : confidencePercent >= 40 ? stateFillTokens.warning : stateFillTokens.danger,
                                )}
                                style={{ width: `${confidencePercent}%` }}
                              />
                            </div>
                            {verification.face_match_score != null && verification.face_match_score > 0 && (
                              <p className={clsx('text-xs', textTokens.subtle)}>
                                Correspondance faciale : {Math.round(verification.face_match_score * 100)}%
                              </p>
                            )}
                          </Card>
                        )}

                        {verification.rejection_reason && (
                          <Card variant="danger" padding="sm">
                            <p className={clsx('text-sm font-medium', textTokens.danger)}>Raison du rejet :</p>
                            <p className={clsx('text-sm mt-1', textTokens.danger)}>{verification.rejection_reason}</p>
                          </Card>
                        )}

                        {verification.ocr_data?.declared_name && (
                          <Card variant="ghost" padding="sm" className="grid grid-cols-2 gap-3">
                            <div>
                              <p className={clsx('text-xs', textTokens.subtle)}>Nom déclaré</p>
                              <p className={clsx('text-sm font-medium', textTokens.title)}>{verification.ocr_data.declared_name}</p>
                            </div>
                            {verification.ocr_data.document_number && (
                              <div>
                                <p className={clsx('text-xs', textTokens.subtle)}>N. document</p>
                                <p className={clsx('text-sm font-medium', textTokens.title)}>{verification.ocr_data.document_number}</p>
                              </div>
                            )}
                          </Card>
                        )}

                        <SecurityNotice />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {isValidUrl(verification.id_document_url) && (
                            <div>
                              <p className={clsx('text-sm font-medium mb-2', textTokens.body)}>Recto</p>
                              <div
                                className={clsx(
                                  'relative group secure-document-preview rounded-lg overflow-hidden border cursor-pointer',
                                  borderTokens.default,
                                  surfaceTokens.subtle,
                                )}
                                onClick={() => setZoomedImage(verification.id_document_url)}
                              >
                                <img
                                  src={verification.id_document_url}
                                  alt="ID recto"
                                  className="w-full h-48 object-contain"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                              </div>
                            </div>
                          )}

                          {isValidUrl(verification.id_back_url) && (
                            <div>
                              <p className={clsx('text-sm font-medium mb-2', textTokens.body)}>Verso</p>
                              <div
                                className={clsx(
                                  'relative group secure-document-preview rounded-lg overflow-hidden border cursor-pointer',
                                  borderTokens.default,
                                  surfaceTokens.subtle,
                                )}
                                onClick={() => setZoomedImage(verification.id_back_url!)}
                              >
                                <img
                                  src={verification.id_back_url}
                                  alt="ID verso"
                                  className="w-full h-48 object-contain"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {isValidUrl(verification.selfie_url) && (
                          <div>
                            <p className={clsx('text-sm font-medium mb-2 flex items-center gap-1.5', textTokens.body)}>
                              <Camera size={16} />
                              Selfie
                            </p>
                            <div
                              className={clsx(
                                'relative group secure-document-preview rounded-lg overflow-hidden border cursor-pointer max-w-xs',
                                borderTokens.default,
                                surfaceTokens.subtle,
                              )}
                              onClick={() => setZoomedImage(verification.selfie_url!)}
                            >
                              <img
                                src={verification.selfie_url}
                                alt="Selfie"
                                className="w-full h-48 object-contain"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                              </div>
                            </div>
                          </div>
                        )}

                        {!isValidUrl(verification.id_document_url) && !isValidUrl(verification.selfie_url) && (
                          <Card variant="warning" padding="md">
                            <p className={clsx('text-sm', textTokens.warning)}>
                              Les documents ont été soumis, mais les fichiers ne sont pas disponibles.
                            </p>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <User className={clsx('w-10 h-10 mx-auto mb-3', textTokens.subtle)} />
                        <p className={textTokens.subtle}>Aucune vérification d'identité soumise</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'contract' && (
                  <div className="space-y-5">
                    {contract ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={contract.signed_by_guest ? 'success' : 'neutral'} className="gap-1.5 rounded-full px-3 py-1.5">
                            {contract.signed_by_guest
                              ? 'Contrat émis par le bailleur et signé électroniquement par le locataire'
                              : 'Contrat émis par le bailleur'}
                          </Badge>
                          {contract.signed_at && (
                            <span className={clsx('text-xs', textTokens.subtle)}>
                              Signé le {formatDate(contract.signed_at)}
                            </span>
                          )}
                        </div>

                        {contract.pdf_storage_path && (
                          <Card variant="ghost" className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className={clsx('w-8 h-8', textTokens.muted)} />
                              <div>
                                <p className={clsx('text-sm font-medium', textTokens.title)}>Contrat PDF disponible</p>
                                {contract.content_hash && (
                                  <p className={clsx('text-[11px] flex items-center gap-1 mt-0.5', textTokens.muted)}>
                                    <Hash size={10} />
                                    SHA-256: {contract.content_hash.substring(0, 16)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={handleDownloadPdf}
                              disabled={downloadingPdf}
                              variant="primary"
                              size="sm"
                            >
                              {downloadingPdf ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                              Télécharger le PDF
                            </Button>
                          </Card>
                        )}

                        {contract.contract_content && (
                          <div>
                            <p className={clsx('text-sm font-medium mb-2 flex items-center gap-1.5', textTokens.body)}>
                              <FileText size={16} />
                              Contenu du contrat
                            </p>
                            <div className={clsx('rounded-lg p-4 max-h-64 overflow-y-auto border', surfaceTokens.subtle, borderTokens.default)}>
                              <pre className={clsx('whitespace-pre-wrap font-sans text-sm leading-relaxed', textTokens.body)}>
                                {contract.contract_content}
                              </pre>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {contract.host_signature_url && contract.host_signature_url.startsWith('data:') && (
                            <div>
                              <p className={clsx('text-sm font-medium mb-2 flex items-center gap-1.5', textTokens.body)}>
                                <PenTool size={14} />
                                Validation du bailleur
                              </p>
                              <Card variant="default" padding="sm">
                                <img
                                  src={contract.host_signature_url}
                                  alt="Validation du bailleur"
                                  className="w-full h-24 object-contain"
                                />
                              </Card>
                            </div>
                          )}

                          {contract.guest_signature_url && contract.guest_signature_url.startsWith('data:') && (
                            <div>
                              <p className={clsx('text-sm font-medium mb-2 flex items-center gap-1.5', textTokens.body)}>
                                <PenTool size={14} />
                                Signature du locataire
                              </p>
                              <Card variant="default" padding="sm">
                                <img
                                  src={contract.guest_signature_url}
                                  alt="Signature du locataire"
                                  className="w-full h-24 object-contain"
                                />
                              </Card>
                            </div>
                          )}
                        </div>

                        {!contract.contract_content && !contract.guest_signature_url && !contract.host_signature_url && (
                          <Card variant="warning" padding="md">
                            <p className={clsx('text-sm', textTokens.warning)}>
                              Le contrat a été créé, mais il n'a pas encore de contenu ou de signature.
                            </p>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className={clsx('w-10 h-10 mx-auto mb-3', textTokens.subtle)} />
                        <p className={textTokens.subtle}>Aucun contrat pour cette réservation</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'audit' && (
                  <div className="space-y-4">
                    {auditTrail.length > 0 ? (
                      <div className="relative">
                        <div className={clsx('absolute left-4 top-0 bottom-0 w-px', surfaceTokens.elevated)} />
                        <div className="space-y-4">
                          {auditTrail.map((entry) => (
                            <div key={entry.id} className="relative pl-10">
                              <div className={clsx('absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-current ring-4 ring-white', textTokens.muted)} />
                              <div className={clsx('rounded-lg p-3', surfaceTokens.subtle)}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={clsx('text-sm font-medium', textTokens.title)}>
                                    {EVENT_LABELS[entry.event_type] || entry.event_type}
                                  </span>
                                  <span className={clsx('text-xs', textTokens.subtle)}>
                                    {formatDate(entry.created_at)}
                                  </span>
                                </div>
                                <div className={clsx('flex flex-wrap gap-2 text-xs', textTokens.subtle)}>
                                  <span className={clsx('rounded border px-2 py-0.5', borderTokens.default, surfaceTokens.panel)}>
                                    {SIGNER_ROLE_LABELS[entry.signer_role] || entry.signer_role}
                                  </span>
                                  {entry.signer_email && (
                                    <span>{entry.signer_email}</span>
                                  )}
                                  {entry.ip_address && entry.ip_address !== 'client-side' && (
                                    <span>IP: {entry.ip_address}</span>
                                  )}
                                </div>
                                {entry.consent_text && (
                                  <p className={clsx('text-[11px] mt-2 italic', textTokens.subtle)}>
                                    "{entry.consent_text}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className={clsx('w-10 h-10 mx-auto mb-3', textTokens.subtle)} />
                        <p className={textTokens.subtle}>Aucun événement d'audit enregistré</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Fermer l'image"
            >
              <X size={28} />
            </button>
            <img
              src={zoomedImage}
              alt="Document en plein écran"
              className="w-full h-full object-contain rounded-lg"
            />
            <a
              href={zoomedImage}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx('absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-lg text-sm font-medium hover:bg-white transition-colors', textTokens.title)}
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={16} />
              Ouvrir l'original
            </a>
          </div>
        </div>
      )}
    </>
  );
}
