import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'Th' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'Sa' },
  { value: 0, label: 'Sunday', short: 'Su' },
]

function createEmptyBaseline() {
  return WEEKDAYS.map((day) => ({
    dayOfWeek: day.value,
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
    shiftId: null,
  }))
}

function getWeekStart(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)

  const day = result.getDay()
  const distanceFromMonday = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + distanceFromMonday)

  return result
}

function addDays(date, numberOfDays) {
  const result = new Date(date)
  result.setDate(result.getDate() + numberOfDays)
  return result
}

function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`)

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function buildWeekSchedule(weekStart, baseline, overrides) {
  return WEEKDAYS.map((weekday, index) => {
    const date = addDays(weekStart, index)
    const dateString = toDateString(date)

    const baselineDay = baseline.find(
      (day) => day.dayOfWeek === weekday.value
    )

    const override = overrides.find(
      (item) => item.shift_date === dateString
    )

    if (override) {
      return {
        date: dateString,
        dayOfWeek: weekday.value,
        dayLabel: weekday.label,
        dayShort: weekday.short,
        mode: override.is_day_off ? 'off' : 'custom',
        startTime: override.start_time
          ? override.start_time.slice(0, 5)
          : baselineDay?.startTime || '09:00',
        endTime: override.end_time
          ? override.end_time.slice(0, 5)
          : baselineDay?.endTime || '17:00',
        notes: override.notes || '',
        overrideId: override.id,
        baselineEnabled: baselineDay?.enabled || false,
        baselineStartTime: baselineDay?.startTime || null,
        baselineEndTime: baselineDay?.endTime || null,
      }
    }

    return {
      date: dateString,
      dayOfWeek: weekday.value,
      dayLabel: weekday.label,
      dayShort: weekday.short,
      mode: 'baseline',
      startTime: baselineDay?.startTime || '09:00',
      endTime: baselineDay?.endTime || '17:00',
      notes: '',
      overrideId: null,
      baselineEnabled: baselineDay?.enabled || false,
      baselineStartTime: baselineDay?.startTime || null,
      baselineEndTime: baselineDay?.endTime || null,
    }
  })
}

function Shift({ session }) {
  const isAdmin = session.user.app_metadata?.role === 'admin'

  const [activeTab, setActiveTab] = useState(
    isAdmin ? 'baseline' : 'week'
  )

  const [employees, setEmployees] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    isAdmin ? '' : session.user.id
  )

  const [baseline, setBaseline] = useState(createEmptyBaseline)
  const [weekSchedule, setWeekSchedule] = useState([])
  const [weekStart, setWeekStart] = useState(() =>
    getWeekStart(new Date())
  )

  const [selectedBaselineDays, setSelectedBaselineDays] = useState([
    1, 2, 3, 4, 5,
  ])

  const [baselineStartTime, setBaselineStartTime] = useState('09:00')
  const [baselineEndTime, setBaselineEndTime] = useState('17:00')

  const [selectedOverrideDates, setSelectedOverrideDates] = useState([])
  const [overrideStartTime, setOverrideStartTime] = useState('09:00')
  const [overrideEndTime, setOverrideEndTime] = useState('17:00')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isAdmin) return

    async function loadEmployees() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name')

      if (error) {
        setMessage(`Unable to load employees: ${error.message}`)
        return
      }

      const employeeList = data || []

      setEmployees(employeeList)

      setSelectedEmployeeId((currentId) => {
        if (currentId) return currentId
        return employeeList[0]?.id || ''
      })
    }

    loadEmployees()
  }, [isAdmin])

  const loadSchedule = useCallback(async () => {
    if (!selectedEmployeeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage('')

    const weekStartString = toDateString(weekStart)
    const weekEndString = toDateString(addDays(weekStart, 6))

    const [baselineResult, overridesResult] = await Promise.all([
      supabase
        .from('shifts')
        .select(`
          id,
          user_id,
          day_of_week,
          start_time,
          end_time,
          notes
        `)
        .eq('user_id', selectedEmployeeId)
        .order('day_of_week'),

      supabase
        .from('shift_overrides')
        .select(`
          id,
          user_id,
          shift_date,
          start_time,
          end_time,
          is_day_off,
          notes
        `)
        .eq('user_id', selectedEmployeeId)
        .gte('shift_date', weekStartString)
        .lte('shift_date', weekEndString)
        .order('shift_date'),
    ])

    const queryError =
      baselineResult.error || overridesResult.error

    if (queryError) {
      setMessage(`Unable to load schedule: ${queryError.message}`)
      setLoading(false)
      return
    }

    const savedBaseline = baselineResult.data || []
    const savedOverrides = overridesResult.data || []

    const baselineForm = createEmptyBaseline().map((day) => {
      const savedDay = savedBaseline.find(
        (item) => item.day_of_week === day.dayOfWeek
      )

      if (!savedDay) return day

      return {
        dayOfWeek: day.dayOfWeek,
        enabled: true,
        startTime: savedDay.start_time.slice(0, 5),
        endTime: savedDay.end_time.slice(0, 5),
        notes: savedDay.notes || '',
        shiftId: savedDay.id,
      }
    })

    setBaseline(baselineForm)
    setWeekSchedule(
      buildWeekSchedule(
        weekStart,
        baselineForm,
        savedOverrides
      )
    )

    setLoading(false)
  }, [selectedEmployeeId, weekStart])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  function toggleBaselineDay(dayOfWeek) {
    setSelectedBaselineDays((currentDays) =>
      currentDays.includes(dayOfWeek)
        ? currentDays.filter((day) => day !== dayOfWeek)
        : [...currentDays, dayOfWeek]
    )
  }

  function applyBaselineTime() {
    if (selectedBaselineDays.length === 0) {
      setMessage('Select at least one weekday.')
      return
    }

    if (
      !baselineStartTime ||
      !baselineEndTime ||
      baselineEndTime <= baselineStartTime
    ) {
      setMessage(
        'The baseline end time must be later than the start time.'
      )
      return
    }

    setBaseline((currentBaseline) =>
      currentBaseline.map((day) =>
        selectedBaselineDays.includes(day.dayOfWeek)
          ? {
              ...day,
              enabled: true,
              startTime: baselineStartTime,
              endTime: baselineEndTime,
            }
          : day
      )
    )

    setMessage(
      'Times applied. Press Save recurring schedule to save them.'
    )
  }

  function updateBaselineDay(dayOfWeek, field, value) {
    setBaseline((currentBaseline) =>
      currentBaseline.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    )
  }

  async function saveBaseline(event) {
    event.preventDefault()

    if (!isAdmin || !selectedEmployeeId) return

    const invalidDay = baseline.find(
      (day) =>
        day.enabled &&
        (!day.startTime ||
          !day.endTime ||
          day.endTime <= day.startTime)
    )

    if (invalidDay) {
      const weekday = WEEKDAYS.find(
        (day) => day.value === invalidDay.dayOfWeek
      )

      setMessage(
        `${weekday.label}: the end time must be later than the start time.`
      )
      return
    }

    setSaving(true)
    setMessage('')

    const rowsToSave = baseline
      .filter((day) => day.enabled)
      .map((day) => ({
        user_id: selectedEmployeeId,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        notes: day.notes.trim() || null,
      }))

    if (rowsToSave.length > 0) {
      const { error: upsertError } = await supabase
        .from('shifts')
        .upsert(rowsToSave, {
          onConflict: 'user_id,day_of_week',
        })

      if (upsertError) {
        setMessage(
          `Unable to save recurring schedule: ${upsertError.message}`
        )
        setSaving(false)
        return
      }
    }

    const removedShiftIds = baseline
      .filter((day) => !day.enabled && day.shiftId)
      .map((day) => day.shiftId)

    if (removedShiftIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .in('id', removedShiftIds)

      if (deleteError) {
        setMessage(
          `Unable to remove recurring days: ${deleteError.message}`
        )
        setSaving(false)
        return
      }
    }

    await loadSchedule()

    setMessage('Recurring schedule saved successfully.')
    setSaving(false)
  }

  function changeWeek(numberOfWeeks) {
    setWeekStart((currentWeek) =>
      addDays(currentWeek, numberOfWeeks * 7)
    )

    setSelectedOverrideDates([])
    setMessage('')
  }

  function toggleOverrideDate(date) {
    setSelectedOverrideDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((item) => item !== date)
        : [...currentDates, date]
    )
  }

  function applyOverrideTime() {
    if (selectedOverrideDates.length === 0) {
      setMessage('Select at least one date.')
      return
    }

    if (
      !overrideStartTime ||
      !overrideEndTime ||
      overrideEndTime <= overrideStartTime
    ) {
      setMessage(
        'The custom end time must be later than the start time.'
      )
      return
    }

    setWeekSchedule((currentSchedule) =>
      currentSchedule.map((day) =>
        selectedOverrideDates.includes(day.date)
          ? {
              ...day,
              mode: 'custom',
              startTime: overrideStartTime,
              endTime: overrideEndTime,
            }
          : day
      )
    )

    setMessage(
      'Custom times applied. Press Save this week to save them.'
    )
  }

  function updateWeekDay(date, field, value) {
    setWeekSchedule((currentSchedule) =>
      currentSchedule.map((day) => {
        if (day.date !== date) return day

        if (field === 'mode' && value === 'custom') {
          return {
            ...day,
            mode: 'custom',
            startTime:
              day.baselineStartTime || day.startTime || '09:00',
            endTime:
              day.baselineEndTime || day.endTime || '17:00',
          }
        }

        return {
          ...day,
          [field]: value,
        }
      })
    )
  }

  async function saveSpecificWeek(event) {
    event.preventDefault()

    if (!isAdmin || !selectedEmployeeId) return

    const invalidDay = weekSchedule.find(
      (day) =>
        day.mode === 'custom' &&
        (!day.startTime ||
          !day.endTime ||
          day.endTime <= day.startTime)
    )

    if (invalidDay) {
      setMessage(
        `${invalidDay.dayLabel}, ${formatDate(
          invalidDay.date
        )}: the end time must be later than the start time.`
      )
      return
    }

    setSaving(true)
    setMessage('')

    const overridesToSave = weekSchedule
      .filter((day) => day.mode !== 'baseline')
      .map((day) => ({
        user_id: selectedEmployeeId,
        shift_date: day.date,
        start_time:
          day.mode === 'custom' ? day.startTime : null,
        end_time:
          day.mode === 'custom' ? day.endTime : null,
        is_day_off: day.mode === 'off',
        notes: day.notes.trim() || null,
      }))

    if (overridesToSave.length > 0) {
      const { error: upsertError } = await supabase
        .from('shift_overrides')
        .upsert(overridesToSave, {
          onConflict: 'user_id,shift_date',
        })

      if (upsertError) {
        setMessage(
          `Unable to save date changes: ${upsertError.message}`
        )
        setSaving(false)
        return
      }
    }

    const overridesToDelete = weekSchedule
      .filter(
        (day) =>
          day.mode === 'baseline' && day.overrideId
      )
      .map((day) => day.overrideId)

    if (overridesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('shift_overrides')
        .delete()
        .in('id', overridesToDelete)

      if (deleteError) {
        setMessage(
          `Unable to restore baseline dates: ${deleteError.message}`
        )
        setSaving(false)
        return
      }
    }

    await loadSchedule()

    setSelectedOverrideDates([])
    setMessage('Specific-date schedule saved successfully.')
    setSaving(false)
  }

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId
  )

  const weekEnd = addDays(weekStart, 6)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar
        user={session.user}
        onSignOut={() => supabase.auth.signOut()}
        isAdmin={isAdmin}
      />

      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-300">
              Shift management
            </p>

            <h1 className="text-3xl font-bold md:text-4xl">
              Employee Schedule
            </h1>

            <p className="mt-2 text-slate-400">
              {isAdmin
                ? 'Set recurring shifts and exact-date schedule changes.'
                : 'View your recurring and date-specific shifts.'}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              All times use Philippine Time (UTC+8).
            </p>
          </div>

          {isAdmin && (
            <label className="w-full text-sm text-slate-300 md:w-96">
              Employee

              <select
                value={selectedEmployeeId}
                onChange={(event) => {
                  setSelectedEmployeeId(event.target.value)
                  setSelectedOverrideDates([])
                  setMessage('')
                }}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white"
              >
                <option value="">Select an employee</option>

                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.full_name || employee.email} (
                    {employee.email})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {selectedEmployee && (
          <div className="mb-5">
            <p className="font-semibold">
              {selectedEmployee.full_name || 'Employee'}
            </p>

            <p className="text-sm text-slate-400">
              {selectedEmployee.email}
            </p>
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {message}
          </div>
        )}

        {isAdmin && (
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('baseline')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'baseline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Recurring baseline
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('week')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Specific week
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('view')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'view'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              View schedule
            </button>
          </div>
        )}

        {isAdmin && activeTab === 'view' && (
          <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Read-only preview. This is how the selected employee sees this week.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center text-slate-400">
            Loading schedule...
          </div>
        ) : (
          <>
            {isAdmin && activeTab === 'baseline' && (
              <form onSubmit={saveBaseline}>
                <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
                  <h2 className="text-xl font-semibold">
                    Set matching weekdays
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Select one day or multiple days and apply
                    the same working hours.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {WEEKDAYS.map((weekday) => {
                      const selected =
                        selectedBaselineDays.includes(
                          weekday.value
                        )

                      return (
                        <button
                          key={weekday.value}
                          type="button"
                          onClick={() =>
                            toggleBaselineDay(weekday.value)
                          }
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

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                    <label className="text-sm text-slate-300">
                      Start time

                      <input
                        type="time"
                        value={baselineStartTime}
                        onChange={(event) =>
                          setBaselineStartTime(
                            event.target.value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>

                    <label className="text-sm text-slate-300">
                      End time

                      <input
                        type="time"
                        value={baselineEndTime}
                        onChange={(event) =>
                          setBaselineEndTime(
                            event.target.value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={applyBaselineTime}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 sm:col-span-2 lg:col-span-1"
                    >
                      Apply to selected
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                  {WEEKDAYS.map((weekday) => {
                    const day = baseline.find(
                      (item) =>
                        item.dayOfWeek === weekday.value
                    )

                    return (
                      <section
                        key={weekday.value}
                        className="border-b border-slate-800 p-5 last:border-b-0"
                      >
                        <div className="grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
                          <label className="flex items-center gap-3 font-semibold">
                            <input
                              type="checkbox"
                              checked={day.enabled}
                              onChange={(event) =>
                                updateBaselineDay(
                                  weekday.value,
                                  'enabled',
                                  event.target.checked
                                )
                              }
                              className="h-5 w-5"
                            />

                            {weekday.label}
                          </label>

                          {day.enabled ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              <label className="text-sm text-slate-300">
                                Start

                                <input
                                  type="time"
                                  value={day.startTime}
                                  onChange={(event) =>
                                    updateBaselineDay(
                                      weekday.value,
                                      'startTime',
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                />
                              </label>

                              <label className="text-sm text-slate-300">
                                End

                                <input
                                  type="time"
                                  value={day.endTime}
                                  onChange={(event) =>
                                    updateBaselineDay(
                                      weekday.value,
                                      'endTime',
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                />
                              </label>

                              <label className="text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
                                Notes

                                <input
                                  value={day.notes}
                                  onChange={(event) =>
                                    updateBaselineDay(
                                      weekday.value,
                                      'notes',
                                      event.target.value
                                    )
                                  }
                                  placeholder="Optional"
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                />
                              </label>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Recurring day off
                            </p>
                          )}
                        </div>
                      </section>
                    )
                  })}
                </div>

                <button
                  type="submit"
                  disabled={saving || !selectedEmployeeId}
                  className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save recurring schedule'}
                </button>
              </form>
            )}

            {(!isAdmin || activeTab === 'week' || activeTab === 'view') && (
              <form onSubmit={saveSpecificWeek}>
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => changeWeek(-1)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  >
                    Previous week
                  </button>

                  <div className="text-center">
                    <h2 className="font-semibold">
                      {formatDate(toDateString(weekStart))} –{' '}
                      {formatDate(toDateString(weekEnd))}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Exact-date schedule
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => changeWeek(1)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  >
                    Next week
                  </button>
                </div>

                {isAdmin && activeTab === 'week' && (
                  <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
                    <h2 className="text-xl font-semibold">
                      Set matching dates
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Select one or multiple dates and apply a
                      custom time.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {weekSchedule.map((day) => {
                        const selected =
                          selectedOverrideDates.includes(
                            day.date
                          )

                        return (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() =>
                              toggleOverrideDate(day.date)
                            }
                            className={`min-w-16 rounded-lg px-3 py-2 text-sm ${
                              selected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            <span className="block font-semibold">
                              {day.dayShort}
                            </span>

                            <span className="block text-xs">
                              {formatDate(day.date)}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                      <label className="text-sm text-slate-300">
                        Start time

                        <input
                          type="time"
                          value={overrideStartTime}
                          onChange={(event) =>
                            setOverrideStartTime(
                              event.target.value
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                        />
                      </label>

                      <label className="text-sm text-slate-300">
                        End time

                        <input
                          type="time"
                          value={overrideEndTime}
                          onChange={(event) =>
                            setOverrideEndTime(
                              event.target.value
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={applyOverrideTime}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 sm:col-span-2 lg:col-span-1"
                      >
                        Apply custom time
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                  {weekSchedule.map((day) => {
                    const effectiveDayOff =
                      day.mode === 'off' ||
                      (day.mode === 'baseline' &&
                        !day.baselineEnabled)

                    const effectiveStart =
                      day.mode === 'custom'
                        ? day.startTime
                        : day.baselineStartTime

                    const effectiveEnd =
                      day.mode === 'custom'
                        ? day.endTime
                        : day.baselineEndTime

                    return (
                      <section
                        key={day.date}
                        className="border-b border-slate-800 p-5 last:border-b-0"
                      >
                        <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
                          <div>
                            <p className="font-semibold">
                              {day.dayLabel}
                            </p>

                            <p className="text-sm text-slate-500">
                              {formatDate(day.date)}
                            </p>
                          </div>

                          {isAdmin && activeTab === 'week' ? (
                            <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                              <label className="text-sm text-slate-300">
                                Schedule type

                                <select
                                  value={day.mode}
                                  onChange={(event) =>
                                    updateWeekDay(
                                      day.date,
                                      'mode',
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                >
                                  <option value="baseline">
                                    Use baseline
                                  </option>

                                  <option value="custom">
                                    Custom time
                                  </option>

                                  <option value="off">
                                    Day off
                                  </option>
                                </select>
                              </label>

                              {day.mode === 'custom' && (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  <label className="text-sm text-slate-300">
                                    Start

                                    <input
                                      type="time"
                                      value={day.startTime}
                                      onChange={(event) =>
                                        updateWeekDay(
                                          day.date,
                                          'startTime',
                                          event.target.value
                                        )
                                      }
                                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                    />
                                  </label>

                                  <label className="text-sm text-slate-300">
                                    End

                                    <input
                                      type="time"
                                      value={day.endTime}
                                      onChange={(event) =>
                                        updateWeekDay(
                                          day.date,
                                          'endTime',
                                          event.target.value
                                        )
                                      }
                                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                    />
                                  </label>

                                  <label className="text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
                                    Notes

                                    <input
                                      value={day.notes}
                                      onChange={(event) =>
                                        updateWeekDay(
                                          day.date,
                                          'notes',
                                          event.target.value
                                        )
                                      }
                                      placeholder="Optional"
                                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                                    />
                                  </label>
                                </div>
                              )}

                              {day.mode === 'baseline' && (
                                <div className="flex items-center text-sm text-slate-400">
                                  {day.baselineEnabled
                                    ? `${day.baselineStartTime} – ${day.baselineEndTime} from baseline`
                                    : 'Day off from baseline'}
                                </div>
                              )}

                              {day.mode === 'off' && (
                                <div className="flex items-center text-sm text-slate-500">
                                  No shift on this date
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {effectiveDayOff ? (
                                <p className="text-slate-500">
                                  Day off
                                </p>
                              ) : (
                                <p className="font-medium text-slate-200">
                                  {effectiveStart} – {effectiveEnd}
                                </p>
                              )}

                              <p className="mt-1 text-xs text-slate-500">
                                {day.mode === 'custom'
                                  ? 'Custom schedule'
                                  : day.mode === 'off'
                                    ? 'Date-specific day off'
                                    : 'Recurring baseline'}
                              </p>

                              {day.notes && (
                                <p className="mt-2 text-sm text-slate-400">
                                  {day.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    )
                  })}
                </div>

                {isAdmin && activeTab === 'week' && (
                  <button
                    type="submit"
                    disabled={saving || !selectedEmployeeId}
                    className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save this week'}
                  </button>
                )}
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Shift
