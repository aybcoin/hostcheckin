import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from '../lib/clsx';
import { stateFillTokens, textTokens } from '../lib/design-tokens';
import { useGuestT } from '../lib/i18n/guest/context';
import { VerificationPage } from './VerificationPage';
import { Card } from './ui/Card';

interface CheckinTokenResolverProps {
  token: string;
}

type ResolveState = 'loading' | 'resolved' | 'error';

function readStringField(source: unknown, key: string): string | null {
  if (!source || typeof source !== 'object' || !(key in source)) {
    return null;
  }

  const value = Reflect.get(source, key);
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function CheckinTokenResolver({ token }: CheckinTokenResolverProps) {
  const t = useGuestT();
  const verificationT = t.verification;
  const [resolveState, setResolveState] = useState<ResolveState>('loading');
  const [uniqueLink, setUniqueLink] = useState<string | null>(null);

  useEffect(() => {
    const normalizedToken = token.trim();
    let cancelled = false;

    const resolveToken = async () => {
      if (!normalizedToken) {
        setResolveState('error');
        setUniqueLink(null);
        return;
      }

      setResolveState('loading');
      setUniqueLink(null);

      const { data: tokenData, error: tokenError } = await supabase
        .from('guest_tokens')
        .select('reservation_id')
        .eq('token', normalizedToken)
        .maybeSingle();

      if (cancelled) return;

      const reservationId = readStringField(tokenData, 'reservation_id');
      if (tokenError || !reservationId) {
        setResolveState('error');
        return;
      }

      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .select('unique_link')
        .eq('id', reservationId)
        .maybeSingle();

      if (cancelled) return;

      const resolvedUniqueLink = readStringField(reservationData, 'unique_link');
      if (reservationError || !resolvedUniqueLink) {
        setResolveState('error');
        return;
      }

      setUniqueLink(resolvedUniqueLink);
      setResolveState('resolved');
    };

    void resolveToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (resolveState === 'resolved' && uniqueLink) {
    return <VerificationPage uniqueLink={uniqueLink} />;
  }

  if (resolveState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <Card variant="highlight" padding="lg" className="w-full max-w-md text-center">
          <div className={clsx('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', stateFillTokens.danger)}>
            <AlertCircle className={clsx('w-8 h-8', textTokens.danger)} />
          </div>
          <h1 className={clsx('text-2xl font-bold mb-2', textTokens.title)}>{verificationT.notFound.title}</h1>
          <p className={textTokens.muted}>{verificationT.notFound.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
      <Card variant="highlight" padding="lg" className="w-full max-w-md text-center">
        <Loader2 className={clsx('w-8 h-8 animate-spin mx-auto mb-4', textTokens.body)} />
        <p className={textTokens.body}>{verificationT.loading}</p>
      </Card>
    </div>
  );
}
