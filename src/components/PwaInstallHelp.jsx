import { Share, X } from 'lucide-react'
import { useAppUtilities } from '../context/appUtilities'

function PwaInstallHelp() {
  const { closeIosHelp, showIosHelp } = useAppUtilities()

  if (!showIosHelp) return null

  return (
    <aside className="fixed bottom-4 right-4 z-[110] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-200 shadow-2xl shadow-black/30">
      <button
        type="button"
        onClick={closeIosHelp}
        aria-label="Close installation instructions"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        <X size={17} />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-300">
          <Share size={19} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-100">Install AQLER Timesheet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            In Safari, tap Share, then choose Add to Home Screen.
          </p>
        </div>
      </div>
    </aside>
  )
}

export default PwaInstallHelp
