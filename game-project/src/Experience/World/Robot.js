import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Robot {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0
        this.maxHealth = 100
        this.health = this.maxHealth
        this.damagePerHit = 20

        this.verticalVelocity = 0
        this.grounded = true
        this.gravity = -20
        this.groundY = 0.0
        this.canJump = true

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()
        this.syncHealthHUD()
    }

    setModel() {
        this.model = this.resources.items.robotModel.scene
        this.model.scale.set(1, 1, 1)
        this.model.position.set(0, 0, 0) // Centrar respecto al cuerpo físico

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPhysics() {
        const radius = 0.35
        const height = 0.5

        this.body = new CANNON.Body({
            mass: 1,                 
            position: new CANNON.Vec3(-8, 0.5, 23),
            fixedRotation: true,
            linearDamping: 0.01, 
            angularDamping: 0.1,
            material: this.physics.robotMaterial
        })

        const cylinder = new CANNON.Cylinder(radius, radius, height, 8)
        const sphereTop = new CANNON.Sphere(radius)
        const sphereBottom = new CANNON.Sphere(radius)

        const q = new CANNON.Quaternion()
        q.setFromEuler(0, 0, Math.PI / 2)

        this.body.addShape(cylinder, new CANNON.Vec3(0, 0, 0), q)
        this.body.addShape(sphereTop, new CANNON.Vec3(0, height / 2, 0))
        this.body.addShape(sphereBottom, new CANNON.Vec3(0, -height / 2, 0))

        this.physics.world.addBody(this.body)

        // ✅ Sincronizar posición visual desde el inicio
        this.group.position.set(-8, 0.5, 23)
        this.body.allowSleep = false
    }

    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { loop: true, volume: 0.5 })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', { volume: 0.8 })
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        this.animation.actions = {}
        this.animation.actions.dance   = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[1])
        this.animation.actions.death   = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[0])
        this.animation.actions.idle    = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[3])
        this.animation.actions.jump    = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[5])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[16])
        this.animation.actions.run     = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[10])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        this.animation.actions.jump.setLoop(THREE.LoopOnce)
        this.animation.actions.jump.clampWhenFinished = true
        this.animation.actions.jump.onFinished = () => {
            this.animation.play('idle')
        }

        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 0.3)
            this.animation.actions.current = newAction

            if (name === 'walking') {
                this.walkSound.play()
            } else {
                this.walkSound.stop()
            }

            if (name === 'jump') {
                this.jumpSound.play()
            }
        }
    }

    update() {
        if (!this.body) return
        if (this.animation.actions.current === this.animation.actions.death) return

        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)

        const keys = this.keyboard.getState()
        const turnSpeed = 4.5
        let isMoving = false
        let isRunning = false
        let maxSpeed = 7

        const isGrounded = Math.abs(this.body.velocity.y) < 0.2

        if (keys.space && isGrounded && this.canJump) {
            this.body.velocity.y = 7.5
            this.animation.play('jump')
            this.canJump = false
        }
        if (isGrounded && !keys.space) {
            this.canJump = true
        }

        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
        }
        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
        }

        this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)

        if (keys.shift) {
            maxSpeed = 12
            isRunning = true
        } else {
            maxSpeed = 7
            isRunning = false
        }

        if (keys.up) {
            this.body.velocity.x = forward.x * maxSpeed
            this.body.velocity.z = forward.z * maxSpeed
            isMoving = true
        } else if (keys.down) {
            this.body.velocity.x = -forward.x * maxSpeed
            this.body.velocity.z = -forward.z * maxSpeed
            isMoving = true
        } else {
            this.body.velocity.x *= 0.85
            this.body.velocity.z *= 0.85
        }

        if (this.body.position.y < -10 || this.body.position.y > 40) {
            this.body.position.set(0, 30, 0)
            this.body.velocity.set(0, 0, 0)
        }

        if (this.animation.actions.current === this.animation.actions.jump && isGrounded && this.canJump) {
            this.animation.play('idle')
        } else if (isMoving && isRunning && this.animation.actions.current !== this.animation.actions.run) {
            this.animation.play('run')
        } else if (isMoving && !isRunning && this.animation.actions.current !== this.animation.actions.walking) {
            this.animation.play('walking')
        } else if (!isMoving && this.animation.actions.current !== this.animation.actions.idle && this.animation.actions.current !== this.animation.actions.jump) {
            this.animation.play('idle')
        }

        this.group.position.copy(this.body.position)
    }

    takeDamage(amount = this.damagePerHit) {
        if (!this.body || this.animation.actions.current === this.animation.actions.death) return

        this.health = Math.max(0, this.health - amount)
        this.syncHealthHUD()

        if (this.health === 0) {
            this.die()
        }
    }

    syncHealthHUD() {
        const hp = Math.max(0, Math.min(this.maxHealth, this.health))
        this.health = hp

        if (this.experience?.menu?.setHealth) {
            this.experience.menu.setHealth(hp)
        }

        if (this.experience?.world) {
            this.experience.world.robotHP = hp
        }
    }

    moveInDirection(dir, speed) {
        if (!window.userInteracted || !this.experience.renderer.instance.xr.isPresenting) return

        const mobile = window.experience?.mobileControls
        if (mobile?.intensity > 0) {
            const dir2D = mobile.directionVector
            const dir3D = new THREE.Vector3(dir2D.x, 0, dir2D.y).normalize()
            const adjustedSpeed = 250 * mobile.intensity
            const force = new CANNON.Vec3(dir3D.x * adjustedSpeed, 0, dir3D.z * adjustedSpeed)
            this.body.applyForce(force, this.body.position)

            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }

            const angle = Math.atan2(dir3D.x, dir3D.z)
            this.group.rotation.y = angle
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
    }

    die() {
        if (this.animation.actions.current !== this.animation.actions.death) {
            this.animation.actions.current.fadeOut(0.2)
            this.animation.actions.death.reset().fadeIn(0.2).play()
            this.animation.actions.current = this.animation.actions.death

            this.walkSound.stop()
            this.health = 0
            this.syncHealthHUD()

            if (this.body && this.physics.world.bodies.includes(this.body)) {
                this.physics.world.removeBody(this.body)
            }
            this.body = null

            this.group.position.y -= 0.5
            this.group.rotation.x = -Math.PI / 2

            console.log('Robot ha muerto')
            this.experience.world.handlePlayerDeath()
        }
    }

    /**
     * revive() — Revierte completamente los efectos de die().
     * Llamar desde Experience.resetGameToFirstLevel() antes de loadLevel().
     *
     * Restaura:
     *  - Postura visual del grupo (rotation.x y position.y)
     *  - Cuerpo físico (lo recrea y lo añade al mundo)
     *  - Animación a idle
     *  - Puntos a 0
     */
    revive(spawnPosition = { x: -17, y: 1.5, z: -67 }) {
        // 1. Restablecer postura visual
        this.group.rotation.set(0, 0, 0)
        this.group.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z)

        // 2. Recrear cuerpo físico si fue eliminado por die()
        if (!this.body) {
            const shape = new CANNON.Sphere(0.4)
            this.body = new CANNON.Body({
                mass: 2,
                shape,
                position: new CANNON.Vec3(spawnPosition.x, spawnPosition.y, spawnPosition.z),
                linearDamping: 0.05,
                angularDamping: 0.9
            })
            this.body.angularFactor.set(0, 1, 0)
            this.body.material = this.physics.robotMaterial
            this.physics.world.addBody(this.body)
        } else {
            // Si el body sigue vivo (no llegó a morir del todo), solo reposicionarlo
            this.body.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z)
        }

        this.body.velocity.set(0, 0, 0)
        this.body.angularVelocity.set(0, 0, 0)
        this.body.quaternion.setFromEuler(0, 0, 0)
        this.body.wakeUp()

        this.health = this.maxHealth
        this.syncHealthHUD()

        // 3. Volver a animación idle
        const death = this.animation.actions.death
        const idle  = this.animation.actions.idle
        if (death) { death.stop(); death.reset() }
        if (idle)  { idle.reset().play(); this.animation.actions.current = idle }

        // 4. Limpiar puntos
        this.points = 0

        console.log('✅ Robot revivido en', spawnPosition)
    }
}