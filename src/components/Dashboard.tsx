import { TrendingUp, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Property, Reservation } from '../lib/supabase';

interface DashboardProps {
  properties: Property[];
  reservations: Reservation[];
  loading: boolean;
}

export function Dashboard({ properties, reservations, loading }: DashboardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Chargement du dashboard...</div>
      </div>
    );
  }

  const totalReservations = reservations.length;
  const upcomingReservations = reservations.filter(
    (r) => new Date(r.check_in_date) > new Date()
  ).length;
  const completedReservations = reservations.filter(
    (r) => r.status === 'completed'
  ).length;

  const stats = [
    {
      label: 'Propriétés',
      value: properties.length,
      max: 3,
      icon: TrendingUp,
      color: 'from-blue-600 to-blue-400',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Réservations totales',
      value: totalReservations,
      icon: Calendar,
      color: 'from-teal-600 to-teal-400',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
    },
    {
      label: 'À venir',
      value: upcomingReservations,
      icon: CheckCircle,
      color: 'from-green-600 to-green-400',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Complétées',
      value: completedReservations,
      icon: AlertCircle,
      color: 'from-orange-600 to-orange-400',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1 sm:mt-2">Bienvenue, vue d'ensemble de vos activités</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`${stat.bgColor} p-2 sm:p-3 rounded-lg`}>
                  <Icon className={`${stat.textColor}`} size={20} />
                </div>
                {stat.max && (
                  <span className="text-xs font-medium text-gray-500">
                    {stat.value} / {stat.max}
                  </span>
                )}
              </div>

              <p className="text-gray-600 text-xs sm:text-sm mt-3 sm:mt-4">{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{stat.value}</p>

              {stat.max && (
                <div className="mt-3 sm:mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${stat.color} h-full transition-all`}
                    style={{ width: `${(stat.value / stat.max) * 100}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Dernières réservations</h2>
          <div className="space-y-3">
            {reservations.slice(0, 5).map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-medium text-gray-900 truncate">{reservation.booking_reference}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(reservation.check_in_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                  reservation.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : reservation.status === 'checked_in'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {reservation.status === 'completed'
                    ? 'Complétée'
                    : reservation.status === 'checked_in'
                    ? 'Check-in'
                    : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Propriétés actives</h2>
          <div className="space-y-3">
            {properties.map((property) => {
              const propertyReservations = reservations.filter(
                (r) => r.property_id === property.id
              );
              return (
                <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-medium text-gray-900 truncate">{property.name}</p>
                    <p className="text-sm text-gray-500">{property.city}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {propertyReservations.length} rés.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
