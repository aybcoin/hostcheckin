import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { clsx } from "../lib/clsx";
import { borderTokens, surfaceTokens, textTokens } from "../lib/design-tokens";
import { Reservation, Property, APP_BASE_URL, supabase } from "../lib/supabase";
import { fr } from "../lib/i18n/fr";
import { CheckinMessageTemplates } from "./CheckinMessageTemplates";
import { GuestPreviewModal } from "./GuestPreviewModal";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { Skeleton } from "./ui/Skeleton";

interface CheckinsPageProps {
  reservations: Reservation[];
  properties: Property[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function CheckinsPageSkeleton() {
  return (
    <Card variant="default" padding="md" aria-hidden="true" className={clsx('space-y-3', borderTokens.default)}>
      {[1, 2, 3, 4, 5].map((index) => (
        <div key={index} className={clsx('flex items-center gap-3 border-b pb-3 last:border-b-0 last:pb-0', borderTokens.subtle)}>
          <Skeleton variant="circle" className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-2/3" />
            <Skeleton variant="text" className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  );
}

export function CheckinsPage({
  reservations,
  properties,
  isLoading = false,
  error = null,
  onRetry,
}: CheckinsPageProps) {
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
    return properties.find((property) => property.id === propertyId)?.name || 'votre logement';
  };

  if (isLoading) {
    return <CheckinsPageSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className={textTokens.warning} aria-hidden="true" />}
        title="Erreur"
        description={error}
        action={(
          <Button variant="secondary" onClick={onRetry}>
            {fr.errors.retry}
          </Button>
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={clsx("text-2xl sm:text-3xl font-bold", textTokens.title)}>
          {fr.checkins.title}
        </h1>
        <p className={clsx("mt-1 sm:mt-2", textTokens.muted)}>
          {fr.checkins.pendingCount(pendingReservations.length)}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowPreviewModal(true)}
          className="mt-3"
        >
          {fr.guestPreview.title}
        </Button>
      </div>

      <div className="space-y-4">
        {pendingReservations.length === 0 ? (
          <Card variant="default" padding="lg" className="text-center sm:p-12">
            <CheckCircle className={clsx("w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4", textTokens.subtle)} />
            <p className={clsx("text-base sm:text-lg", textTokens.muted)}>
              {fr.checkins.allUpToDate}
            </p>
          </Card>
        ) : (
          pendingReservations.map((reservation) => (
            <Card
              key={reservation.id}
              variant="highlight"
              padding="md"
                className="p-4 sm:p-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <div>
                    <p className={clsx("text-xs sm:text-sm", textTokens.muted)}>
                      {fr.checkins.bookingReference}
                    </p>
                    <p className={clsx("text-base sm:text-lg font-bold", textTokens.title)}>
                      {reservation.booking_reference}
                    </p>
                  </div>
                  <div>
                    <p className={clsx("text-xs sm:text-sm", textTokens.muted)}>
                      {fr.checkins.checkinDate}
                    </p>
                    <p className={clsx("text-base sm:text-lg font-bold", textTokens.title)}>
                      {formatDate(reservation.check_in_date)}
                    </p>
                  </div>
                  <div>
                    <p className={clsx("text-xs sm:text-sm", textTokens.muted)}>
                      {fr.checkins.guestsCount}
                    </p>
                    <p className={clsx("text-base sm:text-lg font-bold", textTokens.title)}>
                      {reservation.number_of_guests}
                    </p>
                  </div>
                </div>

              <div className={clsx("border-l-4 p-3 sm:p-4 rounded mb-4", surfaceTokens.subtle, textTokens.title)}>
                <p className={clsx("text-sm", textTokens.body)}>
                  {fr.checkins.shareInfo}
                </p>
              </div>

              <div className={clsx("rounded-lg p-3 sm:p-4 mb-4", surfaceTokens.subtle)}>
                <p className={clsx("text-xs mb-1.5", textTokens.muted)}>{fr.checkins.checkinLink}</p>
                <p className={clsx("text-xs sm:text-sm font-mono break-all", textTokens.body)}>
                  {`${APP_BASE_URL}/checkin/${reservation.unique_link}`}
                </p>
              </div>

              <CheckinMessageTemplates
                checkinLink={`${APP_BASE_URL}/checkin/${reservation.unique_link}`}
                guestName={(reservation.guest_id ? guestNames[reservation.guest_id] : undefined) || fr.app.guestFallbackName}
                propertyName={getPropertyName(reservation.property_id)}
                smartLockCode={reservation.smart_lock_code}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={clsx("flex items-center gap-3 p-3 rounded-lg", surfaceTokens.subtle)}>
                  <Upload className={clsx("w-5 h-5 shrink-0", textTokens.muted)} />
                  <div>
                    <p className={clsx("text-xs", textTokens.muted)}>{fr.checkins.identity}</p>
                    <p className={clsx("text-sm font-medium", textTokens.title)}>
                      {fr.checkins.toVerify}
                    </p>
                  </div>
                </div>
                <div className={clsx("flex items-center gap-3 p-3 rounded-lg", surfaceTokens.subtle)}>
                  <FileText className={clsx("w-5 h-5 shrink-0", textTokens.muted)} />
                  <div>
                    <p className={clsx("text-xs", textTokens.muted)}>{fr.checkins.contract}</p>
                    <p className={clsx("text-sm font-medium", textTokens.title)}>
                      {fr.checkins.toSign}
                    </p>
                  </div>
                </div>
                <div className={clsx("flex items-center gap-3 p-3 rounded-lg", surfaceTokens.subtle)}>
                  <Clock className={clsx("w-5 h-5 shrink-0", textTokens.muted)} />
                  <div>
                    <p className={clsx("text-xs", textTokens.muted)}>{fr.checkins.status}</p>
                    <p className={clsx("text-sm font-medium", textTokens.title)}>
                      {fr.checkins.waiting}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {showPreviewModal ? (
        <GuestPreviewModal onClose={() => setShowPreviewModal(false)} />
      ) : null}
    </div>
  );
}
