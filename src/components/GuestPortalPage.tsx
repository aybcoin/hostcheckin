import { clsx } from '../lib/clsx';
import { borderTokens, statusTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { useGuestPortal } from '../hooks/useGuestPortal';
import { GuestLocaleProvider, useGuestT } from '../lib/i18n/guest/context';
import { GuestPortalLayout } from './guest/GuestPortalLayout';
import { GuestStep1Welcome } from './guest/GuestStep1Welcome';
import { GuestStep2Contract } from './guest/GuestStep2Contract';
import { GuestStep3Identity } from './guest/GuestStep3Identity';
import { GuestStepPoliceBulletin } from './guest/GuestStepPoliceBulletin';
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

function GuestPortalPageContent({ routeToken }: GuestPortalPageProps) {
  const t = useGuestT();
  const token = resolveToken(routeToken);
  const {
    session,
    isLoading,
    error,
    currentStep,
    goToStep,
    markContractSigned,
    markIdentityVerified,
    submitPoliceBulletin,
  } = useGuestPortal(token);

  if (isLoading) {
    return (
      <div className={clsx('flex min-h-screen items-center justify-center px-4', surfaceTokens.app)}>
        <div className={clsx('rounded-xl border px-4 py-3 text-sm', borderTokens.default, surfaceTokens.panel, textTokens.body)}>
          {t.common.loading}
        </div>
      </div>
    );
  }

  if (!session || error) {
    return (
      <div className={clsx('flex min-h-screen items-center justify-center px-4', surfaceTokens.app)}>
        <div className={clsx('max-w-md rounded-xl border p-4 text-sm', statusTokens.danger)}>
          {error || t.guestPortal.errors.invalidToken}
        </div>
      </div>
    );
  }

  const steps: ('welcome' | 'contract' | 'identity' | 'police' | 'confirmation')[] = session.policeBulletinEnabled
    ? ['welcome', 'contract', 'identity', 'police', 'confirmation']
    : ['welcome', 'contract', 'identity', 'confirmation'];

  return (
    <GuestPortalLayout currentStep={currentStep} steps={steps} propertyName={session.propertyName}>
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

      {currentStep === 'police' ? (
        <GuestStepPoliceBulletin
          session={session}
          onSubmit={submitPoliceBulletin}
        />
      ) : null}

      {currentStep === 'confirmation' ? (
        <GuestStep4Confirmation propertyName={session.propertyName} />
      ) : null}
    </GuestPortalLayout>
  );
}

export default function GuestPortalPage({ routeToken }: GuestPortalPageProps) {
  return (
    <GuestLocaleProvider>
      <GuestPortalPageContent routeToken={routeToken} />
    </GuestLocaleProvider>
  );
}
