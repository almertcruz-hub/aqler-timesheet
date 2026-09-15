import {
  getCategoryLabel,
  getStatusLabel,
} from '../../lib/payrollConcernOptions'

function formatDate(dateValue) {
  if (!dateValue) return 'Not specified'

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00`))
}

function formatSubmittedAt(timestamp) {
  if (!timestamp) return ''

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function getStatusClasses(status) {
  if (status === 'resolved') {
    return 'bg-emerald-400/10 text-emerald-300'
  }

  if (status === 'in_review') {
    return 'bg-blue-400/10 text-blue-300'
  }

  return 'bg-amber-400/10 text-amber-300'
}

function ConcernContent({ concern, showEmployee }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-white">{concern.subject}</h3>

          {showEmployee && (
            <p className="mt-1 text-sm text-slate-300">
              {concern.profile?.full_name || concern.profile?.email || 'Employee'}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{getCategoryLabel(concern.category)}</span>
            <span>
              Affected: {formatDate(concern.affected_date_start)} –{' '}
              {formatDate(concern.affected_date_end)}
            </span>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(concern.status)}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {getStatusLabel(concern.status)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        {concern.description}
      </p>

      {concern.admin_response && (
        <aside className="mt-4 rounded-r-lg border-l-2 border-blue-500 bg-blue-500/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-blue-300">Admin response</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
            {concern.admin_response}
          </p>
        </aside>
      )}

      {concern.created_at && (
        <p className="mt-3 text-xs text-slate-500">
          Submitted {formatSubmittedAt(concern.created_at)}
        </p>
      )}
    </>
  )
}

function ConcernCard({ concern, showEmployee = false, selected = false, onSelect }) {
  const classes = `w-full rounded-xl border p-4 text-left ${
    selected
      ? 'border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/20'
      : onSelect
        ? 'border-slate-800 bg-slate-950/50 transition hover:border-slate-700 hover:bg-slate-900'
        : 'border-slate-800 bg-slate-950/40'
  }`

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(concern)} className={classes}>
        <ConcernContent concern={concern} showEmployee={showEmployee} />
      </button>
    )
  }

  return (
    <article className={classes}>
      <ConcernContent concern={concern} showEmployee={showEmployee} />
    </article>
  )
}

export default ConcernCard
