import { Download, RefreshCw, Search } from 'lucide-react'
import {
  formatLogDate,
  formatLogDuration,
  formatLogTime,
} from '../../lib/adminLogHelpers'

function WorkLogsPanel({
  logs,
  loading,
  error,
  search,
  setSearch,
  page,
  setPage,
  totalLogs,
  totalPages,
  exporting,
  onExport,
  onRefresh,
}) {
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-4xl">Employee Work Logs</h1>
          <p className="mt-2 text-slate-400">
            View time-in and time-out activity across all employees.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={onExport}
            disabled={totalLogs === 0 || exporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <label className="relative w-full sm:w-80">
            <span className="sr-only">Search employee logs</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee, email, or date"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          Unable to load employee logs: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
              <tr>
                <th className="px-5 py-4 font-medium">Employee</th>
                <th className="px-5 py-4 font-medium">Shift date</th>
                <th className="px-5 py-4 font-medium">Time in</th>
                <th className="px-5 py-4 font-medium">Time out</th>
                <th className="px-5 py-4 font-medium">Duration</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => {
                const isActive = !log.time_out

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">
                        {log.full_name || 'Employee'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {log.email || log.user_id}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {formatLogDate(log.shift_date)}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {formatLogTime(log.time_in)}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {isActive ? 'Still working' : formatLogTime(log.time_out)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-200">
                      {formatLogDuration(log)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isActive
                          ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                          : 'admin-completed-badge border border-green-500/20 bg-green-500/10 text-green-300'
                      }`}>
                        {isActive ? 'In progress' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="px-6 py-12 text-center text-slate-400">
            Loading employee logs...
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500">
            No employee logs found.
          </div>
        )}

        {!loading && totalLogs > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Page {page} of {totalPages} · {totalLogs} sessions
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={page === 1}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default WorkLogsPanel
