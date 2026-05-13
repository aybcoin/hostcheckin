import type { GuestBundle } from './index';

const en = {
  common: {
    loading: 'Loading...',
  },
  app: {
    brand: 'HostCheckIn',
    hostFallbackName: 'Host',
    guestFallbackName: 'Guest',
  },
  reservations: {
    unknownProperty: 'Unknown',
  },
  guestPortal: {
    aria: {
      main: 'Guest portal',
      steps: 'Guest portal steps',
      languageSwitcher: 'Choose language',
    },
    steps: {
      welcome: 'Welcome',
      contract: 'Contract',
      identity: 'Identity',
      confirmation: 'Confirmation',
    },
    welcome: {
      title: 'Welcome, {guestName}!',
      subtitle: 'Your stay at {propertyName}',
      checkin: 'Check-in',
      checkout: 'Check-out',
      hostedBy: 'Hosted by',
      cta: 'Start',
      statusPending: 'Stay in preparation',
      statusReady: 'Stay ready',
    },
    contract: {
      title: 'Stay agreement',
      instruction: 'Please review and sign the agreement before your arrival.',
      clausesSummaryTitle: 'Summary of key clauses',
      legalNotice: 'The French version of the contract (PDF) is the legally binding reference in case of dispute.',
      viewContract: 'View contract (PDF)',
      acceptLabel: 'I have read and accept the stay agreement',
      cta: 'Sign and continue',
      signing: 'Signing...',
      signed: 'Contract signed',
      noContract: 'Your host is finalizing the contract. You can continue afterward.',
    },
    identity: {
      title: 'Identity verification',
      instruction: 'Take a photo of your identity document (national ID card or passport).',
      uploadLabel: 'Choose a photo',
      preview: 'Preview',
      cta: 'Submit',
      uploading: 'Uploading...',
      skipLabel: 'Skip (manual review)',
      manualRequired: 'Manual review required',
      uploaded: 'Document uploaded successfully',
    },
    confirmation: {
      title: 'Your file is complete!',
      subtitle: 'Welcome to {propertyName}',
      contractSigned: 'Contract signed',
      identityVerified: 'Identity verified',
      message: 'Your host has been notified. See you soon!',
    },
    errors: {
      invalidToken: 'Invalid or expired link. Please contact your host.',
      signError: 'Signature failed. Please try again.',
      uploadError: 'Upload failed. Please try again.',
    },
  },
} satisfies GuestBundle;

export default en;
