import { ChangeEvent, useState } from 'react';
import { useRentiqStore } from '../store/useRentiqStore';
import type { RentIQSnapshot } from '../services/importExportService';

async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

export function ImportExportPage() {
  const { exportJson, importJson, importCsvBookings, importIcalBookings } = useRentiqStore((state) => ({
    exportJson: state.exportJson,
    importJson: state.importJson,
    importCsvBookings: state.importCsvBookings,
    importIcalBookings: state.importIcalBookings,
  }));

  const [csvText, setCsvText] = useState('');
  const [icalText, setIcalText] = useState('');
  const [message, setMessage] = useState('');

  const handleJsonImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const snapshot = JSON.parse(content) as RentIQSnapshot;
      await importJson(snapshot);
      setMessage('Import JSON terminé.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur import JSON.');
    }
  };

  const handleCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const count = await importCsvBookings(content);
      setMessage(`${count} réservation(s) importée(s) depuis CSV.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur import CSV.');
    }
  };

  const handleIcalFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const count = await importIcalBookings(content);
      setMessage(`${count} réservation(s) importée(s) depuis iCal.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur import iCal.');
    }
  };

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
        <h3 className="text-sm font-semibold text-slate-100">Import / Export</h3>
        <p className="mt-1 text-sm text-slate-400">
          Backup JSON complet + première version fonctionnelle CSV/iCal.
        </p>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="space-y-3 rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
          <h4 className="text-sm font-semibold text-slate-100">JSON complet</h4>
          <button
            type="button"
            onClick={() => {
              void exportJson();
            }}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950"
          >
            Exporter JSON
          </button>
          <label className="block text-sm text-slate-300">
            Importer JSON
            <input type="file" accept="application/json" onChange={handleJsonImport} className="mt-2 block w-full text-sm" />
          </label>
        </article>

        <article className="space-y-3 rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
          <h4 className="text-sm font-semibold text-slate-100">CSV Airbnb (v1)</h4>
          <label className="block text-sm text-slate-300">
            Import fichier CSV
            <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="mt-2 block w-full text-sm" />
          </label>
          <textarea
            rows={5}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            placeholder="Coller un CSV ici (optionnel)"
            className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              void importCsvBookings(csvText).then((count) => setMessage(`${count} réservation(s) importée(s) depuis texte CSV.`));
            }}
            className="rounded-lg border border-[var(--rq-border)] px-3 py-2 text-sm text-slate-200"
          >
            Importer texte CSV
          </button>
        </article>

        <article className="space-y-3 rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4 xl:col-span-2">
          <h4 className="text-sm font-semibold text-slate-100">iCal (v1)</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-slate-300">
              Import fichier iCal (.ics)
              <input type="file" accept=".ics,text/calendar" onChange={handleIcalFile} className="mt-2 block w-full text-sm" />
            </label>
            <div>
              <textarea
                rows={5}
                value={icalText}
                onChange={(event) => setIcalText(event.target.value)}
                placeholder="Coller un flux iCal brut ici"
                className="w-full rounded-lg border border-[var(--rq-border)] bg-[var(--rq-panel)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  void importIcalBookings(icalText).then((count) => setMessage(`${count} réservation(s) importée(s) depuis texte iCal.`));
                }}
                className="mt-2 rounded-lg border border-[var(--rq-border)] px-3 py-2 text-sm text-slate-200"
              >
                Importer texte iCal
              </button>
            </div>
          </div>
        </article>
      </div>

      {message ? (
        <p className="rounded-lg border border-[var(--rq-border)] bg-[var(--rq-surface)] p-3 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}
    </section>
  );
}
