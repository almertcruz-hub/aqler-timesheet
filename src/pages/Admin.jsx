import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AdminTabs from '../components/admin/AdminTabs'
import ReminderManager from '../components/admin/ReminderManager'
import WorkLogsPanel from '../components/admin/WorkLogsPanel'
import {
  formatLogDateTime,
  formatLogDuration,
} from '../lib/adminLogHelpers'

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

    return () => clearTimeout(timer)
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
          .order('created_at', { ascending: false }),
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

  async function scheduleReminder(event) {
    event.preventDefault()
    setReminderMessage('')

    if (
      !reminder.userId ||
      reminder.daysOfWeek.length === 0 ||
      !reminder.reminderTime ||
      !reminder.subject.trim() ||
      !reminder.message.trim()
    ) {
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

    if (insertError) {
      setReminderMessage(
        `Unable to schedule reminder: ${insertError.message}`
      )
    } else {
      setReminders((current) => [data, ...current])
      setReminderMessage('Email reminder scheduled successfully.')
      setReminder((current) => ({ ...current, userId: '' }))
    }

    setSavingReminder(false)
  }

  async function cancelReminder(id) {
    setCancellingId(id)
    setReminderMessage('')

    const { error: deleteError } = await supabase
      .from('email_reminders')
      .delete()
      .eq('id', id)
      .eq('status', 'active')

    if (deleteError) {
      setReminderMessage(
        `Unable to cancel reminder: ${deleteError.message}`
      )
    } else {
      setReminders((current) =>
        current.filter((item) => item.id !== id)
      )
      setReminderMessage('Scheduled email cancelled and removed.')
    }

    setCancellingId(null)
  }

  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))

  async function exportLogs() {
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
          query = query.ilike('search_text', `%${exportSearch}%`)
        }

        const { data, error: exportError } = await query

        if (exportError) throw exportError

        const batch = data || []
        exportedLogs.push(...batch)

        if (batch.length < EXPORT_BATCH_SIZE) break
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
        formatLogDateTime(log.scheduled_start_at),
        formatLogDateTime(log.scheduled_end_at),
        formatLogDateTime(log.time_in),
        formatLogDateTime(log.time_out),
        formatLogDuration(log),
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
        .map((row) => row.map(escapeCsv).join(','))
        .join('\r\n')

      const blob = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `aqler-work-logs-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(`Unable to export employee logs: ${exportError.message}`)
    } finally {
      setExporting(false)
    }
  }

  function refreshLogs() {
    setPage(1)
    setRefreshNumber((current) => current + 1)
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

            <AdminTabs
              displayedTab={displayedTab}
              onChange={setActiveTab}
            />
          </>
        )}

        {displayedTab === 'reminders' && (
          <ReminderManager
            employees={employees}
            reminder={reminder}
            setReminder={setReminder}
            reminders={reminders}
            reminderMessage={reminderMessage}
            savingReminder={savingReminder}
            cancellingId={cancellingId}
            onSchedule={scheduleReminder}
            onCancel={cancelReminder}
          />
        )}

        {displayedTab === 'logs' && (
          <WorkLogsPanel
            logs={logs}
            loading={loading}
            error={error}
            search={search}
            setSearch={setSearch}
            page={page}
            setPage={setPage}
            totalLogs={totalLogs}
            totalPages={totalPages}
            exporting={exporting}
            onExport={exportLogs}
            onRefresh={refreshLogs}
          />
        )}
      </div>
    </div>
  )
}

export default Admin
