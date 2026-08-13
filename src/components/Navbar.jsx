import { Link } from 'react-router-dom'

function Navbar({ user, onSignOut, isAdmin = false }) {
  return (
    <nav className="flex justify-between items-center px-8 py-5 bg-slate-900/60 backdrop-blur-md border-b border-slate-800">
      <div className="text-3xl font-bold tracking-wide text-white">
        AQLER <span className="text-blue-300">Timesheet</span>
      </div>
      <div className="flex items-center gap-6 text-sm text-slate-300">
        <Link to="/" className="hover:text-white transition">My Timesheet</Link>
        {isAdmin && (
          <Link to="/admin" className="text-blue-300 hover:text-blue-200 transition">
            Employee Logs
          </Link>
        )}
        {/* <Link to="/leave-requests" className="hover:text-white transition">Leave Requests</Link>
        <Link to="/work-history" className="hover:text-white transition">Work History</Link>
        <Link to="/payslips" className="hover:text-white transition">Payslips</Link> */}

        <div className="ml-4 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">{user.email}</p>
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
