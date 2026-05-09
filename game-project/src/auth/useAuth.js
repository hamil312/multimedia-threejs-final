import { useState, useEffect, useCallback } from 'react'
import { verifySession, isLoggedIn, getUser, logout as doLogout } from './authService'

/**
 * useAuth — hook que provee el estado de autenticación a cualquier componente.
 *
 * Uso:
 *   const { user, loading, logout } = useAuth()
 *   if (loading) return <Spinner />
 *   if (!user)   return <AuthPage />
 */
export default function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Al montar: si hay un token guardado, verificarlo contra el servidor
    const check = async () => {
      try {
        if (!isLoggedIn()) { setLoading(false); return }
        const verified = await verifySession()
        setUser(verified || getUser())   // si /me falla usa el caché local
      } catch {
        setUser(getUser())   // sin conexión → aceptar el usuario guardado
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