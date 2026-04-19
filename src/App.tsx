import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useHost } from './hooks/useHost';
import { useProperties } from './hooks/useProperties';
import { useReservations } from './hooks/useReservations';
import { AuthForm } from './components/AuthForm';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
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
  const { reservations, addReservation, updateReservation, deleteReservation } = useReservations();

  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [publicBookingToken, setPublicBookingToken] = useState<string | null>(null);
  const [autoLinkPropertyId, setAutoLinkPropertyId] = useState<string | null>(null);

  const applyRoute = useCallback((pathname: string) => {
    const checkinMatch = pathname.match(/^\/checkin\/(.+)$/);
    if (checkinMatch) {
      setVerificationLink(checkinMatch[1]);
      setPublicBookingToken(null);
      setAutoLinkPropertyId(null);
      return;
    }

    const publicBookingMatch = pathname.match(/^\/book\/(.+)$/);
    if (publicBookingMatch) {
      setPublicBookingToken(publicBookingMatch[1]);
      setVerificationLink(null);
      setAutoLinkPropertyId(null);
      return;
    }

    const autoLinkMatch = pathname.match(/^\/properties\/([^/]+)\/auto-link$/);
    if (autoLinkMatch) {
      setAutoLinkPropertyId(autoLinkMatch[1]);
      setVerificationLink(null);
      setPublicBookingToken(null);
      setCurrentPage('properties');
      return;
    }

    setVerificationLink(null);
    setPublicBookingToken(null);
    setAutoLinkPropertyId(null);
    setCurrentPage(pageFromPath(pathname));
  }, []);

  useEffect(() => {
    applyRoute(window.location.pathname);
    const onPopState = () => applyRoute(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyRoute]);

  const navigateToPage = useCallback((page: AppPage) => {
    setCurrentPage(page);
    setVerificationLink(null);
    setPublicBookingToken(null);
    setAutoLinkPropertyId(null);
    const targetPath = APP_PAGE_PATHS[page];
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  const openAutoLinkPage = useCallback((propertyId: string) => {
    setAutoLinkPropertyId(propertyId);
    setVerificationLink(null);
    setPublicBookingToken(null);
    setCurrentPage('properties');
    const targetPath = `/properties/${propertyId}/auto-link`;
    if (window.location.pathname !== targetPath) {
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

  const userEmailVerified = useMemo(() => Boolean(user?.email_confirmed_at), [user?.email_confirmed_at]);
  const selectedAutoLinkProperty = useMemo(
    () => properties.find((property) => property.id === autoLinkPropertyId) || null,
    [autoLinkPropertyId, properties],
  );

  if (verificationLink) {
    return <VerificationPage uniqueLink={verificationLink} />;
  }

  if (publicBookingToken) {
    return <PublicBookingForm propertyToken={publicBookingToken} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-700">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateToPage}
        onLogout={handleSignOut}
        hostName={host?.full_name}
      />

      <main className="flex-1 lg:ml-0">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-8 lg:pt-8">
          {autoLinkPropertyId ? (
            <AutoLinkGenerator
              property={selectedAutoLinkProperty}
              hostId={user.id}
              onBack={() => navigateToPage('properties')}
            />
          ) : null}

          {!autoLinkPropertyId && currentPage === 'dashboard' ? (
            <Dashboard
              host={host}
              properties={properties}
              reservations={reservations}
              userEmailVerified={userEmailVerified}
              loading={false}
              onNavigate={navigateToPage}
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
              reservations={reservations}
              userEmailVerified={userEmailVerified}
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
        </div>
      </main>
    </div>
  );
}

export default App;
