import * as THREE from 'three'
import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import VRIntegration from '../integrations/VRIntegration.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import ModalManager from './Utils/ModalManager.js'
import World from './World/World.js'
import Resources from './Utils/Resources.js'
import sources from './sources.js'
import Sounds from './World/Sound.js'
import Raycaster from './Utils/Raycaster.js'
import KeyboardControls from './Utils/KeyboardControls.js'
import GameTracker from './Utils/GameTracker.js'
import Physics from './Utils/Physics.js'
import cannonDebugger from 'cannon-es-debugger'
import CircularMenu from '../controls/CircularMenu.js'
import { Howler } from 'howler'
import SocketManager from '../network/SocketManager.js'

let instance = null

export default class Experience {
  constructor(_canvas) {
    if (instance) return instance
    instance = this

    window.experience = this
    this.canvas = _canvas
    window.userInteracted = false

    // Core setup
    this.debug    = new Debug()
    this.sizes    = new Sizes()
    this.time     = new Time()
    this.scene    = new THREE.Scene()
    this.physics  = new Physics()
    this.debugger = cannonDebugger(this.scene, this.physics.world, { color: 0x00ff00 })
    this.keyboard = new KeyboardControls()

    this.scene.background = new THREE.Color('#87ceeb')

    this.resources = new Resources(sources)

    this.resources.on('ready', () => {
      this.modal.show({
        icon: '🚀',
        message: 'Recoge todas las monedas\n¡y evita los obstáculos!',
        buttons: [
          {
            text: '▶️ Iniciar juego',
            onClick: () => this.startGame()
          }
        ]
      })

      const overlay = document.querySelector('.loader-overlay')
      if (overlay) {
        overlay.classList.add('fade-out')
        setTimeout(() => overlay.remove(), 1000)
      }
    })

    this.camera   = new Camera(this)
    this.renderer = new Renderer(this)

    this.vrDolly = new THREE.Group()
    this.vrDolly.name = 'VR_DOLLY'
    this.vrDolly.add(this.camera.instance)
    this.scene.add(this.vrDolly)

    this.raycaster = new Raycaster(this)

    this.modal = new ModalManager({ container: document.body })
    this.vr = new VRIntegration({
      renderer:     this.renderer.instance,
      scene:        this.scene,
      camera:       this.camera.instance,
      vrDolly:      this.vrDolly,
      modalManager: this.modal,
      experience:   this
    })

    this.menu = new CircularMenu({
      container:     document.body,
      vrIntegration: this.vr,
      onAudioToggle: () => this.world.toggleAudio(),
      onWalkMode: () => {
        this.resumeAudioContext()
        this.toggleWalkMode()
      },
      onFullscreen: () => {
        if (!document.fullscreenElement) {
          document.body.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      },
      onCancelGame: () => this.tracker.handleCancelGame()
    })

    this._startObstacleWaves()

    if (this.tracker) this.tracker.destroy()
    this.tracker = new GameTracker({ modal: this.modal, menu: this.menu })

    // Mundo
    this.world = new World(this)

    // ✅ Conectar menu con world para que los sliders de audio funcionen
    this.menu._world = this.world

    this.isThirdPerson = false
    this.startLoop()
    this.sizes.on('resize', () => this.resize())

    this.sounds = new Sounds({ time: this.time, debug: this.debug })

    window.addEventListener('click',      this.handleFirstInteraction, { once: true })
    window.addEventListener('touchstart', this.handleFirstInteraction, { once: true })
  }

  handleFirstInteraction() {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
        .then(() => console.log('🔊 AudioContext reanudado por interacción del usuario.'))
        .catch(err => console.warn('⚠️ Error reanudando AudioContext:', err))
    }
    window.userInteracted = true
  }

