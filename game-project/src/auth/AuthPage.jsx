import { useState } from 'react'
import { login, register } from './authService'

/**
 * AuthPage — pantalla de login y registro con la paleta del HUD del juego.
 * Paleta: #060608 · #282e44 · #5e648d · #a0a2e1 · #d9d5ea
 *
 * @param {function} onSuccess — se llama con el objeto user tras autenticarse
 */
export default function AuthPage({ onSuccess }) {
  const [mode,    setMode]    = useState('login')   // 'login' | 'register'
  const [form,    setForm]    = useState({ username: '', email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (mode === 'login') {
        data = await login({ email: form.email, password: form.password })
      } else {
        data = await register({ username: form.username, email: form.email, password: form.password })
      }
      onSuccess(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
    setForm({ username: '', email: '', password: '' })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:wght@400;600&display=swap');

        .auth-overlay {
          position: fixed; inset: 0;
          background: #060608;
          display: flex; align-items: center; justify-content: center;
          z-index: 20000;
          font-family: 'Crimson Pro', Georgia, serif;
        }

        .auth-card {
          background: #0f1220;
          border: 1px solid #5e648d;
          border-top: 3px solid #a0a2e1;
          width: 100%; max-width: 380px;
          padding: 0;
          clip-path: polygon(
            14px 0%, calc(100% - 14px) 0%,
            100% 14px, 100% calc(100% - 14px),
            calc(100% - 14px) 100%, 14px 100%,
            0% calc(100% - 14px), 0% 14px
          );
          animation: auth-fade .3s ease;
        }

        @keyframes auth-fade {
          from { opacity:0; transform: translateY(-14px) scale(.98); }
          to   { opacity:1; transform: translateY(0)     scale(1); }
        }

        .auth-header {
          padding: 28px 28px 0;
          text-align: center;
        }
        .auth-logo {
          font-size: 36px; line-height:1; display:block; margin-bottom:10px;
        }
        .auth-title {
          font-family: 'Cinzel', Georgia, serif;
          font-size: 17px; font-weight: 600;
          color: #d9d5ea;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0 0 4px;
        }
        .auth-subtitle {
          font-size: 14px; color: #5e648d; margin: 0 0 22px;
        }

        .auth-tabs {
          display: flex; border-bottom: 1px solid #282e44;
        }
        .auth-tab {
          flex: 1; padding: 10px;
          font-family: 'Cinzel', serif; font-size: 11px;
          letter-spacing: 2px; text-transform: uppercase;
          color: #5e648d; background: none;
          border: none; cursor: pointer;
          transition: color .2s, border-bottom .2s;
          border-bottom: 2px solid transparent;
        }
        .auth-tab.active {
          color: #a0a2e1;
          border-bottom: 2px solid #a0a2e1;
        }
        .auth-tab:hover:not(.active) { color: #7a7eaa; }

        .auth-body { padding: 22px 28px 28px; }

        .auth-field {
          margin-bottom: 14px;
        }
        .auth-label {
          display: block;
          font-family: 'Cinzel', serif;
          font-size: 9px; letter-spacing: 2.5px;
          color: #5e648d; margin-bottom: 5px;
          text-transform: uppercase;
        }
        .auth-input {
          width: 100%; box-sizing: border-box;
          background: #060608;
          border: 1px solid #282e44;
          color: #d9d5ea;
          font-family: 'Crimson Pro', serif;
          font-size: 16px;
          padding: 10px 12px;
          border-radius: 4px;
          outline: none;
          transition: border-color .2s;
        }
        .auth-input:focus {
          border-color: #5e648d;
          box-shadow: 0 0 0 2px rgba(94,100,141,.2);
        }
        .auth-input::placeholder { color: #282e44; }
        .auth-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #060608 inset;
          -webkit-text-fill-color: #d9d5ea;
        }

        .auth-error {
          background: rgba(160,50,50,.12);
          border: 1px solid rgba(160,50,50,.3);
          border-radius: 4px;
          color: #c87070;
          font-size: 14px;
          padding: 9px 12px;
          margin-bottom: 14px;
          text-align: center;
        }

        .auth-btn {
          width: 100%;
          font-family: 'Cinzel', serif;
          font-size: 12px; letter-spacing: 2.5px;
          font-weight: 600; text-transform: uppercase;
          padding: 13px;
          background: #282e44;
          color: #d9d5ea;
          border: 1px solid #5e648d;
          cursor: pointer;
          transition: background .2s, border-color .2s;
          clip-path: polygon(
            6px 0%, calc(100% - 6px) 0%,
            100% 6px, 100% calc(100% - 6px),
            calc(100% - 6px) 100%, 6px 100%,
            0% calc(100% - 6px), 0% 6px
          );
          margin-top: 4px;
        }
        .auth-btn:hover:not(:disabled) { background: #5e648d; border-color: #a0a2e1; }
        .auth-btn:disabled { opacity: .5; cursor: not-allowed; }
        .auth-btn:focus-visible {
          outline: 3px solid #d9d5ea; outline-offset: 3px;
        }

        .auth-footer {
          text-align: center; margin-top: 16px;
          font-size: 14px; color: #5e648d;
        }
        .auth-footer button {
          background: none; border: none;
          color: #a0a2e1; cursor: pointer;
          font-family: inherit; font-size: inherit;
          text-decoration: underline; padding: 0;
          transition: color .2s;
        }
        .auth-footer button:hover { color: #d9d5ea; }
      `}</style>

      <div className="auth-overlay" role="main">
        <div className="auth-card" role="dialog" aria-modal="true" aria-label="Autenticación del juego">

          <div className="auth-header">
            <span className="auth-logo" aria-hidden="true">🎮</span>
            <h1 className="auth-title">Exploration Game</h1>
            <p className="auth-subtitle">Inicia sesión para jugar</p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button
              role="tab" aria-selected={mode === 'login'}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >Iniciar sesión</button>
            <button
              role="tab" aria-selected={mode === 'register'}
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >Registrarse</button>
          </div>

          <form className="auth-body" onSubmit={handleSubmit} noValidate>

            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-username">Usuario</label>
                <input
                  id="auth-username" name="username" type="text"
                  className="auth-input" placeholder="nombre_jugador"
                  value={form.username} onChange={handleChange}
                  autoComplete="username" minLength={3} maxLength={24}
                  required aria-required="true"
                />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">Correo</label>
              <input
                id="auth-email" name="email" type="email"
                className="auth-input" placeholder="correo@ejemplo.com"
                value={form.email} onChange={handleChange}
                autoComplete="email" required aria-required="true"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Contraseña</label>
              <input
                id="auth-password" name="password" type="password"
                className="auth-input" placeholder="mínimo 6 caracteres"
                value={form.password} onChange={handleChange}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6} required aria-required="true"
              />
            </div>

            {error && (
              <div className="auth-error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Procesando...' : mode === 'login' ? '▶  Entrar al juego' : '✦  Crear cuenta'}
            </button>

            <p className="auth-footer">
              {mode === 'login'
                ? <>¿Sin cuenta? <button type="button" onClick={switchMode}>Regístrate aquí</button></>
                : <>¿Ya tienes cuenta? <button type="button" onClick={switchMode}>Inicia sesión</button></>
              }
            </p>

          </form>
        </div>
      </div>
    </>
  )
}