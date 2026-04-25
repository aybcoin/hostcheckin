import { BarChart3, Beaker, Building2, CalendarDays, Download, RefreshCcw, Sparkles, TrendingUp } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useRentiqStore } from '../store/useRentiqStore';

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { to: '/recommendations', label: 'Recommandations', icon: Sparkles },
  { to: '/backtest', label: 'Backtest', icon: Beaker },
  { to: '/listings', label: 'Mes logements', icon: Building2 },
  { to: '/competitors', label: 'Concurrents', icon: TrendingUp },
  { to: '/imports', label: 'Import / Export', icon: Download },
];

export function LayoutShell() {
  const {
    listings,
    selectedListingId,
    setSelectedListing,
    regeneratePricing,
    loading,
    recommendations,
  } = useRentiqStore((state) => ({
    listings: state.listings,
    selectedListingId: state.selectedListingId,
    setSelectedListing: state.setSelectedListing,
    regeneratePricing: state.regeneratePricing,
    loading: state.loading,
    recommendations: state.recommendations,
  }));

  const activeListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? listings[0] ?? null,
    [listings, selectedListingId],
  );

  return (
    <div className="min-h-screen bg-[var(--rq-bg)] text-[var(--rq-text)]">
      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-4 md:py-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-2xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4 shadow-2xl shadow-black/20 lg:flex">
          <div className="mb-6 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">RentIQ Maroc</p>
            <h1 className="mt-2 text-xl font-semibold">Revenue cockpit</h1>
            <p className="mt-1 text-sm text-slate-300">Pricing dynamique local-first</p>
          </div>

          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                  {link.to === '/recommendations' ? (
                    <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                      {recommendations.length}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-[var(--rq-border)] bg-black/20 p-3 text-xs text-slate-400">
            Mode local-first actif. Aucun scraping ni automation risquée.
          </div>
        </aside>

        <div className="flex-1 space-y-4">
          <header className="rounded-2xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">MVP pricing</p>
                <h2 className="text-lg font-semibold">{activeListing?.name ?? 'Aucun logement'}</h2>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedListingId ?? activeListing?.id ?? ''}
                  onChange={(event) => setSelectedListing(event.target.value)}
                  className="min-w-56 rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm outline-none ring-0"
                >
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    void regeneratePricing(60);
                  }}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Recalculer 60 jours
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
