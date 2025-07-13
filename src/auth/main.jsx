import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthApp from './AuthApp.jsx';

const container = document.getElementById('auth-root');
const root = createRoot(container);
root.render(<AuthApp />);
