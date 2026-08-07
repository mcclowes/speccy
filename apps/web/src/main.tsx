import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mcclowes/speccy-renderer/styles.css';
import './studio.css';
import './parameter-prototype.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
