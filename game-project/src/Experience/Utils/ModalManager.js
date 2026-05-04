/**
 * ModalManager — Rediseñado con la paleta del HUD
 * Paleta: #060608 · #282e44 · #5e648d · #a0a2e1 · #d9d5ea
 * Tipografía: Cinzel (títulos) · Crimson Pro (cuerpo)
 */
export default class ModalManager {
  constructor({ container = document.body } = {}) {
    this.container = container
    this._injectFonts()
    this._createModal()
  }

  _injectFonts() {
    if (document.getElementById('modal-font-import')) return
    const link = document.createElement('link')
    link.id   = 'modal-font-import'
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:wght@400;600&display=swap'
    document.head.appendChild(link)

    const style = document.createElement('style')
    style.id = 'modal-styles'
    style.textContent = `
      @keyframes modal-fadein {
        from { opacity: 0; transform: translateY(-18px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)     scale(1); }
      }
      @keyframes modal-scan {
        0%   { top: 0;    opacity: 0.05; }
        100% { top: 100%; opacity: 0; }
      }

      /* Overlay */
      #hud-modal-overlay {
        position: fixed; inset: 0;
        background: rgba(6, 6, 8, 0.82);
        backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center;
        z-index: 10500;
      }
      #hud-modal-overlay.visible { display: flex; }

      /* Caja */
      #hud-modal-box {
        position: relative;
        background: #0f1220;
        border: 1px solid #5e648d;
        border-top: 3px solid #a0a2e1;
        max-width: 360px;
        width: 90%;
        padding: 0 0 24px;
        overflow: hidden;
        animation: modal-fadein 0.28s cubic-bezier(.4,0,.2,1) both;
        /* Esquinas cortadas — mismo estilo que el HUD */
        clip-path: polygon(
          16px 0%, calc(100% - 16px) 0%,
          100% 16px, 100% calc(100% - 16px),
          calc(100% - 16px) 100%, 16px 100%,
          0% calc(100% - 16px), 0% 16px
        );
      }

      /* Scanline decorativa */
      #hud-modal-box::after {
        content: '';
        position: absolute; left: 0; right: 0; height: 22px;
        background: linear-gradient(180deg, #a0a2e1, transparent);
        pointer-events: none;
        animation: modal-scan 3.2s linear infinite;
      }

      /* Barra de color superior según tipo */
      #hud-modal-stripe {
        height: 3px; width: 100%;
        background: #a0a2e1;
        margin-bottom: 0;
      }

      /* Icono grande */
      #hud-modal-icon {
        font-size: 52px;
        text-align: center;
        padding: 22px 24px 4px;
        line-height: 1;
      }

      /* Título opcional */
      #hud-modal-title {
        font-family: 'Cinzel', Georgia, serif;
        font-size: 17px;
        font-weight: 600;
        color: #d9d5ea;
        text-align: center;
        letter-spacing: 2px;
        padding: 10px 24px 0;
        text-transform: uppercase;
        display: none;
      }
      #hud-modal-title.visible { display: block; }

      /* Mensaje */
      #hud-modal-text {
        font-family: 'Crimson Pro', Georgia, serif;
        font-size: 16px;
        color: #a0a2e1;
        text-align: center;
        padding: 12px 28px 0;
        white-space: pre-line;
        line-height: 1.65;
      }

      /* Separador */
      #hud-modal-sep {
        height: 1px;
        background: #282e44;
        margin: 18px 24px 16px;
      }

      /* Contenedor de botones */
      #hud-modal-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 0 24px;
      }

      /* Botón primario */
      .hud-modal-btn {
        font-family: 'Cinzel', Georgia, serif;
        font-size: 13px;
        letter-spacing: 1.5px;
        font-weight: 600;
        padding: 11px 16px;
        background: #282e44;
        color: #d9d5ea;
        border: 1px solid #5e648d;
        cursor: pointer;
        text-align: center;
        transition: background 0.2s, border-color 0.2s;
        clip-path: polygon(
          8px 0%, calc(100% - 8px) 0%,
          100% 8px, 100% calc(100% - 8px),
          calc(100% - 8px) 100%, 8px 100%,
          0% calc(100% - 8px), 0% 8px
        );
      }
      .hud-modal-btn:hover {
        background: #5e648d;
        border-color: #a0a2e1;
        color: #d9d5ea;
      }
      .hud-modal-btn:focus-visible {
        outline: 3px solid #d9d5ea;
        outline-offset: 3px;
      }
      /* Botón peligroso (salir / cancelar) */
      .hud-modal-btn.danger {
        border-color: #3a2e44;
        color: #7a7a9e;
      }
      .hud-modal-btn.danger:hover {
        background: #2a1e34;
        border-color: #5e648d;
        color: #a0a2e1;
      }

      /* Botón cerrar (fallback) */
      #hud-modal-close {
        font-family: 'Cinzel', Georgia, serif;
        font-size: 13px; letter-spacing: 1.5px;
        padding: 10px 16px;
        background: transparent;
        color: #5e648d;
        border: 1px solid #282e44;
        cursor: pointer;
        display: block; width: calc(100% - 48px);
        margin: 0 24px;
        transition: color 0.2s, border-color 0.2s;
      }
      #hud-modal-close:hover { color: #a0a2e1; border-color: #5e648d; }

      /* Barra de vida embebida en el modal de muerte */
      #hud-modal-hp-row {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        padding: 8px 24px 0;
        display: none;
      }
      #hud-modal-hp-row.visible { display: flex; }
      #hud-modal-hp-hearts { display: flex; gap: 4px; }
    `
    document.head.appendChild(style)
  }

