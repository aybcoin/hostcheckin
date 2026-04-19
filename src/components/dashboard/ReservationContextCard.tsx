import { AlertTriangle, CalendarClock, CheckCircle2, FileWarning, ShieldAlert } from 'lucide-react';
import { fr } from '../../lib/i18n/fr';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export type ReservationIssueCode = 'checkin_due' | 'contract_missing' | 'id_missing' | 'deposit_pending';

interface ReservationContextCardProps {
  mode: 'action' | 'arrival';
  guestName: string;
  propertyName: string;
  checkInDateLabel: string;
  statusLabel: string;
  issueCode?: ReservationIssueCode;
  issueLabel?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaVariant?: 'primary' | 'secondary';
  ctaTestId?: string;
}

function issueIconByCode(issueCode: ReservationIssueCode | undefined) {
  if (issueCode === 'checkin_due') return CalendarClock;
  if (issueCode === 'id_missing') return ShieldAlert;
  if (issueCode === 'contract_missing') return FileWarning;
  return AlertTriangle;
}

export function ReservationContextCard({
  mode,
  guestName,
  propertyName,
  checkInDateLabel,
  statusLabel,
  issueCode,
  issueLabel,
  ctaLabel,
  onCta,
  ctaVariant = 'secondary',
  ctaTestId,
}: ReservationContextCardProps) {
  const IssueIcon = issueIconByCode(issueCode);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-5 text-slate-900 break-words sm:truncate">{guestName}</p>
          <p className="text-sm text-slate-600 break-words sm:truncate">{propertyName}</p>
          <p className="mt-1 text-xs text-slate-500">{checkInDateLabel}</p>
        </div>
        <Badge variant="neutral" className="self-start sm:self-auto">{statusLabel}</Badge>
      </div>

      {mode === 'action' && issueLabel ? (
        <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            <IssueIcon size={12} />
            <span className="truncate">{issueLabel}</span>
          </span>
          {ctaLabel && onCta ? (
            <Button
              variant={ctaVariant}
              size="sm"
              fullWidth
              className="sm:w-auto"
              onClick={onCta}
              data-testid={ctaTestId}
            >
              {ctaLabel}
            </Button>
          ) : null}
        </div>
      ) : mode === 'arrival' ? (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
          <CheckCircle2 size={12} />
          <span>{fr.dashboard.zoneUpcoming.arrivalPlanned}</span>
        </div>
      ) : null}
    </Card>
  );
}
