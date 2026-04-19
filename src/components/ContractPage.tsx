import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Check, X, Trash2, Star, Eye, Save, Info, Download, Shield, Sparkles } from 'lucide-react';
import { Reservation, Property, Contract, ContractTemplate } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { fr } from '../lib/i18n/fr';

interface ContractPageProps {
  reservations: Reservation[];
  properties: Property[];
}

const DEFAULT_TEMPLATE_1 = `CONTRAT DE LOCATION COURTE DURÉE

Entre les soussignés :

Le propriétaire du logement : {{property_name}}
Adresse : {{property_address}}

Et le locataire : {{guest_name}}
Email : {{guest_email}}
Téléphone : {{guest_phone}}

Réservation : {{booking_reference}}

Il a été convenu ce qui suit :

Article 1 - Objet du contrat
Le propriétaire loue au locataire le logement situé à l'adresse suivante :
{{property_address}}

Article 2 - Durée du séjour
Du {{check_in_date}} au {{check_out_date}}
Heure d'arrivée : {{check_in_time}}
Heure de départ : {{check_out_time}}

Article 3 - Capacité d'accueil
Nombre d'occupants déclarés : {{number_of_guests}} personne(s)
Capacité maximum du logement : {{max_guests}} personne(s)
Nombre de chambres : {{rooms_count}}

Article 4 - Règles de la maison
- Respect du voisinage et des horaires de repos (22h - 8h)
- Interdiction de fumer à l'intérieur du logement
- Interdiction d'organiser des fêtes ou événements sans accord préalable
- Les animaux ne sont acceptés qu'avec autorisation préalable du propriétaire
- Maintenir les lieux propres et en bon état

Article 5 - Responsabilités du locataire
Le locataire s'engage à :
- Prendre soin du logement et de son contenu
- Signaler immédiatement toute détérioration ou dysfonctionnement
- Restituer les clés à l'heure convenue
- Laisser le logement dans un état de propreté raisonnable

Fait le {{today_date}}`;

const DEFAULT_TEMPLATE_2 = `CONTRAT DE LOCATION SAISONNIÈRE DÉTAILLÉ

ENTRE LES PARTIES :

LE BAILLEUR :
Propriétaire du logement : {{property_name}}
Adresse du logement : {{property_address}}, {{property_city}}, {{property_country}}

LE LOCATAIRE :
Nom complet : {{guest_name}}
Email : {{guest_email}}
Téléphone : {{guest_phone}}

RÉFÉRENCE DE RÉSERVATION : {{booking_reference}}

PREAMBULE
Le présent contrat est conclu dans le cadre d'une location saisonnière de courte durée. Il définit les droits et obligations de chacune des parties.

ARTICLE 1 - OBJET
Le bailleur met à disposition du locataire le logement décrit ci-dessus, meublé et équipé, pour un usage exclusif d'habitation temporaire.

ARTICLE 2 - DURÉE ET HORAIRES
- Date d'arrivée : {{check_in_date}} à {{check_in_time}}
- Date de départ : {{check_out_date}} à {{check_out_time}}
- Toute prolongation devra faire l'objet d'un accord écrit préalable.

ARTICLE 3 - CAPACITÉ D'ACCUEIL
- Nombre de voyageurs déclarés : {{number_of_guests}}
- Capacité maximale autorisée : {{max_guests}} personnes
- Nombre de chambres : {{rooms_count}}
- Tout dépassement de la capacité maximale est strictement interdit.

ARTICLE 4 - ETAT DES LIEUX
Un état des lieux sera réalisé à l'arrivée et au départ du locataire. Toute dégradation constatée sera à la charge du locataire.

ARTICLE 5 - RÈGLEMENT INTÉRIEUR
Le locataire s'engage à respecter les règles suivantes :
1. Respect du voisinage et des horaires de repos (22h00 - 08h00)
2. Interdiction formelle de fumer dans le logement
3. Interdiction d'organiser des fêtes, soirées ou rassemblements
4. Maintien du logement en bon état de propreté
5. Utilisation responsable des équipements et installations
6. Les animaux ne sont admis qu'avec autorisation écrite préalable
7. Le locataire est responsable de la fermeture des portes et fenêtres

ARTICLE 6 - RESPONSABILITÉ
Le locataire est responsable des dommages causés au logement pendant toute la durée du séjour, qu'ils soient de son fait ou du fait des personnes présentes dans le logement.

ARTICLE 7 - RÉSILIATION
En cas de non-respect des clauses du présent contrat, le bailleur se réserve le droit de résilier immédiatement la location sans remboursement.

ARTICLE 8 - LITIGES
En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.

Fait en deux exemplaires, le {{today_date}}

Signature du bailleur :                    Signature du locataire :`;

