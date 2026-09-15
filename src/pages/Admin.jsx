import { useEffect, useState } from 'react'
import { Bell, Clock3, Download, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const WEEKDAYS = [
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'T', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'T', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'Sa', label: 'Saturday' },
  { value: 0, short: 'Su', label: 'Sunday' },
]

const PAGE_SIZE = 20
const EXPORT_BATCH_SIZE = 1000

function Admin({ session, section = 'logs', embedded = false }) {
  const [activeTab, setActiveTab] = useState(section)
  const displayedTab = embedded ? section : activeTab
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [refreshNumber, setRefreshNumber] = useState(0)
  const [exporting, setExporting] = useState(false)

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
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)

    return () => {
      clearTimeout(timer)
    }
  }, [search])

  useEffect(() => {
    async function fetchAdminSetup() {
      const [profilesResult, remindersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name'),

        supabase
          .from('email_reminders')
          .select(`
            id,
            days_of_week,
            reminder_time,
            timezone,
            subject,
            message,
            status,
            sent_at,
            created_at, 
            profiles(full_name, email)
          `)
          .eq('status', 'active')
          .order('created_at', {ascending: false}),
      ])

      const setupError = profilesResult.error || remindersResult.error

      if (setupError) {
        setReminderMessage(
          `Unable to load admin data: ${setupError.message}`
        )
        return
      }

      setEmployees(profilesResult.data || [])
      setReminders(remindersResult.data || [])
    }
    
    fetchAdminSetup()
  }, [])

  useEffect(() => {
    let ignoreResult = false

    async function fetchLogs() {
      setLoading(true)
      setError('')

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('admin_work_logs')
        .select(
          'id, user_id, shift_date, time_in, time_out, created_at, full_name, email',
          { count: 'exact' }
        )
        .order('time_in', { ascending: false })
        .range(from, to)

      if (debouncedSearch) {
        query = query.ilike('search_text', `%${debouncedSearch}%`)
      }

      const { data, count, error: logsError } = await query

      if (ignoreResult) return

      if (logsError) {
        setError(logsError.message)
        setLogs([])
        setTotalLogs(0)
      } else {
        setLogs(data || [])
        setTotalLogs(count || 0)
      }

      setLoading(false)
    }

    fetchLogs()

    return () => {
      ignoreResult = true
    }
  }, [page, debouncedSearch, refreshNumber])

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

  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))

  const formatDate = (dateString) => {
    if (!dateString) return '—'

    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${dateString}T12:00:00+08:00`))
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '—'

    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp))
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ''

    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp))
  }

  const formatDuration = (log) => {
    if (!log.time_out) return 'In progress'

    const start = new Date(log.time_in)
    const end = new Date(log.time_out)
    const totalMinutes = Math.max(
      0,
      Math.round((end - start) / (1000 * 60))
    )
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }

  const exportLogs = async () => {
    setExporting(true)
    setError('')

    try {
      const exportedLogs = []
      let from = 0

      while (true) {
        const to = from + EXPORT_BATCH_SIZE - 1

        let query = supabase
          .from('admin_work_logs_export')
          .select(`
            id,
            user_id,
            shift_date,
            time_in,
            time_out,
            full_name,
            email,
            scheduled_start_at,
            scheduled_end_at
          `)
          .order('time_in', { ascending: false })
          .range(from, to)

        const exportSearch = search.trim()

        if (exportSearch) {
          query = query.ilike(
            'search_text',
            `%${exportSearch}%`
          )
        }

        const {
          data,
          error: exportError,
        } = await query

        if (exportError) {
          throw exportError
        }

        const batch = data || []

        exportedLogs.push(...batch)

        if (batch.length < EXPORT_BATCH_SIZE) {
          break
        }

        from += EXPORT_BATCH_SIZE
      }

      const escapeCsv = (value) => {
        const text = String(value ?? '')

        return `"${text.replaceAll('"', '""')}"`
      }

      const rows = exportedLogs.map((log) => [
        log.full_name || 'Employee',
        log.email || '',
        log.shift_date || '',
        formatDateTime(log.scheduled_start_at),
        formatDateTime(log.scheduled_end_at),
        formatDateTime(log.time_in),
        formatDateTime(log.time_out),
        formatDuration(log),
        log.time_out ? 'Completed' : 'In progress',
      ])

      const csv = [
        [
          'Employee',
          'Email',
          'Shift Date',
          'Scheduled Shift Start',
          'Scheduled Shift End',
          'Actual Time In',
          'Actual Time Out',
          'Duration',
          'Status',
        ],
        ...rows,
      ]
        .map((row) =>
          row.map(escapeCsv).join(',')
        )
        .join('\r\n')

      const blob = new Blob(
        [`\uFEFF${csv}`],
        {
          type: 'text/csv;charset=utf-8',
        }
      )

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url

      link.download =
        `aqler-work-logs-${
          new Date().toISOString().slice(0, 10)
        }.csv`

      document.body.appendChild(link)

      link.click()

      link.remove()

      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(
        `Unable to export employee logs: ${
          exportError.message
        }`
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'}>
      {!embedded && (
        <Navbar
          user={session.user}
          onSignOut={() => supabase.auth.signOut()}
          isAdmin
        />
      )}

      <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10'}>
        {!embedded && (
        <>
        <header className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-slate-400">
            Manage employee work logs and email reminders.
          </p>
        </header>

        <div className="mb-6 inline-flex rounded-xl border border-slate-800 bg-slate-900/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              displayedTab === 'logs'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock3 size={16} />
            Work logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              displayedTab === 'reminders'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell size={16} />
            Email reminders
          </button>
        </div>
        </>
        )}

        {displayedTab === 'reminders' && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">Schedule an employee reminder</h1>
            <p className="mt-1 text-sm text-slate-400">Choose the weekdays and time. The schedule repeats weekly in Asia/Manila time.</p>
          </div>

          <form onSubmit={scheduleReminder} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Employee
              <select
                value={reminder.userId}
                onChange={(event) => setReminder((current) => ({ ...current, userId: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white [color-scheme:dark] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <label className="text-sm text-slate-300 md:col-span-2">
              Message
              <textarea
                value={reminder.message}
                onChange={(event) => setReminder((current) => ({ ...current, message: event.target.value }))}
                rows="3"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <div className="flex items-center gap-4 md:col-span-2">
              <button
                disabled={savingReminder}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
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
        )}

        {displayedTab === 'logs' && (
        <>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold md:text-4xl">Employee Work Logs</h1>
            <p className="text-slate-400 mt-2">View time-in and time-out activity across all employees.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setRefreshNumber((current) => current + 1)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportLogs}
              disabled={totalLogs === 0 || exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <label className="relative w-full sm:w-80">
              <span className="sr-only">Search employee logs</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
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
                        {formatDate(log.shift_date)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatTime(log.time_in)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {isActive ? 'Still working' : formatTime(log.time_out)}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-200">
                        {formatDuration(log)}
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
        )}
      </div>
    </div>
  )
}

export default Admin
