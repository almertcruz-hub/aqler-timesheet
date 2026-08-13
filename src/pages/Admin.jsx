import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const WEEKDAYS = [
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'T', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'T', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'S', label: 'Saturday' },
  { value: 0, short: 'S', label: 'Sunday' },
]

function Admin({ session }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [reminders, setReminders] = useState([])
  const [savingReminder, setSavingReminder] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminder, setReminder] = useState({
    userId: '',
    daysOfWeek: [1, 2, 3, 4, 5],
    reminderTime: '17:00',
    subject: 'Timesheet reminder',
    message: 'Please remember to update your timesheet.',
  })

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      setError('')

      const [logsResult, profilesResult, remindersResult] = await Promise.all([
        supabase
          .from('logs')
          .select('id, type, time, date, duration, created_at, user_id, profiles(full_name, email)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        supabase
          .from('email_reminders')
          .select('id, days_of_week, reminder_time, timezone, subject, message, status, sent_at, created_at, profiles(full_name, email)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ])

      const queryError = logsResult.error || profilesResult.error || remindersResult.error
      if (queryError) setError(queryError.message)
      else {
        setLogs(logsResult.data || [])
        setEmployees(profilesResult.data || [])
        setReminders(remindersResult.data || [])
      }

      setLoading(false)
    }

    fetchLogs()
  }, [])

  const scheduleReminder = async (event) => {
    event.preventDefault()
    setReminderMessage('')

    if (!reminder.userId || reminder.daysOfWeek.length === 0 || !reminder.reminderTime || !reminder.subject.trim() || !reminder.message.trim()) {
      setReminderMessage('Complete all reminder fields.')
      return
    }

    setSavingReminder(true)
    const { data, error: insertError } = await supabase
      .from('email_reminders')
      .insert({
        user_id: reminder.userId,
        days_of_week: reminder.daysOfWeek,
        reminder_time: reminder.reminderTime,
        timezone: 'Asia/Manila',
        status: 'active',
        subject: reminder.subject.trim(),
        message: reminder.message.trim(),
        created_by: session.user.id,
      })
      .select('id, days_of_week, reminder_time, timezone, subject, message, status, sent_at, created_at, profiles(full_name, email)')
      .single()

    if (insertError) setReminderMessage(`Unable to schedule reminder: ${insertError.message}`)
    else {
      setReminders((current) => [data, ...current])
      setReminderMessage('Email reminder scheduled successfully.')
      setReminder((current) => ({ ...current, userId: '' }))
    }
    setSavingReminder(false)
  }

  const cancelReminder = async (id) => {
    setCancellingId(id)
    setReminderMessage('')

    const { error: deleteError } = await supabase
      .from('email_reminders')
      .delete()
      .eq('id', id)
      .eq('status', 'active')

    if (deleteError) setReminderMessage(`Unable to cancel reminder: ${deleteError.message}`)
    else {
      setReminders((current) => current.filter((item) => item.id !== id))
      setReminderMessage('Scheduled email cancelled and removed.')
    }

    setCancellingId(null)
  }

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
        <section className="mb-10 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">Email reminders</p>
            <h1 className="mt-1 text-2xl font-bold">Schedule an employee reminder</h1>
            <p className="mt-1 text-sm text-slate-400">Choose the weekdays and time. The schedule repeats weekly in Asia/Manila time.</p>
          </div>

          <form onSubmit={scheduleReminder} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Employee
              <select
                value={reminder.userId}
                onChange={(event) => setReminder((current) => ({ ...current, userId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white"
              >
                <option value="">Select an employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name || employee.email} ({employee.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Send time (Asia/Manila)
              <input
                type="time"
                value={reminder.reminderTime}
                onChange={(event) => setReminder((current) => ({ ...current, reminderTime: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white"
              />
            </label>

            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-sm text-slate-300">Repeat on</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = reminder.daysOfWeek.includes(day.value)
                  return (
                    <button
                      key={day.label}
                      type="button"
                      title={day.label}
                      aria-pressed={selected}
                      onClick={() => setReminder((current) => ({
                        ...current,
                        daysOfWeek: selected
                          ? current.daysOfWeek.filter((value) => value !== day.value)
                          : [...current.daysOfWeek, day.value],
                      }))}
                      className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {day.short}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <label className="text-sm text-slate-300 md:col-span-2">
              Subject
              <input
                value={reminder.subject}
                onChange={(event) => setReminder((current) => ({ ...current, subject: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white"
              />
            </label>

            <label className="text-sm text-slate-300 md:col-span-2">
              Message
              <textarea
                value={reminder.message}
                onChange={(event) => setReminder((current) => ({ ...current, message: event.target.value }))}
                rows="3"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white"
              />
            </label>

            <div className="flex items-center gap-4 md:col-span-2">
              <button
                disabled={savingReminder}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {savingReminder ? 'Scheduling...' : 'Schedule email'}
              </button>
              {reminderMessage && <p className="text-sm text-slate-300">{reminderMessage}</p>}
            </div>
          </form>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Scheduled emails</h2>
                <p className="text-sm text-slate-500">Active recurring reminders. Cancelled schedules are removed.</p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {reminders.filter((item) => item.status === 'active').length} active
              </span>
            </div>

            <div className="space-y-3">
              {reminders.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{item.subject}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === 'active'
                            ? 'bg-green-500/10 text-green-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {item.status === 'active' ? 'Active' : item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">
                        {item.profiles?.full_name || 'Employee'} · {item.profiles?.email}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">{item.message}</p>
                    </div>

                    <div className="shrink-0 md:text-right">
                      <p className="text-sm font-medium text-blue-300">
                        {WEEKDAYS.filter((day) => item.days_of_week?.includes(day.value)).map((day) => day.short).join(' ')} at{' '}
                        {String(item.reminder_time).slice(0, 5)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Asia/Manila</p>
                      {item.status === 'active' && (
                        <button
                          type="button"
                          disabled={cancellingId === item.id}
                          onClick={() => cancelReminder(item.id)}
                          className="mt-3 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {cancellingId === item.id ? 'Cancelling...' : 'Cancel schedule'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}

              {reminders.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
                  No scheduled emails yet.
                </div>
              )}
            </div>
          </div>
        </section>

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
