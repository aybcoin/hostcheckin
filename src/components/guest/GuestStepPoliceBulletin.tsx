import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, ctaTokens, inputTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { useGuestT } from '../../lib/i18n/guest/context';
import { toast } from '../../lib/toast';
import type { PoliceBulletinDraft } from '../../types/police-bulletin';
import type { GuestSession } from '../../types/guest-portal';

interface GuestStepPoliceBulletinProps {
  session: GuestSession;
  onSubmit: (draft: PoliceBulletinDraft) => Promise<boolean>;
}

export function GuestStepPoliceBulletin({ session, onSubmit }: GuestStepPoliceBulletinProps) {
  const t = useGuestT();
  const prefill = session.policePrefill;

  const [fullName, setFullName] = useState(prefill.fullName);
  const [firstName, setFirstName] = useState(prefill.firstName);
  const [dateOfBirth, setDateOfBirth] = useState(prefill.dateOfBirth ?? '');
  const [placeOfBirth, setPlaceOfBirth] = useState(prefill.placeOfBirth);
  const [nationality, setNationality] = useState(prefill.nationality);
  const [passportNo, setPassportNo] = useState(prefill.passportNo);
  const [arrivalDate, setArrivalDate] = useState(prefill.arrivalDate);

  const [profession, setProfession] = useState('');
  const [comingFrom, setComingFrom] = useState(prefill.nationality);
  const [goingTo, setGoingTo] = useState(prefill.propertyName);
  const [homeAddress, setHomeAddress] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const ok = await onSubmit({
      reservation_id: session.reservationId,
      host_id: prefill.hostId,
      property_id: prefill.propertyId,
      appart_no: prefill.appartNo,
      full_name: fullName.trim(),
      first_name: firstName.trim(),
      date_of_birth: dateOfBirth || null,
      place_of_birth: placeOfBirth.trim(),
      nationality: nationality.trim(),
      profession: profession.trim(),
      coming_from: comingFrom.trim(),
      going_to: goingTo.trim(),
      arrival_date: arrivalDate || null,
      home_address: homeAddress.trim(),
      passport_no: passportNo.trim(),
    });
    setIsSubmitting(false);
    if (!ok) {
      toast.error(t.guestPortal.errors.uploadError);
    }
  };

  const labelClass = clsx('mb-1 block text-xs font-medium', textTokens.muted);

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx('rounded-2xl border p-5 shadow-sm sm:p-6', surfaceTokens.panel, borderTokens.default)}
    >
      <header className="flex items-start gap-3">
        <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', surfaceTokens.subtle)}>
          <ShieldCheck className={textTokens.body} size={20} aria-hidden="true" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className={clsx('text-xl font-semibold', textTokens.title)}>{t.guestPortal.police.title}</h2>
          <p className={clsx('mt-0.5 text-sm', textTokens.muted)}>{t.guestPortal.police.subtitle}</p>
        </div>
      </header>

      <section className="mt-6 space-y-3">
        <div>
          <p className={clsx('text-sm font-semibold', textTokens.title)}>{t.guestPortal.police.sectionAsk}</p>
          <p className={clsx('text-xs', textTokens.muted)}>{t.guestPortal.police.sectionAskHint}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="police-profession">{t.guestPortal.police.fields.profession}</label>
            <input
              id="police-profession"
              type="text"
              value={profession}
              onChange={(event) => setProfession(event.target.value)}
              placeholder={t.guestPortal.police.placeholders.profession}
              className={inputTokens.base}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-coming-from">{t.guestPortal.police.fields.comingFrom}</label>
            <input
              id="police-coming-from"
              type="text"
              value={comingFrom}
              onChange={(event) => setComingFrom(event.target.value)}
              placeholder={t.guestPortal.police.placeholders.comingFrom}
              className={inputTokens.base}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-going-to">{t.guestPortal.police.fields.goingTo}</label>
            <input
              id="police-going-to"
              type="text"
              value={goingTo}
              onChange={(event) => setGoingTo(event.target.value)}
              placeholder={t.guestPortal.police.placeholders.goingTo}
              className={inputTokens.base}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-home-address">{t.guestPortal.police.fields.homeAddress}</label>
            <input
              id="police-home-address"
              type="text"
              value={homeAddress}
              onChange={(event) => setHomeAddress(event.target.value)}
              placeholder={t.guestPortal.police.placeholders.homeAddress}
              className={inputTokens.base}
              required
            />
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <div>
          <p className={clsx('text-sm font-semibold', textTokens.title)}>{t.guestPortal.police.sectionAuto}</p>
          <p className={clsx('text-xs', textTokens.muted)}>{t.guestPortal.police.sectionAutoHint}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="police-first-name">{t.guestPortal.police.fields.firstName}</label>
            <input
              id="police-first-name"
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={inputTokens.base}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-full-name">{t.guestPortal.police.fields.fullName}</label>
            <input
              id="police-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputTokens.base}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-dob">{t.guestPortal.police.fields.dateOfBirth}</label>
            <input
              id="police-dob"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              className={inputTokens.base}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-pob">{t.guestPortal.police.fields.placeOfBirth}</label>
            <input
              id="police-pob"
              type="text"
              value={placeOfBirth}
              onChange={(event) => setPlaceOfBirth(event.target.value)}
              className={inputTokens.base}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-nationality">{t.guestPortal.police.fields.nationality}</label>
            <input
              id="police-nationality"
              type="text"
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              className={inputTokens.base}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="police-passport">{t.guestPortal.police.fields.passportNo}</label>
            <input
              id="police-passport"
              type="text"
              value={passportNo}
              onChange={(event) => setPassportNo(event.target.value)}
              className={clsx(inputTokens.base, 'font-mono')}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="police-arrival">{t.guestPortal.police.fields.arrivalDate}</label>
            <input
              id="police-arrival"
              type="date"
              value={arrivalDate}
              onChange={(event) => setArrivalDate(event.target.value)}
              className={inputTokens.base}
              required
            />
          </div>
        </div>
      </section>

      <div className={clsx('mt-5 rounded-xl border p-3 text-xs', borderTokens.default, statusTokens.info)}>
        {t.guestPortal.police.reuseSignatureNotice}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
            ctaTokens.primary,
          )}
        >
          {isSubmitting ? t.guestPortal.police.submitting : t.guestPortal.police.submit}
        </button>
      </div>
    </form>
  );
}
