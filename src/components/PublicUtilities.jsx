import { Download, Moon, Sun } from 'lucide-react'
import { useAppUtilities } from '../context/appUtilities'

function PublicUtilities() {
  const { canInstall, installApp, isLight, toggleTheme } = useAppUtilities()

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      {canInstall && (
        <button
          type="button"
          onClick={installApp}
          aria-label="Install app"
          title="Install app"
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 shadow-sm transition hover:bg-slate-800 hover:text-white"
        >
          <Download size={17} />
        </button>
      )}

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isLight ? 'Use dark theme' : 'Use light theme'}
        title={isLight ? 'Use dark theme' : 'Use light theme'}
        className="grid h-10 w-10 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 shadow-sm transition hover:bg-slate-800 hover:text-white"
      >
        {isLight ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    </div>
  )
}

export default PublicUtilities
