/**
 * authService.js — Centraliza todas las llamadas a la API de autenticación.
 *
 * El token JWT se guarda en localStorage con la clave 'game_token'.
 * El objeto de usuario se guarda en 'game_user'.
 *
 * Cualquier parte de la app puede importar getToken() para enviar
 * el token en los headers de fetch.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const API      = `${BASE_URL}/api/auth`

export const checkBackendHealth = async () => {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ── Helpers de almacenamiento ────────────────────────────────────────────────
export const saveSession  = (token, user) => {
  localStorage.setItem('game_token', token)
  localStorage.setItem('game_user',  JSON.stringify(user))
}
export const clearSession = () => {
  localStorage.removeItem('game_token')
  localStorage.removeItem('game_user')
}
export const getToken     = ()  => localStorage.getItem('game_token')
export const getUser      = ()  => {
  try { return JSON.parse(localStorage.getItem('game_user')) }
  catch { return null }
}
export const isLoggedIn   = ()  => !!getToken()

// ── Registro ─────────────────────────────────────────────────────────────────
export const register = async ({ username, email, password }) => {
  const res  = await fetch(`${API}/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, email, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al registrarse')
  saveSession(data.token, data.user)
  return data
}

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async ({ email, password }) => {
  const res  = await fetch(`${API}/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión')
  saveSession(data.token, data.user)
  return data
}

// ── Verificar sesión activa (al recargar la página) ───────────────────────────
export const verifySession = async () => {
  const token = getToken()
  if (!token) return null

  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!res.ok) {
    clearSession()     // token expirado o inválido
    return null
  }

  const data = await res.json()
  return data.user
}

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = () => {
  clearSession()
  window.location.reload()
}