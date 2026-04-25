import { Suspense, StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import RentiqApp from './rentiq/RentiqApp';
import './index.css';

const App = lazy(() => import('./App'));

function isRentiqRoute(pathname: string): boolean {
  return pathname === '/rentiq' || pathname.startsWith('/rentiq/');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      {isRentiqRoute(window.location.pathname) ? <RentiqApp /> : <App />}
    </Suspense>
  </StrictMode>,
);
