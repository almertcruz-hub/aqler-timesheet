import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import ShiftHeader from '../components/shifts/ShiftHeader'
import BaselineScheduleEditor from '../components/shifts/BaselineScheduleEditor'
import WeekScheduleEditor from '../components/shifts/WeekScheduleEditor'
import {
  WEEKDAYS,
  addDays,
  buildWeekSchedule,
  createEmptyBaseline,
  formatShiftDate,
  getWeekStart,
  hasInvalidShiftTimes,
  toDateString,
} from '../lib/shiftSchedule'

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

    const queryError = baselineResult.error || overridesResult.error

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
        overnight: Boolean(savedDay.is_overnight),
      }
    })

    setBaseline(baselineForm)
    setWeekSchedule(
      buildWeekSchedule(weekStart, baselineForm, savedOverrides)
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
          ? { ...day, [field]: value }
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
    if (
      weekDirty &&
      !window.confirm('Discard unsaved changes for this week?')
    ) {
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

        return { ...day, [field]: value }
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
        `${invalidDay.dayLabel}, ${formatShiftDate(
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
        start_time: day.mode === 'custom' ? day.startTime : null,
        end_time: day.mode === 'custom' ? day.endTime : null,
        is_overnight:
          day.mode === 'custom' ? Boolean(day.overnight) : false,
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
        setMessage(`Unable to save date changes: ${upsertError.message}`)
        setSaving(false)
        return
      }
    }

    const overridesToDelete = weekSchedule
      .filter((day) => day.mode === 'baseline' && day.overrideId)
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
        <ShiftHeader
          isAdmin={isAdmin}
          employees={employees}
          selectedEmployeeId={selectedEmployeeId}
          selectedEmployee={selectedEmployee}
          activeTab={activeTab}
          message={message}
          messageClasses={messageClasses}
          onEmployeeChange={changeEmployee}
          onTabChange={changeTab}
        />

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-12 text-center text-slate-400">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
            Loading schedule...
          </div>
        ) : (
          <>
            {isAdmin && activeTab === 'baseline' && (
              <BaselineScheduleEditor
                baseline={baseline}
                selectedDays={selectedBaselineDays}
                startTime={baselineStartTime}
                endTime={baselineEndTime}
                overnight={baselineOvernight}
                dirty={baselineDirty}
                saving={saving}
                selectedEmployeeId={selectedEmployeeId}
                onSubmit={saveBaseline}
                onToggleDay={toggleBaselineDay}
                onStartTimeChange={setBaselineStartTime}
                onEndTimeChange={setBaselineEndTime}
                onOvernightChange={setBaselineOvernight}
                onApplyTime={applyBaselineTime}
                onUpdateDay={updateBaselineDay}
              />
            )}

            {(!isAdmin || activeTab === 'week' || activeTab === 'view') && (
              <WeekScheduleEditor
                isAdmin={isAdmin}
                activeTab={activeTab}
                weekStart={weekStart}
                weekEnd={weekEnd}
                weekSchedule={weekSchedule}
                selectedDates={selectedOverrideDates}
                startTime={overrideStartTime}
                endTime={overrideEndTime}
                overnight={overrideOvernight}
                dirty={weekDirty}
                saving={saving}
                selectedEmployeeId={selectedEmployeeId}
                onSubmit={saveSpecificWeek}
                onChangeWeek={changeWeek}
                onToggleDate={toggleOverrideDate}
                onStartTimeChange={setOverrideStartTime}
                onEndTimeChange={setOverrideEndTime}
                onOvernightChange={setOverrideOvernight}
                onApplyTime={applyOverrideTime}
                onUpdateDay={updateWeekDay}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Shift
