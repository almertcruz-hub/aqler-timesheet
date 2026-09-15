import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const savedTheme = localStorage.getItem('timesheet-theme')
const prefersLightTheme = window.matchMedia('(prefers-color-scheme: light)').matches
const useLightTheme = savedTheme
  ? savedTheme === 'light'
  : prefersLightTheme

document.documentElement.classList.toggle('light', useLightTheme)
document.documentElement.style.colorScheme = useLightTheme ? 'light' : 'dark'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
