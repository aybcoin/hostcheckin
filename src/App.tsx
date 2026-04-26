import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from './lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from './lib/design-tokens';
import { useAuth } from './hooks/useAuth';
import { useHost } from './hooks/useHost';
import { useOnboarding } from './hooks/useOnboarding';
import { useProperties } from './hooks/useProperties';
import { useReservations } from './hooks/useReservations';
import { AuthForm } from './components/AuthForm';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { TopNavigation } from './components/TopNavigation';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/ToastContainer';
import { APP_PAGE_PATHS, AppPage } from './lib/navigation';

const DashboardPage = lazy(() =>
  import('./components/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const ReservationsPage = lazy(() =>
  import('./components/ReservationsPage').then((module) => ({ default: module.ReservationsPage })),
);
const CalendarPage = lazy(() =>
  import('./components/CalendarPage').then((module) => ({ default: module.CalendarPage })),
);
const PropertiesPage = lazy(() =>
  import('./components/PropertiesPage').then((module) => ({ default: module.PropertiesPage })),
);
const CheckinsPage = lazy(() =>
  import('./components/CheckinsPage').then((module) => ({ default: module.CheckinsPage })),
);
const BlacklistPage = lazy(() =>
  import('./components/BlacklistPage').then((module) => ({ default: module.BlacklistPage })),
);
const VerificationPage = lazy(() =>
  import('./components/VerificationPage').then((module) => ({ default: module.VerificationPage })),
);
const ContractPage = lazy(() =>
  import('./components/ContractPage').then((module) => ({ default: module.ContractPage })),
);
const ProfilePage = lazy(() =>
  import('./components/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const SecurityPage = lazy(() =>
  import('./components/SecurityPage').then((module) => ({ default: module.SecurityPage })),
);
const AutomationsPage = lazy(() =>
  import('./components/AutomationsPage').then((module) => ({ default: module.AutomationsPage })),
);
const HelpPage = lazy(() =>
  import('./components/HelpPage').then((module) => ({ default: module.HelpPage })),
);
const HousekeepingPage = lazy(() =>
  import('./components/HousekeepingPage').then((module) => ({ default: module.HousekeepingPage })),
);
const MaintenancePage = lazy(() =>
  import('./components/MaintenancePage').then((module) => ({ default: module.MaintenancePage })),
);
const LinenPage = lazy(() =>
  import('./components/LinenPage').then((module) => ({ default: module.LinenPage })),
);
const FinancePage = lazy(() =>
  import('./components/FinancePage').then((module) => ({ default: module.FinancePage })),
);
const InventoryPage = lazy(() =>
  import('./components/InventoryPage').then((module) => ({ default: module.InventoryPage })),
);
const IcalPage = lazy(() =>
  import('./components/IcalPage').then((module) => ({ default: module.IcalPage })),
);
const PricingPage = lazy(() =>
  import('./components/PricingPage').then((module) => ({ default: module.PricingPage })),
);
const SubscriptionPricingPage = lazy(() =>
  import('./components/SubscriptionPricingPage').then((module) => ({ default: module.SubscriptionPricingPage })),
);
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const AutoLinkGenerator = lazy(() =>
  import('./components/AutoLinkGenerator').then((module) => ({ default: module.AutoLinkGenerator })),
);
const PublicBookingForm = lazy(() =>
  import('./components/PublicBookingForm').then((module) => ({ default: module.PublicBookingForm })),
);
const GuestPortalPage = lazy(() => import('./components/GuestPortalPage'));

const legacyPagePathAliases: Partial<Record<string, AppPage>> = {
  '/profile': 'profile',
};

function pageFromPath(pathname: string): AppPage {
  const aliasedPage = legacyPagePathAliases[pathname];
  if (aliasedPage) {
    return aliasedPage;
  }

  const entry = Object.entries(APP_PAGE_PATHS).find(([, path]) => path === pathname);
  if (!entry) return 'dashboard';
  return entry[0] as AppPage;
}

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { host, updateHost } = useHost(user?.id || null);
  const onboarding = useOnboarding();
  const {
    properties,
    loading: propertiesLoading,
    error: propertiesError,
    refresh: refreshProperties,
    addProperty,
    updateProperty,
    deleteProperty,
  } = useProperties(user?.id || null);
  const {
    reservations,
    loading: reservationsLoading,
    error: reservationsError,
    refresh: refreshReservations,
    addReservation,
    updateReservation,
    deleteReservation,
  } = useReservations();

  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [publicBookingToken, setPublicBookingToken] = useState<string | null>(null);
  const [guestPortalToken, setGuestPortalToken] = useState<string | null>(null);
  const [autoLinkPropertyId, setAutoLinkPropertyId] = useState<string | null>(null);
  const [focusedReservationId, setFocusedReservationId] = useState<string | null>(null);

  const applyRoute = useCallback((pathname: string, search: string = '') => {
    const params = new URLSearchParams(search);
    const guestPortalMatch = pathname.match(/^\/check-in\/(.+)$/);
    if (guestPortalMatch) {
      setGuestPortalToken(guestPortalMatch[1]);
      setVerificationLink(null);
      setPublicBookingToken(null);
      setAutoLinkPropertyId(null);
      setFocusedReservationId(null);
      return;
    }

    if (pathname === '/check-in') {
      setGuestPortalToken(params.get('token') ?? '');
      setVerificationLink(null);
      setPublicBookingToken(null);
      setAutoLinkPropertyId(null);
      setFocusedReservationId(null);
      return;
    }

    const checkinMatch = pathname.match(/^\/checkin\/(.+)$/);
    if (checkinMatch) {
      setVerificationLink(checkinMatch[1]);
      setGuestPortalToken(null);
      setPublicBookingToken(null);
      setAutoLinkPropertyId(null);
      setFocusedReservationId(null);
      return;
    }

    const publicBookingMatch = pathname.match(/^\/book\/(.+)$/);
    if (publicBookingMatch) {
      setPublicBookingToken(publicBookingMatch[1]);
      setGuestPortalToken(null);
      setVerificationLink(null);
      setAutoLinkPropertyId(null);
      setFocusedReservationId(null);
      return;
    }

    const autoLinkMatch = pathname.match(/^\/properties\/([^/]+)\/auto-link$/);
    if (autoLinkMatch) {
      setAutoLinkPropertyId(autoLinkMatch[1]);
      setGuestPortalToken(null);
      setVerificationLink(null);
      setPublicBookingToken(null);
      setFocusedReservationId(null);
      setCurrentPage('properties');
      return;
    }

    setGuestPortalToken(null);
    setVerificationLink(null);
    setPublicBookingToken(null);
    setAutoLinkPropertyId(null);
    const page = pageFromPath(pathname);
    setCurrentPage(page);
    if (page === 'reservations') {
      setFocusedReservationId(params.get('focus'));
    } else {
      setFocusedReservationId(null);
    }
  }, []);

  useEffect(() => {
    applyRoute(window.location.pathname, window.location.search);
    const onPopState = () => applyRoute(window.location.pathname, window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyRoute]);

  const navigateToPage = useCallback((page: AppPage) => {
    if (page === 'rentiq') {
      window.location.assign(APP_PAGE_PATHS.rentiq);
      return;
    }

    setCurrentPage(page);
    setGuestPortalToken(null);
    setVerificationLink(null);
    setPublicBookingToken(null);
    setAutoLinkPropertyId(null);
    setFocusedReservationId(null);
    const targetPath = APP_PAGE_PATHS[page];
    const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;
    if (currentPathWithSearch !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  const openAutoLinkPage = useCallback((propertyId: string) => {
    setAutoLinkPropertyId(propertyId);
    setGuestPortalToken(null);
    setVerificationLink(null);
    setPublicBookingToken(null);
    setFocusedReservationId(null);
    setCurrentPage('properties');
    const targetPath = `/properties/${propertyId}/auto-link`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  const openReservationFromDashboard = useCallback((reservationId: string) => {
    setCurrentPage('reservations');
    setGuestPortalToken(null);
    setVerificationLink(null);
    setPublicBookingToken(null);
    setAutoLinkPropertyId(null);
    setFocusedReservationId(reservationId);
    const targetPath = `/reservations?focus=${encodeURIComponent(reservationId)}`;
    const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;
    if (currentPathWithSearch !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (error) throw new Error(error.message || 'Connexion échouée');
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    const { error } = await signUp(email, password, fullName);
    if (error) throw new Error(error.message || 'Inscription échouée');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const selectedAutoLinkProperty = useMemo(
    () => properties.find((property) => property.id === autoLinkPropertyId) || null,
    [autoLinkPropertyId, properties],
  );

  const reservationsActionCount = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return reservations.filter((reservation) => {
      if (reservation.status === 'cancelled' || reservation.status === 'checked_in' || reservation.status === 'completed') {
        return false;
      }
      const checkIn = new Date(reservation.check_in_date);
      checkIn.setHours(0, 0, 0, 0);
      const daysUntilArrival = Math.floor((checkIn.getTime() - today.getTime()) / dayMs);
      return daysUntilArrival <= 1;
    }).length;
  }, [reservations]);

  const suspenseFallback = (
    <div className={clsx('flex min-h-screen items-center justify-center', surfaceTokens.app)}>
      <div
        className={clsx('h-8 w-8 animate-spin rounded-full border-2 border-t-transparent', borderTokens.default)}
        role="status"
        aria-label="Chargement..."
      />
    </div>
  );

  const isPublicRoute = guestPortalToken !== null || verificationLink !== null || publicBookingToken !== null;
  const shouldShowOnboardingModal = Boolean(user && !isPublicRoute && !onboarding.isComplete);

  if (authLoading && !isPublicRoute) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', surfaceTokens.app)}>
        <div className={textTokens.body}>Chargement…</div>
      </div>
    );
  }

  let appContent: JSX.Element;

  if (guestPortalToken !== null) {
    appContent = <GuestPortalPage routeToken={guestPortalToken} />;
  } else if (verificationLink) {
    appContent = <VerificationPage uniqueLink={verificationLink} />;
  } else if (publicBookingToken) {
    appContent = <PublicBookingForm propertyToken={publicBookingToken} />;
  } else if (!user) {
    appContent = <AuthForm onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  } else {
    appContent = (
      <div className={clsx('min-h-screen', surfaceTokens.app)}>
        <a
          href="#main-content"
          className={clsx(
            'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none focus:ring-2',
            surfaceTokens.panel,
            textTokens.title,
            borderTokens.strong,
          )}
        >
          Aller au contenu principal
        </a>
        <TopNavigation
          currentPage={currentPage}
          onNavigate={navigateToPage}
          onLogout={handleSignOut}
          hostName={host?.full_name}
          reservationsActionCount={reservationsActionCount}
        />

        <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          {autoLinkPropertyId ? (
            <AutoLinkGenerator
              property={selectedAutoLinkProperty}
              hostId={user.id}
              onBack={() => navigateToPage('properties')}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'dashboard' ? (
            <DashboardPage
              host={host}
              hostId={user.id}
              onOpenReservation={openReservationFromDashboard}
              onNavigateToHousekeeping={() => navigateToPage('housekeeping')}
              onNavigateToMaintenance={() => navigateToPage('maintenance')}
              onNavigateToLinen={() => navigateToPage('linen')}
              onNavigateToFinance={() => navigateToPage('finance')}
              onNavigateToIcal={() => navigateToPage('ical')}
              onNavigateToInventory={() => navigateToPage('inventory')}
              onNavigateToPricing={() => navigateToPage('pricing-engine')}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'properties' ? (
            <PropertiesPage
              properties={properties}
              isLoading={propertiesLoading}
              error={propertiesError}
              onRetry={refreshProperties}
              onAdd={addProperty}
              onEdit={updateProperty}
              onDelete={deleteProperty}
              onOpenAutoLink={openAutoLinkPage}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'reservations' ? (
            <ReservationsPage
              reservations={reservations}
              properties={properties}
              hostId={user.id}
              focusedReservationId={focusedReservationId}
              onUpdate={updateReservation}
              onAdd={addReservation}
              onDelete={deleteReservation}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'checkins' ? (
            <CheckinsPage
              reservations={reservations}
              properties={properties}
              isLoading={reservationsLoading || propertiesLoading}
              error={reservationsError || propertiesError}
              onRetry={() => {
                refreshReservations();
                refreshProperties();
              }}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'automations' ? (
            <AutomationsPage />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'calendar' ? (
            <CalendarPage
              reservations={reservations}
              properties={properties}
              onNavigateToReservation={() => navigateToPage('reservations')}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'contracts' ? (
            <ContractPage
              reservations={reservations}
              properties={properties}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'profile' ? (
            <ProfilePage
              host={host}
              onUpdate={updateHost}
              properties={properties}
              onNavigate={navigateToPage}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'settings' ? (
            <SettingsPage />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'pricing' ? <SubscriptionPricingPage /> : null}

          {!autoLinkPropertyId && currentPage === 'blacklist' ? (
            <BlacklistPage hostId={user.id} />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'help' ? (
            <HelpPage onNavigate={navigateToPage} />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'security' ? (
            <SecurityPage />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'housekeeping' ? (
            <HousekeepingPage
              hostId={user.id}
              properties={properties}
              reservations={reservations}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'maintenance' ? (
            <MaintenancePage
              hostId={user.id}
              properties={properties}
              reservations={reservations}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'linen' ? (
            <LinenPage
              hostId={user.id}
              properties={properties}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'finance' ? (
            <FinancePage hostId={user.id} />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'inventory' ? (
            <InventoryPage
              hostId={user.id}
              properties={properties}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'ical' ? (
            <IcalPage
              hostId={user.id}
              properties={properties}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'pricing-engine' ? (
            <PricingPage hostId={user.id} />
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <ErrorBoundary>
        <Suspense fallback={suspenseFallback}>
          {appContent}
        </Suspense>
      </ErrorBoundary>
      {shouldShowOnboardingModal && user ? (
        <OnboardingModal
          isOpen
          hostId={user.id}
          state={onboarding.state}
          goToStep={onboarding.goToStep}
          complete={onboarding.complete}
          skip={onboarding.skip}
        />
      ) : null}
    </>
  );
}

export default App;
