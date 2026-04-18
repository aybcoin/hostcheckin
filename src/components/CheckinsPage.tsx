import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, CheckCircle, Clock } from "lucide-react";
import { Reservation, Property, APP_BASE_URL, supabase } from "../lib/supabase";
import { fr } from "../lib/i18n/fr";
import { CheckinMessageTemplates } from "./CheckinMessageTemplates";
import { GuestPreviewModal } from "./GuestPreviewModal";

interface CheckinsPageProps {
  reservations: Reservation[];
  properties: Property[];
}

export function CheckinsPage({ reservations, properties }: CheckinsPageProps) {
  const [guestNames, setGuestNames] = useState<Record<string, string>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const pendingReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "pending"),
    [reservations],
  );

  useEffect(() => {
    const loadGuests = async () => {
      if (pendingReservations.length === 0) {
        setGuestNames({});
        return;
      }
      const guestIds = [...new Set(pendingReservations.map((item) => item.guest_id))];
      const { data, error } = await supabase
        .from("guests")
        .select("id, full_name")
        .in("id", guestIds);

      if (error || !data) {
        setGuestNames({});
        return;
      }

      const map: Record<string, string> = {};
      data.forEach((guest: { id: string; full_name: string }) => {
        map[guest.id] = guest.full_name;
      });
      setGuestNames(map);
    };
    void loadGuests();
  }, [pendingReservations]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPropertyName = (propertyId: string): string => {
    return properties.find((property) => property.id === propertyId)?.name || 'votre hébergement';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {fr.checkins.title}
        </h1>
        <p className="text-gray-600 mt-1 sm:mt-2">
          {fr.checkins.pendingCount(pendingReservations.length)}
        </p>
        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Aperçu invité (démo)
        </button>
      </div>

      <div className="space-y-4">
        {pendingReservations.length === 0 ? (
          <div className="bg-white rounded-lg p-8 sm:p-12 text-center">
            <CheckCircle className="w-12 sm:w-16 h-12 sm:h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-gray-600 text-base sm:text-lg">
              {fr.checkins.allUpToDate}
            </p>
          </div>
        ) : (
          pendingReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {fr.checkins.bookingReference}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {reservation.booking_reference}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {fr.checkins.checkinDate}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {formatDate(reservation.check_in_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {fr.checkins.guestsCount}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">
                    {reservation.number_of_guests}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border-l-4 border-slate-900 p-3 sm:p-4 rounded mb-4">
                <p className="text-sm text-slate-700">
                  {fr.checkins.shareInfo}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                <p className="text-xs text-gray-600 mb-1.5">{fr.checkins.checkinLink}</p>
                <p className="text-xs sm:text-sm font-mono text-gray-700 break-all">
                  {`${APP_BASE_URL}/checkin/${reservation.unique_link}`}
                </p>
              </div>

              <CheckinMessageTemplates
                checkinLink={`${APP_BASE_URL}/checkin/${reservation.unique_link}`}
                guestName={guestNames[reservation.guest_id] || fr.app.guestFallbackName}
                propertyName={getPropertyName(reservation.property_id)}
                smartLockCode={reservation.smart_lock_code}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Upload className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">{fr.checkins.identity}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {fr.checkins.toVerify}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">{fr.checkins.contract}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {fr.checkins.toSign}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-slate-700 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">{fr.checkins.status}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {fr.checkins.waiting}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showPreviewModal ? (
        <GuestPreviewModal onClose={() => setShowPreviewModal(false)} />
      ) : null}
    </div>
  );
}
