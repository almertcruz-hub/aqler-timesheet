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
    <section className="mx-auto mb-10 max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex gap-3 flex-col justify-between sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-xl font-semibold uppercase tracking-widest text-slate-400">
            Today's Timesheet
          </h4>
      
          {isWorking ? (
            <div className="flex w-fit items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-sm font-medium text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              Working
            </div>
          ) : (
            <div className="flex w-fit items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              Not clocked in
            </div>
          )}
        </div>

        <div className="py-4 text-center">
          {isWorking ? (
            <>
              <p
                className="text-5xl font-semibold tracking-tight text-white tabular-nums md:text-7xl"
                aria-live="polite"
              >
                {formatElapsed(activeTimeIn, currentTime)}
              </p>

              <p className="mt-3 text-sm text-slate-400 md:text-base">
                Started at {formatCurrentTime(activeTimeIn)}
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
                {formatCurrentTime(currentTime)}
              </p>

              <p className="mt-3 text-sm text-slate-400 md:text-base">
                {formatCurrentDate(currentTime)}
              </p>
            </>
          )}
        </div>

        {isWorking ? (
          <button
            type="button"
            onClick={onTimeOut}
            disabled={isLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={19} />
            {isLoading ? 'Please wait...' : 'Time Out'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onTimeIn}
            disabled={isLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={19} />
            {isLoading ? 'Please wait...' : 'Time In'}
          </button>
        )}
      </div>
    </section>
    )
  }

export default TimeButtons
