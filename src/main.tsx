import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RentiqApp from './rentiq/RentiqApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RentiqApp />
  </StrictMode>,
);
