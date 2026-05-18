import { useState, useEffect, useCallback } from 'react'
import { verifySession, isLoggedIn, getUser, logout as doLogout, checkBackendHealth } from './authService'

export default function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      try {
        const backendUp = await checkBackendHealth()
        if (!backendUp) {
          const anonymous = { id: 'offline', username: 'Jugador', email: 'offline@local' }
          window.__gameUser = anonymous
          setUser(anonymous)
          setLoading(false)
          return
        }
      } catch {
      }

      try {
        if (!isLoggedIn()) { setLoading(false); return }
        const verified = await verifySession()
        setUser(verified || getUser())
      } catch {
        setUser(getUser())
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  const logout = useCallback(() => {
    doLogout()
    setUser(null)
  }, [])

  return { user, loading, logout, setUser }
}
