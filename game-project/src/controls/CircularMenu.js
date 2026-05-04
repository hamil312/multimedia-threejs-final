import gsap from 'gsap'
import { Howler } from 'howler'

/**
 * CircularMenu — HUD + Menú de accesibilidad WCAG 2.1 / WAI-ARIA 1.2
 * Paleta: #060608 · #282e44 · #5e648d · #a0a2e1 · #d9d5ea
 *
 * AUDIO: Los sliders controlan Howler (SFX) y AmbientSound (música).
 * VOZ ASISTIDA: keydown WASD/flechas/Espacio → SpeechSynthesis + subtítulo.
 * TAMAÑO TEXTO: escala todos los elementos del HUD real.
 */
export default class CircularMenu {
  constructor({ container, vrIntegration, onAudioToggle, onWalkMode, onFullscreen, onCancelGame }) {
    this.container     = container
    this.vrIntegration = vrIntegration
    this.isOpen        = false
    this.actionButtons = []

    // Se asigna desde Experience.js: menu._world = world
    this._world = null

    this._a11y = {
      subtitlesOn:   false,
      highContrast:  false,
      musicVol:      75,
      sfxVol:        50,
      fontSize:      1.2,
      keyboardHints: true
    }

    this._speechSynth = window.speechSynthesis || null
    this._subTimer    = null

    this._injectStyles()
    this._buildHUD()
    this._buildA11yMenu()
    this._initVoiceAssist()
    this._applyFontScale(this._a11y.fontSize)
  }

