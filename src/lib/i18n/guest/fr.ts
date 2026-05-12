const fr = {
  common: {
    loading: 'Chargement…',
  },
  app: {
    brand: 'HostCheckIn',
    hostFallbackName: 'Hôte',
    guestFallbackName: 'Voyageur',
  },
  reservations: {
    unknownProperty: 'Inconnu',
  },
  guestPortal: {
    aria: {
      main: 'Portail invité',
      steps: 'Étapes du portail invité',
      languageSwitcher: 'Choisir la langue',
    },
    steps: {
      welcome: 'Bienvenue',
      contract: 'Contrat',
      identity: 'Identité',
      confirmation: 'Confirmation',
    },
    welcome: {
      title: 'Bienvenue, {guestName} !',
      subtitle: 'Votre séjour à {propertyName}',
      checkin: 'Arrivée',
      checkout: 'Départ',
      hostedBy: 'Hébergé par',
      cta: 'Commencer',
      statusPending: 'Séjour en préparation',
      statusReady: 'Séjour prêt',
    },
    contract: {
      title: 'Contrat de séjour',
      instruction: 'Veuillez lire et signer le contrat avant votre arrivée.',
      clausesSummaryTitle: 'Résumé des clauses principales',
      legalNotice: 'La version française du contrat (PDF) fait foi en cas de litige.',
      viewContract: 'Voir le contrat (PDF)',
      acceptLabel: "J'ai lu et j'accepte le contrat de séjour",
      cta: 'Signer et continuer',
      signing: 'Signature...',
      signed: 'Contrat signé',
      noContract: 'Votre hôte finalise le contrat. Vous pouvez continuer ensuite.',
    },
    identity: {
      title: "Vérification d'identité",
      instruction: "Prenez une photo de votre pièce d'identité (carte nationale, passeport).",
      uploadLabel: 'Choisir une photo',
      preview: 'Aperçu',
      cta: 'Envoyer',
      uploading: 'Envoi...',
      skipLabel: 'Passer (vérification manuelle)',
      manualRequired: 'Vérification manuelle requise',
      uploaded: 'Pièce envoyée avec succès',
    },
    confirmation: {
      title: 'Dossier complet !',
      subtitle: 'Bienvenue à {propertyName}',
      contractSigned: 'Contrat signé',
      identityVerified: 'Identité vérifiée',
      message: 'Votre hôte a été notifié. À bientôt !',
    },
    errors: {
      invalidToken: 'Lien invalide ou expiré. Contactez votre hôte.',
      signError: 'Erreur lors de la signature. Réessayez.',
      uploadError: "Erreur lors de l'envoi. Réessayez.",
    },
  },
};

export default fr;
