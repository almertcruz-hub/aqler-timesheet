import { Link } from 'react-router-dom'

function Navbar({ user, onSignOut, isAdmin = false }) {
  return (
    <nav className="flex flex-col gap-4 border-b border-slate-800 bg-slate-900/60 px-4 py-4 backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-8">
      <div className="text-2xl font-bold tracking-wide text-white md:text-3xl">
        AQLER <span className="text-blue-300">Timesheet</span>
      </div>
      <div className="flex w-full flex-wrap items-center gap-3 text-sm text-slate-300 md:w-auto md:justify-end md:gap-6">
        <Link to="/" className="hover:text-white transition">My Timesheet</Link>
        {isAdmin && (
          <Link to="/admin" className="text-blue-300 hover:text-blue-200 transition">
            Employee Logs
          </Link>
        )}
        {/* <Link to="/leave-requests" className="hover:text-white transition">Leave Requests</Link>
        <Link to="/work-history" className="hover:text-white transition">Work History</Link>
        <Link to="/payslips" className="hover:text-white transition">Payslips</Link> */}

        <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="max-w-40 truncate text-sm font-medium md:max-w-none">{user.email}</p>
            {isAdmin && <p className="text-xs text-blue-300">Administrator</p>}
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="text-sm text-slate-400 hover:text-red-400 transition"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}

export default Navbar
