import { useEffect, useMemo, useState } from 'react';
import { Ban, Plus, Trash2 } from 'lucide-react';
import { supabase, BlacklistedGuest } from '../lib/supabase';
import { fr } from '../lib/i18n/fr';

interface BlacklistPageProps {
  hostId: string | null;
}

interface BlacklistForm {
  full_name: string;
  email: string;
  phone: string;
  document_number: string;
  reason: string;
}

const EMPTY_FORM: BlacklistForm = {
  full_name: '',
  email: '',
  phone: '',
  document_number: '',
  reason: '',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function BlacklistPage({ hostId }: BlacklistPageProps) {
  const [items, setItems] = useState<BlacklistedGuest[]>([]);
  const [form, setForm] = useState<BlacklistForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(
    () =>
      Boolean(form.full_name.trim()) &&
      Boolean(form.reason.trim()) &&
      Boolean(form.email.trim() || form.phone.trim() || form.document_number.trim()),
    [form],
  );

  useEffect(() => {
    const fetchItems = async () => {
      if (!hostId) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('blacklisted_guests')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Impossible de charger la liste noire.');
        setLoading(false);
        return;
      }
      setError(null);
      setItems((data || []) as BlacklistedGuest[]);
      setLoading(false);
    };

    void fetchItems();
  }, [hostId]);

  const handleAdd = async () => {
    if (!hostId || !isFormValid) return;
    setSaving(true);

    const payload = {
      host_id: hostId,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      document_number: form.document_number.trim() || null,
      reason: form.reason.trim(),
    };

    const { data, error: insertError } = await supabase
      .from('blacklisted_guests')
      .insert(payload)
      .select()
      .maybeSingle();

    if (insertError) {
      setError('Impossible d’ajouter cet invité à la liste noire.');
      setSaving(false);
      return;
    }

    if (data) {
      setItems((previous) => [data as BlacklistedGuest, ...previous]);
    }
    setForm(EMPTY_FORM);
    setError(null);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('blacklisted_guests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError('Impossible de supprimer cet élément.');
      return;
    }

    setItems((previous) => previous.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Liste noire</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bloquez des invités pour éviter toute future réservation non souhaitée.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ajouter un invité</h2>
        <p className="mt-1 text-sm text-slate-600">
          Renseignez au moins un identifiant : e-mail, téléphone ou numéro de document.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="blacklist-full-name" className="text-xs font-medium text-slate-700">
              {fr.blacklist.fullName}
            </label>
            <input
              id="blacklist-full-name"
              type="text"
              value={form.full_name}
              onChange={(event) => setForm((previous) => ({ ...previous, full_name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="blacklist-email" className="text-xs font-medium text-slate-700">
              {fr.blacklist.email}
            </label>
            <input
              id="blacklist-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="blacklist-phone" className="text-xs font-medium text-slate-700">
              {fr.blacklist.phone}
            </label>
            <input
              id="blacklist-phone"
              type="text"
              value={form.phone}
              onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="blacklist-document-number" className="text-xs font-medium text-slate-700">
              {fr.blacklist.documentNumber}
            </label>
            <input
              id="blacklist-document-number"
              type="text"
              value={form.document_number}
              onChange={(event) => setForm((previous) => ({ ...previous, document_number: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="blacklist-reason" className="text-xs font-medium text-slate-700">
              {fr.blacklist.reason}
            </label>
            <textarea
              id="blacklist-reason"
              value={form.reason}
              onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!isFormValid || saving}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          {saving ? 'Ajout…' : 'Ajouter à la liste noire'}
        </button>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Invités blacklistés</h2>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Chargement de la liste noire…</p>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Aucun invité blacklisté pour le moment.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.full_name}</p>
                    <p className="text-xs text-slate-500">Ajouté le {formatDate(item.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Retirer cet invité de la liste noire"
                    className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                  <p><strong>E-mail :</strong> {item.email || '—'}</p>
                  <p><strong>Téléphone :</strong> {item.phone || '—'}</p>
                  <p><strong>Document :</strong> {item.document_number || '—'}</p>
                  <p><strong>Raison :</strong> {item.reason}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-center gap-2">
          <Ban size={16} />
          La correspondance est vérifiée lors de la création d’une réservation.
        </div>
      </div>
    </div>
  );
}
