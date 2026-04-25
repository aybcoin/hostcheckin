import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRentiqStore } from '../store/useRentiqStore';
import type { ListingPositioning } from '../types';
import { formatMad } from '../utils/currency';

export function ListingsPage() {
  const listings = useRentiqStore((state) => state.listings);
  const selectedListingId = useRentiqStore((state) => state.selectedListingId);
  const updateListing = useRentiqStore((state) => state.updateListing);
  const updateListingAmenities = useRentiqStore((state) => state.updateListingAmenities);

  const listing = useMemo(
    () => listings.find((item) => item.id === selectedListingId) ?? listings[0] ?? null,
    [listings, selectedListingId],
  );

  const [amenitiesInput, setAmenitiesInput] = useState(listing?.amenities.join(', ') ?? '');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setAmenitiesInput(listing?.amenities.join(', ') ?? '');
  }, [listing?.id, listing?.amenities]);

  if (!listing) {
    return <p className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">Aucun logement.</p>;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await updateListing(listing.id, {
      basePrice: Number(form.get('basePrice')),
      minPrice: Number(form.get('minPrice')),
      maxPrice: Number(form.get('maxPrice')),
      positioning: form.get('positioning') as ListingPositioning,
      currentPrice: Number(form.get('currentPrice')),
    });

    const amenities = amenitiesInput
      .split(',')
      .map((amenity) => amenity.trim())
      .filter(Boolean);

    await updateListingAmenities(listing.id, amenities);
    setMessage('Modifications sauvegardées dans IndexedDB.');
  };

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <h3 className="text-sm font-semibold text-slate-100">Mes logements</h3>
        <p className="mt-1 text-sm text-slate-400">Edition du pricing de base, bornes, positionnement et équipements.</p>
      </article>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Nom</span>
            <input
              value={listing.name}
              readOnly
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-slate-200"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Zone</span>
            <input
              value={listing.zone}
              readOnly
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-slate-200"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Prix de base (MAD)</span>
            <input
              name="basePrice"
              type="number"
              defaultValue={listing.basePrice}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Prix actuel (MAD)</span>
            <input
              name="currentPrice"
              type="number"
              defaultValue={listing.currentPrice ?? listing.basePrice}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Prix minimum (MAD)</span>
            <input
              name="minPrice"
              type="number"
              defaultValue={listing.minPrice}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Prix maximum (MAD)</span>
            <input
              name="maxPrice"
              type="number"
              defaultValue={listing.maxPrice}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Positionnement</span>
            <select
              name="positioning"
              defaultValue={listing.positioning}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
            >
              <option value="budget">budget</option>
              <option value="standard">standard</option>
              <option value="premium">premium</option>
              <option value="luxe">luxe</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Frais ménage</span>
            <input
              readOnly
              value={formatMad(listing.cleaningFee)}
              className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Équipements (séparés par virgule)</span>
          <textarea
            rows={3}
            value={amenitiesInput}
            onChange={(event) => setAmenitiesInput(event.target.value)}
            className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2"
          />
        </label>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Capacité {listing.capacity} · Chambres {listing.bedrooms}</p>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            Sauvegarder
          </button>
        </div>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      </form>
    </section>
  );
}
