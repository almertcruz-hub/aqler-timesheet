import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Clock3, LayoutDashboard, LogOut, Menu, MessageSquareWarning, X, CalendarDays } from 'lucide-react'

function Navbar({ user, onSignOut, isAdmin = false }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-blue-500/10 text-blue-300'
        : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
    }`

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link to="/" onClick={closeMenu} className="shrink-0 text-xl font-bold tracking-wide text-white">
            AQLER <span className="text-blue-400">Timesheet</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="hidden flex-1 items-center justify-between gap-5 md:flex">
            <nav className="ml-4 flex items-center gap-1" aria-label="Main navigation">
              <NavLink to="/" end className={navLinkClasses}>
                <Clock3 size={16} />
                My Timesheet
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin/logs" className={navLinkClasses}>
                  <LayoutDashboard size={16} />
                  Admin
                </NavLink>
              )}

              <NavLink to="/shifts" className={navLinkClasses}>
                <CalendarDays size={16} />
                {isAdmin ? 'My Schedule' : 'Schedule'}
              </NavLink>

              <NavLink to="/payroll-concerns" className={navLinkClasses}>
                <MessageSquareWarning size={16} />
                {isAdmin ? 'My Concerns' : 'Concerns'}
              </NavLink>
            </nav>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 pr-1 leading-tight">
                  <p className="max-w-44 truncate text-sm font-medium text-slate-200">
                    {user.email}
                  </p>
                  {isAdmin && <p className="text-xs text-blue-300">Administrator</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut size={16} />
                <span className="sr-only lg:not-sr-only">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-800 py-4 md:hidden">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              <NavLink to="/" end onClick={closeMenu} className={navLinkClasses}>
                <Clock3 size={17} />
                My Timesheet
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin/logs" onClick={closeMenu} className={navLinkClasses}>
                  <LayoutDashboard size={17} />
                  Admin Dashboard
                </NavLink>
              )}

              <NavLink to="/shifts" onClick={closeMenu} className={navLinkClasses}>
                <CalendarDays size={17} />
                {isAdmin ? 'My Schedule' : 'Schedule'}
              </NavLink>

              <NavLink to="/payroll-concerns" onClick={closeMenu} className={navLinkClasses}>
                <MessageSquareWarning size={17} />
                {isAdmin ? 'My Concerns' : 'Payroll Concerns'}
              </NavLink>
            </nav>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">{user.email}</p>
                <p className="text-xs text-slate-500">{isAdmin ? 'Administrator' : 'Employee'}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
