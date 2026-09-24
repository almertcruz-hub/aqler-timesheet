import { formatShiftDate, toDateString } from '../../lib/shiftSchedule'

function WeekScheduleEditor({
  isAdmin,
  activeTab,
  weekStart,
  weekEnd,
  weekSchedule,
  selectedDates,
  startTime,
  endTime,
  overnight,
  dirty,
  saving,
  selectedEmployeeId,
  onSubmit,
  onChangeWeek,
  onToggleDate,
  onStartTimeChange,
  onEndTimeChange,
  onOvernightChange,
  onApplyTime,
  onUpdateDay,
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => onChangeWeek(-1)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          Previous week
        </button>
        <div className="text-center">
          <h2 className="font-semibold">
            {formatShiftDate(toDateString(weekStart))} –{' '}
            {formatShiftDate(toDateString(weekEnd))}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Selected week</p>
        </div>
        <button
          type="button"
          onClick={() => onChangeWeek(1)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          Next week
        </button>
      </div>

      {isAdmin && activeTab === 'week' && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
          <h2 className="text-xl font-semibold">Apply hours to selected dates</h2>
          <p className="mt-1 text-sm text-slate-400">
            Select one or multiple dates and apply a custom time.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {weekSchedule.map((day) => {
              const selected = selectedDates.includes(day.date)

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => onToggleDate(day.date)}
                  className={`min-w-16 rounded-lg px-3 py-2 text-sm ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="block font-semibold">{day.dayShort}</span>
                  <span className="block text-xs">
                    {formatShiftDate(day.date)}
                  </span>
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

            <label className="flex h-10 w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={overnight}
                onChange={(event) => onOvernightChange(event.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              <span>Ends next day</span>
            </label>

            <button
              type="button"
              onClick={onApplyTime}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 sm:col-span-2 lg:col-span-1"
            >
              Apply custom time
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        {weekSchedule.map((day) => {
          const effectiveDayOff =
            day.mode === 'off' ||
            (day.mode === 'baseline' && !day.baselineEnabled)
          const effectiveStart =
            day.mode === 'custom' ? day.startTime : day.baselineStartTime
          const effectiveEnd =
            day.mode === 'custom' ? day.endTime : day.baselineEndTime
          const effectiveOvernight =
            day.mode === 'custom' ? day.overnight : day.baselineOvernight

          if (isAdmin && activeTab === 'week') {
            const scheduleSummary = effectiveDayOff
              ? 'Day off'
              : `${effectiveStart} – ${effectiveEnd}${effectiveOvernight ? ' (+1 day)' : ''}`

            return (
              <details
                key={day.date}
                className="group border-b border-slate-800 last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-800/40">
                  <div>
                    <p className="font-semibold text-slate-100">{day.dayLabel}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatShiftDate(day.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {scheduleSummary}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {day.mode === 'custom'
                          ? 'Schedule change'
                          : day.mode === 'off'
                            ? 'Day off change'
                            : 'Weekly schedule'}
                      </p>
                    </div>
                    <span className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 group-open:bg-slate-800">
                      Edit
                    </span>
                  </div>
                </summary>

                <div className="border-t border-slate-800 bg-slate-950/30 p-5">
                  <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
                    <label className="text-sm text-slate-300">
                      Schedule for this date
                      <select
                        value={day.mode}
                        onChange={(event) =>
                          onUpdateDay(day.date, 'mode', event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                      >
                        <option value="baseline">Use weekly hours</option>
                        <option value="custom">Use different hours</option>
                        <option value="off">Day off</option>
                      </select>
                    </label>

                    {day.mode === 'custom' && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-sm text-slate-300">
                          Start
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(event) =>
                              onUpdateDay(day.date, 'startTime', event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="text-sm text-slate-300">
                          End
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(event) =>
                              onUpdateDay(day.date, 'endTime', event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
                          Notes
                          <input
                            value={day.notes}
                            onChange={(event) =>
                              onUpdateDay(day.date, 'notes', event.target.value)
                            }
                            placeholder="Optional"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="mt-6 flex h-11 w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={day.overnight || false}
                            onChange={(event) =>
                              onUpdateDay(
                                day.date,
                                'overnight',
                                event.target.checked
                              )
                            }
                            className="h-4 w-4 accent-blue-500"
                          />
                          Ends next day
                        </label>
                      </div>
                    )}

                    {day.mode === 'baseline' && (
                      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                        {day.baselineEnabled
                          ? `${day.baselineStartTime} – ${day.baselineEndTime}${day.baselineOvernight ? ' (+1 day)' : ''} from the weekly schedule`
                          : 'This is a day off in the weekly schedule.'}
                      </div>
                    )}

                    {day.mode === 'off' && (
                      <label className="text-sm text-slate-300">
                        Day-off notes
                        <input
                          value={day.notes}
                          onChange={(event) =>
                            onUpdateDay(day.date, 'notes', event.target.value)
                          }
                          placeholder="Example: Vacation leave"
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </details>
            )
          }

          return (
            <section
              key={day.date}
              className="border-b border-slate-800 px-5 py-4 last:border-b-0"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-100">{day.dayLabel}</p>
                  <p className="text-sm text-slate-500">
                    {formatShiftDate(day.date)}
                  </p>
                </div>
                <div className="sm:text-right">
                  {effectiveDayOff ? (
                    <p className="text-slate-500">Day off</p>
                  ) : (
                    <p className="font-medium text-slate-200">
                      {effectiveStart} – {effectiveEnd}
                      {effectiveOvernight && (
                        <span className="ml-2 text-blue-400">+1 day</span>
                      )}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {day.mode === 'custom'
                      ? 'Schedule change'
                      : day.mode === 'off'
                        ? 'Day off change'
                        : 'Weekly schedule'}
                  </p>
                  {day.notes && (
                    <p className="mt-2 text-sm text-slate-400">{day.notes}</p>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {isAdmin && activeTab === 'week' && (
        <div className="sticky bottom-4 z-20 mt-6 flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl shadow-black/20 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-slate-100">
              {dirty ? 'Unsaved changes for this week' : 'This week is up to date'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Only dates changed from the weekly schedule are stored separately.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving || !selectedEmployeeId || !dirty}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {saving ? 'Saving...' : 'Save schedule changes'}
          </button>
        </div>
      )}
    </form>
  )
}

export default WeekScheduleEditor
