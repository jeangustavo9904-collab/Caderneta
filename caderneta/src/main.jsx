import React from 'react';
import { createRoot } from 'react-dom/client';
// Fontes empacotadas junto com o app (nada é buscado na internet).
import '@fontsource-variable/figtree';
import '@fontsource-variable/bricolage-grotesque';
import './index.css';
import './lib/instalacao';
import App from './App';

// Pede ao navegador para não apagar os dados quando o aparelho ficar sem espaço.
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
