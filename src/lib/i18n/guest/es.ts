import type { GuestBundle } from './index';

const es = {
  common: {
    loading: 'Cargando...',
  },
  app: {
    brand: 'HostCheckIn',
    hostFallbackName: 'Anfitrión',
    guestFallbackName: 'Huésped',
  },
  reservations: {
    unknownProperty: 'Desconocida',
  },
  guestPortal: {
    aria: {
      main: 'Portal del huésped',
      steps: 'Pasos del portal del huésped',
      languageSwitcher: 'Elegir idioma',
    },
    steps: {
      welcome: 'Bienvenida',
      contract: 'Contrato',
      identity: 'Identidad',
      confirmation: 'Confirmación',
    },
    welcome: {
      title: 'Bienvenido, {guestName}.',
      subtitle: 'Su estancia en {propertyName}',
      checkin: 'Llegada',
      checkout: 'Salida',
      hostedBy: 'Alojado por',
      cta: 'Comenzar',
      statusPending: 'Estancia en preparación',
      statusReady: 'Estancia lista',
    },
    contract: {
      title: 'Contrato de estancia',
      instruction: 'Le pedimos que lea y firme el contrato antes de su llegada.',
      clausesSummaryTitle: 'Resumen de las cláusulas principales',
      legalNotice: 'La versión francesa del contrato (PDF) es la referencia jurídicamente vinculante en caso de litigio.',
      viewContract: 'Ver contrato (PDF)',
      acceptLabel: 'He leído y acepto el contrato de estancia',
      cta: 'Firmar y continuar',
      signing: 'Firmando...',
      signed: 'Contrato firmado',
      noContract: 'Su anfitrión está finalizando el contrato. Puede continuar después.',
    },
    identity: {
      title: 'Verificación de identidad',
      instruction: 'Tome una foto de su documento de identidad (documento nacional o pasaporte).',
      uploadLabel: 'Elegir una foto',
      preview: 'Vista previa',
      cta: 'Enviar',
      uploading: 'Enviando...',
      skipLabel: 'Omitir (revisión manual)',
      manualRequired: 'Se requiere revisión manual',
      uploaded: 'Documento enviado correctamente',
    },
    confirmation: {
      title: 'Su expediente está completo.',
      subtitle: 'Bienvenido a {propertyName}',
      contractSigned: 'Contrato firmado',
      identityVerified: 'Identidad verificada',
      message: 'Su anfitrión ha sido notificado. Hasta pronto.',
    },
    errors: {
      invalidToken: 'Enlace no válido o vencido. Comuníquese con su anfitrión.',
      signError: 'Se produjo un error al firmar. Inténtelo de nuevo.',
      uploadError: 'Se produjo un error al enviar. Inténtelo de nuevo.',
    },
  },
} satisfies GuestBundle;

export default es;
