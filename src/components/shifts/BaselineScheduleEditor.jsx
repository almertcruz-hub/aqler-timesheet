import { WEEKDAYS } from '../../lib/shiftSchedule'

function BaselineScheduleEditor({
  baseline,
  selectedDays,
  startTime,
  endTime,
  overnight,
  dirty,
  saving,
  selectedEmployeeId,
  onSubmit,
  onToggleDay,
  onStartTimeChange,
  onEndTimeChange,
  onOvernightChange,
  onApplyTime,
  onUpdateDay,
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
        <h2 className="text-xl font-semibold">Apply hours to multiple days</h2>
        <p className="mt-1 text-sm text-slate-400">
          Select one day or multiple days and apply the same working hours.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {WEEKDAYS.map((weekday) => {
            const selected = selectedDays.includes(weekday.value)

            return (
              <button
                key={weekday.value}
                type="button"
                onClick={() => onToggleDay(weekday.value)}
                className={`h-11 min-w-11 rounded-full px-3 text-sm font-semibold ${
                  selected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {weekday.short}
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <label className="text-sm text-slate-300">
            Start time
            <input
              type="time"
              value={startTime}
              onChange={(event) => onStartTimeChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            End time
            <input
              type="time"
              value={endTime}
              onChange={(event) => onEndTimeChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex h-10 items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={overnight}
              onChange={(event) => onOvernightChange(event.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
            <span className="block text-sm font-medium text-white">
              Shift ends next day
            </span>
          </label>

          <button
            type="button"
            onClick={onApplyTime}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 sm:col-span-2 lg:col-span-1"
          >
            Apply to selected
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        {WEEKDAYS.map((weekday) => {
          const day = baseline.find(
            (item) => item.dayOfWeek === weekday.value
          )

          return (
            <details
              key={weekday.value}
              className="group border-b border-slate-800 last:border-b-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-800/40">
                <div>
                  <p className="font-semibold text-slate-100">{weekday.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {day.enabled
                      ? `${day.startTime} – ${day.endTime}${day.overnight ? ' (+1 day)' : ''}`
                      : 'Day off'}
                  </p>
                </div>
                <span className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 group-open:bg-slate-800">
                  Edit
                </span>
              </summary>

              <div className="border-t border-slate-800 bg-slate-950/30 p-5">
                <label className="mb-5 flex w-fit items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(event) =>
                      onUpdateDay(
                        weekday.value,
                        'enabled',
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-blue-500"
                  />
                  Working day
                </label>

                {day.enabled ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm text-slate-300">
                      Start
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(event) =>
                          onUpdateDay(
                            weekday.value,
                            'startTime',
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      End
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(event) =>
                          onUpdateDay(
                            weekday.value,
                            'endTime',
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
                      Notes
                      <input
                        value={day.notes}
                        onChange={(event) =>
                          onUpdateDay(
                            weekday.value,
                            'notes',
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="mt-6 flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={day.overnight}
                        onChange={(event) =>
                          onUpdateDay(
                            day.dayOfWeek,
                            'overnight',
                            event.target.checked
                          )
                        }
                        className="h-4 w-4 accent-blue-500"
                      />
                      Ends next day
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    This weekday is set as a day off.
                  </p>
                )}
              </div>
            </details>
          )
        })}
      </div>

      <div className="sticky bottom-4 z-20 mt-6 flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl shadow-black/20 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-100">
            {dirty ? 'Unsaved weekly changes' : 'Weekly schedule is up to date'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Changes apply to the selected employee after you save.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving || !selectedEmployeeId || !dirty}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {saving ? 'Saving...' : 'Save weekly schedule'}
        </button>
      </div>
    </form>
  )
}

export default BaselineScheduleEditor
