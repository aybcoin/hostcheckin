import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { AppPage } from '../lib/navigation';
import { fr } from '../lib/i18n/fr';
import { Button } from './ui/Button';
import { NavigationItem } from './navigation/NavigationItem';

interface TopNavigationProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  hostName?: string;
  reservationsActionCount?: number;
}

interface PrimaryLink {
  id: AppPage;
  label: string;
  showBadge?: boolean;
}

const TABLET_MAX_VISIBLE_LINKS = 5;
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function initialsFromName(name?: string) {
  if (!name) return 'H';
  const [first = 'H'] = name.trim().split(/\s+/);
  return first[0]?.toUpperCase() || 'H';
}

export function TopNavigation({
  currentPage,
  onNavigate,
  onLogout,
  hostName,
  reservationsActionCount = 0,
}: TopNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabletMoreOpen, setTabletMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabletMoreRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);

  /**
   * Responsive logic:
   * - <768px: header compact + hamburger, menu plein écran pour réduire la densité visuelle.
   * - 768-1023px: topbar condensée, "More" protège la lisibilité si le nombre de liens augmente.
   * - >=1024px: topbar complète, aucun hamburger (navigation directe visible).
   */
  const primaryLinks = useMemo<PrimaryLink[]>(
    () => [
      { id: 'reservations', label: fr.topnav.links.reservations, showBadge: true },
      { id: 'properties', label: fr.topnav.links.properties },
      { id: 'contracts', label: fr.topnav.links.documents },
      { id: 'checkins', label: fr.topnav.links.automations },
      { id: 'profile', label: fr.topnav.links.account },
    ],
    [],
  );

  const tabletVisibleLinks = primaryLinks.slice(0, TABLET_MAX_VISIBLE_LINKS);
  const tabletOverflowLinks = primaryLinks.slice(TABLET_MAX_VISIBLE_LINKS);

  useEffect(() => {
    setMobileOpen(false);
    setTabletMoreOpen(false);
    setUserMenuOpen(false);
  }, [currentPage]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tabletMoreRef.current && !tabletMoreRef.current.contains(target)) {
        setTabletMoreOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const panel = mobilePanelRef.current;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) || []);

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousActiveElement?.focus();
    };
  }, [mobileOpen]);

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
    setTabletMoreOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <header className={clsx('sticky top-0 z-40 border-b bg-white/95 backdrop-blur', borderTokens.default)}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <button
          type="button"
          aria-label={fr.topnav.logoAria}
          className={clsx('text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300', textTokens.title)}
          onClick={() => handleNavigate('dashboard')}
        >
          {fr.app.brand}
        </button>

        <nav aria-label="Navigation principale desktop" className="hidden flex-1 items-center justify-center lg:flex">
          <ul className="flex items-center gap-6">
            {primaryLinks.map((item) => (
              <li key={item.id}>
                <NavigationItem
                  variant="desktop"
                  label={item.label}
                  isActive={currentPage === item.id}
                  badgeCount={item.showBadge ? reservationsActionCount : undefined}
                  testId={`nav-link-${item.id}-desktop`}
                  onSelect={() => handleNavigate(item.id)}
                />
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Navigation principale tablette" className="hidden flex-1 items-center justify-center md:flex lg:hidden">
          <ul className="flex items-center gap-5">
            {tabletVisibleLinks.map((item) => (
              <li key={item.id}>
                <NavigationItem
                  variant="tablet"
                  label={item.label}
                  isActive={currentPage === item.id}
                  badgeCount={item.showBadge ? reservationsActionCount : undefined}
                  testId={`nav-link-${item.id}-tablet`}
                  onSelect={() => handleNavigate(item.id)}
                />
              </li>
            ))}
            {tabletOverflowLinks.length > 0 ? (
              <li>
                <div className="relative" ref={tabletMoreRef}>
                  <button
                    type="button"
                    aria-label={fr.topnav.more}
                    aria-haspopup="menu"
                    aria-expanded={tabletMoreOpen}
                    onClick={() => setTabletMoreOpen((previous) => !previous)}
                    className={clsx(
                      'inline-flex items-center gap-1 border-b-2 border-transparent py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
                      textTokens.muted,
                      'hover:opacity-90',
                    )}
                  >
                    {fr.topnav.more}
                    <ChevronDown size={14} />
                  </button>
                  {tabletMoreOpen ? (
                    <div role="menu" className={clsx('absolute right-0 top-11 z-50 min-w-48 rounded-lg border bg-white p-2 shadow-xl', borderTokens.default)}>
                      {tabletOverflowLinks.map((item) => (
                        <NavigationItem
                          key={item.id}
                          variant="menu"
                          label={item.label}
                          isActive={currentPage === item.id}
                          testId={`nav-link-${item.id}-tablet-more`}
                          onSelect={() => handleNavigate(item.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="secondary"
            size="sm"
            className={clsx(borderTokens.strong, textTokens.title)}
            onClick={() => handleNavigate('pricing')}
          >
            {fr.topnav.upgrade}
          </Button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              aria-label={fr.topnav.userMenu.aria}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((previous) => !previous)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300',
                borderTokens.default,
                textTokens.body,
                'hover:bg-white/70',
              )}
            >
              <span className={clsx('inline-flex h-7 w-7 items-center justify-center rounded-full bg-current text-xs font-semibold text-white', textTokens.title)}>
                {initialsFromName(hostName)}
              </span>
              <ChevronDown size={14} />
            </button>

            {userMenuOpen ? (
              <div role="menu" className={clsx('absolute right-0 top-11 z-50 min-w-52 rounded-lg border bg-white p-2 shadow-xl', borderTokens.default)}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate('profile')}
                  className={clsx('w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300', textTokens.body)}
                >
                  {fr.topnav.userMenu.profile}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate('pricing')}
                  className={clsx('w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300', textTokens.body)}
                >
                  {fr.topnav.userMenu.billing}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleNavigate('help')}
                  className={clsx('w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300', textTokens.body)}
                >
                  {fr.topnav.userMenu.help}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className={clsx('w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300', textTokens.danger)}
                >
                  {fr.topnav.userMenu.logout}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          data-testid="topnav-mobile-open"
          aria-label={fr.topnav.openMobileMenu}
          aria-expanded={mobileOpen}
          aria-controls="topnav-mobile-panel"
          onClick={() => setMobileOpen(true)}
          className={clsx('rounded-lg border p-2 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 md:hidden', borderTokens.default, textTokens.body)}
        >
          <Menu size={20} />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className={clsx('absolute inset-0', surfaceTokens.overlay)} onClick={() => setMobileOpen(false)} />
          <div
            id="topnav-mobile-panel"
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label={fr.topnav.mobileMenuTitle}
            data-testid="topnav-mobile-panel"
            className="absolute inset-0 flex flex-col bg-white px-5 pb-6 pt-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className={clsx('text-base font-semibold', textTokens.title)}>{fr.topnav.mobileMenuTitle}</p>
              <button
                type="button"
                data-testid="topnav-mobile-close"
                aria-label={fr.topnav.closeMobileMenu}
                onClick={() => setMobileOpen(false)}
                className={clsx('rounded-lg border p-2 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300', borderTokens.default, textTokens.body)}
              >
                <X size={18} />
              </button>
            </div>

            <nav aria-label="Navigation principale mobile" className="flex-1 overflow-auto">
              <ul className="space-y-1">
                {primaryLinks.map((item) => (
                  <li key={item.id}>
                    <NavigationItem
                      variant="mobile"
                      label={item.label}
                      isActive={currentPage === item.id}
                      badgeCount={item.showBadge ? reservationsActionCount : undefined}
                      testId={`nav-link-${item.id}-mobile`}
                      onSelect={() => handleNavigate(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <div className={clsx('mt-4 space-y-2 border-t pt-4', borderTokens.default)}>
              <Button
                variant="secondary"
                fullWidth
                className={clsx('justify-center', borderTokens.strong, textTokens.title)}
                onClick={() => handleNavigate('pricing')}
              >
                {fr.topnav.upgrade}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleNavigate('profile')}
                className="justify-center"
              >
                {fr.topnav.userMenu.profile}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleNavigate('help')}
                className="justify-center"
              >
                {fr.topnav.userMenu.help}
              </Button>
              <Button
                variant="dangerSoft"
                fullWidth
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                className="justify-center"
              >
                {fr.topnav.userMenu.logout}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
