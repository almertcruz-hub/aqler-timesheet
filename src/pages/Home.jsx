import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import AlertMessage from '../components/AlertMessage'
import TimeButtons from '../components/TimeButtons'
import WorkLog from '../components/WorkLog'

function Home({ session }) {
  const user = session.user

  const [logs, setLogs] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const activeTimeIn = activeSession ? new Date(activeSession.time_in) : null

  const [alertMessage, setAlertMessage] = useState("")
  const timerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const isProcessingRef = useRef(false)

  // ---------------- FETCH DATA ----------------
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', user.id)
        .order('time_in', { ascending: false })

      if (error) {
        showAlert(`Unable to load work logs: ${error.message}`)
        setLogs( [] )
        setActiveSession(null)
        setIsLoading(false)
        return
      }

      const loadedLogs = data || []

      const openSession = loadedLogs.find(
        (log) => log.time_out === null
      )
      
      setLogs(loadedLogs)
      setActiveSession(openSession || null)
      setIsLoading(false)
    }

    fetchData()

  }, [user.id])

  // ---------------- ALERT ----------------
  const showAlert = (msg) => {
    setAlertMessage(msg)
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setAlertMessage("")
    }, 5000)
  }

  // Time In Handler
  const timeIn = async () => {
    if (isLoading || activeSession || isProcessingRef.current) {
      showAlert("You are already timed in!")
      return
    }

    isProcessingRef.current = true

    const now = new Date()

    const { data: newLog, error } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        time_in: now.toISOString(),
      })
      .select()
      .single()


    if (error) {
      showAlert(`Failed to time in: ${error.message}`)
      isProcessingRef.current = false
      return
    }

    setActiveSession(newLog)

    setLogs((currentLogs) => [
      newLog,
      ...currentLogs,
    ])

    showAlert(
      `Timed in at ${now.toLocaleTimeString()}`
    )

    isProcessingRef.current = false

  }

  // ---------------- TIME OUT ----------------
  const timeOut = async () => {
    if (!activeSession || isProcessingRef.current) {
      showAlert("You are not currently timed in!")
      return
    }

    isProcessingRef.current = true

    const now = new Date()

    const { data: completedLog, error} = await supabase
      .from('logs')
      .update({
        time_out: now.toISOString()
      })
      .eq('id', activeSession.id)
      .eq('user_id', user.id)
      .is('time_out', null)
      .select()
      .maybeSingle()

      if (error || !completedLog) {
        showAlert(
          error
          ? `Unable to time out: ${error.message}`
          : 'Session already ended. Please refresh.'
        )

        isProcessingRef.current = false 
        return
      }

      const startTime = new Date(completedLog.time_in)

      const durationHours = (now - startTime) / (1000 * 60 * 60)

      setLogs((currentLogs) =>
        currentLogs.map((log) =>
          log.id === completedLog.id
            ? completedLog
            : log
        )
      )

      setActiveSession(null)

      showAlert(
        `Timed out at ${now.toLocaleTimeString()} ` +
        `(${durationHours.toFixed(2)} hours)`
      )
      
      isProcessingRef.current = false
  }


  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        isAdmin={user.app_metadata?.role === 'admin'}
      />

      <div className="px-4 py-6 md:p-8">
        <h1 className="mb-4 text-2xl font-bold md:mb-6 md:text-4xl">
          Welcome back, {user.user_metadata?.full_name?.split(' ')[0]}!
        </h1>

        <p className="text-lg text-slate-300 mb-8">
          Here's a quick overview of your timesheet activities.
        </p>

        <AlertMessage message={alertMessage} />

        <TimeButtons
          isLoading={isLoading}
          onTimeIn={timeIn}
          onTimeOut={timeOut}
          activeTimeIn={activeTimeIn}
        />

        <WorkLog logs={logs} />
      </div>
    </div>
  )
}

export default Home
