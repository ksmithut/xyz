import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')
if (root instanceof HTMLDivElement) {
  createRoot(root).render(<App />)
}
