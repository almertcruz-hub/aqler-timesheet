import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

function PwaInstallButton() {
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

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt()
      setInstallPrompt(null)
      return
    }

    if (isIos) {
      setShowIosHelp(true)
    }
  }

  if (isInstalled || (!installPrompt && !isIos)) return null

  return (
    <>
      <button
        type="button"
        onClick={installApp}
        className="fixed bottom-4 right-20 z-[100] inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-300 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        <Download size={18} />
        <span className="hidden sm:inline">Install app</span>
      </button>

      {showIosHelp && (
        <aside className="fixed bottom-20 right-4 z-[110] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-200 shadow-2xl shadow-black/30">
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            aria-label="Close installation instructions"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={17} />
          </button>

          <div className="flex items-start gap-3 pr-7">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-300">
              <Share size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">Install AQLER Timesheet</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                In Safari, tap the Share button, then choose Add to Home Screen.
              </p>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}

export default PwaInstallButton
