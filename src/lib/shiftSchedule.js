export const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'Th' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'Sa' },
  { value: 0, label: 'Sunday', short: 'Su' },
]

export function createEmptyBaseline() {
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

export function getWeekStart(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)

  const day = result.getDay()
  const distanceFromMonday = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + distanceFromMonday)

  return result
}

export function addDays(date, numberOfDays) {
  const result = new Date(date)
  result.setDate(result.getDate() + numberOfDays)
  return result
}

export function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatShiftDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`)

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function buildWeekSchedule(weekStart, baseline, overrides) {
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

export function hasInvalidShiftTimes(startTime, endTime, overnight) {
  if (!startTime || !endTime) return true
  if (startTime === endTime) return true
  if (overnight) return false

  return endTime <= startTime
}
