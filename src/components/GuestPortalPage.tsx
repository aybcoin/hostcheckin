import { clsx } from '../lib/clsx';
import { borderTokens, statusTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { useGuestPortal } from '../hooks/useGuestPortal';
import { fr } from '../lib/i18n/fr';
import { GuestPortalLayout } from './guest/GuestPortalLayout';
import { GuestStep1Welcome } from './guest/GuestStep1Welcome';
import { GuestStep2Contract } from './guest/GuestStep2Contract';
import { GuestStep3Identity } from './guest/GuestStep3Identity';
import { GuestStep4Confirmation } from './guest/GuestStep4Confirmation';

interface GuestPortalPageProps {
  routeToken?: string;
}

function resolveToken(routeToken?: string): string {
  if (routeToken !== undefined) return routeToken.trim();

  const queryToken = new URLSearchParams(window.location.search).get('token');
  if (queryToken?.trim()) return queryToken.trim();

  const pathToken = window.location.pathname.split('/').filter(Boolean).pop();
  return pathToken?.trim() ?? '';
}

export default function GuestPortalPage({ routeToken }: GuestPortalPageProps) {
  const token = resolveToken(routeToken);
  const {
    session,
    isLoading,
    error,
    currentStep,
    goToStep,
    markContractSigned,
    markIdentityVerified,
  } = useGuestPortal(token);

  if (isLoading) {
    return (
      <div className={clsx('flex min-h-screen items-center justify-center px-4', surfaceTokens.app)}>
        <div className={clsx('rounded-xl border px-4 py-3 text-sm', borderTokens.default, surfaceTokens.panel, textTokens.body)}>
          {fr.common.loading}
        </div>
      </div>
    );
  }

  if (!session || error) {
    return (
      <div className={clsx('flex min-h-screen items-center justify-center px-4', surfaceTokens.app)}>
        <div className={clsx('max-w-md rounded-xl border p-4 text-sm', statusTokens.danger)}>
          {error || fr.guestPortal.errors.invalidToken}
        </div>
      </div>
    );
  }

  return (
    <GuestPortalLayout currentStep={currentStep} propertyName={session.propertyName}>
      {currentStep === 'welcome' ? (
        <GuestStep1Welcome
          session={session}
          onStart={() => goToStep(session.contractSigned ? 'identity' : 'contract')}
        />
      ) : null}

      {currentStep === 'contract' ? (
        <GuestStep2Contract
          session={session}
          onSign={markContractSigned}
        />
      ) : null}

      {currentStep === 'identity' ? (
        <GuestStep3Identity
          session={session}
          onVerify={markIdentityVerified}
        />
      ) : null}

      {currentStep === 'confirmation' ? (
        <GuestStep4Confirmation propertyName={session.propertyName} />
      ) : null}
    </GuestPortalLayout>
  );
}
