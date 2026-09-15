import { useEffect, useState } from 'react'
import { Inbox, Plus, RefreshCw, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import ConcernForm from '../components/payroll/ConcernForm'
import ConcernCard from '../components/payroll/ConcernCard'
import {
  CONCERN_CATEGORIES,
  CONCERN_STATUSES,
  getCategoryLabel,
} from '../lib/payrollConcernOptions'

function formatDate(dateValue) {
  if (!dateValue) return 'Not specified'

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00`))
}

function createResponseForm(concern) {
  return {
    status: concern?.status || 'open',
    adminResponse: concern?.admin_response || '',
  }
}

function PayrollConcerns({ session, adminMode = false, embedded = false }) {
  const user = session.user
  const hasAdminRole = user.app_metadata?.role === 'admin'
  const isAdmin = adminMode && hasAdminRole

  const [concerns, setConcerns] = useState([])
  const [selectedConcern, setSelectedConcern] = useState(null)
  const [responseForm, setResponseForm] = useState(
    createResponseForm(null)
  )
  const [loading, setLoading] = useState(true)
  const [savingResponse, setSavingResponse] = useState(false)
  const [error, setError] = useState('')
  const [refreshNumber, setRefreshNumber] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAdminForm, setShowAdminForm] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchConcerns() {
      let concernsQuery = supabase
        .from('payroll_concerns')
        .select('*')
        .order('created_at', { ascending: false })

      if (!isAdmin) {
        concernsQuery = concernsQuery.eq('user_id', user.id)
      }

      const { data, error: concernsError } = await concernsQuery

      if (cancelled) return

      if (concernsError) {
        setError(concernsError.message)
        setConcerns([])
        setSelectedConcern(null)
        setLoading(false)
        return
      }

      let loadedConcerns = data || []
      let loadWarning = ''

      if (isAdmin && loadedConcerns.length > 0) {
        const employeeIds = [
          ...new Set(loadedConcerns.map((concern) => concern.user_id)),
        ]

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', employeeIds)

        if (cancelled) return

        if (profilesError) {
          loadWarning = `Concerns loaded, but employee names could not be loaded: ${profilesError.message}`
        } else {
          const profilesById = new Map(
            (profiles || []).map((profile) => [profile.id, profile])
          )

          loadedConcerns = loadedConcerns.map((concern) => ({
            ...concern,
            profile: profilesById.get(concern.user_id) || null,
          }))
        }
      }

      setConcerns(loadedConcerns)
      setError(loadWarning)
      setLoading(false)

      if (isAdmin) {
        const firstConcern = loadedConcerns[0] || null
        setSelectedConcern(firstConcern)
        setResponseForm(createResponseForm(firstConcern))
      }
    }

    fetchConcerns()

    return () => {
      cancelled = true
    }
  }, [isAdmin, refreshNumber, user.id])

  function refreshConcerns() {
    setLoading(true)
    setError('')
    setRefreshNumber((currentNumber) => currentNumber + 1)
  }

  function handleConcernSubmitted(newConcern) {
    if (isAdmin) {
      setShowAdminForm(false)
      refreshConcerns()
      return
    }

    setConcerns((currentConcerns) => [newConcern, ...currentConcerns])
  }

  function selectConcern(concern) {
    setSelectedConcern(concern)
    setResponseForm(createResponseForm(concern))
  }

  function handleResponseChange(event) {
    const { name, value } = event.target

    setResponseForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function saveAdminResponse() {
    if (!selectedConcern) return

    setSavingResponse(true)
    setError('')

    const { data, error: updateError } = await supabase
      .from('payroll_concerns')
      .update({
        status: responseForm.status,
        admin_response: responseForm.adminResponse.trim() || null,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      })
      .eq('id', selectedConcern.id)
      .select()
      .single()

    setSavingResponse(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    const updatedConcern = {
      ...data,
      profile: selectedConcern.profile,
    }

    setConcerns((currentConcerns) =>
      currentConcerns.map((concern) =>
        concern.id === updatedConcern.id ? updatedConcern : concern
      )
    )
    setSelectedConcern(updatedConcern)
    setResponseForm(createResponseForm(updatedConcern))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredConcerns = concerns.filter((concern) => {
    const matchesSearch =
      !normalizedSearch ||
      concern.subject.toLowerCase().includes(normalizedSearch) ||
      concern.description.toLowerCase().includes(normalizedSearch) ||
      concern.profile?.full_name?.toLowerCase().includes(normalizedSearch) ||
      concern.profile?.email?.toLowerCase().includes(normalizedSearch)

    const matchesStatus =
      !statusFilter || concern.status === statusFilter
    const matchesCategory =
      !categoryFilter || concern.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <div className={embedded ? '' : 'min-h-screen bg-slate-950 text-white'}>
      {!embedded && (
        <Navbar user={user} onSignOut={signOut} isAdmin={hasAdminRole} />
      )}

      <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10'}>
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-300">
              {isAdmin ? 'Administrator' : 'Employee support'}
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              {isAdmin ? 'Payroll Concern Queue' : 'Payroll Concerns'}
            </h1>
            <p className="mt-2 text-slate-400">
              {isAdmin
                ? 'Review employee concerns, respond, and update their status.'
                : 'Submit and track payroll or attendance concerns.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminForm((isVisible) => !isVisible)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
              >
                {showAdminForm ? <X size={16} /> : <Plus size={16} />}
                {showAdminForm ? 'Close form' : 'Submit a concern'}
              </button>
            )}

            <button
              type="button"
              onClick={refreshConcerns}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {isAdmin ? (
          <>
            {showAdminForm && (
              <div className="mb-5 max-w-2xl">
                <ConcernForm
                  userId={user.id}
                  onConcernSubmitted={handleConcernSubmitted}
                />
              </div>
            )}

            <div className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:grid-cols-[1.4fr_0.8fr_0.9fr]">
              <label className="relative">
                <span className="sr-only">Search concerns</span>
                <Search
                  size={17}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee, email, or subject"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All statuses</option>
                {CONCERN_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All categories</option>
                {CONCERN_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Concerns</h2>
                  <span className="text-sm text-slate-400">
                    {filteredConcerns.length} total
                  </span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto mb-3 animate-spin" size={22} />
                    <p>Loading concerns...</p>
                  </div>
                ) : filteredConcerns.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Inbox className="mx-auto mb-3 text-slate-600" size={28} />
                    <p>No concerns match your filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConcerns.map((concern) => (
                      <ConcernCard
                        key={concern.id}
                        concern={concern}
                        showEmployee
                        selected={selectedConcern?.id === concern.id}
                        onSelect={selectConcern}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 lg:sticky lg:top-5">
                {!selectedConcern ? (
                  <p className="py-10 text-center text-slate-400">
                    Select a concern to review it.
                  </p>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold">Review concern</h2>

                    <div className="mt-5 space-y-5">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          Employee
                        </p>
                        <p className="mt-1 text-slate-200">
                          {selectedConcern.profile?.full_name || 'Employee'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {selectedConcern.profile?.email || 'Email unavailable'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          Concern
                        </p>
                        <p className="mt-1 font-medium">{selectedConcern.subject}</p>
                        <p className="mt-1 text-sm text-blue-300">
                          {getCategoryLabel(selectedConcern.category)}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Affected dates: {formatDate(selectedConcern.affected_date_start)} –{' '}
                          {formatDate(selectedConcern.affected_date_end)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                          Employee explanation
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {selectedConcern.description}
                        </p>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">
                          Admin response
                        </span>
                        <textarea
                          name="adminResponse"
                          value={responseForm.adminResponse}
                          onChange={handleResponseChange}
                          rows="5"
                          placeholder="Write your response to the employee..."
                          className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <select
                          name="status"
                          value={responseForm.status}
                          onChange={handleResponseChange}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                          {CONCERN_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={saveAdminResponse}
                          disabled={savingResponse}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:opacity-50"
                        >
                          {savingResponse ? 'Saving...' : 'Save response'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <ConcernForm
              userId={user.id}
              onConcernSubmitted={handleConcernSubmitted}
            />

            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your concerns</h2>
                <span className="text-sm text-slate-400">
                  {concerns.length} total
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="mx-auto mb-3 animate-spin" size={22} />
                  <p>Loading concerns...</p>
                </div>
              ) : concerns.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Inbox className="mx-auto mb-3 text-slate-600" size={28} />
                  <p className="font-medium text-slate-300">No concerns yet</p>
                  <p className="mt-1 text-sm">
                    No submitted concerns.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {concerns.map((concern) => (
                    <ConcernCard key={concern.id} concern={concern} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default PayrollConcerns
