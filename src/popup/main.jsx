import React from 'react';
import ReactDOM from 'react-dom/client';
import PopupApp from './PopupApp.jsx';
import { AppState } from '../utils/AppState.js';

const appState = new AppState();

ReactDOM.createRoot(document.getElementById('popup-root')).render(
  <React.StrictMode>
    <PopupApp appState={appState} />
  </React.StrictMode>
);
