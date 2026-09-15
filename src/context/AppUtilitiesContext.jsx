import { useEffect, useState } from 'react'
import { AppUtilitiesContext } from './appUtilities'

function AppUtilitiesProvider({ children }) {
  const [isLight, setIsLight] = useState(() =>
    document.documentElement.classList.contains('light')
  )
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  useEffect(() => {
    function saveInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    function handleInstalled() {
      setInstallPrompt(null)
      setShowIosHelp(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', saveInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', saveInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  function toggleTheme() {
    const nextIsLight = !isLight

    document.documentElement.classList.toggle('light', nextIsLight)
    document.documentElement.style.colorScheme = nextIsLight ? 'light' : 'dark'
    localStorage.setItem('timesheet-theme', nextIsLight ? 'light' : 'dark')
    setIsLight(nextIsLight)
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt()
      setInstallPrompt(null)
      return
    }

    if (isIos) setShowIosHelp(true)
  }

  const value = {
    canInstall: !isInstalled && (Boolean(installPrompt) || isIos),
    installApp,
    isLight,
    showIosHelp,
    closeIosHelp: () => setShowIosHelp(false),
    toggleTheme,
  }

  return (
    <AppUtilitiesContext.Provider value={value}>
      {children}
    </AppUtilitiesContext.Provider>
  )
}

export default AppUtilitiesProvider
