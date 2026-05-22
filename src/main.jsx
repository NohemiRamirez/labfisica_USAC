import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App.jsx'

// Guarda el laboratorio activo si el usuario cierra el navegador
window.addEventListener('beforeunload', () => {
  const store = window.__labfisicaStore
  if (store) store.saveNow()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)