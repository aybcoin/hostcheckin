/**
 * SideNavigation — premium editorial sidebar
 *
 * Desktop (≥1024px): fixed 256px sidebar, always visible.
 * Mobile (<1024px): thin top bar with hamburger → overlay drawer slides from left.
 */
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { clsx } from '../lib/clsx';
import {
  accentTokens,
  borderTokens,
  sidebarPropertyTokens,
  sidebarTokens,
  surfaceTokens,
  textTokens,
  transitionTokens,
} from '../lib/design-tokens';
import type { AppPage } from '../lib/navigation';
import { fr } from '../lib/i18n/fr';
import type { Property, Reservation } from '../lib/supabase';
import { Badge } from './ui/Badge';

const UPGRADE_BANNER_DISMISSED_KEY = 'hostcheckin:upgrade-banner-dismissed';

interface TopNavigationProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  hostName?: string;
  reservationsActionCount?: number;
  /** Currently focused property to surface in the sidebar context card. */
  activeProperty?: Property | null;
  /** Next or current reservation tied to the active property. */
  activeReservation?: Reservation | null;
  /** Today's date (ISO yyyy-MM-dd) — injected for testability. Defaults to system today. */
  today?: string;
  /** Triggered when the user activates the property card. */
  onSelectProperty?: (propertyId: string) => void;
}

type PropertyStatus = 'arriving' | 'leaving' | 'idle';

function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatShortDate(iso: string): string {
  // ISO yyyy-mm-dd → dd/mm/yyyy (no Date parsing to avoid TZ off-by-one)
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function platformVariant(source: Reservation['external_source'] | undefined) {
  switch (source) {
    case 'airbnb':
      return { label: fr.topnav.propertyCard.platform.airbnb, className: sidebarPropertyTokens.platformAirbnb };
    case 'booking':
      return { label: fr.topnav.propertyCard.platform.booking, className: sidebarPropertyTokens.platformBooking };
    case 'vrbo':
      return { label: fr.topnav.propertyCard.platform.vrbo, className: sidebarPropertyTokens.platformOther };
    case 'manual':
      return { label: fr.topnav.propertyCard.platform.direct, className: sidebarPropertyTokens.platformDirect };
    case 'other':
      return { label: fr.topnav.propertyCard.platform.other, className: sidebarPropertyTokens.platformOther };
    default:
      return null;
  }
}

function computePropertyStatus(reservation: Reservation | null | undefined, today: string): PropertyStatus {
  if (!reservation) return 'idle';
  if (reservation.check_in_date === today) return 'arriving';
  if (reservation.check_out_date === today) return 'leaving';
  return 'idle';
}

interface SidebarPropertyCardProps {
  property: Property;
  reservation: Reservation | null;
  today: string;
  onSelect?: (propertyId: string) => void;
}

function SidebarPropertyCard({ property, reservation, today, onSelect }: SidebarPropertyCardProps) {
  const status = computePropertyStatus(reservation, today);
  const platform = platformVariant(reservation?.external_source ?? undefined);
  const reference = property.id.slice(0, 6).toUpperCase();
  const ariaLabel = fr.topnav.propertyCard.ariaLabel.replace('{name}', property.name);

  const statusLabel =
    status === 'arriving'
      ? fr.topnav.propertyCard.arrivingToday
      : status === 'leaving'
      ? fr.topnav.propertyCard.leavingToday
      : fr.topnav.propertyCard.freeStatus;

  const statusClass =
    status === 'arriving'
      ? sidebarPropertyTokens.statusArriving
      : status === 'leaving'
      ? sidebarPropertyTokens.statusLeaving
      : sidebarPropertyTokens.statusIdle;

  const statusDotClass =
    status === 'arriving'
      ? sidebarPropertyTokens.statusArrivingDot
      : status === 'leaving'
      ? sidebarPropertyTokens.statusLeavingDot
      : sidebarPropertyTokens.statusIdleDot;

  return (
    <div className="px-4 pb-3">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => onSelect?.(property.id)}
        className={clsx(
          'flex w-full flex-col gap-2.5 rounded-2xl p-3 text-left',
          sidebarPropertyTokens.card,
          sidebarPropertyTokens.focusRing,
        )}
      >
        <div className="flex items-start gap-3">
          {property.image_url ? (
            <img
              src={property.image_url}
              alt={fr.topnav.propertyCard.imageAlt}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              className={clsx(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
                sidebarPropertyTokens.imageFallback,
              )}
              aria-hidden="true"
            >
              <Home size={22} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={clsx('truncate text-sm font-semibold leading-tight', sidebarPropertyTokens.title)}>
              {property.name}
            </p>
            {platform ? (
              <span
                className={clsx(
                  'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  platform.className,
                )}
              >
                {platform.label}
              </span>
            ) : null}
            <p className={clsx('mt-1.5 text-[11px]', sidebarPropertyTokens.reference)}>
              {fr.topnav.propertyCard.referenceLabel.replace('{reference}', reference)}
            </p>
            {reservation ? (
              <p className={clsx('mt-0.5 text-[11px]', sidebarPropertyTokens.dates)}>
                {formatShortDate(reservation.check_in_date)}
                {' → '}
                {formatShortDate(reservation.check_out_date)}
              </p>
            ) : (
              <p className={clsx('mt-0.5 text-[11px]', sidebarPropertyTokens.reference)}>
                {fr.topnav.propertyCard.noUpcoming}
              </p>
            )}
          </div>
        </div>
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-medium',
            statusClass,
          )}
        >
          <span aria-hidden="true" className={clsx('h-1.5 w-1.5 rounded-full', statusDotClass)} />
          {statusLabel}
        </span>
      </button>
    </div>
  );
}

