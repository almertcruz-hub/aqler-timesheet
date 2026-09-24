import { CalendarRange, Eye, Repeat2, UserRound } from 'lucide-react'

function ShiftHeader({
  isAdmin,
  employees,
  selectedEmployeeId,
  selectedEmployee,
  activeTab,
  message,
  messageClasses,
  onEmployeeChange,
  onTabChange,
}) {
  return (
    <>
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
              onChange={(event) => onEmployeeChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name || employee.email} ({employee.email})
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
          <p className="text-sm text-slate-400">{selectedEmployee.email}</p>
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
            onClick={() => onTabChange('baseline')}
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
            onClick={() => onTabChange('week')}
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
            onClick={() => onTabChange('view')}
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
    </>
  )
}

export default ShiftHeader
