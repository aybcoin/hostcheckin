import { ShieldCheck } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { Property } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface VerificationModeCardProps {
  property: Property;
  saving: boolean;
  onChange: (mode: 'simple' | 'complete') => void;
}

export function VerificationModeCard({ property, saving, onChange }: VerificationModeCardProps) {
  const mode = property.verification_mode || 'simple';

  return (
    <Card variant="ghost" padding="sm" className="mt-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck size={16} className={textTokens.body} />
        <h4 className={clsx('text-sm font-semibold', textTokens.title)}>Type de vérification</h4>
      </div>
      <p className={clsx('text-xs', textTokens.muted)}>
        Choisissez le niveau par défaut appliqué aux nouvelles réservations de ce logement.
      </p>

      <div className={clsx('mt-3 inline-flex rounded-lg border bg-white p-1', borderTokens.default)}>
        <Button
          onClick={() => onChange('simple')}
          disabled={saving}
          variant={mode === 'simple' ? 'primary' : 'tertiary'}
          size="sm"
        >
          Vérification simple
        </Button>
        <Button
          onClick={() => onChange('complete')}
          disabled={saving}
          variant={mode === 'complete' ? 'primary' : 'tertiary'}
          size="sm"
        >
          Vérification complète
        </Button>
      </div>

      <div className={clsx('mt-3 overflow-hidden rounded-lg border bg-white', borderTokens.default)}>
        <div className={clsx('grid grid-cols-3 border-b px-3 py-2 text-[11px] font-semibold uppercase', borderTokens.default, surfaceTokens.subtle, textTokens.subtle)}>
          <span>Mode</span>
          <span>Voyageur principal</span>
          <span>Tous les adultes</span>
        </div>
        <div className={clsx('grid grid-cols-3 px-3 py-2 text-xs', textTokens.body)}>
          <span>Simple</span>
          <span>Oui</span>
          <span>Non</span>
        </div>
        <div className={clsx('grid grid-cols-3 border-t px-3 py-2 text-xs', borderTokens.default, textTokens.body)}>
          <span>Complète</span>
          <span>Oui</span>
          <span>Oui</span>
        </div>
      </div>
    </Card>
  );
}
