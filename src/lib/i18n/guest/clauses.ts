import type { GuestLocale } from './index';

export type ClauseSummary = {
  title: string;
  body: string;
};

export const clauses: Record<GuestLocale, ClauseSummary[]> = {
  fr: [
    {
      title: 'Parties au contrat',
      body: "Le contrat lie l'hôte ou son mandataire en qualité de bailleur de courte durée et le voyageur signataire en qualité d'occupant temporaire.",
    },
    {
      title: 'Détails du séjour',
      body: 'Le document récapitule le logement réservé, les dates de séjour et la référence de réservation applicables à votre dossier.',
    },
    {
      title: 'Valeur légale de la signature électronique',
      body: 'La signature électronique apposée dans ce parcours produit des effets juridiques conformément à la loi marocaine 53-05 du 2007-11-30.',
    },
    {
      title: "Vérification d'identité",
      body: "Un contrôle automatisé du document d'identité peut être réalisé avant la signature afin de confirmer la cohérence des informations transmises.",
    },
    {
      title: 'Intégrité du document',
      body: "La version signée est scellée par une empreinte cryptographique SHA-256 afin d'attester l'intégrité du document après signature.",
    },
    {
      title: 'Consentement explicite',
      body: 'Votre consentement résulte de la lecture complète du document, de la case à cocher dédiée et de la signature électronique finale.',
    },
  ],
  en: [
    {
      title: 'Contracting parties',
      body: 'The agreement is entered into between the host or its appointed representative as short-term rental provider and the signing guest as temporary occupant.',
    },
    {
      title: 'Stay details',
      body: 'The document summarizes the booked property, the stay dates, and the reservation reference attached to your file.',
    },
    {
      title: 'Legal effect of the electronic signature',
      body: 'The electronic signature applied in this flow carries legal effect under Moroccan Law 53-05 dated 2007-11-30.',
    },
    {
      title: 'Identity verification',
      body: 'An automated identity check may be completed before signature to confirm the consistency of the submitted information.',
    },
    {
      title: 'Document integrity',
      body: 'The signed version is sealed with a SHA-256 cryptographic fingerprint to confirm the integrity of the document after signature.',
    },
    {
      title: 'Consent',
      body: 'Your consent is captured through full review of the document, an explicit checkbox, and the final electronic signature.',
    },
  ],
  es: [
    {
      title: 'Partes del contrato',
      body: 'El contrato se celebra entre el anfitrión o su representante designado como proveedor de alojamiento de corta estancia y el huésped firmante como ocupante temporal.',
    },
    {
      title: 'Detalles de la estancia',
      body: 'El documento resume la propiedad reservada, las fechas de la estancia y la referencia de reserva asociada a su expediente.',
    },
    {
      title: 'Valor legal de la firma electrónica',
      body: 'La firma electrónica aplicada en este flujo produce efectos jurídicos conforme a la Ley marroquí 53-05 de fecha 2007-11-30.',
    },
    {
      title: 'Verificación de identidad',
      body: 'Antes de la firma puede realizarse una verificación automatizada de identidad para confirmar la coherencia de la información enviada.',
    },
    {
      title: 'Integridad del documento',
      body: 'La versión firmada queda sellada con una huella criptográfica SHA-256 para acreditar la integridad del documento después de la firma.',
    },
    {
      title: 'Consentimiento',
      body: 'Su consentimiento se formaliza mediante la lectura completa del documento, una casilla de aceptación explícita y la firma electrónica final.',
    },
  ],
};