  _createModal() {
    // Overlay
    this.overlay = document.createElement('div')
    this.overlay.id = 'hud-modal-overlay'
    this.overlay.setAttribute('role', 'dialog')
    this.overlay.setAttribute('aria-modal', 'true')
    this.overlay.setAttribute('aria-live', 'assertive')

    // Box
    this.box = document.createElement('div')
    this.box.id = 'hud-modal-box'

    // Stripe top
    const stripe = document.createElement('div'); stripe.id = 'hud-modal-stripe'
    this.box.appendChild(stripe)

    // Icon
    this.icon = document.createElement('div'); this.icon.id = 'hud-modal-icon'
    this.box.appendChild(this.icon)

    // Title
    this.title = document.createElement('div'); this.title.id = 'hud-modal-title'
    this.box.appendChild(this.title)

    // HP row (death modal)
    this.hpRow = document.createElement('div'); this.hpRow.id = 'hud-modal-hp-row'
    const hpLabel = document.createElement('span')
    hpLabel.style.cssText = 'font-family:"Cinzel",serif;font-size:9px;letter-spacing:2px;color:#5e648d;'
    hpLabel.textContent = 'VIDA'
    this.hpHearts = document.createElement('div'); this.hpHearts.id = 'hud-modal-hp-hearts'
    this.hpRow.appendChild(hpLabel); this.hpRow.appendChild(this.hpHearts)
    this.box.appendChild(this.hpRow)

    // Message
    this.text = document.createElement('div'); this.text.id = 'hud-modal-text'
    this.box.appendChild(this.text)

    // Separator
    const sep = document.createElement('div'); sep.id = 'hud-modal-sep'
    this.box.appendChild(sep)

    // Buttons container
    this.buttonsContainer = document.createElement('div'); this.buttonsContainer.id = 'hud-modal-buttons'
    this.box.appendChild(this.buttonsContainer)

    // Close fallback
    this.closeBtn = document.createElement('button'); this.closeBtn.id = 'hud-modal-close'
    this.closeBtn.setAttribute('aria-label', 'Cerrar modal')
    this.closeBtn.textContent = 'CERRAR'
    this.closeBtn.onclick = () => this.hide()
    this.box.appendChild(this.closeBtn)

    this.overlay.appendChild(this.box)
    this.container.appendChild(this.overlay)

    // Cerrar con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay.classList.contains('visible')) this.hide()
    })
  }

  /**
   * show({ icon, title, message, buttons, type, showHP, hpValue })
   *
   * type: 'default' | 'death' | 'win' | 'info'
   *   - 'death' → stripe roja oscura + corazones vacíos
   *   - 'win'   → stripe dorada
   *   - 'info'  → stripe azul
   *
   * showHP: boolean — muestra los corazones encima del mensaje
   * hpValue: 0–100
   */
  show({ icon = 'ℹ️', title = '', message = '', buttons = [], type = 'default', showHP = false, hpValue = 0 } = {}) {
    // Stripe de color según tipo
    const stripeColors = {
      death:   '#3a1a2a',
      win:     '#a0a2e1',
      info:    '#5e648d',
      default: '#a0a2e1'
    }
    const stripeEl = document.getElementById('hud-modal-stripe')
    if (stripeEl) stripeEl.style.background = stripeColors[type] || stripeColors.default

    this.icon.textContent = icon

    // Título
    if (title) {
      this.title.textContent = title
      this.title.classList.add('visible')
      this.title.setAttribute('aria-label', title)
    } else {
      this.title.classList.remove('visible')
    }

    // HP row
    if (showHP) {
      this._renderModalHearts(hpValue)
      this.hpRow.classList.add('visible')
    } else {
      this.hpRow.classList.remove('visible')
    }

    this.text.textContent = message
    this.overlay.setAttribute('aria-label', title || message)
    this.overlay.classList.add('visible')

    // Botones
    this.buttonsContainer.innerHTML = ''
    if (Array.isArray(buttons) && buttons.length > 0) {
      buttons.forEach((btn, i) => {
        const b = document.createElement('button')
        b.className = 'hud-modal-btn' + (btn.danger ? ' danger' : '')
        b.textContent = btn.text || 'Aceptar'
        b.setAttribute('aria-label', btn.text || 'Aceptar')
        b.onclick = () => { btn.onClick?.(); this.hide() }
        this.buttonsContainer.appendChild(b)
        // Foco al primer botón
        if (i === 0) setTimeout(() => b.focus(), 50)
      })
      this.closeBtn.style.display = 'none'
    } else {
      this.closeBtn.style.display = 'block'
      setTimeout(() => this.closeBtn.focus(), 50)
    }

    // Foco al modal para lectores de pantalla
    this.overlay.setAttribute('tabindex', '-1')
    setTimeout(() => this.overlay.focus(), 30)
  }

  _renderModalHearts(hp) {
    const total  = 5
    const filled = Math.round((hp / 100) * total)
    this.hpHearts.innerHTML = ''
    for (let i = 0; i < total; i++) {
      const h = document.createElement('span')
      h.setAttribute('aria-hidden', 'true')
      h.style.cssText = 'font-size:20px;'
      h.textContent = i < filled ? '♥' : '♡'
      h.style.color  = i < filled ? '#a0a2e1' : '#282e44'
      this.hpHearts.appendChild(h)
    }
  }

  hide() {
    this.overlay.classList.remove('visible')
  }
}