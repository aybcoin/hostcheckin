import { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Check, X, Trash2, Star, Eye, Save, Info, Download, Shield, Sparkles } from 'lucide-react';
import { Reservation, Property, Contract, ContractTemplate } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { clsx } from '../lib/clsx';
import { fr } from '../lib/i18n/fr';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import {
  borderTokens,
  iconButtonToken,
  inputTokens,
  modalTokens,
  stateFillTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';

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
  { key: '{{property_name}}', label: 'Nom logement' },
  { key: '{{property_address}}', label: 'Adresse complète' },
  { key: '{{property_city}}', label: 'Ville' },
  { key: '{{property_country}}', label: 'Pays' },
  { key: '{{guest_name}}', label: "Nom voyageur" },
  { key: '{{guest_email}}', label: "E-mail voyageur" },
  { key: '{{guest_phone}}', label: "Téléphone voyageur" },
  { key: '{{check_in_date}}', label: "Date d'arrivée" },
  { key: '{{check_out_date}}', label: 'Date de départ' },
  { key: '{{check_in_time}}', label: "Heure d'arrivée" },
  { key: '{{check_out_time}}', label: 'Heure de départ' },
  { key: '{{number_of_guests}}', label: "Nombre de voyageurs" },
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
          <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>Gestion des Contrats</h1>
          {activeCustomTemplate && (
            <Badge variant="active" className="gap-1.5">
              <Check size={12} />
              Contrat personnalisé actif
            </Badge>
          )}
        </div>
        <p className={clsx('mt-1', textTokens.muted)}>Gérez vos contrats de location et personnalisez-les selon vos besoins</p>
      </div>

      <div className={clsx('flex gap-1 p-1 rounded-lg w-fit', surfaceTokens.muted)}>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            aria-pressed={activeTab === 'templates'}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
              activeTab === 'templates'
                ? clsx(surfaceTokens.panel, textTokens.title, 'shadow-sm')
                : clsx(textTokens.muted, 'hover:bg-white/70'),
            )}
          >
          Modèles de contrat
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('signed')}
          aria-pressed={activeTab === 'signed'}
          className={clsx(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
            activeTab === 'signed'
              ? clsx(surfaceTokens.panel, textTokens.title, 'shadow-sm')
              : clsx(textTokens.muted, 'hover:bg-white/70'),
          )}
        >
          Contrats signés ({contracts.length})
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="default" className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <FileText className={clsx('w-5 h-5', textTokens.muted)} />
                <h3 className={clsx('font-semibold', textTokens.title)}>Contrat par défaut type 1</h3>
              </div>
              <p className={clsx('text-sm mb-4 flex-1', textTokens.subtle)}>Contrat standard préfiguré avec les clauses essentielles pour une location courte durée.</p>
              <div className="flex gap-2 mt-auto">
                <Button
                  onClick={() => { setPreviewContent(replaceVars(DEFAULT_TEMPLATE_1, properties, reservations)); setPreviewType('default1'); setShowPreview(true); }}
                  variant="secondary"
                  size="sm"
                >
                  <Eye size={14} />
                  Voir
                </Button>
                <Button variant="secondary" size="sm">
                  <Download size={14} />
                  PDF
                </Button>
              </div>
            </Card>

            <Card variant="highlight" className="flex flex-col relative">
              <Badge variant="neutral" className="absolute top-3 right-3 gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold">
                <Sparkles size={10} />
                Nouveau
              </Badge>
              <div className="flex items-center gap-2 mb-3">
                <Shield className={clsx('w-5 h-5', textTokens.muted)} />
                <h3 className={clsx('font-semibold', textTokens.title)}>Contrat par défaut type 2</h3>
              </div>
              <p className={clsx('text-sm mb-4 flex-1', textTokens.subtle)}>Contrat détaillé avec clauses de sécurité, règlement intérieur complet et responsabilités.</p>
              <div className="flex gap-2 mt-auto">
                <Button
                  onClick={() => { setPreviewContent(replaceVars(DEFAULT_TEMPLATE_2, properties, reservations)); setPreviewType('default2'); setShowPreview(true); }}
                  variant="secondary"
                  size="sm"
                >
                  <Eye size={14} />
                  Voir
                </Button>
                <Button variant="secondary" size="sm">
                  <Download size={14} />
                  PDF
                </Button>
              </div>
            </Card>

            <Card variant="default" className={clsx('flex flex-col border-2 border-dashed', borderTokens.strong)}>
              <div className="flex items-center gap-2 mb-3">
                <Star className={clsx('w-5 h-5 fill-current', textTokens.warning)} />
                <h3 className={clsx('font-semibold', textTokens.title)}>Mon propre contrat</h3>
              </div>
              {templates.length > 0 ? (
                <>
                  <div className="flex-1 space-y-2 mb-4">
                    {templates.map((t) => (
                      <div key={t.id} className={clsx('flex items-center justify-between rounded-lg p-2.5', surfaceTokens.subtle)}>
                        <div className="flex items-center gap-2 min-w-0">
                          {t.is_default && <Star size={12} className={clsx('fill-current shrink-0', textTokens.warning)} />}
                          <span className={clsx('text-sm font-medium truncate', textTokens.title)}>{t.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!t.is_default && (
                            <button type="button" onClick={() => setDefaultTemplate(t.id)} className={iconButtonToken} aria-label={`Activer le modèle ${t.name}`}>
                              <Star size={14} aria-hidden="true" />
                            </button>
                          )}
                          <Button
                            onClick={() => { setEditingTemplate(t); setShowEditor(true); }}
                            variant="tertiary"
                            size="sm"
                          >
                            Modifier
                          </Button>
                          <button type="button" onClick={() => deleteTemplate(t.id)} className={clsx(iconButtonToken, textTokens.danger, 'hover:bg-white/70')} aria-label={`Supprimer le modèle ${t.name}`}>
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={clsx('text-[11px] mb-3', textTokens.subtle)}>
                    Dernière modification : {formatDate(templates[0].updated_at)}
                  </p>
                </>
              ) : (
                <p className={clsx('text-sm mb-4 flex-1', textTokens.subtle)}>Créez votre propre contrat personnalisé avec vos clauses spécifiques.</p>
              )}
              <Button
                onClick={() => { setEditingTemplate(null); setNewTemplateName(''); setNewTemplateContent(''); setShowEditor(true); }}
                variant="primary"
                className="w-full"
              >
                {templates.length > 0 ? 'Ajouter un modèle' : 'Créer mon contrat'}
              </Button>
            </Card>
          </div>

          <Card variant="ghost" padding="md">
            <div className="flex items-start gap-3">
              <Info className={clsx('w-5 h-5 shrink-0 mt-0.5', textTokens.muted)} />
              <div>
                <h4 className={clsx('font-semibold mb-2', textTokens.title)}>Comment utiliser les contrats</h4>
                <p className={clsx('text-sm mb-3', textTokens.body)}>
                  Les contrats sont automatiquement présentés aux voyageurs lors du check-in. Le contrat actif sera utilisé pour toutes les nouvelles réservations.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PLACEHOLDERS.slice(0, 8).map((p) => (
                    <span key={p.key} className={clsx('text-xs bg-white/70 rounded px-2 py-1 font-mono', textTokens.body)}>{p.key}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {showEditor && (
            <Card variant="default" padding="sm" className="overflow-hidden p-0">
              <div className={clsx('p-4 border-b flex items-center justify-between', surfaceTokens.subtle, borderTokens.default)}>
                <h3 className={clsx('font-semibold', textTokens.title)}>
                  {isEditing ? `Modifier : ${editingTemplate!.name}` : 'Nouveau modèle'}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const content = isEditing ? editingTemplate!.content : newTemplateContent;
                      setPreviewContent(replaceVars(content, properties, reservations));
                      setPreviewType('custom');
                      setShowPreview(true);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    <Eye className="w-4 h-4" />
                    Aperçu
                  </Button>
                  <button type="button" aria-label="Fermer l'éditeur de modèle" onClick={() => { setEditingTemplate(null); setShowEditor(false); }} className={iconButtonToken}>
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className={clsx('block text-sm font-medium mb-1', textTokens.body)}>Nom du modèle</label>
                  <input
                    type="text"
                    value={isEditing ? editingTemplate!.name : newTemplateName}
                    onChange={(e) => isEditing ? setEditingTemplate({ ...editingTemplate!, name: e.target.value }) : setNewTemplateName(e.target.value)}
                    placeholder="Ex: Contrat standard, Contrat longue durée..."
                    className={inputTokens.base}
                  />
                </div>
                <div>
                  <label className={clsx('block text-sm font-medium mb-1', textTokens.body)}>Variables disponibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((p) => (
                      <Button
                        key={p.key}
                        onClick={() => insertPlaceholder(p.key)}
                        variant="secondary"
                        size="sm"
                        title={p.label}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={clsx('block text-sm font-medium mb-1', textTokens.body)}>Contenu du contrat</label>
                  <textarea
                    ref={textareaRef}
                    value={isEditing ? editingTemplate!.content : newTemplateContent}
                    onChange={(e) => isEditing ? setEditingTemplate({ ...editingTemplate!, content: e.target.value }) : setNewTemplateContent(e.target.value)}
                    rows={18}
                    placeholder="Rédigez votre contrat ici... Utilisez les variables ci-dessus pour insérer automatiquement les informations."
                    className={`${inputTokens.base} font-mono leading-relaxed`}
                  />
                </div>
                <div className="flex gap-3">
                  {!isEditing && !newTemplateContent && (
                    <Button
                      onClick={() => { setNewTemplateName('Contrat standard'); setNewTemplateContent(DEFAULT_TEMPLATE_1); }}
                      variant="secondary"
                      size="sm"
                    >
                      <FileText className="w-4 h-4" />
                      Utiliser le modèle par défaut
                    </Button>
                  )}
                  <Button
                    onClick={saveTemplate}
                    disabled={saving || !(isEditing ? editingTemplate!.name && editingTemplate!.content : newTemplateName && newTemplateContent)}
                    variant="primary"
                    size="sm"
                    className="ml-auto"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'signed' && (
        <div className="space-y-4">
          {isSigningHost && selectedReservation && (
            <div className={modalTokens.overlay}>
              <div className={`${modalTokens.panel} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
                <div className={clsx('p-5 border-b flex items-center justify-between', borderTokens.default)}>
                  <h2 className={clsx('text-xl font-bold', textTokens.title)}>Signer le contrat</h2>
                  <button type="button" aria-label="Fermer la fenêtre de signature" onClick={() => { setIsSigningHost(false); setSelectedReservation(null); clearSignature(); }} className={iconButtonToken}>
                    <X className="w-5 h-5" aria-hidden="true" />
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
                      <Card variant="ghost" className="max-h-64 overflow-y-auto">
                        <pre className={clsx('text-sm whitespace-pre-wrap font-sans', textTokens.body)}>{text}</pre>
                      </Card>
                    );
                  })()}
                  <div>
                    <label className={clsx('block text-sm font-medium mb-2', textTokens.body)}>Signature du propriétaire</label>
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
                      className={clsx('border-2 rounded-lg w-full bg-white', borderTokens.strong)}
                      style={{ touchAction: 'none' }}
                    />
                    <Button onClick={clearSignature} variant="secondary" size="sm" className="mt-1.5">
                      Effacer
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={saveSignature} variant="primary" className="flex-1">
                      <Check className="w-5 h-5" />
                      Signer et enregistrer
                    </Button>
                    <Button
                      onClick={() => { setIsSigningHost(false); setSelectedReservation(null); clearSignature(); }}
                      variant="secondary"
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {templates.length === 0 && (
            <Card variant="warning" padding="md">
              <p className={clsx('text-sm', textTokens.warning)}>
                Vous n'avez pas encore de modèle de contrat. Créez-en un dans l'onglet "Modèles de contrat" pour pouvoir émettre des contrats.
              </p>
            </Card>
          )}

          {reservations.length === 0 ? (
            <Card variant="default" padding="lg" className="text-center">
              <FileText className={clsx('w-12 h-12 mx-auto mb-4', textTokens.subtle)} />
              <p className={textTokens.muted}>Aucune réservation disponible</p>
            </Card>
          ) : (
            reservations.map((reservation) => {
              const property = properties.find((p) => p.id === reservation.property_id);
              const contract = contracts.find((c) => c.reservation_id === reservation.id);
              return (
                <Card key={reservation.id} variant="default" className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className={clsx('w-5 h-5', textTokens.muted)} />
                        <div>
                          <p className={clsx('font-bold', textTokens.title)}>{reservation.booking_reference}</p>
                          <p className={clsx('text-sm', textTokens.muted)}>{property?.name}</p>
                        </div>
                      </div>
                      <div className={clsx('flex gap-6 text-sm', textTokens.muted)}>
                        <span>Arrivée : {formatDate(reservation.check_in_date)}</span>
                        <span>Départ : {formatDate(reservation.check_out_date)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {contract ? (
                        <>
                          <span className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5', stateFillTokens.neutral, textTokens.body)}>
                            <Check className="w-4 h-4" />
                            Contrat signé
                          </span>
                          <div className={clsx('flex gap-3 text-xs', textTokens.subtle)}>
                            {contract.signed_by_host && <span>Bailleur (émetteur)</span>}
                            {contract.signed_by_guest && <span>Locataire (signataire)</span>}
                          </div>
                          {contract.pdf_storage_path && (
                            <Button
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
                                      alert('Erreur lors du téléchargement du PDF. Réessayez.');
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
                              variant="secondary"
                              size="sm"
                            >
                              <Download size={12} className={downloadingPdfId === contract.id ? 'animate-bounce' : ''} />
                              {downloadingPdfId === contract.id ? '...' : 'PDF'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() => { setSelectedReservation(reservation.id); setIsSigningHost(true); }}
                          disabled={templates.length === 0}
                          variant="secondary"
                          size="sm"
                        >
                          Créer et valider
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {showPreview && (
        <div className={modalTokens.overlay} onClick={() => setShowPreview(false)}>
          <div className={`${modalTokens.panel} max-w-3xl flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className={clsx('p-5 border-b flex items-center justify-between shrink-0', borderTokens.default)}>
              <h2 className={clsx('text-lg font-bold', textTokens.title)}>Apercu du contrat</h2>
              <button type="button" aria-label="Fermer l'aperçu du contrat" onClick={() => setShowPreview(false)} className={iconButtonToken}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className={clsx('whitespace-pre-wrap font-sans text-sm leading-relaxed', textTokens.body)}>{previewContent}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
