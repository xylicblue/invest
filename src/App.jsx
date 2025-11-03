import { useState, useEffect } from 'react'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import PlayerDashboard from './pages/PlayerDashboard'
import { auth } from './lib/supabase'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkUser()
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const { user, profile } = await auth.getCurrentUser()
      setUser(user)
      setProfile(profile)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = async () => {
    await checkUser()
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // If not logged in, show login page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  // If logged in, show appropriate dashboard based on role
  if (profile?.role === 'admin') {
    return <AdminDashboard profile={profile} onLogout={handleLogout} />
  }

  return <PlayerDashboard profile={profile} onLogout={handleLogout} />
}

export default App
