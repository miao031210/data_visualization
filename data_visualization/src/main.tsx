import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDashboardPersistence } from './store/dashboardStore'

const root = document.getElementById('root')

async function bootstrap() {
  await initDashboardPersistence()
  if (!root) return
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
