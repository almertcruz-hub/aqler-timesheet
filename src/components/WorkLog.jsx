import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, Inbox, Timer } from 'lucide-react'

function formatDate(dateString, fallbackTimestamp) {
  const date = dateString
    ? new Date(`${dateString}T12:00:00+08:00`)
    : new Date(fallbackTimestamp)

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatTime(timestamp) {
  if (!timestamp) return '—'

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatDuration(log) {
  if (!log.time_out) return 'In progress'

  const totalMinutes = Math.max(
    0,
    Math.round((new Date(log.time_out) - new Date(log.time_in)) / (1000 * 60))
  )
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function WorkLog({ logs }) {
  const [limit, setLimit] = useState(10)
  const visibleLogs = logs.slice(0, limit)

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
            Recent activity
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">Work log</h2>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
          {logs.length} {logs.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      {visibleLogs.length > 0 ? (
        <div className="space-y-3">
          {visibleLogs.map((log) => {
            const isActive = log.time_out === null

            return (
              <article
                key={log.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700 sm:p-5"
              >
                <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold text-slate-100">
                      {formatDate(log.shift_date, log.time_in)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Shift date</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2 text-blue-300">
                      <Clock3 size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{formatTime(log.time_in)}</p>
                      <p className="text-xs text-slate-500">Time in</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-800 p-2 text-slate-400">
                      <Clock3 size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{formatTime(log.time_out)}</p>
                      <p className="text-xs text-slate-500">Time out</p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isActive
                        ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                        : 'completed-badge border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    }`}>
                      {isActive ? <Timer size={14} /> : <CheckCircle2 size={14} />}
                      {isActive ? 'Active' : 'Completed'}
                    </div>
                    <p className={`mt-2 text-lg font-bold tabular-nums ${
                      isActive ? 'text-amber-300' : 'text-slate-100'
                    }`}>
                      {formatDuration(log)}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 py-14 text-center">
          <Inbox className="mx-auto text-slate-600" size={32} />
          <p className="mt-3 font-medium text-slate-300">No work sessions yet</p>
          <p className="mt-1 text-sm text-slate-500">
            No recorded sessions.
          </p>
        </div>
      )}

      {(limit < logs.length || limit > 10) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {limit < logs.length && (
            <button
              type="button"
              onClick={() => setLimit((current) => current + 10)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              <ChevronDown size={16} />
              Show more ({logs.length - limit} remaining)
            </button>
          )}

          {limit > 10 && (
            <button
              type="button"
              onClick={() => setLimit(10)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <ChevronUp size={16} />
              Show less
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default WorkLog
