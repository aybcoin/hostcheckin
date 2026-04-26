/**
 * SideNavigation — left sidebar (Payoneer-style)
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
  iconButtonToken,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';
import type { AppPage } from '../lib/navigation';
import { fr } from '../lib/i18n/fr';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

const UPGRADE_BANNER_DISMISSED_KEY = 'hostcheckin:upgrade-banner-dismissed';

interface TopNavigationProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  hostName?: string;
  reservationsActionCount?: number;
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
          'group flex w-full items-center gap-3 rounded-lg py-2.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
          isActive
            ? clsx(
              'border-l-[3px] pl-[9px] pr-3 font-semibold',
              accentTokens.bgLight,
              accentTokens.activeNavBorder,
              accentTokens.activeNavText,
            )
            : clsx('px-3 font-medium', textTokens.muted, 'hover:bg-slate-100 hover:text-slate-900'),
        )}
      >
        <Icon
          size={18}
          aria-hidden="true"
          className={clsx(
            'shrink-0',
            isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600',
          )}
        />
        <span className="truncate">{item.label}</span>
        {item.badgeCount != null && item.badgeCount > 0 ? (
          <Badge variant="active" className="ml-auto shrink-0">
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
}

function SidebarContent({
  groups,
  currentPage,
  hostName,
  onNavigate,
  onLogout,
  onClose,
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
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={clsx('flex h-16 shrink-0 items-center gap-3 border-b px-5', borderTokens.subtle)}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 shadow-sm shadow-emerald-900/20">
          <span className="font-display text-base font-medium text-white">H</span>
        </div>
        <span className={clsx('font-display text-lg font-medium tracking-tight', textTokens.title)}>
          {fr.app.brand}
        </span>
        {onClose != null ? (
          <button
            type="button"
            aria-label={fr.topnav.closeMobileMenu}
            onClick={onClose}
            className={clsx(
              'ml-auto rounded-lg p-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
              textTokens.muted,
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Nav groups */}
      <nav
        aria-label={fr.topnav.primaryNav}
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <ul className="space-y-8">
          {groups.map((group, index) => (
            <li key={group.label} className={clsx(index > 0 && 'border-t border-stone-100 pt-6')}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                {group.label}
              </p>
              <ul className="space-y-0.5">
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
        <div className={clsx('shrink-0 px-3 pb-3', borderTokens.subtle)}>
          <Card variant="default" padding="sm" className="relative overflow-hidden">
            <button
              type="button"
              onClick={() => handleNavigate('pricing')}
              className="flex w-full items-start gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
            >
              <span className={clsx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', accentTokens.bgLight, accentTokens.text)}>
                <Sparkles size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={clsx('block text-sm font-semibold', textTokens.title)}>
                  {fr.topnav.upgrade}
                </span>
                <span className={clsx('block text-xs', textTokens.muted)}>
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
              className={clsx('absolute right-2 top-2', iconButtonToken)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </Card>
        </div>
      ) : null}

      {/* User footer */}
      <div className={clsx('shrink-0 border-t px-3 py-3', borderTokens.default)}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={fr.topnav.viewProfile}
            onClick={() => handleNavigate('profile')}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initialsFromName(hostName)}
            </div>
            <div className="min-w-0 text-left">
              <p className={clsx('truncate text-sm font-semibold leading-tight', textTokens.title)}>
                {hostName ?? fr.app.hostFallbackName}
              </p>
              <p className={clsx('truncate text-xs leading-tight', textTokens.subtle)}>
                {fr.topnav.userMenu.profile}
              </p>
            </div>
          </button>
          <button
            type="button"
            aria-label={fr.topnav.userMenu.logout}
            onClick={onLogout}
            className={clsx(
              'shrink-0 rounded-lg p-2 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2',
              textTokens.subtle,
              'hover:text-red-600',
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
}: TopNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          'fixed inset-y-0 left-0 z-40 hidden w-64 border-r lg:flex lg:flex-col',
          surfaceTokens.panel,
          borderTokens.default,
        )}
      >
        <SidebarContent
          groups={groups}
          currentPage={currentPage}
          hostName={hostName}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        className={clsx(
          'sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden',
          surfaceTokens.panel,
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 shadow-sm shadow-emerald-900/20">
            <span className="font-display text-sm font-medium text-white">H</span>
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
              'absolute inset-y-0 left-0 w-72 border-r shadow-xl',
              surfaceTokens.panel,
              borderTokens.default,
            )}
          >
            <SidebarContent
              groups={groups}
              currentPage={currentPage}
              hostName={hostName}
              onNavigate={handleNavigate}
              onLogout={onLogout}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
