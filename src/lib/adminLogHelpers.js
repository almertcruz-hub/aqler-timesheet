export function formatLogDate(dateString) {
  if (!dateString) return '—'

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateString}T12:00:00+08:00`))
}

export function formatLogTime(timestamp) {
  if (!timestamp) return '—'

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function formatLogDateTime(timestamp) {
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

export function formatLogDuration(log) {
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
