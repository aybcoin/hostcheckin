import { clsx } from '../../lib/clsx';
import { accentTokens, textTokens } from '../../lib/design-tokens';
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
    'inline-flex items-center gap-2 border-b-2 px-0.5 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
  tablet:
    'inline-flex items-center gap-2 border-b-2 px-0.5 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
  mobile:
    'w-full border-l-4 px-4 py-3 text-left text-base font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
  menu:
    'w-full border-l-4 px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
};

export function NavigationItem({
  label,
  isActive,
  variant,
  badgeCount,
  onSelect,
  testId,
}: NavigationItemProps) {
  const isMobileStyle = variant === 'mobile' || variant === 'menu';

  const activeClass = isMobileStyle
    ? clsx(accentTokens.activeNavBorder, accentTokens.activeNavText, accentTokens.bgLight)
    : clsx(accentTokens.activeNavBorder, accentTokens.activeNavText);

  const inactiveClass = isMobileStyle
    ? clsx('border-transparent', textTokens.muted, 'hover:border-slate-300 hover:bg-slate-50')
    : clsx('border-transparent', textTokens.muted, 'hover:text-slate-800 hover:border-slate-300');

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
