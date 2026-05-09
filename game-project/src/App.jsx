import { useEffect, useRef } from 'react'
import useAuth       from './auth/useAuth'
import AuthPage      from './auth/AuthPage'
import Experience    from './Experience/Experience'
import './styles/loader.css'

/**
 * App — punto de entrada.
 *
 * Flujo:
 *  1. useAuth verifica si hay un token JWT válido en localStorage.
 *  2. Si no hay sesión → muestra <AuthPage />.
 *  3. Si hay sesión   → monta el canvas Three.js y arranca Experience.
 *
 * Experience recibe el usuario autenticado vía window.__gameUser
 * para que World.js pueda usar user.id en lugar de generar un playerId aleatorio.
 */
const App = () => {
  const canvasRef          = useRef()
  const experienceRef      = useRef()
  const { user, loading, logout, setUser } = useAuth()

  useEffect(() => {
    if (!user || !canvasRef.current) return
    if (experienceRef.current) return   // ya existe, no recrear

    // Exponer usuario globalmente para que Experience/World.js lo lean
    window.__gameUser = user

    experienceRef.current = new Experience(canvasRef.current)

    const handleProgress = (e) => {
      const bar  = document.getElementById('loader-bar')
      const text = document.getElementById('loader-text')
      if (bar)  bar.style.width   = `${e.detail}%`
      if (text) text.textContent  = `Cargando... ${e.detail}%`
    }
    const handleComplete = () => {
      const overlay = document.getElementById('loader-overlay')
      if (overlay) {
        overlay.style.opacity  = '0'
        overlay.style.transition = 'opacity .6s'
        setTimeout(() => overlay.remove(), 700)
      }
    }

    window.addEventListener('resource-progress', handleProgress)
    window.addEventListener('resource-complete',  handleComplete)

    return () => {
      window.removeEventListener('resource-progress', handleProgress)
      window.removeEventListener('resource-complete',  handleComplete)
    }
  }, [user])

  // 1. Cargando sesión
  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#060608',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Cinzel', Georgia, serif", fontSize: 14,
        color: '#5e648d', letterSpacing: 3
      }}>
        CARGANDO...
      </div>
    )
  }

  // 2. Sin sesión → mostrar login/register
  if (!user) {
    return <AuthPage onSuccess={setUser} />
  }

  // 3. Con sesión → juego
  return (
    <>
      <div id="loader-overlay" style={{
        position: 'fixed', inset: 0, background: '#060608',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9000, fontFamily: "'Cinzel', Georgia, serif"
      }}>
        <div id="loader-bar" style={{
          width: '0%', height: 3, background: '#a0a2e1',
          borderRadius: 2, transition: 'width .2s',
          maxWidth: 320, marginBottom: 14
        }}/>
        <div id="loader-text" style={{ color: '#5e648d', fontSize: 13, letterSpacing: 2 }}>
          Cargando... 0%
        </div>
      </div>

      {/* Botón de logout — esquina superior derecha, visible mientras se juega */}
      <button
        onClick={logout}
        aria-label="Cerrar sesión"
        style={{
          position: 'fixed', top: 14, right: 80, zIndex: 9998,
          background: 'rgba(6,6,8,.8)', color: '#5e648d',
          border: '1px solid #282e44', borderRadius: 4,
          fontFamily: "'Cinzel', serif", fontSize: 10,
          letterSpacing: 2, padding: '6px 12px', cursor: 'pointer',
          transition: 'color .2s, border-color .2s'
        }}
        onMouseEnter={e => { e.target.style.color='#d9d5ea'; e.target.style.borderColor='#5e648d' }}
        onMouseLeave={e => { e.target.style.color='#5e648d'; e.target.style.borderColor='#282e44' }}
      >
        SALIR
      </button>

      <canvas ref={canvasRef} className="webgl" />
    </>
  )
}

export default App