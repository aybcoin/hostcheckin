import { BadgeCheck, Lock, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { fr } from '../../lib/i18n/fr';

export interface TrustBadgeProps {
  type: 'signature' | 'identity' | 'deposit';
}

const iconByType = {
  signature: ShieldCheck,
  identity: BadgeCheck,
  deposit: Lock,
} as const;

const variantByType = {
  signature: 'success',
  identity: 'success',
  deposit: 'neutral',
} as const;

export function TrustBadge({ type }: TrustBadgeProps) {
  const Icon = iconByType[type];
  const label = fr.trust.badges[type];
  const ariaLabel = fr.trust.badgesAria[type];

  return (
    <span role="status" aria-label={ariaLabel}>
      <Badge variant={variantByType[type]} className="gap-1.5">
        <Icon size={12} aria-hidden="true" />
        <span>{label}</span>
      </Badge>
    </span>
  );
}
