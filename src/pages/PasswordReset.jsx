import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

const inputClasses = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

function PasswordReset({ mode, session, recoveryError, onComplete }) {
  const isReset = mode === 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const invalidLink = isReset && (recoveryError || !session)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading || success || invalidLink) return
    setError('')

    if (isReset && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (isReset && password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = isReset
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
          })

      if (authError) throw authError
      setSuccess(true)
      setPassword('')
      setConfirmation('')
      if (isReset) onComplete()
    } catch (error) {
      setError(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-600">
            <KeyRound size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{isReset ? 'Set new password' : 'Forgot password?'}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {isReset ? 'Choose a new password for your account.' : 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl sm:p-8">
          {(error || invalidLink) && (
            <div role="alert" className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {invalidLink ? 'This reset link is invalid or has expired. Request a new link to continue.' : error}
            </div>
          )}
          {success && (
            <div role="status" className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {isReset ? 'Your password has been updated.' : 'If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.'}
            </div>
          )}

          {!success && !invalidLink && (
            <div className="space-y-5">
              {isReset ? <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">New password</span>
                  <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} className={inputClasses} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Confirm new password</span>
                  <input type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={loading} className={inputClasses} />
                </label>
              </> : (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
                  <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} className={inputClasses} placeholder="you@example.com" />
                </label>
              )}
              <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-blue-600 px-5 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? 'Please wait...' : isReset ? 'Save new password' : 'Send reset link'}
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm">
            <Link to={invalidLink ? '/forgot-password' : isReset && success ? '/' : '/login'} className="font-medium text-blue-400 transition hover:text-blue-300">
              {invalidLink ? 'Request a new reset link' : isReset && success ? 'Continue to timesheet' : 'Back to sign in'}
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}

export default PasswordReset
