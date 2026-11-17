import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

// Restaura a URL original capturada pelo 404.html do GitHub Pages.
const redirect = sessionStorage.getItem('__redirect')
if (redirect) {
  sessionStorage.removeItem('__redirect')
  window.history.replaceState(null, '', redirect)
}

// No GitHub Pages o site vive sob /<nome-do-repositorio>/. O basename faz as
// rotas /v/:slug e /admin funcionarem dentro desse prefixo.
const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
