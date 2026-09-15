import { useState } from 'react'
import { FileWarning, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CONCERN_CATEGORIES } from '../../lib/payrollConcernOptions'

function createEmptyForm() {
  return {
    affectedDateStart: '',
    affectedDateEnd: '',
    category: '',
    subject: '',
    description: '',
  }
}

function ConcernForm({ userId, onConcernSubmitted }) {
  const [form, setForm] = useState(createEmptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setSuccess('')

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (
      !form.affectedDateStart ||
      !form.affectedDateEnd ||
      !form.category ||
      !form.subject.trim() ||
      !form.description.trim()
    ) {
      setError('Complete all required fields.')
      return
    }

    if (form.affectedDateEnd < form.affectedDateStart) {
      setError('The end date cannot be earlier than the start date.')
      return
    }

    setSaving(true)

    const { data, error: insertError } = await supabase
      .from('payroll_concerns')
      .insert({
        user_id: userId,
        affected_date_start: form.affectedDateStart,
        affected_date_end: form.affectedDateEnd,
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        status: 'open',
      })
      .select()
      .single()

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setForm(createEmptyForm())
    setSuccess('Your concern was submitted successfully.')
    onConcernSubmitted(data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="h-fit rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 sm:p-6"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-300">
          <FileWarning size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Submit a concern</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Required fields are marked with an asterisk.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm text-slate-300">
            Affected date start <span className="text-red-300">*</span>
          </span>
          <input
            type="date"
            name="affectedDateStart"
            value={form.affectedDateStart}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm text-slate-300">
            Affected date end <span className="text-red-300">*</span>
          </span>
          <input
            type="date"
            name="affectedDateEnd"
            value={form.affectedDateEnd}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white [color-scheme:dark] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm text-slate-300">
            Category <span className="text-red-300">*</span>
          </span>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Select a category</option>
            {CONCERN_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm text-slate-300">
            Subject <span className="text-red-300">*</span>
          </span>
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Example: My time out was not recorded"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm text-slate-300">
            Issue description <span className="text-red-300">*</span>
          </span>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Include the date, expected result, and what actually happened."
            rows="5"
            required
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Send size={17} />
          {saving ? 'Submitting...' : 'Submit concern'}
        </button>
      </div>
    </form>
  )
}

export default ConcernForm
