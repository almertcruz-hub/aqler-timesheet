import { NavLink, Outlet } from 'react-router-dom'
import { Bell, CalendarDays, Clock3, MessageSquareWarning } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const ADMIN_LINKS = [
  {
    to: '/admin/logs',
    label: 'Work Logs',
    icon: Clock3,
  },
  {
    to: '/admin/shifts',
    label: 'Shifts',
    icon: CalendarDays,
  },
  {
    to: '/admin/concerns',
    label: 'Concerns',
    icon: MessageSquareWarning,
  },
  {
    to: '/admin/reminders',
    label: 'Email Reminders',
    icon: Bell,
  },
]

function AdminLayout({ session }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar
        user={session.user}
        onSignOut={() => supabase.auth.signOut()}
        isAdmin
      />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <header className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-300">
            Administrator
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Admin Workspace
          </h1>
          <p className="mt-2 text-slate-400">
            Manage employee logs, schedules, concerns, and reminders.
          </p>
        </header>

        <nav
          aria-label="Admin sections"
          className="mb-7 flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70 p-1"
        >
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={16} />
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
