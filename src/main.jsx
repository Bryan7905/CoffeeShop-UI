import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import api from './api';

const apiUrl = import.meta.env.VITE_API_BASE_URL;
if (apiUrl) {
  api.setBaseUrl(apiUrl);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)