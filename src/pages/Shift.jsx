import { useCallback, useEffect, useState } from 'react'
import { CalendarRange, Eye, RefreshCw, Repeat2, UserRound } from 'lucide-react'
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
    overnight: false,
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
      const startTime = override.start_time
        ? override.start_time.slice(0, 5)
        : baselineDay?.startTime || '09:00'

      const endTime = override.end_time
        ? override.end_time.slice(0, 5)
        : baselineDay?.endTime || '17:00'

      return {
        date: dateString,
        dayOfWeek: weekday.value,
        dayLabel: weekday.label,
        dayShort: weekday.short,
        mode: override.is_day_off ? 'off' : 'custom',
        startTime,
        endTime,
        overnight: Boolean(override.is_overnight),
        notes: override.notes || '',
        overrideId: override.id,
        baselineEnabled: baselineDay?.enabled || false,
        baselineStartTime: baselineDay?.startTime || null,
        baselineEndTime: baselineDay?.endTime || null,
        baselineOvernight: baselineDay?.overnight || false,
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
      overnight: baselineDay?.overnight || false,
      notes: '',
      overrideId: null,
      baselineEnabled: baselineDay?.enabled || false,
      baselineStartTime: baselineDay?.startTime || null,
      baselineEndTime: baselineDay?.endTime || null,
      baselineOvernight: baselineDay?.overnight || false,
    }
  })
}

function hasInvalidShiftTimes(startTime, endTime, overnight) {
  if (!startTime || !endTime) {
    return true
  }

  if (startTime === endTime) {
    return true
  }

  if (overnight) {
    return false
  }

  return endTime <= startTime
}

