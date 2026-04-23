import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from './lib/clsx';
import { surfaceTokens, textTokens } from './lib/design-tokens';
import { useAuth } from './hooks/useAuth';
import { useHost } from './hooks/useHost';
import { useProperties } from './hooks/useProperties';
import { useReservations } from './hooks/useReservations';
import { AuthForm } from './components/AuthForm';
import { TopNavigation } from './components/TopNavigation';
import { DashboardPage } from './components/DashboardPage';
import { PropertiesPage } from './components/PropertiesPage';
import { ReservationsPage } from './components/ReservationsPage';
import { CheckinsPage } from './components/CheckinsPage';
import { ProfilePage } from './components/ProfilePage';
import { ContractPage } from './components/ContractPage';
import { CalendarPage } from './components/CalendarPage';
import { VerificationPage } from './components/VerificationPage';
import { PricingPage } from './components/PricingPage';
import { AutoLinkGenerator } from './components/AutoLinkGenerator';
import { PublicBookingForm } from './components/PublicBookingForm';
import { BlacklistPage } from './components/BlacklistPage';
import { HelpPage } from './components/HelpPage';
import { SecurityPage } from './components/SecurityPage';
import { APP_PAGE_PATHS, AppPage } from './lib/navigation';

function pageFromPath(pathname: string): AppPage {
  const entry = Object.entries(APP_PAGE_PATHS).find(([, path]) => path === pathname);
  if (!entry) return 'dashboard';
  return entry[0] as AppPage;
}

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { host, updateHost } = useHost(user?.id || null);
  const { properties, addProperty, updateProperty, deleteProperty } = useProperties(user?.id || null);
  const {
    reservations,
    loading: reservationsLoading,
    addReservation,
    updateReservation,
    deleteReservation,
  } = useReservations();

  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [publicBookingToken, setPublicBookingToken] = useState<string | null>(null);
  const [autoLinkPropertyId, setAutoLinkPropertyId] = useState<string | null>(null);
  const [focusedReservationId, setFocusedReservationId] = useState<string | null>(null);

  const applyRoute = useCallback((pathname: string, search: string = '') => {
    const params = new URLSearchParams(search);
    const checkinMatch = pathname.match(/^\/checkin\/(.+)$/);
    if (checkinMatch) {
      setVerificationLink(checkinMatch[1]);
      setPublicBookingToken(null);
      setAutoLinkPropertyId(null);
      setFocusedReservationId(null);
      return;
    }

    const publicBookingMatch = pathname.match(/^\/book\/(.+)$/);
    if (publicBookingMatch) {
      setPublicBookingToken(publicBookingMatch[1]);
      setVerificationLink(null);
      setAutoLinkPropertyId(null);
      setFocusedReservationId(null);
      return;
    }

    const autoLinkMatch = pathname.match(/^\/properties\/([^/]+)\/auto-link$/);
    if (autoLinkMatch) {
      setAutoLinkPropertyId(autoLinkMatch[1]);
      setVerificationLink(null);
      setPublicBookingToken(null);
      setFocusedReservationId(null);
      setCurrentPage('properties');
      return;
    }

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
    setCurrentPage(page);
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

  if (verificationLink) {
    return <VerificationPage uniqueLink={verificationLink} />;
  }

  if (publicBookingToken) {
    return <PublicBookingForm propertyToken={publicBookingToken} />;
  }

  if (authLoading) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', surfaceTokens.app)}>
        <div className={textTokens.body}>Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return (
    <div className={clsx('min-h-screen', surfaceTokens.app)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
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
            properties={properties}
            reservations={reservations}
            loading={reservationsLoading}
            onOpenReservation={openReservationFromDashboard}
          />
        ) : null}

        {!autoLinkPropertyId && currentPage === 'properties' ? (
          <PropertiesPage
            properties={properties}
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
            focusedReservationId={focusedReservationId}
            onUpdate={updateReservation}
            onAdd={addReservation}
            onDelete={deleteReservation}
          />
        ) : null}

        {!autoLinkPropertyId && currentPage === 'checkins' ? (
          <CheckinsPage reservations={reservations} properties={properties} />
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

        {!autoLinkPropertyId && currentPage === 'pricing' ? <PricingPage /> : null}

        {!autoLinkPropertyId && currentPage === 'blacklist' ? (
          <BlacklistPage hostId={user.id} />
        ) : null}

        {!autoLinkPropertyId && currentPage === 'help' ? (
          <HelpPage onNavigate={navigateToPage} />
        ) : null}

        {!autoLinkPropertyId && currentPage === 'security' ? (
          <SecurityPage />
        ) : null}
      </main>
    </div>
  );
}

export default App;
