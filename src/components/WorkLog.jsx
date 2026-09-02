import { useState } from "react"

function WorkLog({ logs }) {
  const [limit, setLimit] = useState(10)

  const visibleLogs = logs.slice(0, limit)

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Still working'

    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(timestamp))
  }

  const formatDuration = (log) => {
    if (!log.time_out) return 'In progress'

    const timeIn = new Date(log.time_in)
    const timeOut = new Date(log.time_out)

    const totalMinutes = Math.round(
      (timeOut - timeIn) / (1000 * 60)
    )

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${hours}h ${minutes}m`
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
      <h2 className="text-xl font-semibold mb-4 text-white">
        Work Log
      </h2>

      <div className="space-y-3">
        {visibleLogs.map((log) => {
          const isActive = log.time_out === null

          return (
            <article
              key={log.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-100">
                    Shift date: {log.shift_date}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Time In: {formatTime(log.time_in)}
                  </p>

                  <p className="text-sm text-slate-400">
                    Time Out: {formatTime(log.time_out)}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p
                    className={`text-2xl font-bold ${
                      isActive
                      ? 'text-amber-300'
                      : 'text-green-400'
                    }`}
                    >
                      {formatDuration(log)}
                    </p>

                    <p className="text-medium font-medium text-slate-500">
                      {isActive ? 'Active': 'Completed'}
                    </p>
                </div>
              </div>
            </article>
          )
        })
      }

      {visibleLogs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center text-slate-300">
          <div className="mb-3 text-5xl">😴</div>

          <p className="font-medium text-slate-600 transition hover:text-white">
            No recorded work sessions yet.
          </p>
        </div>
      )}
      </div>

      <div className="mt-6 flex justify-center gap-4">
        {limit < logs.length && (
          <button
            type="button"
            onClick={() => setLimit((current) => current + 10)}
            className="text-sm text-slate-400"
          >
            Show more ({logs.length - limit} remaining)
          </button>
        )}

        {limit > 10 && (
          <button
            type="button"
            onClick={() => setLimit(10)}
            className="text-sm text-slate-400 transition hover:text-red-400"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  )
}

export default WorkLog