  resumeAudioContext() {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
        .then(() => console.log('🔊 AudioContext reanudado manualmente'))
        .catch(err => console.warn('⚠️ Error reanudando AudioContext:', err))
    }
  }

  toggleWalkMode() {
    this.isThirdPerson = !this.isThirdPerson
    const controls = this.camera.controls
    const cam      = this.camera.instance

    if (this.isThirdPerson) {
      controls.enabled = false
      console.log('🟡 Tercera persona ON')
    } else {
      controls.enabled      = true
      controls.enableRotate = true
      controls.enableZoom   = true
      controls.enablePan    = false
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI * 0.9
      cam.position.set(12, 5, 10)
      cam.up.set(0, 1, 0)
      controls.target.set(0, 0, 0)
      cam.lookAt(controls.target)
      controls.update()
      console.log('🟢 Vista global restaurada')
    }
  }

  startLoop() {
    this.vr.setUpdateCallback((delta) => this.update(delta))
    this.time.on('tick', () => {
      if (!this.renderer.instance.xr.isPresenting) {
        const delta = this.time.delta * 0.001
        this.update(delta)
      }
    })
  }

  resize() {
    this.camera.resize()
    this.renderer.resize()
  }

  update(delta) {
    if (!this.isThirdPerson && !this.renderer.instance.xr.isPresenting) {
      this.camera.update()
    }
    if (this.renderer.instance.xr.isPresenting) {
      this.adjustCameraForVR()
    }
    this.world.update(delta)
    this.renderer.update()
    this.physics.update(delta)
    this.socketManager?.update()
  }

  adjustCameraForVR() {
    if (this.renderer.instance.xr.isPresenting && this.world.robot?.group) {
      const pos = this.world.robot.group.position
      this.camera.instance.position.copy(pos).add(new THREE.Vector3(0, 1.6, 0))
      this.camera.instance.lookAt(pos.clone().add(new THREE.Vector3(0, 1.6, -1)))
    }
  }

  _startObstacleWaves() {
    this.obstacleWaveCount = 10
    this.maxObstacles      = 50
    this.currentObstacles  = []
    const delay = 30000

    const spawnWave = () => {
      if (this.obstacleWavesDisabled) return

      for (let i = 0; i < this.obstacleWaveCount; i++) {
        const obstacle = this.raycaster.generateRandomObstacle?.()
        if (obstacle) this.currentObstacles.push(obstacle)
      }

      while (this.currentObstacles.length > this.maxObstacles) {
        const oldest = this.currentObstacles.shift()
        if (oldest) this.raycaster._removeObstacle(oldest)
      }

      this.obstacleWaveTimeout = setTimeout(spawnWave, delay)
    }

    this.obstacleWaveTimeout = setTimeout(spawnWave, 30000)
  }

  destroy() {
    this.sizes.off('resize')
    this.time.off('tick')

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose?.())
        } else {
          child.material.dispose?.()
        }
      }
    })

    this.camera.controls.dispose()
    this.renderer.instance.dispose()
    if (this.debug.active) this.debug.ui.destroy()
  }

  startGame() {
    console.log('🎮 Juego iniciado')
    this.isThirdPerson = true
    this.tracker.start()
    this._startObstacleWaves()

    if (this.menu?.toggleButton?.style) {
      this.menu.toggleButton.style.display = 'block'
    }

    if (this.world) {
      this.world.gameStarted = true
    }
    console.log('🎮 Iniciando partida...')
  }

  resetGame() {
    console.log('♻️ Reiniciando juego completo...')

    this.socketManager?.socket?.disconnect()
    if (this.menu)          this.menu.destroy()
    if (this.tracker)       this.tracker.destroy()
    if (this.socketManager) this.socketManager.destroy()

    this.destroy()

    instance = null
    const newExperience = new Experience(this.canvas)
    newExperience.isThirdPerson = true

    const cancelBtn = document.getElementById('cancel-button')
    if (cancelBtn) cancelBtn.remove()

    newExperience.tracker?.hideGameButtons?.()
  }

  /**
   * resetGameToFirstLevel — Reinicia al nivel 1 sin destruir la instancia.
   *
   * Errores que tenía la versión anterior y se corrigen aquí:
   * 1. No reseteaba accumulatedPoints → los puntos del intento anterior
   *    se sumaban al nuevo.
   * 2. No reseteaba gameStarted → el bucle de enemigos no arrancaba.
   * 3. No re-spawneaba enemigos → el juego quedaba sin perseguidores.
   * 4. No reseteaba robotHP ni actualizaba el HUD de vida.
   * 5. No reconectaba menu._world (necesario tras recrear world).
   * 6. El tracker no se reiniciaba correctamente (seguía contando el
   *    tiempo del intento anterior).
   */
  resetGameToFirstLevel() {
    console.log('♻️ Reiniciando al nivel 1...')

    // 1. Cerrar el modal
    this.modal.hide()

    // 2. ✅ Reanimar el robot — revierte TODOS los efectos de die()
    //    (body=null, rotation.x=-PI/2, animación death bloqueada)
    this.world.robot?.revive?.()

    // 3. Destruir todos los enemigos activos
    if (Array.isArray(this.world.enemies)) {
      this.world.enemies.forEach(e => e?.destroy?.())
      this.world.enemies = []
    }

    // 4. Resetear todos los contadores
    this.world.points              = 0
    this.world.accumulatedPoints   = 0
    this.world.loader.prizes       = []
    this.world.defeatTriggered     = false
    this.world.finalPrizeActivated = false
    this.world.gameStarted         = false
    this.world.levelManager.currentLevel = 1

    // 5. Restaurar vida al 100% y actualizar HUD
    this.world.robotHP = 100
    this.world._updateHealthHUD?.()

    // 6. Limpiar obstáculos de olas
    this.obstacleWavesDisabled = false
    clearTimeout(this.obstacleWaveTimeout)
    this.raycaster?.removeAllObstacles?.()

    // 7. Limpiar escena 3D y física
    this.world.clearCurrentScene()

    // 8. Cargar nivel 1 — async, actualiza HUD de puntos, nivel y posición del robot
    this.world.loadLevel(1)

    // 9. Respawnear enemigos con delay para esperar a loadLevel (async)
    setTimeout(() => {
      const enemiesCountEnv = parseInt(import.meta.env.VITE_ENEMIES_COUNT || '3', 10)
      const enemiesCount = Number.isFinite(enemiesCountEnv) && enemiesCountEnv > 0 ? enemiesCountEnv : 3
      this.world.spawnEnemies(enemiesCount)
      console.log(`👾 ${enemiesCount} enemigos respawneados`)
    }, 1800)

    // 10. Reiniciar tracker de tiempo
    this.tracker.destroy()
    this.tracker = new GameTracker({ modal: this.modal, menu: this.menu })
    this.tracker.start()

    // 11. Reconectar menu._world
    this.menu._world = this.world

    // 12. Reactivar juego y olas de obstáculos
    this.world.gameStarted = true
    this._startObstacleWaves()

    if (this.menu?.toggleButton?.style) {
      this.menu.toggleButton.style.display = 'block'
    }

    console.log('✅ Juego reiniciado en nivel 1.')
  }
}