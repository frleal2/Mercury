import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Ensure Tailwind CSS is applied
import App from './App';
import { SessionProvider } from './providers/SessionProvider'; // Import SessionProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SessionProvider>
    <App />
  </SessionProvider>
);