export type GuestPortalStep = 'welcome' | 'contract' | 'identity' | 'police' | 'confirmation';

export interface PoliceBulletinPrefill {
  fullName: string;
  firstName: string;
  dateOfBirth: string | null;
  placeOfBirth: string;
  nationality: string;
  passportNo: string;
  appartNo: string | null;
  arrivalDate: string;
  propertyName: string;
  hostId: string;
  propertyId: string | null;
}

export interface GuestSession {
  token: string;
  reservationId: string;
  guestName: string;
  propertyName: string;
  checkinDate: string;
  checkoutDate: string;
  hostName: string;
  contractUrl: string | null;
  identityVerified: boolean;
  contractSigned: boolean;
  identityRetentionMonths: number;
  policeBulletinEnabled: boolean;
  policeBulletinSubmitted: boolean;
  policePrefill: PoliceBulletinPrefill;
}

export interface GuestPortalState {
  step: GuestPortalStep;
  session: GuestSession | null;
  isLoading: boolean;
  error: string | null;
}