const PLACEHOLDERS = [
  { key: '{{property_name}}', label: 'Nom propriété' },
  { key: '{{property_address}}', label: 'Adresse complète' },
  { key: '{{property_city}}', label: 'Ville' },
  { key: '{{property_country}}', label: 'Pays' },
  { key: '{{guest_name}}', label: "Nom invité" },
  { key: '{{guest_email}}', label: "E-mail invité" },
  { key: '{{guest_phone}}', label: "Téléphone invité" },
  { key: '{{check_in_date}}', label: "Date d'arrivée" },
  { key: '{{check_out_date}}', label: 'Date de départ' },
  { key: '{{check_in_time}}', label: "Heure d'arrivée" },
  { key: '{{check_out_time}}', label: 'Heure de départ' },
  { key: '{{number_of_guests}}', label: "Nombre d'invités" },
  { key: '{{max_guests}}', label: 'Capacité max' },
  { key: '{{rooms_count}}', label: 'Nombre chambres' },
  { key: '{{booking_reference}}', label: 'Référence réservation' },
  { key: '{{today_date}}', label: 'Date du jour' },
];

function replaceVars(content: string, props: Property[], reservations: Reservation[]) {
  const p = props[0];
  const r = reservations[0];
  return content
    .replace(/\{\{property_name\}\}/g, p?.name || 'Mon Appartement')
    .replace(/\{\{property_address\}\}/g, p ? `${p.address}, ${p.city}` : '123 Rue Exemple, Paris')
    .replace(/\{\{property_city\}\}/g, p?.city || 'Paris')
    .replace(/\{\{property_country\}\}/g, p?.country || 'France')
    .replace(/\{\{guest_name\}\}/g, 'Jean Dupont')
    .replace(/\{\{guest_email\}\}/g, 'jean@exemple.com')
    .replace(/\{\{guest_phone\}\}/g, fr.contracts.phoneFallback)
    .replace(/\{\{check_in_date\}\}/g, r ? new Date(r.check_in_date).toLocaleDateString('fr-FR') : '15/04/2026')
    .replace(/\{\{check_out_date\}\}/g, r ? new Date(r.check_out_date).toLocaleDateString('fr-FR') : '20/04/2026')
    .replace(/\{\{check_in_time\}\}/g, p?.check_in_time || '15:00')
    .replace(/\{\{check_out_time\}\}/g, p?.check_out_time || '11:00')
    .replace(/\{\{number_of_guests\}\}/g, r ? String(r.number_of_guests) : '2')
    .replace(/\{\{max_guests\}\}/g, p ? String(p.max_guests) : '4')
    .replace(/\{\{rooms_count\}\}/g, p ? String(p.rooms_count) : '2')
    .replace(/\{\{booking_reference\}\}/g, r?.booking_reference || 'BK12345ABC')
    .replace(/\{\{today_date\}\}/g, new Date().toLocaleDateString('fr-FR'));
}

