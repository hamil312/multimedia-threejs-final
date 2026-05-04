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

        this.verticalVelocity = 0
        this.grounded = true
        this.gravity = -20
        this.groundY = 0.5

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()
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
        this.animation.actions.dance = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[0])
        this.animation.actions.death = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[1])
        this.animation.actions.idle = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[2])
        this.animation.actions.jump = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[3])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resources.items.robotModel.animations[10])

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
        if (this.animation.actions.current === this.animation.actions.death) return
        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)

        const keys = this.keyboard.getState()
        const turnSpeed = 2.5
        let isMoving = false
        const maxSpeed = 10

        // 1. Rotación primero
        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
    
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)

        // 3. Detectar si está en el suelo por velocidad vertical cercana a 0
        //    (Cannon resuelve esto solo con el cuerpo dinámico)
        const isGrounded = Math.abs(this.body.velocity.y) < 0.5

        // 4. Salto — Cannon aplica la gravedad, solo lanzamos impulso
        if (keys.space && isGrounded) {
            this.body.velocity.y = 10  // velocidad vertical directa
            this.animation.play('jump')
        }

        // 5. Movimiento horizontal — sobreescribimos X y Z, Cannon conserva Y
        if (keys.up) {
            this.body.velocity.x = forward.x * maxSpeed
            this.body.velocity.z = forward.z * maxSpeed
            isMoving = true
        } else if (keys.down) {
            this.body.velocity.x = -forward.x * maxSpeed
            this.body.velocity.z = -forward.z * maxSpeed
            isMoving = true
        } else {
            // Frenar horizontalmente sin tocar Y (la gravedad sigue actuando)
            this.body.velocity.x *= 0.85
            this.body.velocity.z *= 0.85
        }

        // 6. Reubicación emergencia
        if (this.body.position.y < -10 || this.body.position.y > 18) {
            this.body.position.set(0, 1.2, 0)
            this.body.velocity.set(0, 0, 0)
        }

        // 7. Animaciones
        if (isMoving && this.animation.actions.current !== this.animation.actions.walking) {
            this.animation.play('walking')
        } else if (!isMoving
            && this.animation.actions.current !== this.animation.actions.idle
            && this.animation.actions.current !== this.animation.actions.jump) {
            this.animation.play('idle')
        }

        // 8. Sincronizar visual con física (Cannon mueve el body, tú lees la posición)
        this.group.position.copy(this.body.position)

    }

    // Método para mover el robot desde el exterior VR
    moveInDirection(dir, speed) {
        if (!window.userInteracted || !this.experience.renderer.instance.xr.isPresenting) {
            return
        }

        // Si hay controles móviles activos
        const mobile = window.experience?.mobileControls
        if (mobile?.intensity > 0) {
            const dir2D = mobile.directionVector
            const dir3D = new THREE.Vector3(dir2D.x, 0, dir2D.y).normalize()

            const adjustedSpeed = 250 * mobile.intensity // velocidad más fluida
            const force = new CANNON.Vec3(dir3D.x * adjustedSpeed, 0, dir3D.z * adjustedSpeed)

            this.body.applyForce(force, this.body.position)

            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }

            // Rotar suavemente en dirección de avance
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

            // 💥 Eliminar cuerpo del mundo para evitar errores
            if (this.physics.world.bodies.includes(this.body)) {
                this.physics.world.removeBody(this.body)
            }
            this.body = null  // prevenir referencias rotas

            // Ajustes visuales (opcional)
            this.group.position.y -= 0.5
            this.group.rotation.x = -Math.PI / 2

            console.log(' Robot ha muerto')
        }
    }



}
