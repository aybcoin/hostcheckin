export type GuestPortalStep = 'welcome' | 'contract' | 'identity' | 'confirmation';

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
}

export interface GuestPortalState {
  step: GuestPortalStep;
  session: GuestSession | null;
  isLoading: boolean;
  error: string | null;
}
