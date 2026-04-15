import { FileText, Upload, CheckCircle, Clock } from 'lucide-react';
import { Reservation } from '../lib/supabase';

interface CheckinsPageProps {
  reservations: Reservation[];
}

export function CheckinsPage({ reservations }: CheckinsPageProps) {
  const pendingReservations = reservations.filter((r) => r.status === 'pending');

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Check-ins</h1>
        <p className="text-gray-600 mt-1 sm:mt-2">
          {pendingReservations.length} réservation(s) en attente de check-in
        </p>
      </div>

      <div className="space-y-4">
        {pendingReservations.length === 0 ? (
          <div className="bg-white rounded-lg p-8 sm:p-12 text-center">
            <CheckCircle className="w-12 sm:w-16 h-12 sm:h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 text-base sm:text-lg">Tous les check-ins sont à jour</p>
          </div>
        ) : (
          pendingReservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Référence de réservation</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{reservation.booking_reference}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Date d'arrivée</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{formatDate(reservation.check_in_date)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Nombre d'hôtes</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{reservation.number_of_guests}</p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded mb-4">
                <p className="text-sm text-blue-800">
                  Partagez le lien unique avec votre invité pour qu'il complète le check-in
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                <p className="text-xs text-gray-600 mb-1.5">Lien de check-in</p>
                <p className="text-xs sm:text-sm font-mono text-gray-700 break-all">
                  {`${window.location.origin}/checkin/${reservation.unique_link}`}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Upload className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Identité</p>
                    <p className="text-sm font-medium text-gray-900">À vérifier</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Contrat</p>
                    <p className="text-sm font-medium text-gray-900">À signer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Statut</p>
                    <p className="text-sm font-medium text-gray-900">En attente</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
