import { useState, useEffect } from 'react';
import {
  X, FileText, User, Camera, PenTool, Download, ExternalLink, Loader2,
  AlertCircle, ShieldCheck, ShieldX, Clock, Activity, Hash
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SecurityNotice } from './SecurityNotice';

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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Documents du check-in</h2>
              <p className="text-sm text-gray-500 mt-0.5">Réservation {bookingReference}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : !hasIdentityDocs && !hasContract && auditTrail.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-600 text-center font-medium">Aucun document soumis</p>
              <p className="text-sm text-gray-400 text-center mt-1">
                Le client n'a pas encore complété son check-in en ligne.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 bg-gray-100 p-1 mx-4 sm:mx-5 mt-4 rounded-lg shrink-0">
                <button
                  onClick={() => setActiveTab('identity')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'identity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User size={16} />
                  <span>Identité</span>
                </button>
                <button
                  onClick={() => setActiveTab('contract')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'contract' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText size={16} />
                  <span>Contrat</span>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Activity size={16} />
                  <span>Audit</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {activeTab === 'identity' && (
                  <div className="space-y-5">
                    {verification ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                            verification.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : verification.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {verification.status === 'approved' ? (
                              <><ShieldCheck size={12} /> Vérifiée</>
                            ) : verification.status === 'rejected' ? (
                              <><ShieldX size={12} /> Rejetée</>
                            ) : (
                              <><Clock size={12} /> En attente</>
                            )}
                          </span>
                          <span className="text-sm text-gray-500">
                            {ID_TYPE_LABELS[verification.id_type] || ID_TYPE_LABELS[verification.detected_document_type || ''] || verification.id_type}
                          </span>
                          <span className="text-xs text-gray-400">
                            Soumis le {formatDate(verification.created_at)}
                          </span>
                        </div>

                        {confidencePercent !== null && (
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Score de confiance KYC</span>
                              <span className={`text-sm font-bold ${
                                confidencePercent >= 70 ? 'text-green-600' : confidencePercent >= 40 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {confidencePercent}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  confidencePercent >= 70 ? 'bg-green-500' : confidencePercent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${confidencePercent}%` }}
                              />
                            </div>
                            {verification.face_match_score != null && verification.face_match_score > 0 && (
                              <p className="text-xs text-gray-500">
                                Correspondance faciale : {Math.round(verification.face_match_score * 100)}%
                              </p>
                            )}
                          </div>
                        )}

                        {verification.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800 font-medium">Raison du rejet :</p>
                            <p className="text-sm text-red-700 mt-1">{verification.rejection_reason}</p>
                          </div>
                        )}

                        {verification.ocr_data?.declared_name && (
                          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-500">Nom déclaré</p>
                              <p className="text-sm font-medium text-gray-900">{verification.ocr_data.declared_name}</p>
                            </div>
                            {verification.ocr_data.document_number && (
                              <div>
                                <p className="text-xs text-gray-500">N. document</p>
                                <p className="text-sm font-medium text-gray-900">{verification.ocr_data.document_number}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <SecurityNotice />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {isValidUrl(verification.id_document_url) && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Recto</p>
                              <div
                                className="relative group secure-document-preview rounded-lg overflow-hidden border border-gray-200 cursor-pointer bg-gray-50"
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
                              <p className="text-sm font-medium text-gray-700 mb-2">Verso</p>
                              <div
                                className="relative group secure-document-preview rounded-lg overflow-hidden border border-gray-200 cursor-pointer bg-gray-50"
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
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                              <Camera size={16} />
                              Selfie
                            </p>
                            <div
                              className="relative group secure-document-preview rounded-lg overflow-hidden border border-gray-200 cursor-pointer bg-gray-50 max-w-xs"
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
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-800">
                              Les documents ont été soumis, mais les fichiers ne sont pas disponibles.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Aucune vérification d'identité soumise</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'contract' && (
                  <div className="space-y-5">
                    {contract ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                            contract.signed_by_guest
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {contract.signed_by_guest
                              ? 'Contrat émis par le bailleur et signé électroniquement par le locataire'
                              : 'Contrat émis par le bailleur'}
                          </span>
                          {contract.signed_at && (
                            <span className="text-xs text-gray-400">
                              Signé le {formatDate(contract.signed_at)}
                            </span>
                          )}
                        </div>

                        {contract.pdf_storage_path && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="w-8 h-8 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-blue-900">Contrat PDF disponible</p>
                                {contract.content_hash && (
                                  <p className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5">
                                    <Hash size={10} />
                                    SHA-256: {contract.content_hash.substring(0, 16)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={handleDownloadPdf}
                              disabled={downloadingPdf}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {downloadingPdf ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                              Télécharger le PDF
                            </button>
                          </div>
                        )}

                        {contract.contract_content && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                              <FileText size={16} />
                              Contenu du contrat
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto border border-gray-200">
                              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                                {contract.contract_content}
                              </pre>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {contract.host_signature_url && contract.host_signature_url.startsWith('data:') && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <PenTool size={14} />
                                Validation du bailleur
                              </p>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <img
                                  src={contract.host_signature_url}
                                  alt="Validation du bailleur"
                                  className="w-full h-24 object-contain"
                                />
                              </div>
                            </div>
                          )}

                          {contract.guest_signature_url && contract.guest_signature_url.startsWith('data:') && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <PenTool size={14} />
                                Signature du locataire
                              </p>
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <img
                                  src={contract.guest_signature_url}
                                  alt="Signature du locataire"
                                  className="w-full h-24 object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {!contract.contract_content && !contract.guest_signature_url && !contract.host_signature_url && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-800">
                              Le contrat a été créé, mais il n'a pas encore de contenu ou de signature.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Aucun contrat pour cette réservation</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'audit' && (
                  <div className="space-y-4">
                    {auditTrail.length > 0 ? (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                        <div className="space-y-4">
                          {auditTrail.map((entry) => (
                            <div key={entry.id} className="relative pl-10">
                              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {EVENT_LABELS[entry.event_type] || entry.event_type}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {formatDate(entry.created_at)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                  <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
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
                                  <p className="text-[11px] text-gray-400 mt-2 italic">
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
                        <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Aucun événement d'audit enregistré</p>
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
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
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
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 text-gray-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
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