  /* ══════════════════════════════════════════════════════════════
     ESTILOS GLOBALES
  ══════════════════════════════════════════════════════════════ */
  _injectStyles() {
    if (document.getElementById('hud-global-styles')) return
    const style = document.createElement('style')
    style.id = 'hud-global-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:wght@400;600&display=swap');
      :root {
        --hud-bg:      #060608;
        --hud-surface: #0f1220;
        --hud-border:  #282e44;
        --hud-mid:     #5e648d;
        --hud-accent:  #a0a2e1;
        --hud-light:   #d9d5ea;
        --hud-font:    'Cinzel','Georgia',serif;
        --hud-body:    'Crimson Pro','Georgia',serif;
        --hud-radius:  6px;
      }
      body.hud-high-contrast {
        --hud-surface:#000; --hud-border:#fff; --hud-mid:#fff;
        --hud-accent:#fff;  --hud-light:#fff;
      }
      @keyframes hud-heart-pulse {
        0%,100%{transform:scale(1)} 50%{transform:scale(1.22)}
      }
      .hud-heart-low{animation:hud-heart-pulse .85s ease-in-out infinite;color:#a0a2e1!important}
      @keyframes hud-scan{0%{top:0;opacity:.05}100%{top:100%;opacity:0}}
      .hud-scanline{position:relative;overflow:hidden}
      .hud-scanline::after{content:'';position:absolute;left:0;right:0;height:20px;
        background:linear-gradient(180deg,var(--hud-accent),transparent);
        pointer-events:none;animation:hud-scan 3.5s linear infinite}
      .hud-a11y-btn:focus-visible,#hud-menu-toggle:focus-visible{
        outline:3px solid var(--hud-light);outline-offset:3px}
      .hud-skip{position:fixed;top:-60px;left:16px;background:var(--hud-light);
        color:var(--hud-bg);font-family:var(--hud-body);font-size:15px;
        padding:8px 14px;border-radius:var(--hud-radius);z-index:11000;
        transition:top .2s;text-decoration:none}
      .hud-skip:focus{top:8px}
      #hud-subtitles-bar{position:fixed;bottom:36px;left:50%;transform:translateX(-50%);
        background:rgba(6,6,8,.93);border:1px solid var(--hud-mid);
        border-radius:var(--hud-radius);color:var(--hud-light);
        font-family:var(--hud-body);font-size:22px;font-weight:600;
        padding:12px 28px;z-index:10001;max-width:640px;text-align:center;
        pointer-events:none;display:none;letter-spacing:.5px}
      #hud-subtitles-bar.visible{display:block}
      #hud-kb-hints{position:fixed;bottom:10px;right:18px;
        font-family:var(--hud-body);font-size:13px;color:var(--hud-mid);
        pointer-events:none;z-index:9998;line-height:2;text-align:right}
      .hud-switch{position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0}
      .hud-switch input{opacity:0;width:0;height:0}
      .hud-switch-track{position:absolute;inset:0;border-radius:11px;
        background:var(--hud-border);border:1px solid var(--hud-mid);
        transition:background .25s;cursor:pointer}
      .hud-switch input:checked+.hud-switch-track{background:var(--hud-mid)}
      .hud-switch-thumb{position:absolute;top:4px;left:4px;width:13px;height:13px;
        border-radius:50%;background:var(--hud-light);transition:transform .25s;pointer-events:none}
      .hud-switch input:checked~.hud-switch-thumb{transform:translateX(16px)}
      .hud-switch input:focus-visible+.hud-switch-track{outline:3px solid var(--hud-light);outline-offset:2px}
      input[type=range].hud-slider{-webkit-appearance:none;width:100%;height:5px;
        border-radius:3px;cursor:pointer;background:var(--hud-border);accent-color:var(--hud-accent)}
      input[type=range].hud-slider::-webkit-slider-thumb{-webkit-appearance:none;
        width:17px;height:17px;border-radius:50%;background:var(--hud-accent);
        border:2px solid var(--hud-light);cursor:pointer}
      input[type=range].hud-slider:focus-visible{outline:2px solid var(--hud-light);outline-offset:4px}
    `
    document.head.appendChild(style)
  }

  /* ══════════════════════════════════════════════════════════════
     HUD PANEL SUPERIOR
  ══════════════════════════════════════════════════════════════ */
  _buildHUD() {
    const skip = document.createElement('a')
    skip.className = 'hud-skip'; skip.href = '#game-canvas'; skip.textContent = 'Saltar al juego'
    document.body.prepend(skip)

    const panel = document.createElement('div')
    panel.id = 'hud-panel'
    panel.setAttribute('role','region'); panel.setAttribute('aria-label','Panel de información del juego')
    panel.className = 'hud-scanline'
    Object.assign(panel.style, {
      position:'fixed', top:'14px', left:'50%', transform:'translateX(-50%)',
      display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr',
      background:'var(--hud-surface)', border:'1px solid var(--hud-mid)',
      borderTop:'3px solid var(--hud-accent)', borderRadius:'var(--hud-radius)',
      zIndex:'9999', pointerEvents:'none', fontFamily:'var(--hud-font)',
      minWidth:'500px', overflow:'hidden'
    })

    const sep = () => { const d=document.createElement('div'); d.style.cssText='background:var(--hud-border);width:1px;margin:10px 0;'; return d }

    // TIEMPO
    const timerBlock = document.createElement('div')
    timerBlock.id = 'hud-timer-block'
    timerBlock.style.cssText = 'padding:12px 18px 14px;display:flex;flex-direction:column;gap:5px;'
    timerBlock.innerHTML = `
      <span id="hud-lbl-tiempo" style="font-size:10px;letter-spacing:3px;color:var(--hud-mid);font-family:var(--hud-body);">TIEMPO</span>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="hud-timer-val" role="timer" aria-live="off" aria-label="Tiempo transcurrido"
          style="font-size:32px;font-weight:600;color:var(--hud-light);line-height:1;letter-spacing:1px;">00:00</span>
        <span aria-hidden="true" style="width:9px;height:9px;border-radius:50%;background:var(--hud-accent);flex-shrink:0;animation:hud-heart-pulse 1.8s ease-in-out infinite;"></span>
      </div>`

    // NIVEL
    const levelBlock = document.createElement('div')
    levelBlock.id = 'hud-level-block'
    levelBlock.setAttribute('role','status'); levelBlock.setAttribute('aria-live','polite')
    levelBlock.setAttribute('aria-atomic','true'); levelBlock.setAttribute('aria-label','Nivel de exploración: 1 de 2')
    levelBlock.style.cssText = 'padding:12px 18px 14px;display:flex;flex-direction:column;gap:5px;'
    levelBlock.innerHTML = `
      <span id="hud-lbl-nivel" style="font-size:10px;letter-spacing:3px;color:var(--hud-mid);font-family:var(--hud-body);">EXPLORACIÓN</span>
      <div style="display:flex;align-items:baseline;gap:7px;">
        <span id="hud-level-num" style="font-size:32px;font-weight:600;color:var(--hud-light);line-height:1;">1</span>
        <span id="hud-level-den" style="font-size:16px;color:var(--hud-mid);">/ 2</span>
      </div>
      <div style="position:relative;margin-top:3px;">
        <div style="height:6px;background:var(--hud-border);border-radius:3px;overflow:hidden;">
          <div id="hud-level-bar" role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="2"
            aria-label="Progreso: nivel 1 de 2"
            style="height:100%;width:50%;background:var(--hud-accent);border-radius:3px;transition:width .55s cubic-bezier(.4,0,.2,1);"></div>
        </div>
        <span id="hud-level-pct" style="position:absolute;right:0;top:8px;font-size:9px;font-family:var(--hud-body);color:var(--hud-mid);">50%</span>
      </div>`

    // PUNTOS
    const pointsBlock = document.createElement('div')
    pointsBlock.id = 'hud-points-block'
    pointsBlock.setAttribute('role','status'); pointsBlock.setAttribute('aria-live','polite')
    pointsBlock.setAttribute('aria-label','Puntos totales: 0')
    pointsBlock.style.cssText = 'padding:12px 18px 14px;display:flex;flex-direction:column;gap:5px;'
    pointsBlock.innerHTML = `
      <span id="hud-lbl-puntos" style="font-size:10px;letter-spacing:3px;color:var(--hud-mid);font-family:var(--hud-body);">PUNTOS</span>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="hud-points-val" style="font-size:32px;font-weight:600;color:var(--hud-light);line-height:1;">00</span>
        <span aria-hidden="true" style="font-size:22px;line-height:1;">🪙</span>
      </div>`

    panel.appendChild(timerBlock); panel.appendChild(sep())
    panel.appendChild(levelBlock); panel.appendChild(sep())
    panel.appendChild(pointsBlock)
    document.body.appendChild(panel)

    // BARRA DE VIDA
    const hpBar = document.createElement('div')
    hpBar.id = 'hud-hp'
    hpBar.setAttribute('role','region'); hpBar.setAttribute('aria-label','Vida del personaje')
    Object.assign(hpBar.style, {
      position:'fixed', top:'114px', left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:'8px',
      background:'var(--hud-surface)', border:'1px solid var(--hud-mid)',
      borderTop:'3px solid var(--hud-accent)', borderRadius:'var(--hud-radius)',
      padding:'8px 18px', zIndex:'9999', pointerEvents:'none', fontFamily:'var(--hud-font)'
    })
    hpBar.innerHTML = `
      <span id="hud-lbl-vida" style="font-size:10px;letter-spacing:3px;color:var(--hud-mid);font-family:var(--hud-body);margin-right:4px;">VIDA</span>
      <div id="hud-hearts" role="meter" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"
        aria-label="Vida: 100 de 100" style="display:flex;gap:5px;align-items:center;"></div>
      <span id="hud-hp-pct" style="font-size:14px;font-family:var(--hud-body);color:var(--hud-mid);margin-left:6px;">100%</span>`
    document.body.appendChild(hpBar)
    this._renderHearts(100)

    // SUBTÍTULOS
    const subBar = document.createElement('div')
    subBar.id = 'hud-subtitles-bar'
    subBar.setAttribute('role','log'); subBar.setAttribute('aria-live','assertive')
    subBar.setAttribute('aria-label','Subtítulos del juego')
    document.body.appendChild(subBar)

    // HINTS
    const kbHints = document.createElement('div')
    kbHints.id = 'hud-kb-hints'; kbHints.setAttribute('aria-hidden','true')
    kbHints.innerHTML = 'W / ↑ — Adelante &nbsp; S / ↓ — Atrás<br>A / ← — Izquierda &nbsp; D / → — Derecha<br>Espacio — Saltar &nbsp;&nbsp; Tab — Menú'
    document.body.appendChild(kbHints)

    this.panel       = panel;      this.hpBar       = hpBar
    this.timer       = document.getElementById('hud-timer-val')
    this.status      = document.getElementById('hud-points-val')
    this.levelNum    = document.getElementById('hud-level-num')
    this.levelDen    = document.getElementById('hud-level-den')
    this.levelBar    = document.getElementById('hud-level-bar')
    this.levelPct    = document.getElementById('hud-level-pct')
    this.levelBlock  = levelBlock
    this.pointsBlock = pointsBlock
  }

  /* ══════════════════════════════════════════════════════════════
     CORAZONES
  ══════════════════════════════════════════════════════════════ */
  _renderHearts(hp) {
    const c = document.getElementById('hud-hearts'); if (!c) return
    const total = 5, filled = Math.round((hp/100)*total), isLow = hp<=30
    c.innerHTML = ''
    for (let i=0;i<total;i++) {
      const h = document.createElement('span')
      h.setAttribute('aria-hidden','true')
      h.style.cssText = 'font-size:22px;line-height:1;transition:color .3s;'
      if (i<filled) { h.textContent='♥'; h.style.color='var(--hud-light)'; if(isLow) h.className='hud-heart-low' }
      else          { h.textContent='♡'; h.style.color='var(--hud-border)' }
      c.appendChild(h)
    }
    c.setAttribute('aria-valuenow', hp)
    c.setAttribute('aria-label',`Vida: ${hp} de 100`)
    const pct = document.getElementById('hud-hp-pct'); if(pct) pct.textContent=`${hp}%`
  }

  /* ══════════════════════════════════════════════════════════════
     MENÚ DE ACCESIBILIDAD
  ══════════════════════════════════════════════════════════════ */
  _buildA11yMenu() {
    this.toggleButton = document.createElement('button')
    this.toggleButton.id = 'hud-menu-toggle'
    this.toggleButton.setAttribute('aria-label','Abrir menú de accesibilidad')
    this.toggleButton.setAttribute('aria-expanded','false')
    this.toggleButton.setAttribute('aria-controls','hud-a11y-panel')
    this.toggleButton.style.cssText = `
      position:fixed;top:110px;left:16px;width:54px;height:54px;border-radius:50%;
      background:var(--hud-surface);color:var(--hud-light);font-size:24px;
      border:1px solid var(--hud-mid);cursor:pointer;display:flex;
      align-items:center;justify-content:center;z-index:10000;
      font-family:var(--hud-font);transition:background .2s,border-color .2s;`
    this.toggleButton.textContent = '☰'
    this.toggleButton.style.display = 'none'
    this.container.appendChild(this.toggleButton)
    this.toggleButton.addEventListener('click', () => this._toggleA11yMenu())
    this.toggleButton.addEventListener('keydown', e => {
      if (e.key === 'Escape') this._closeA11yMenu()
      // Bloquar Space: el botón solo se activa con Enter
      if (e.code === 'Space') { e.preventDefault(); e.stopPropagation() }
    })

    const panel = document.createElement('div')
    panel.id = 'hud-a11y-panel'
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','false')
    panel.setAttribute('aria-label','Opciones de accesibilidad')
    panel.style.cssText = `
      position:fixed;top:174px;left:16px;width:230px;
      background:var(--hud-surface);border:1px solid var(--hud-mid);
      border-top:3px solid var(--hud-accent);border-radius:var(--hud-radius);
      z-index:10000;font-family:var(--hud-body);color:var(--hud-light);
      padding:0 0 14px;display:none;opacity:0;`
    document.body.appendChild(panel)
    this.a11yPanel = panel

    // Sección 1: Audio
    this._buildSection(panel, '1 · AUDIO', [
      this._makeToggleRow('Subtítulos / voz asistida','hud-sw-subtitles',this._a11y.subtitlesOn, val => {
        this._a11y.subtitlesOn = val
        if (!val) this._hideSubtitle()
        else this._showSubtitleDirect('Voz asistida activada', 2500)
      }),
      this._makeSliderRow('Música','hud-vol-music',this._a11y.musicVol, val => {
        this._a11y.musicVol = val
        this._setAmbientVolume(val / 100)
      }),
      this._makeSliderRow('Efectos','hud-vol-sfx',this._a11y.sfxVol, val => {
        this._a11y.sfxVol = val
        try { Howler.volume(val / 100) } catch(_) {}
      })
    ])

    // Sección 2: Visual
    this._buildSection(panel, '2 · VISUAL', [
      this._makeTextSizeRow(),
      this._makeToggleRow('Alto contraste','hud-sw-contrast',this._a11y.highContrast, val => {
        this._a11y.highContrast = val
        document.body.classList.toggle('hud-high-contrast', val)
      })
    ])

    // Sección 3: Controles
    this._buildSection(panel, '3 · CONTROLES', [
      this._makeKeyboardRow()
    ])

    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this._closeA11yMenu()
        this.toggleButton.focus()
        return
      }
      // ✅ Solo Enter activa los controles del menú.
      // Bloqueamos Space para que no active checkboxes/botones
      // mientras el jugador intenta saltar con la barra espaciadora.
      if (e.code === 'Space') {
        e.preventDefault()
        e.stopPropagation()
      }
    })
  }

  _buildSection(parent, title, rows) {
    const lbl = document.createElement('p')
    lbl.textContent = title
    lbl.style.cssText = 'margin:14px 14px 7px;font-size:10px;letter-spacing:2.5px;color:var(--hud-mid);font-family:var(--hud-font);'
    parent.appendChild(lbl)
    rows.forEach(r => parent.appendChild(r))
    const hr = document.createElement('div'); hr.style.cssText='height:1px;background:var(--hud-border);margin:10px 14px 0;'
    parent.appendChild(hr)
  }

  _makeToggleRow(label, id, initial, onChange) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 14px;'
    const lbl = document.createElement('label'); lbl.htmlFor=id+'-cb'; lbl.textContent=label
    lbl.style.cssText = 'font-size:14px;color:var(--hud-light);cursor:pointer;flex:1;line-height:1.4;'
    const sw=document.createElement('label'); sw.className='hud-switch'
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id=id+'-cb'; cb.checked=initial; cb.setAttribute('aria-label',label)
    const track=document.createElement('span'); track.className='hud-switch-track'
    const thumb=document.createElement('span'); thumb.className='hud-switch-thumb'
    cb.addEventListener('change', ()=>onChange(cb.checked))
    sw.appendChild(cb); sw.appendChild(track); sw.appendChild(thumb)
    row.appendChild(lbl); row.appendChild(sw)
    return row
  }

  _makeSliderRow(label, id, initial, onChange) {
    const wrap = document.createElement('div'); wrap.style.cssText='padding:5px 14px 8px;'
    const header = document.createElement('div'); header.style.cssText='display:flex;justify-content:space-between;margin-bottom:7px;'
    const lbl = document.createElement('label'); lbl.htmlFor=id; lbl.textContent=label
    lbl.style.cssText = 'font-size:14px;color:var(--hud-accent);'
    const val = document.createElement('span'); val.style.cssText='font-size:13px;color:var(--hud-mid);'; val.textContent=`${initial}%`
    const slider = document.createElement('input')
    slider.type='range'; slider.id=id; slider.min=0; slider.max=100; slider.step=5; slider.value=initial
    slider.className='hud-slider'; slider.setAttribute('aria-label',`${label}: ${initial} por ciento`)
    slider.addEventListener('input', ()=>{
      val.textContent=`${slider.value}%`
      slider.setAttribute('aria-label',`${label}: ${slider.value} por ciento`)
      onChange(Number(slider.value))
    })
    header.appendChild(lbl); header.appendChild(val)
    wrap.appendChild(header); wrap.appendChild(slider)
    return wrap
  }

  _makeTextSizeRow() {
    const wrap = document.createElement('div'); wrap.style.cssText='padding:7px 14px;display:flex;align-items:center;justify-content:space-between;'
    const lbl = document.createElement('span'); lbl.textContent='Tamaño de texto'; lbl.style.cssText='font-size:14px;color:var(--hud-light);'
    const btns = document.createElement('div'); btns.setAttribute('role','group'); btns.setAttribute('aria-label','Tamaño de texto del HUD'); btns.style.cssText='display:flex;gap:5px;'
    const sizes=[{label:'A',scale:1,fs:'12px',aria:'Texto normal'},{label:'A',scale:1.2,fs:'15px',aria:'Texto grande'},{label:'A',scale:1.45,fs:'18px',aria:'Texto muy grande'}]
    sizes.forEach(s=>{
      const b=document.createElement('button'); b.className='hud-a11y-btn'; b.textContent=s.label
      b.setAttribute('aria-label',s.aria); b.setAttribute('aria-pressed',String(Math.abs(this._a11y.fontSize-s.scale)<0.01))
      b.style.cssText=`font-size:${s.fs};font-family:var(--hud-font);width:32px;height:32px;
        background:${Math.abs(this._a11y.fontSize-s.scale)<0.01?'var(--hud-mid)':'var(--hud-border)'};
        color:var(--hud-light);border:1px solid var(--hud-mid);border-radius:4px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;transition:background .2s;`
      b.addEventListener('click',()=>{
        this._a11y.fontSize=s.scale; this._applyFontScale(s.scale)
        btns.querySelectorAll('button').forEach(btn=>{btn.setAttribute('aria-pressed','false');btn.style.background='var(--hud-border)'})
        b.setAttribute('aria-pressed','true'); b.style.background='var(--hud-mid)'
      })
      btns.appendChild(b)
    })
    wrap.appendChild(lbl); wrap.appendChild(btns)
    return wrap
  }

  _makeKeyboardRow() {
    const wrap = document.createElement('div'); wrap.style.cssText='padding:7px 14px;'
    wrap.appendChild(this._makeToggleRow('Mostrar controles en pantalla','hud-sw-kb',this._a11y.keyboardHints, val=>{
      this._a11y.keyboardHints=val
      const hints=document.getElementById('hud-kb-hints'); if(hints) hints.style.display=val?'block':'none'
    }))
    const note=document.createElement('p'); note.style.cssText='font-size:12px;color:var(--hud-mid);margin:4px 0 0;line-height:1.6;'
    note.textContent='WASD / flechas · Espacio · Tab · Esc'
    wrap.appendChild(note)
    return wrap
  }

  /* ══════════════════════════════════════════════════════════════
     ESCALA DE FUENTE — aplica a TODOS los elementos del HUD
  ══════════════════════════════════════════════════════════════ */
  _applyFontScale(scale) {
    const set = (id, px) => { const el=document.getElementById(id); if(el) el.style.fontSize=Math.round(px*scale)+'px' }
    // Valores base → escalan
    set('hud-timer-val',  32); set('hud-level-num', 32); set('hud-points-val', 32)
    set('hud-level-den',  16); set('hud-hp-pct',    14); set('hud-level-pct',  9)
    // Labels de sección (letra chica)
    ;['hud-lbl-tiempo','hud-lbl-nivel','hud-lbl-puntos','hud-lbl-vida'].forEach(id=>set(id,10))
    // Corazones
    document.querySelectorAll('#hud-hearts span').forEach(h=>{ h.style.fontSize=Math.round(22*scale)+'px' })
  }

  /* ══════════════════════════════════════════════════════════════
     VOZ ASISTIDA EN MOVIMIENTO
  ══════════════════════════════════════════════════════════════ */
  _initVoiceAssist() {
    const voiceMap = {
      w:'Adelante', W:'Adelante', ArrowUp:'Adelante',
      s:'Atrás',    S:'Atrás',    ArrowDown:'Atrás',
      a:'Izquierda',A:'Izquierda',ArrowLeft:'Izquierda',
      d:'Derecha',  D:'Derecha',  ArrowRight:'Derecha',
      ' ':'Salto'
    }
    window.addEventListener('keydown', e => {
      if (!this._a11y.subtitlesOn || e.repeat) return
      const word = voiceMap[e.key]; if (!word) return
      this._showSubtitleDirect(word, 700)
      if (this._speechSynth) {
        this._speechSynth.cancel()
        const u = new SpeechSynthesisUtterance(word)
        u.lang='es-ES'; u.rate=1.15; u.volume=1
        this._speechSynth.speak(u)
      }
    })
  }

  /* ══════════════════════════════════════════════════════════════
     VOLUMEN MÚSICA (AmbientSound — Web Audio API)
  ══════════════════════════════════════════════════════════════ */
  _setAmbientVolume(value) {
    const amb = this._world?.ambientSound; if (!amb) return
    // Si AmbientSound no tiene gainNode, lo creamos y reconectamos
    if (amb.context && amb.source) {
      if (!amb._gainNode) {
        amb._gainNode = amb.context.createGain()
        try { amb.source.disconnect(); amb.source.connect(amb._gainNode); amb._gainNode.connect(amb.context.destination) } catch(_) {}
      }
      amb._gainNode.gain.setTargetAtTime(value, amb.context.currentTime, 0.05)
    }
  }

  /* ══════════════════════════════════════════════════════════════
     TOGGLE MENÚ
  ══════════════════════════════════════════════════════════════ */
  _toggleA11yMenu() { this.isOpen ? this._closeA11yMenu() : this._openA11yMenu() }

  _openA11yMenu() {
    this.isOpen=true
    this.toggleButton.setAttribute('aria-expanded','true')
    this.toggleButton.setAttribute('aria-label','Cerrar menú de accesibilidad')
    this.a11yPanel.style.display='block'
    gsap.to(this.a11yPanel,{opacity:1,y:0,duration:.25,ease:'power2.out'})
    const first=this.a11yPanel.querySelector('input,button,[tabindex]'); if(first) first.focus()
  }

  _closeA11yMenu() {
    this.isOpen=false
    this.toggleButton.setAttribute('aria-expanded','false')
    this.toggleButton.setAttribute('aria-label','Abrir menú de accesibilidad')
    gsap.to(this.a11yPanel,{opacity:0,y:-6,duration:.18,ease:'power2.in',onComplete:()=>{ this.a11yPanel.style.display='none' }})
  }

  toggleMenu() { this._toggleA11yMenu() }

  /* ══════════════════════════════════════════════════════════════
     SUBTÍTULOS INTERNOS
  ══════════════════════════════════════════════════════════════ */
  _showSubtitleDirect(text, durationMs=3500) {
    const bar=document.getElementById('hud-subtitles-bar'); if(!bar) return
    bar.textContent=text; bar.classList.add('visible')
    clearTimeout(this._subTimer)
    this._subTimer=setTimeout(()=>{ bar.classList.remove('visible'); bar.textContent='' }, durationMs)
  }

  _hideSubtitle() {
    const bar=document.getElementById('hud-subtitles-bar')
    if(bar){ bar.classList.remove('visible'); bar.textContent='' }
    clearTimeout(this._subTimer)
    if(this._speechSynth) this._speechSynth.cancel()
  }

  /* ══════════════════════════════════════════════════════════════
     SETTERS PÚBLICOS
  ══════════════════════════════════════════════════════════════ */
  setTimer(seconds) {
    if (!this.timer) return
    const m=String(Math.floor(seconds/60)).padStart(2,'0'), s=String(seconds%60).padStart(2,'0')
    this.timer.textContent=`${m}:${s}`
  }

  setStatus(text) {
    const match=String(text).match(/\d+/), num=match?String(parseInt(match[0])).padStart(2,'0'):'00'
    if(this.status)      this.status.textContent=num
    if(this.pointsBlock) this.pointsBlock.setAttribute('aria-label',`Puntos totales: ${num}`)
  }

  setLevel(current, total) {
    if(this.levelNum) this.levelNum.textContent=current
    if(this.levelDen) this.levelDen.textContent=`/ ${total}`
    const pct=Math.round((current/total)*100)
    if(this.levelBar){ this.levelBar.style.width=`${pct}%`; this.levelBar.setAttribute('aria-valuenow',current); this.levelBar.setAttribute('aria-valuemax',total); this.levelBar.setAttribute('aria-label',`Progreso: nivel ${current} de ${total}`) }
    if(this.levelPct)   this.levelPct.textContent=`${pct}%`
    if(this.levelBlock) this.levelBlock.setAttribute('aria-label',`Nivel de exploración: ${current} de ${total}`)
  }

  setHealth(hp) { this._renderHearts(Math.max(0,Math.min(100,hp))) }

  showSubtitle(text, durationMs=4000) {
    if(!text){ this._hideSubtitle(); return }
    if(!this._a11y.subtitlesOn) return
    this._showSubtitleDirect(text, durationMs)
  }

  setPlayerCount(_count) {}

  /* ══════════════════════════════════════════════════════════════
     DESTRUCTOR
  ══════════════════════════════════════════════════════════════ */
  destroy() {
    this.toggleButton?.remove(); this.a11yPanel?.remove()
    this.panel?.remove();        this.hpBar?.remove()
    document.getElementById('hud-subtitles-bar')?.remove()
    document.getElementById('hud-kb-hints')?.remove()
    document.getElementById('hud-global-styles')?.remove()
    document.querySelector('.hud-skip')?.remove()
    if(this._speechSynth) this._speechSynth.cancel()
  }
}