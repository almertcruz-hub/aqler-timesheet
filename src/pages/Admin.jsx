import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

function Admin({ session }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await supabase
        .from('logs')
        .select('id, type, time, date, duration, created_at, user_id, profiles(full_name, email)')
        .order('created_at', { ascending: false })

      if (queryError) setError(queryError.message)
      else setLogs(data || [])

      setLoading(false)
    }

    fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return logs

    return logs.filter((log) => {
      const employee = log.profiles
      return [employee?.full_name, employee?.email, log.type, log.date]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [logs, search])

  const formatDuration = (duration) => {
    if (duration == null) return '—'
    const minutes = Math.round(Number(duration) * 60)
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar
        user={session.user}
        onSignOut={() => supabase.auth.signOut()}
        isAdmin
      />

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-300 mb-2">Admin</p>
            <h1 className="text-4xl font-bold">Employee Work Logs</h1>
            <p className="text-slate-400 mt-2">View time-in and time-out activity across all employees.</p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, email, or date"
            className="w-full md:w-80 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            Unable to load employee logs: {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                <tr>
                  <th className="px-5 py-4 font-medium">Employee</th>
                  <th className="px-5 py-4 font-medium">Activity</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Time</th>
                  <th className="px-5 py-4 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">{log.profiles?.full_name || 'Employee'}</p>
                      <p className="text-xs text-slate-500">{log.profiles?.email || log.user_id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        log.type === 'IN'
                          ? 'bg-teal-500/10 text-teal-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}>
                        Time {log.type === 'IN' ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{log.date}</td>
                    <td className="px-5 py-4 text-slate-300">{log.time}</td>
                    <td className="px-5 py-4 font-medium text-slate-200">{formatDuration(log.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredLogs.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">No employee logs found.</div>
          )}
          {loading && <div className="px-6 py-12 text-center text-slate-400">Loading employee logs...</div>}
        </div>
      </main>
    </div>
  )
}

export default Admin
