import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import 'speccy-renderer/styles.css';
import './studio.css';
import { App } from './App';
import { DiffExample } from './DiffExample';

const Root = window.location.pathname === '/diff' ? DiffExample : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <Analytics />
  </StrictMode>,
);
