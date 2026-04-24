import { useEffect, useMemo, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { toast } from '../../lib/toast';
import { clsx } from '../../lib/clsx';
import { supabase } from '../../lib/supabase';
import { borderTokens, ctaTokens, inputTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { GuestSession } from '../../types/guest-portal';

interface GuestStep3IdentityProps {
  session: GuestSession;
  onVerify: () => Promise<boolean>;
}

export function GuestStep3Identity({ session, onVerify }: GuestStep3IdentityProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const completeVerification = async () => {
    const ok = await onVerify();
    if (!ok) {
      toast.error(fr.guestPortal.errors.uploadError);
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) {
      toast.error(fr.guestPortal.errors.uploadError);
      return;
    }

    setIsUploading(true);

    const safeFilename = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${session.reservationId}/${Date.now()}-${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from('identity-docs')
      .upload(filePath, selectedFile, { upsert: false });

    if (uploadError) {
      setStorageUnavailable(true);
      toast.warning(fr.guestPortal.identity.manualRequired);
      setIsUploading(false);
      return;
    }

    toast.success(fr.guestPortal.identity.uploaded);
    await completeVerification();
    setIsUploading(false);
  };

  const handleSkip = async () => {
    if (isUploading) return;

    setIsUploading(true);
    const ok = await completeVerification();
    if (ok) {
      toast.warning(fr.guestPortal.identity.manualRequired);
    }
    setIsUploading(false);
  };

  return (
    <section className={clsx('rounded-2xl border p-5 shadow-sm sm:p-6', surfaceTokens.panel, borderTokens.default)}>
      <h2 className={clsx('text-xl font-bold', textTokens.title)}>{fr.guestPortal.identity.title}</h2>
      <p className={clsx('mt-1 text-sm', textTokens.body)}>{fr.guestPortal.identity.instruction}</p>

      <div className={clsx('mt-4 rounded-xl border p-4', borderTokens.default, surfaceTokens.subtle)}>
        <label htmlFor="guest-identity-file" className={clsx('mb-2 block text-sm font-medium', textTokens.body)}>
          {fr.guestPortal.identity.uploadLabel}
        </label>
        <input
          id="guest-identity-file"
          type="file"
          accept="image/*"
          capture="environment"
          className={inputTokens.base}
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="mt-4">
            <p className={clsx('mb-2 text-xs font-medium', textTokens.subtle)}>{fr.guestPortal.identity.preview}</p>
            <div className={clsx('overflow-hidden rounded-xl border', borderTokens.default)}>
              <img src={previewUrl} alt={fr.guestPortal.identity.preview} className="h-56 w-full object-cover" />
            </div>
          </div>
        ) : (
          <div className={clsx('mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs', borderTokens.default, textTokens.subtle)}>
            <ImageUp size={14} aria-hidden="true" />
            {fr.guestPortal.identity.preview}
          </div>
        )}
      </div>

      {storageUnavailable ? (
        <div className={clsx('mt-4 rounded-xl border p-3 text-sm', statusTokens.warning)}>
          {fr.guestPortal.identity.manualRequired}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
            ctaTokens.primary,
          )}
        >
          {isUploading ? fr.guestPortal.identity.uploading : fr.guestPortal.identity.cta}
        </button>

        {storageUnavailable ? (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isUploading}
            className={clsx(
              'inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
              ctaTokens.secondary,
            )}
          >
            {fr.guestPortal.identity.skipLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