interface NavItem {
  id: AppPage;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function initialsFromName(name?: string) {
  if (!name) return 'H';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (parts[0]?.[0] ?? 'H').toUpperCase();
}

// ─── Sidebar nav item ──────────────────────────────────────────────────────────

interface SideNavItemProps {
  item: NavItem;
  isActive: boolean;
  onSelect: () => void;
}

function SideNavItem({ item, isActive, onSelect }: SideNavItemProps) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        aria-current={isActive ? 'page' : undefined}
        onClick={onSelect}
        className={clsx(
          'group relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-[15px]',
          transitionTokens.color,
          sidebarTokens.focusRing,
          isActive ? sidebarTokens.navItemActive : sidebarTokens.navItem,
        )}
      >
        {isActive ? (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400"
          />
        ) : null}
        <Icon
          size={18}
          aria-hidden="true"
          className={clsx(
            'shrink-0',
            isActive ? sidebarTokens.navIconActive : sidebarTokens.navIcon,
          )}
        />
        <span className="truncate">{item.label}</span>
        {item.badgeCount != null && item.badgeCount > 0 ? (
          <Badge variant="active" className={clsx('ml-auto shrink-0', sidebarTokens.navBadge)}>
            {item.badgeCount}
          </Badge>
        ) : null}
      </button>
    </li>
  );
}

// ─── Sidebar content (shared between desktop & mobile drawer) ─────────────────

interface SidebarContentProps {
  groups: NavGroup[];
  currentPage: AppPage;
  hostName?: string;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  onClose?: () => void;
  activeProperty?: Property | null;
  activeReservation?: Reservation | null;
  today: string;
  onSelectProperty?: (propertyId: string) => void;
}

