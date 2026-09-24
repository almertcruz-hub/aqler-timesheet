const WEEKDAYS = [
  { value: 1, short: 'M', label: 'Monday' },
  { value: 2, short: 'T', label: 'Tuesday' },
  { value: 3, short: 'W', label: 'Wednesday' },
  { value: 4, short: 'T', label: 'Thursday' },
  { value: 5, short: 'F', label: 'Friday' },
  { value: 6, short: 'Sa', label: 'Saturday' },
  { value: 0, short: 'Su', label: 'Sunday' },
]

function ReminderManager({
  employees,
  reminder,
  setReminder,
  reminders,
  reminderMessage,
  savingReminder,
  cancellingId,
  onSchedule,
  onCancel,
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Schedule an employee reminder</h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose the weekdays and time. The schedule repeats weekly in Asia/Manila time.
        </p>
      </div>

      <form onSubmit={onSchedule} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-300">
          Employee
          <select
            value={reminder.userId}
            onChange={(event) =>
              setReminder((current) => ({
                ...current,
                userId: event.target.value,
              }))
            }
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
            onChange={(event) =>
              setReminder((current) => ({
                ...current,
                reminderTime: event.target.value,
              }))
            }
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
                  onClick={() =>
                    setReminder((current) => ({
                      ...current,
                      daysOfWeek: selected
                        ? current.daysOfWeek.filter(
                            (value) => value !== day.value
                          )
                        : [...current.daysOfWeek, day.value],
                    }))
                  }
                  className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
            onChange={(event) =>
              setReminder((current) => ({
                ...current,
                subject: event.target.value,
              }))
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="text-sm text-slate-300 md:col-span-2">
          Message
          <textarea
            value={reminder.message}
            onChange={(event) =>
              setReminder((current) => ({
                ...current,
                message: event.target.value,
              }))
            }
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
          {reminderMessage && (
            <p className="text-sm text-slate-300">{reminderMessage}</p>
          )}
        </div>
      </form>

      <div className="mt-8 border-t border-slate-800 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Scheduled emails</h2>
            <p className="text-sm text-slate-500">
              Active recurring reminders. Cancelled schedules are removed.
            </p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {reminders.filter((item) => item.status === 'active').length} active
          </span>
        </div>

        <div className="space-y-3">
          {reminders.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
            >
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
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">
                    {item.message}
                  </p>
                </div>

                <div className="shrink-0 md:text-right">
                  <p className="text-sm font-medium text-blue-300">
                    {WEEKDAYS.filter((day) =>
                      item.days_of_week?.includes(day.value)
                    ).map((day) => day.short).join(' ')} at{' '}
                    {String(item.reminder_time).slice(0, 5)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Asia/Manila</p>
                  {item.status === 'active' && (
                    <button
                      type="button"
                      disabled={cancellingId === item.id}
                      onClick={() => onCancel(item.id)}
                      className="mt-3 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {cancellingId === item.id
                        ? 'Cancelling...'
                        : 'Cancel schedule'}
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
  )
}

export default ReminderManager
