import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import AdminLayout from './pages/AdminLayout'
import Shift from './pages/Shift'
import PayrollConcerns from './pages/PayrollConcerns'
import AppUtilitiesProvider from './context/AppUtilitiesContext'
import PublicUtilities from './components/PublicUtilities'
import PwaInstallHelp from './components/PwaInstallHelp'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppUtilitiesProvider>
      <BrowserRouter>
      {!session && <PublicUtilities />}
      <PwaInstallHelp />

      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading...
        </div>
      ) : (
        <Routes>
        <Route path="/" element={session ? <Home session={session} /> : <Navigate to="/login" />} />
        <Route
          path="/admin"
          element={
            session?.user?.app_metadata?.role === 'admin'
              ? <AdminLayout session={session} />
              : <Navigate to="/" />
          }
        >
          <Route index element={<Navigate to="logs" replace />} />
          <Route
            path="logs"
            element={<Admin session={session} section="logs" embedded />}
          />
          <Route
            path="shifts"
            element={<Shift session={session} adminMode embedded />}
          />
          <Route
            path="concerns"
            element={<PayrollConcerns session={session} adminMode embedded />}
          />
          <Route
            path="reminders"
            element={<Admin session={session} section="reminders" embedded />}
          />
        </Route>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />
        <Route
          path="/shifts"
          element={
            session
              ? <Shift session={session} />
              : <Navigate to="/login" />
          }
        />
        <Route path="/payroll-concerns"
          element={
            session ? <PayrollConcerns session={session} />
            : <Navigate to='/login' />
          }
        />
        </Routes>
      )}
      </BrowserRouter>
    </AppUtilitiesProvider>
  )
}

export default App
