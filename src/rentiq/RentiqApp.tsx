import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LayoutShell } from './components/LayoutShell';
import { CompetitorsPage } from './pages/CompetitorsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { BacktestPage } from './pages/BacktestPage';
import { ListingsPage } from './pages/ListingsPage';
import { PricingCalendarPage } from './pages/PricingCalendarPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { useRentiqStore } from './store/useRentiqStore';
import './app/theme.css';

export default function RentiqApp() {
  const initialize = useRentiqStore((state) => state.initialize);
  const initialized = useRentiqStore((state) => state.initialized);
  const loading = useRentiqStore((state) => state.loading);
  const error = useRentiqStore((state) => state.error);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  if (loading && !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--rq-bg)] text-[var(--rq-text)]">
        Initialisation RentIQ Maroc...
      </div>
    );
  }

  if (error && !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--rq-bg)] text-[var(--rq-text)]">
        {error}
      </div>
    );
  }

  return (
    <BrowserRouter basename="/rentiq">
      <Routes>
        <Route element={<LayoutShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<PricingCalendarPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/backtest" element={<BacktestPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/competitors" element={<CompetitorsPage />} />
          <Route path="/imports" element={<ImportExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
