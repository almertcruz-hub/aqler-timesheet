import { useEffect, useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'

function formatElapsed(startTime, currentTime) {
  if (!startTime) return '00:00:00'

  const difference = Math.max(
    0,
    currentTime.getTime() - startTime.getTime()
  )

  const totalSeconds = Math.floor(difference / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':')
}

function formatCurrentTime(date) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

function formatCurrentDate(date) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Splits a time string like "2:19:38 AM" into digit/colon/meridiem
// pieces so each can be styled and spaced independently.
function TimeDisplay({ value, className = '' }) {
  const match = value.match(/^(.*?)(\s?[AP]M)?$/i)
  const digits = match ? match[1] : value
  const meridiem = match ? match[2] : null

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      {digits.split('').map((char, i) =>
        char === ':' ? (
          <span key={i} className="mx-[0.03em] -translate-y-[0.08em] tracking-normal text-[0.75em] text-slate-500">
            :
          </span>
        ) : (
          <span key={i} className="tracking-tighter">{char}</span>
        )
      )}
      {meridiem && (
        <span className="ml-2.5 self-end pb-[0.12em] text-[0.32em] font-semibold tracking-normal text-slate-400">
          {meridiem.trim()}
        </span>
      )}
    </span>
  )
}

function TimeButtons({
  onTimeIn,
  onTimeOut,
  activeTimeIn,
  isLoading,
}) {

  const [currentTime, setCurrentTime] = useState(
    () => new Date()
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const isWorking = Boolean(activeTimeIn)

  return (
    <section className="mb-10 rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/10 md:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-base text-slate-400">
          {formatCurrentDate(currentTime)}
        </p>

        {isWorking ? (
          <div
            role="status"
            className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 z-0 animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex z-10 h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            Clocked In
          </div>
        ) : (
          <div className="flex w-fit items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Not Clocked In
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 border-t border-slate-800/60 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          {isWorking ? (
            <>
              <TimeDisplay
                value={formatElapsed(activeTimeIn, currentTime)}
                className="font-mono text-5xl font-semibold text-white tabular-nums md:text-6xl"
              />
              <p className="mt-3 text-sm text-slate-400 md:text-base">
                Session started at <span className="font-medium text-slate-200">{formatCurrentTime(activeTimeIn)}</span>
              </p>
            </>
          ) : (
            <TimeDisplay
              value={formatCurrentTime(currentTime)}
              className="font-mono text-5xl font-semibold text-white tabular-nums md:text-6xl"
            />
          )}
        </div>

        <div className="w-full sm:w-52">
          {isWorking ? (
            <button
              type="button"
              onClick={onTimeOut}
              disabled={isLoading}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-semibold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={19} />
              {isLoading ? 'Please wait...' : 'Time Out'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onTimeIn}
              disabled={isLoading}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn size={19} />
              {isLoading ? 'Please wait...' : 'Time In'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default TimeButtons