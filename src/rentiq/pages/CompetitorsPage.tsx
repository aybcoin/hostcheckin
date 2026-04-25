import { FormEvent, useMemo, useState } from 'react';
import { useRentiqStore } from '../store/useRentiqStore';
import { formatMad } from '../utils/currency';

export function CompetitorsPage() {
  const { competitors, listings, selectedListingId, addCompetitor } = useRentiqStore((state) => ({
    competitors: state.competitors,
    listings: state.listings,
    selectedListingId: state.selectedListingId,
    addCompetitor: state.addCompetitor,
  }));

  const selectedListing = listings.find((listing) => listing.id === selectedListingId) ?? listings[0] ?? null;
  const filtered = useMemo(
    () => competitors.filter((competitor) => competitor.zone === selectedListing?.zone),
    [competitors, selectedListing?.zone],
  );

  const averageWeekday = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(filtered.reduce((sum, item) => sum + item.priceWeekday, 0) / filtered.length);
  }, [filtered]);

  const averageWeekend = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(filtered.reduce((sum, item) => sum + item.priceWeekend, 0) / filtered.length);
  }, [filtered]);

  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await addCompetitor({
      name: String(form.get('name') ?? ''),
      zone: String(form.get('zone') ?? 'temara') as 'temara' | 'rabat' | 'harhoura' | 'skhirat' | 'sale' | 'oujda',
      capacity: Number(form.get('capacity') ?? 2),
      positioning: String(form.get('positioning') ?? 'standard') as 'budget' | 'standard' | 'premium' | 'luxe',
      priceWeekday: Number(form.get('priceWeekday') ?? 0),
      priceWeekend: Number(form.get('priceWeekend') ?? 0),
      cleaningFee: Number(form.get('cleaningFee') ?? 0),
      rating: Number(form.get('rating') ?? 4.5),
      amenities: String(form.get('amenities') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      url: String(form.get('url') ?? ''),
    });

    event.currentTarget.reset();
    setMessage('Concurrent ajouté avec succès.');
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <h3 className="text-sm font-semibold text-slate-100">Ajouter un concurrent</h3>
        <p className="mt-1 text-sm text-slate-400">Saisie manuelle légale pour alimenter le facteur concurrence.</p>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input name="name" required placeholder="Nom de l'annonce" className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input name="zone" defaultValue={selectedListing?.zone ?? 'temara'} className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
            <input name="capacity" type="number" defaultValue={4} className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="priceWeekday" type="number" placeholder="Prix semaine" className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
            <input name="priceWeekend" type="number" placeholder="Prix week-end" className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="cleaningFee" type="number" placeholder="Frais ménage" className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
            <input name="rating" type="number" step="0.01" defaultValue={4.5} className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
          </div>
          <select name="positioning" className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm">
            <option value="budget">budget</option>
            <option value="standard">standard</option>
            <option value="premium">premium</option>
            <option value="luxe">luxe</option>
          </select>
          <input name="amenities" placeholder="Equipements (virgules)" className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />
          <input name="url" placeholder="URL annonce (optionnel)" className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm" />

          <button type="submit" className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950">
            Ajouter
          </button>
          {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
        </form>
      </article>

      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Concurrents - {selectedListing?.zone ?? 'zone'}</h3>
            <p className="text-sm text-slate-400">Prix moyen concurrents semaine: {formatMad(averageWeekday)} · week-end: {formatMad(averageWeekend)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((competitor) => (
            <article key={competitor.id} className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{competitor.name}</p>
                  <p className="text-xs text-slate-400">
                    Capacité {competitor.capacity} · {competitor.positioning} · Note {competitor.rating.toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-slate-300">Semaine {formatMad(competitor.priceWeekday)}</p>
                  <p className="text-slate-300">Week-end {formatMad(competitor.priceWeekend)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Equipements: {competitor.amenities.join(', ')}</p>
            </article>
          ))}

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--rq-border)] p-4 text-sm text-slate-400">
              Aucun concurrent saisi pour cette zone.
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
