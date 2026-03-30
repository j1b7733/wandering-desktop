import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.addEventListener('error', (e) => {
  if (window.require) {
    const fs = window.require('fs');
    fs.writeFileSync('C:\\Users\\lorjo\\.gemini\\antigravity\\scratch\\wandering-desktop-v1.2\\tmp_err.txt', e.error ? e.error.stack : e.message);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
