import { clsx } from '../../lib/clsx';
import { textTokens } from '../../lib/design-tokens';
import { Badge } from '../ui/Badge';

type NavigationItemVariant = 'desktop' | 'tablet' | 'mobile' | 'menu';

interface NavigationItemProps {
  label: string;
  isActive: boolean;
  variant: NavigationItemVariant;
  badgeCount?: number;
  onSelect: () => void;
  testId?: string;
}

const baseByVariant: Record<NavigationItemVariant, string> = {
  desktop:
    'inline-flex items-center gap-2 border-b-2 px-0.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
  tablet:
    'inline-flex items-center gap-2 border-b-2 px-0.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
  mobile:
    'w-full border-b-2 px-1 py-3 text-left text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
  menu:
    'w-full border-b-2 px-1 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
};

const activeClass = clsx('border-current', textTokens.title);
const inactiveClass = clsx('border-transparent hover:opacity-90', textTokens.muted);

export function NavigationItem({
  label,
  isActive,
  variant,
  badgeCount,
  onSelect,
  testId,
}: NavigationItemProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(baseByVariant[variant], isActive ? activeClass : inactiveClass)}
    >
      <span>{label}</span>
      {badgeCount && badgeCount > 0 ? <Badge variant="active">{badgeCount}</Badge> : null}
    </button>
  );
}
