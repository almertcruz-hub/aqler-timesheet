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
    <section className="mb-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/15">
      <div className={`h-1 w-full ${isWorking ? 'bg-emerald-500' : 'bg-blue-500'}`} />
      <div className="p-5 md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>

            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Today's Timesheet
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatCurrentDate(currentTime)}
            </p>

          </div>
      
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

        <div className="grid items-center gap-7 py-4 md:grid-cols-[1fr_auto] md:text-left">
          <div className="text-center md:text-left">
          {isWorking ? (
            <>
              <p
                className="text-5xl font-semibold tracking-tight text-white tabular-nums md:text-6xl"
                aria-live="polite"
              >
                {formatElapsed(activeTimeIn, currentTime)}
              </p>

              <p className="mt-3 text-sm text-slate-400 md:text-base">
                Session started at <span className="font-medium text-slate-200">{formatCurrentTime(activeTimeIn)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl font-semibold tracking-tight text-white tabular-nums md:text-6xl">
                {formatCurrentTime(currentTime)}
              </p>

              <p className="mt-3 text-sm text-slate-400 md:text-base">
                Current time
              </p>
            </>
          )}
          </div>

          <div className="md:w-52">
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
      </div>
      </div>
    </section>
    )
  }

export default TimeButtons