export function ContractPage({ reservations, properties }: ContractPageProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'signed'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [, setPreviewType] = useState<'default1' | 'default2' | 'custom' | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isSigningHost, setIsSigningHost] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeCustomTemplate = templates.find((t) => t.is_default);

  useEffect(() => {
    fetchContracts();
    fetchTemplates();
  }, []);

  const fetchContracts = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setContracts(data);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('contract_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = editingTemplate ? editingTemplate.content : newTemplateContent;
    const newContent = currentContent.substring(0, start) + placeholder + currentContent.substring(end);

    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, content: newContent });
    } else {
      setNewTemplateContent(newContent);
    }
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await supabase
          .from('contract_templates')
          .update({ name: editingTemplate.name, content: editingTemplate.content, updated_at: new Date().toISOString() })
          .eq('id', editingTemplate.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('contract_templates').insert({
          host_id: user.id,
          name: newTemplateName,
          content: newTemplateContent,
          is_default: templates.length === 0,
        });
        setNewTemplateName('');
        setNewTemplateContent('');
      }
      setEditingTemplate(null);
      setShowEditor(false);
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Supprimer ce modèle de contrat ?')) return;
    await supabase.from('contract_templates').delete().eq('id', id);
    fetchTemplates();
  };

  const setDefaultTemplate = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('contract_templates').update({ is_default: false }).eq('host_id', user.id);
    await supabase.from('contract_templates').update({ is_default: true }).eq('id', id);
    fetchTemplates();
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
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [isDrawing]);

  const handlePointerUp = useCallback(() => setIsDrawing(false), []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedReservation) return;
    const signatureDataUrl = canvas.toDataURL();
    const reservation = reservations.find((r) => r.id === selectedReservation);
    if (!reservation) return;

    const defaultTemplate = templates.find((t) => t.is_default);
    const { data: existingContract, error: existingContractError } = await supabase
      .from('contracts')
      .select('id, locked')
      .eq('reservation_id', selectedReservation)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingContractError) {
      console.error('Error loading contract before host signature:', existingContractError);
      alert("Impossible de charger le contrat existant.");
      return;
    }

    if (existingContract?.locked) {
      alert("Ce contrat est déjà scellé et ne peut plus être modifié.");
      return;
    }

    let contractId: string | null = null;

    if (existingContract) {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          signed_by_host: true,
          host_signature_url: signatureDataUrl,
          template_id: defaultTemplate?.id || null,
        })
        .eq('id', existingContract.id);

      if (updateError) {
        console.error('Error updating contract with host signature:', updateError);
        alert("Impossible d'enregistrer la signature du propriétaire.");
        return;
      }
      contractId = existingContract.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('contracts')
        .insert({
          reservation_id: selectedReservation,
          property_id: reservation.property_id,
          contract_type: 'rental_agreement',
          pdf_url: 'pending',
          signed_by_host: true,
          signed_by_guest: false,
          host_signature_url: signatureDataUrl,
          template_id: defaultTemplate?.id || null,
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        console.error('Error creating contract with host signature:', insertError);
        alert("Impossible de créer le contrat du propriétaire.");
        return;
      }
      contractId = inserted.id;
    }

    // Log the host signature audit event (server-side IP + UA capture).
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-audit-event`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            contract_id: contractId,
            reservation_id: selectedReservation,
            event_type: 'contract_signed_host',
            signer_role: 'host',
            consent_text:
              "Le propriétaire confirme avoir signé électroniquement le contrat conformément à la Loi marocaine 53-05.",
            metadata: { source: 'host_dashboard' },
          }),
        },
      );
    } catch (auditErr) {
      console.warn('Host signature audit log failed:', auditErr);
    }

    // Regenerate the PDF so that it embeds the host signature. The edge
    // function seals (locks) the contract only once BOTH parties have signed.
    if (contractId) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract-pdf`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              contract_id: contractId,
              reservation_id: selectedReservation,
            }),
          },
        );
        if (!resp.ok) {
          const err = await resp.text().catch(() => '');
          console.warn('PDF regeneration after host signature failed:', resp.status, err);
        }
      } catch (pdfErr) {
        console.warn('PDF regeneration error:', pdfErr);
      }
    }

    setIsSigningHost(false);
    setSelectedReservation(null);
    clearSignature();
    fetchContracts();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');
  const isEditing = editingTemplate !== null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion des Contrats</h1>
          {activeCustomTemplate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-medium">
              <Check size={12} />
              Contrat personnalisé actif
            </span>
          )}
        </div>
        <p className="text-gray-600 mt-1">Gérez vos contrats de location et personnalisez-les selon vos besoins</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
          >
          Modèles de contrat
        </button>
        <button
          onClick={() => setActiveTab('signed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'signed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Contrats signés ({contracts.length})
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-gray-900">Contrat par défaut type 1</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4 flex-1">Contrat standard préfiguré avec les clauses essentielles pour une location courte durée.</p>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => { setPreviewContent(replaceVars(DEFAULT_TEMPLATE_1, properties, reservations)); setPreviewType('default1'); setShowPreview(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye size={14} />
                  Voir
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Download size={14} />
                  PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col relative">
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                Nouveau
              </span>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-gray-900">Contrat par défaut type 2</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4 flex-1">Contrat détaillé avec clauses de sécurité, règlement intérieur complet et responsabilités.</p>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => { setPreviewContent(replaceVars(DEFAULT_TEMPLATE_2, properties, reservations)); setPreviewType('default2'); setShowPreview(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye size={14} />
                  Voir
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Download size={14} />
                  PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">Mon propre contrat</h3>
              </div>
              {templates.length > 0 ? (
                <>
                  <div className="flex-1 space-y-2 mb-4">
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {t.is_default && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                          <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!t.is_default && (
                            <button onClick={() => setDefaultTemplate(t.id)} className="p-1 text-gray-400 hover:text-amber-500" title="Activer">
                              <Star size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingTemplate(t); setShowEditor(true); }}
                            className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded"
                          >
                            Modifier
                          </button>
                          <button onClick={() => deleteTemplate(t.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Dernière modification : {formatDate(templates[0].updated_at)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 mb-4 flex-1">Créez votre propre contrat personnalisé avec vos clauses spécifiques.</p>
              )}
              <button
                onClick={() => { setEditingTemplate(null); setNewTemplateName(''); setNewTemplateContent(''); setShowEditor(true); }}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                {templates.length > 0 ? 'Ajouter un modèle' : 'Créer mon contrat'}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Comment utiliser les contrats</h4>
                <p className="text-sm text-slate-700 mb-3">
                  Les contrats sont automatiquement présentés aux invités lors du check-in. Le contrat actif sera utilisé pour toutes les nouvelles réservations.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PLACEHOLDERS.slice(0, 8).map((p) => (
                    <span key={p.key} className="text-xs bg-white/70 text-slate-700 rounded px-2 py-1 font-mono">{p.key}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {showEditor && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {isEditing ? `Modifier : ${editingTemplate!.name}` : 'Nouveau modèle'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const content = isEditing ? editingTemplate!.content : newTemplateContent;
                      setPreviewContent(replaceVars(content, properties, reservations));
                      setPreviewType('custom');
                      setShowPreview(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Aperçu
                  </button>
                  <button onClick={() => { setEditingTemplate(null); setShowEditor(false); }} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du modèle</label>
                  <input
                    type="text"
                    value={isEditing ? editingTemplate!.name : newTemplateName}
                    onChange={(e) => isEditing ? setEditingTemplate({ ...editingTemplate!, name: e.target.value }) : setNewTemplateName(e.target.value)}
                    placeholder="Ex: Contrat standard, Contrat longue durée..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-300 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variables disponibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => insertPlaceholder(p.key)}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors border border-slate-200"
                        title={p.label}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenu du contrat</label>
                  <textarea
                    ref={textareaRef}
                    value={isEditing ? editingTemplate!.content : newTemplateContent}
                    onChange={(e) => isEditing ? setEditingTemplate({ ...editingTemplate!, content: e.target.value }) : setNewTemplateContent(e.target.value)}
                    rows={18}
                    placeholder="Rédigez votre contrat ici... Utilisez les variables ci-dessus pour insérer automatiquement les informations."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-300 outline-none font-mono text-sm leading-relaxed"
                  />
                </div>
                <div className="flex gap-3">
                  {!isEditing && !newTemplateContent && (
                    <button
                      onClick={() => { setNewTemplateName('Contrat standard'); setNewTemplateContent(DEFAULT_TEMPLATE_1); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Utiliser le modèle par défaut
                    </button>
                  )}
                  <button
                    onClick={saveTemplate}
                    disabled={saving || !(isEditing ? editingTemplate!.name && editingTemplate!.content : newTemplateName && newTemplateContent)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 text-sm ml-auto"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'signed' && (
        <div className="space-y-4">
          {isSigningHost && selectedReservation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Signer le contrat</h2>
                  <button onClick={() => { setIsSigningHost(false); setSelectedReservation(null); clearSignature(); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-5">
                  {(() => {
                    const reservation = reservations.find((r) => r.id === selectedReservation);
                    const property = properties.find((p) => p.id === reservation?.property_id);
                    if (!reservation || !property) return null;
                    const tpl = templates.find((t) => t.is_default);
                    const text = tpl
                      ? replaceVars(tpl.content, [property], [reservation])
                      : `Contrat pour ${property.name}\nRéservation : ${reservation.booking_reference}`;
                    return (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{text}</pre>
                      </div>
                    );
                  })()}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Signature du propriétaire</label>
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
                    <button onClick={clearSignature} className="mt-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                      Effacer
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveSignature} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800">
                      <Check className="w-5 h-5" />
                      Signer et enregistrer
                    </button>
                    <button onClick={() => { setIsSigningHost(false); setSelectedReservation(null); clearSignature(); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200">
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {templates.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                Vous n'avez pas encore de modèle de contrat. Créez-en un dans l'onglet "Modèles de contrat" pour pouvoir émettre des contrats.
              </p>
            </div>
          )}

          {reservations.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucune réservation disponible</p>
            </div>
          ) : (
            reservations.map((reservation) => {
              const property = properties.find((p) => p.id === reservation.property_id);
              const contract = contracts.find((c) => c.reservation_id === reservation.id);
              return (
                <div key={reservation.id} className="bg-white rounded-lg shadow-sm border p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-slate-700" />
                        <div>
                          <p className="font-bold text-gray-900">{reservation.booking_reference}</p>
                          <p className="text-sm text-gray-600">{property?.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm text-gray-600">
                        <span>Arrivée : {formatDate(reservation.check_in_date)}</span>
                        <span>Départ : {formatDate(reservation.check_out_date)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {contract ? (
                        <>
                          <span className="px-3 py-1.5 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium flex items-center gap-1.5">
                            <Check className="w-4 h-4" />
                            Contrat signé
                          </span>
                          <div className="flex gap-3 text-xs text-gray-500">
                            {contract.signed_by_host && <span>Bailleur (émetteur)</span>}
                            {contract.signed_by_guest && <span>Locataire (signataire)</span>}
                          </div>
                          {contract.pdf_storage_path && (
                            <button
                              disabled={downloadingPdfId === contract.id}
                              onClick={async () => {
                                setDownloadingPdfId(contract.id);
                                try {
                                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                  const session = (await supabase.auth.getSession()).data.session;
                                  const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
                                  const resp = await fetch(
                                    `${supabaseUrl}/functions/v1/download-contract-pdf?contract_id=${contract.id}`,
                                    { headers: { Authorization: `Bearer ${token}` } },
                                  );
                                  if (!resp.ok) {
                                    const errText = await resp.text().catch(() => '');
                                    if (resp.status === 409) {
                                      alert("Erreur d'intégrité : le PDF semble avoir été modifié. Contactez le support.");
                                    } else {
                                      alert('Erreur lors du téléchargement du PDF. Veuillez réessayer.');
                                    }
                                    console.error(`PDF download failed (${resp.status}):`, errText);
                                    return;
                                  }
                                  const blob = await resp.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `contrat_${reservation.booking_reference}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error('PDF download error:', err);
                                  alert('Erreur réseau lors du téléchargement. Vérifiez votre connexion.');
                                } finally {
                                  setDownloadingPdfId(null);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200 disabled:opacity-50"
                            >
                              <Download size={12} className={downloadingPdfId === contract.id ? 'animate-bounce' : ''} />
                              {downloadingPdfId === contract.id ? '...' : 'PDF'}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => { setSelectedReservation(reservation.id); setIsSigningHost(true); }}
                          disabled={templates.length === 0}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm disabled:opacity-40"
                        >
                          Créer et valider
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Apercu du contrat</h2>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{previewContent}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
