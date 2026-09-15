import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) setError(loginError.message)
    setLoading(false)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/40">
            <Clock3 size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            AQLER <span className="text-blue-400">Timesheet</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to record your work and view your schedule.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/15 sm:p-8"
        >
          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-blue-400 transition hover:text-blue-300">
              Create account
            </Link>
          </p>
        </form>

      </div>
    </main>
  )
}

export default Login