function Shift({ session, adminMode = false, embedded = false }) {
  const hasAdminRole = session.user.app_metadata?.role === 'admin'
  const isAdmin = adminMode && hasAdminRole

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

  const [baselineOvernight, setBaselineOvernight] = useState(false)
  const [overrideOvernight, setOverrideOvernight] = useState(false)
  const [baselineDirty, setBaselineDirty] = useState(false)
  const [weekDirty, setWeekDirty] = useState(false)

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
          is_overnight,
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
          is_overnight,
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

      const startTime = savedDay.start_time.slice(0,5)
      const endTime = savedDay.end_time.slice(0,5)

      return {
        dayOfWeek: day.dayOfWeek,
        enabled: true,
        startTime,
        endTime,
        notes: savedDay.notes || '',
        shiftId: savedDay.id,
        overnight: Boolean(savedDay.is_overnight),
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
    const timer = window.setTimeout(() => {
      loadSchedule()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
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
      hasInvalidShiftTimes(
        baselineStartTime,
        baselineEndTime,
        baselineOvernight
      )
    ) {
      setMessage(
        baselineOvernight
          ? 'For an overnight shift, the end time must be earlier than the start time.'
          : 'For a same-day shift, the end time must be later than the start time.'
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
              overnight: baselineOvernight,
            }
          : day
      )
    )
    setBaselineDirty(true)

    setMessage(
      'Times applied. Press Save recurring schedule to save them.'
    )
  }

  function updateBaselineDay(dayOfWeek, field, value) {
    setBaselineDirty(true)
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
        hasInvalidShiftTimes(
          day.startTime,
          day.endTime,
          day.overnight
        )
    )

    if (invalidDay) {
      const weekday = WEEKDAYS.find(
        (day) => day.value === invalidDay.dayOfWeek
      )

      setMessage(
        invalidDay.overnight
          ? `${weekday.label}: for an overnight shift, the end time must be earlier than the start time.`
          : `${weekday.label}: for a same-day shift, the end time must be later than the start time.`
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
        is_overnight: Boolean(day.overnight),
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
    setBaselineDirty(false)
    setSaving(false)
  }

  function changeWeek(numberOfWeeks) {
    if (weekDirty && !window.confirm('Discard unsaved changes for this week?')) {
      return
    }

    setWeekStart((currentWeek) =>
      addDays(currentWeek, numberOfWeeks * 7)
    )

    setSelectedOverrideDates([])
    setWeekDirty(false)
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
      hasInvalidShiftTimes(
        overrideStartTime,
        overrideEndTime,
        overrideOvernight
      )
    ) {
      setMessage(
        overrideOvernight
          ? 'For an overnight shift, the end time must be earlier than the start time.'
          : 'For a same-day shift, the end time must be later than the start time.'
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
              overnight: overrideOvernight,
            }
          : day
      )
    )
    setWeekDirty(true)

    setMessage(
      'Custom times applied. Press Save this week to save them.'
    )
  }

  function updateWeekDay(date, field, value) {
    setWeekDirty(true)
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
            overnight: day.baselineEnabled
              ? day.baselineOvernight
              : day.overnight || false,
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
        hasInvalidShiftTimes(
          day.startTime,
          day.endTime,
          day.overnight
        )
    )

    if (invalidDay) {
      setMessage(
        `${invalidDay.dayLabel}, ${formatDate(
          invalidDay.date
        )}: enter a valid start and end time.`
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
        is_overnight:
          day.mode === 'custom'
            ? Boolean(day.overnight)
            : false,
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
    setWeekDirty(false)
    setSaving(false)
  }

  function changeEmployee(employeeId) {
    if (
      (baselineDirty || weekDirty) &&
      !window.confirm('Discard unsaved schedule changes?')
    ) {
      return
    }

    setSelectedEmployeeId(employeeId)
    setSelectedOverrideDates([])
    setBaselineDirty(false)
    setWeekDirty(false)
    setMessage('')
  }

  function changeTab(nextTab) {
    const hasUnsavedChanges =
      (activeTab === 'baseline' && baselineDirty) ||
      (activeTab === 'week' && weekDirty)

    if (
      hasUnsavedChanges &&
      !window.confirm('Discard unsaved schedule changes?')
    ) {
      return
    }

    setActiveTab(nextTab)
    setBaselineDirty(false)
    setWeekDirty(false)
    setMessage('')
  }

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId
  )

  const weekEnd = addDays(weekStart, 6)
  const normalizedMessage = message.toLowerCase()
  const messageClasses = normalizedMessage.includes('successfully')
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
    : normalizedMessage.startsWith('unable')
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200'

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'}>
      {!embedded && (
        <Navbar
          user={session.user}
          onSignOut={() => supabase.auth.signOut()}
          isAdmin={hasAdminRole}
        />
      )}

      <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10'}>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
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
            <label className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 md:w-96">
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <UserRound size={16} className="text-blue-300" />
                Employee
              </span>

              <select
                value={selectedEmployeeId}
                onChange={(event) => changeEmployee(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
          <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <p className="font-semibold">
              {selectedEmployee.full_name || 'Employee'}
            </p>

            <p className="text-sm text-slate-400">
              {selectedEmployee.email}
            </p>
          </div>
        )}

        {message && (
          <div className={`mb-6 rounded-xl border p-4 text-sm ${messageClasses}`}>
            {message}
          </div>
        )}

        {isAdmin && (
          <div className="mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => changeTab('baseline')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'baseline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Repeat2 size={16} />
              Weekly Schedule
            </button>

            <button
              type="button"
              onClick={() => changeTab('week')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <CalendarRange size={16} />
              Schedule Changes
            </button>

            <button
              type="button"
              onClick={() => changeTab('view')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'view'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Eye size={16} />
              Employee View
            </button>
          </div>
        )}

        {isAdmin && activeTab === 'view' && (
          <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Read-only preview. This is how the selected employee sees this week.
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-12 text-center text-slate-400">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
            Loading schedule...
          </div>
        ) : (
          <>
            {isAdmin && activeTab === 'baseline' && (
              <form onSubmit={saveBaseline}>
                <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
                  <h2 className="text-xl font-semibold">
                    Apply hours to multiple days
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

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
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
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
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
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="flex h-10 items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={baselineOvernight}
                        onChange={(event) => {
                          setBaselineOvernight(event.target.checked)
                        }}
                        className="h-4 w-4 accent-blue-500"
                      />

                      <span>
                        <span className="block text-sm font-medium text-white">
                          Shift ends next day
                        </span>

                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={applyBaselineTime}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 sm:col-span-2 lg:col-span-1"
                    >
                      Apply to selected
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
                  {WEEKDAYS.map((weekday) => {
                    const day = baseline.find(
                      (item) =>
                        item.dayOfWeek === weekday.value
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
                                updateBaselineDay(
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
                                    updateBaselineDay(weekday.value, 'startTime', event.target.value)
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
                                    updateBaselineDay(weekday.value, 'endTime', event.target.value)
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                                />
                              </label>

                              <label className="text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
                                Notes
                                <input
                                  value={day.notes}
                                  onChange={(event) =>
                                    updateBaselineDay(weekday.value, 'notes', event.target.value)
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
                                    updateBaselineDay(day.dayOfWeek, 'overnight', event.target.checked)
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
                      {baselineDirty ? 'Unsaved weekly changes' : 'Weekly schedule is up to date'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Changes apply to the selected employee after you save.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !selectedEmployeeId || !baselineDirty}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {saving ? 'Saving...' : 'Save weekly schedule'}
                  </button>
                </div>
              </form>
            )}

            {(!isAdmin || activeTab === 'week' || activeTab === 'view') && (
              <form onSubmit={saveSpecificWeek}>
                <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                      Selected week
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
                  <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
                    <h2 className="text-xl font-semibold">
                      Apply hours to selected dates
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

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
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
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
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
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                        />
                      </label>

                      <label className="flex h-10 w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={overrideOvernight}
                          onChange={(event) => {
                            setOverrideOvernight(
                              event.target.checked
                            )
                          }}
                          className="h-4 w-4 accent-blue-500"
                        />

                        <span>Ends next day</span>
                      </label>

                      <button
                        type="button"
                        onClick={applyOverrideTime}
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

                    const effectiveOvernight =
                      day.mode === 'custom'
                        ? day.overnight
                        : day.baselineOvernight

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
                              <p className="mt-1 text-sm text-slate-500">{formatDate(day.date)}</p>
                            </div>

                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <p className="text-sm font-medium text-slate-200">{scheduleSummary}</p>
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
                                    updateWeekDay(day.date, 'mode', event.target.value)
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
                                        updateWeekDay(day.date, 'startTime', event.target.value)
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
                                        updateWeekDay(day.date, 'endTime', event.target.value)
                                      }
                                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none focus:border-blue-500"
                                    />
                                  </label>

                                  <label className="text-sm text-slate-300 sm:col-span-2 lg:col-span-1">
                                    Notes
                                    <input
                                      value={day.notes}
                                      onChange={(event) =>
                                        updateWeekDay(day.date, 'notes', event.target.value)
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
                                        updateWeekDay(day.date, 'overnight', event.target.checked)
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
                                      updateWeekDay(day.date, 'notes', event.target.value)
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
                            <p className="text-sm text-slate-500">{formatDate(day.date)}</p>
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
                        {weekDirty ? 'Unsaved changes for this week' : 'This week is up to date'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Only dates changed from the weekly schedule are stored separately.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={saving || !selectedEmployeeId || !weekDirty}
                      className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {saving ? 'Saving...' : 'Save schedule changes'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Shift
