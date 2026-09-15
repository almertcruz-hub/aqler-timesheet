import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister(event) {
    event.preventDefault()
    setMessage('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error: registerError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    })

    if (registerError) {
      setMessage(registerError.message)
    } else {
      setSuccess(true)
      setMessage('Account created. Check your email to confirm your account.')
    }

    setLoading(false)
  }

  const inputClasses =
    'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-950/40">
            <Clock3 size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            AQLER <span className="text-blue-400">Timesheet</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Create an employee account.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          {message && (
            <div
              role={success ? 'status' : 'alert'}
              className={`mb-5 rounded-xl border p-3 text-sm ${
                success
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/20 bg-red-500/10 text-red-300'
              }`}
            >
              {message}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
                className={inputClasses}
                placeholder="Juan dela Cruz"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className={inputClasses}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength="6"
                required
                className={inputClasses}
                placeholder="At least 6 characters"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength="6"
                required
                className={inputClasses}
                placeholder="Enter the same password"
              />
            </label>

            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus size={18} />
              {loading ? 'Creating account...' : success ? 'Account created' : 'Create account'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-400 transition hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </form>

      </div>
    </main>
  )
}

export default Register