function SidebarContent({
  groups,
  currentPage,
  hostName,
  onNavigate,
  onLogout,
  onClose,
  activeProperty,
  activeReservation,
  today,
  onSelectProperty,
}: SidebarContentProps) {
  const [isUpgradeBannerDismissed, setIsUpgradeBannerDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(UPGRADE_BANNER_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    onClose?.();
  };

  const dismissUpgradeBanner = () => {
    setIsUpgradeBannerDismissed(true);
    try {
      window.localStorage.setItem(UPGRADE_BANNER_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage failures and only dismiss for the current session.
    }
  };

  return (
    <div
      className={clsx(
        'relative flex h-full flex-col overflow-hidden',
        sidebarTokens.panel,
      )}
    >
      <div className={clsx('relative flex h-16 shrink-0 items-center gap-3 px-6')}>
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', sidebarTokens.brandTile)}>
          <span className={clsx('text-base font-bold', textTokens.inverse)}>H</span>
        </div>
        <p className={clsx('truncate text-lg font-semibold tracking-tight', sidebarTokens.brandText)}>
          {fr.app.brand}
        </p>
        {onClose != null ? (
          <button
            type="button"
            aria-label={fr.topnav.closeMobileMenu}
            onClick={onClose}
            className={clsx(
              'ml-auto rounded-lg p-2',
              transitionTokens.color,
              sidebarTokens.closeButton,
              sidebarTokens.focusRing,
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {activeProperty ? (
        <SidebarPropertyCard
          property={activeProperty}
          reservation={activeReservation ?? null}
          today={today}
          onSelect={onSelectProperty}
        />
      ) : null}

      <nav aria-label={fr.topnav.primaryNav} className="relative flex-1 overflow-y-auto px-3 pb-4 pt-2">
        <ul className="space-y-6">
          {groups.map((group, index) => (
            <li key={group.label} className={clsx(index > 0 && clsx('pt-5', 'border-t', sidebarTokens.divider))}>
              <p className={clsx('mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em]', sidebarTokens.navGroupLabel)}>
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <SideNavItem
                    key={item.id}
                    item={item}
                    isActive={currentPage === item.id}
                    onSelect={() => handleNavigate(item.id)}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {!isUpgradeBannerDismissed ? (
        <div className="relative shrink-0 px-4 pb-4">
          <div className={clsx('relative overflow-hidden rounded-[1.5rem] border p-4', sidebarTokens.promoCard)}>
            <button
              type="button"
              onClick={() => handleNavigate('pricing')}
              className={clsx('flex w-full items-start gap-3 rounded-2xl text-left', sidebarTokens.focusRing)}
            >
              <span className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', sidebarTokens.promoIcon)}>
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={clsx('block text-sm font-semibold', sidebarTokens.promoTitle)}>
                  {fr.topnav.upgrade}
                </span>
                <span className={clsx('mt-1 block text-xs leading-5', sidebarTokens.promoBody)}>
                  {fr.topnav.upgradeSubtitle}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={fr.a11y.close}
              onClick={(event) => {
                event.stopPropagation();
                dismissUpgradeBanner();
              }}
              className={clsx(
                'absolute right-2 top-2 rounded-xl p-1.5',
                transitionTokens.color,
                sidebarTokens.closeButton,
                sidebarTokens.focusRing,
              )}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <div className={clsx('relative shrink-0 px-4 py-4', sidebarTokens.userPanel)}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={fr.topnav.viewProfile}
            onClick={() => handleNavigate('profile')}
            className={clsx('flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left', sidebarTokens.focusRing)}
          >
            <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold', sidebarTokens.avatar)}>
              {initialsFromName(hostName)}
            </div>
            <div className="min-w-0">
              <p className={clsx('truncate text-sm font-semibold leading-tight', sidebarTokens.userName)}>
                {hostName ?? fr.app.hostFallbackName}
              </p>
              <p className={clsx('truncate text-xs leading-tight', sidebarTokens.userMeta)}>
                {fr.topnav.userMenu.profile}
              </p>
            </div>
          </button>
          <button
            type="button"
            aria-label={fr.topnav.userMenu.logout}
            onClick={onLogout}
            className={clsx(
              'shrink-0 rounded-2xl p-2',
              transitionTokens.color,
              sidebarTokens.logout,
              sidebarTokens.focusRing,
            )}
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function TopNavigation({
  currentPage,
  onNavigate,
  onLogout,
  hostName,
  reservationsActionCount = 0,
  activeProperty,
  activeReservation,
  today,
  onSelectProperty,
}: TopNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const todayStr = today ?? todayIso();

  const groups: NavGroup[] = [
    {
      label: fr.topnav.groups.overview,
      items: [
        { id: 'dashboard', label: fr.sidebar.menu.dashboard, icon: LayoutDashboard },
        { id: 'portfolio', label: fr.topnav.links.portfolio, icon: Building2 },
        { id: 'analytics', label: fr.topnav.links.analytics, icon: BarChart3 },
      ],
    },
    {
      label: fr.topnav.groups.operations,
      items: [
        { id: 'reservations', label: fr.topnav.links.reservations, icon: Calendar, badgeCount: reservationsActionCount },
        { id: 'properties', label: fr.topnav.links.properties, icon: Home },
        { id: 'housekeeping', label: fr.topnav.links.housekeeping, icon: Sparkles },
        { id: 'maintenance', label: fr.topnav.links.maintenance, icon: Wrench },
        { id: 'linen', label: fr.topnav.links.linen, icon: Wind },
        { id: 'inventory', label: fr.topnav.links.inventory, icon: Package },
      ],
    },
    {
      label: fr.topnav.groups.business,
      items: [
        { id: 'finance', label: fr.topnav.links.finance, icon: TrendingUp },
        { id: 'pricing-engine', label: fr.topnav.links.pricingEngine, icon: Tag },
        { id: 'messaging', label: fr.topnav.links.messaging, icon: MessageSquare },
        { id: 'ical', label: fr.topnav.links.ical, icon: CalendarDays },
      ],
    },
    {
      label: fr.topnav.groups.configuration,
      items: [
        { id: 'contracts', label: fr.topnav.links.documents, icon: FileText },
        { id: 'checkins', label: fr.topnav.links.automations, icon: Zap },
        { id: 'profile', label: fr.topnav.links.account, icon: User },
      ],
    },
  ];

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── Desktop sidebar (fixed, always visible on lg+) ── */}
      <aside
        aria-label={fr.topnav.primaryNav}
        className={clsx(
          'fixed inset-y-0 left-0 z-40 hidden w-64 lg:flex lg:flex-col',
          sidebarTokens.shell,
        )}
      >
        <SidebarContent
          groups={groups}
          currentPage={currentPage}
          hostName={hostName}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          activeProperty={activeProperty}
          activeReservation={activeReservation}
          today={todayStr}
          onSelectProperty={onSelectProperty}
        />
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        className={clsx(
          'sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden',
          surfaceTokens.panel,
          sidebarTokens.mobileTopBar,
          borderTokens.default,
        )}
      >
        <button
          type="button"
          aria-label={fr.topnav.openMobileMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className={clsx(
            'rounded-lg p-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
            textTokens.body,
          )}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label={fr.topnav.logoAria}
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center gap-2 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
        >
          <div className={clsx('flex h-8 w-8 items-center justify-center rounded-lg shadow-sm shadow-emerald-900/20', accentTokens.bg)}>
            <span className={clsx('font-display text-sm font-medium', textTokens.inverse)}>H</span>
          </div>
          <span className={clsx('font-display text-base font-medium tracking-tight', textTokens.title)}>
            {fr.app.brand}
          </span>
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {initialsFromName(hostName)}
        </div>
      </div>

      {/* ── Mobile overlay drawer ── */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className={clsx('absolute inset-0', surfaceTokens.overlay)}
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={fr.topnav.mobileMenuTitle}
            className={clsx(
              'absolute inset-y-0 left-0 w-72 shadow-xl',
              sidebarTokens.shell,
            )}
          >
            <SidebarContent
              groups={groups}
              currentPage={currentPage}
              hostName={hostName}
              onNavigate={handleNavigate}
              onLogout={onLogout}
              onClose={() => setMobileOpen(false)}
              activeProperty={activeProperty}
              activeReservation={activeReservation}
              today={todayStr}
              onSelectProperty={onSelectProperty}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
