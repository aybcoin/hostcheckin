import { useState, useEffect } from 'react';
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

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { host, updateHost } = useHost(user?.id || null);
  const { properties, addProperty, updateProperty, deleteProperty } = useProperties(user?.id || null);
  const { reservations, addReservation, updateReservation, deleteReservation } = useReservations();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/checkin\/(.+)/);
    if (match) {
      setVerificationLink(match[1]);
    } else if (path === '/calendar') {
      setCurrentPage('calendar');
    } else if (path === '/reservations') {
      setCurrentPage('reservations');
    } else if (path === '/contracts') {
      setCurrentPage('contracts');
    }
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (error) throw error;
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    const { error } = await signUp(email, password, fullName);
    if (error) throw error;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (verificationLink) {
    return <VerificationPage uniqueLink={verificationLink} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
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
        onNavigate={setCurrentPage}
        onLogout={handleSignOut}
        hostName={host?.full_name}
      />

      <main className="flex-1 lg:ml-0">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-8 lg:pt-8">
          {currentPage === 'dashboard' && (
            <Dashboard
              properties={properties}
              reservations={reservations}
              loading={false}
            />
          )}

          {currentPage === 'properties' && (
            <PropertiesPage
              properties={properties}
              onAdd={addProperty}
              onEdit={updateProperty}
              onDelete={deleteProperty}
            />
          )}

          {currentPage === 'reservations' && (
            <ReservationsPage
              reservations={reservations}
              properties={properties}
              onUpdate={updateReservation}
              onAdd={addReservation}
              onDelete={deleteReservation}
            />
          )}

          {currentPage === 'checkins' && (
            <CheckinsPage reservations={reservations} />
          )}

          {currentPage === 'calendar' && (
            <CalendarPage
              reservations={reservations}
              properties={properties}
              onNavigateToReservation={() => setCurrentPage('reservations')}
            />
          )}

          {currentPage === 'contracts' && (
            <ContractPage
              reservations={reservations}
              properties={properties}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage host={host} onUpdate={updateHost} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
