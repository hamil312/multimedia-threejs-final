import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

export default class Enemy {
    constructor({ experience, playerRef, position }) {
        this.experience = experience
        this.scene = experience.scene
        this.physics = experience.physics
        this.resources = experience.resources
        this.time = experience.time


        this.playerRef = playerRef

        // CONFIGURACIÓN
        this.speed = 0.75
        this.attackDistance = 1.2   
        this.attackCooldown = 2000  
        this.lastAttackTime = 0

        this.setModel(position)
        this.setPhysics()
        this.setAnimation()
    }

    setModel(position) {
        const resource = this.resources.items.enemyModel

        this.model = SkeletonUtils.clone(resource.scene)
        this.model.scale.set(0.8, 0.8, 0.8)

        // 👇 ajuste de altura (clave)
        this.model.position.set(0, 0, 0)

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.group.position.copy(position)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
            }
        })
    }

    setPhysics() {
        const shape = new CANNON.Sphere(0.5)

        this.body = new CANNON.Body({
            mass: 5,
            shape,
            position: new CANNON.Vec3(
                this.group.position.x,
                this.group.position.y,
                this.group.position.z
            ),
            fixedRotation: true,
            linearDamping: 0.5,
            material: this.physics.obstacleMaterial
        })

        this.body.allowSleep = false
        this._spawnY = this.group.position.y
        this.physics.world.addBody(this.body)
    }

    setAnimation() {
        const resource = this.resources.items.enemyModel

        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        // MOSTRAR NOMBRES DE TODAS LAS ANIMACIONES (para debug)
        console.log('Animaciones disponibles en Skeleton.glb:')
        resource.animations.forEach((clip, index) => {
            console.log(`[${index}] ${clip.name}`)
            this.animation.actions[clip.name] = this.animation.mixer.clipAction(clip)
        })

        this.animation.idleAction = Object.values(this.animation.actions)[3]
        this.animation.walkAction = Object.values(this.animation.actions)[12]
        this.animation.attackAction = Object.values(this.animation.actions)[11]

        const start = this.animation.idleAction || this.animation.walkAction
        if (start) {
            this.animation.actions.current = start
            start.play()
        }
    }

    playAnimation(action) {
        if (!action || action === this.animation.actions.current) return

        action.reset().play()
        if (this.animation.actions.current) {
            action.crossFadeFrom(this.animation.actions.current, 0.3)
        }
        this.animation.actions.current = action
    }

    followPlayer(delta) {
        if (!this.playerRef?.body) return

        const enemyPos = this.body.position
        const playerPos = this.playerRef.body.position

        const dx = playerPos.x - enemyPos.x
        const dz = playerPos.z - enemyPos.z
        const dy = playerPos.y - enemyPos.y
        const distance = Math.sqrt(dx * dx + dz * dz + dy * dy)

        if (!isFinite(dx) || !isFinite(dz)) return

        if (distance > this.attackDistance) {
            this.attacking = false

            const nx = dx / distance
            const nz = dz / distance

            this.body.velocity.x = nx * this.speed * 10
            this.body.velocity.z = nz * this.speed * 10
            this.body.velocity.y = this.body.velocity.y * 0.1

            const angle = Math.atan2(nx, nz)
            this.group.rotation.y = angle

            this.playAnimation(this.animation.walkAction || this.animation.idleAction)
        } else {
            this.body.velocity.x *= 0.5
            this.body.velocity.z *= 0.5
            this.attack()
        }
    }

    attack() {
        const now = Date.now()

        if (now - this.lastAttackTime < this.attackCooldown) return
        this.lastAttackTime = now

        this.playAnimation(this.animation.attackAction || this.animation.idleAction)

        // HACER DAÑO
        if (this.playerRef?.takeDamage) {
            this.playerRef.takeDamage(20)
        }
    }

    update() {
        const delta = this.time.delta * 0.001

        if (this.animation?.mixer) {
            this.animation.mixer.update(delta)
        }

        if (this.delayActivation > 0) {
            this.delayActivation -= delta
            return
        }

        this.followPlayer(delta)

        this.group.position.copy(this.body.position)
    }

    destroy() {
        if (this.group) {
            this.scene.remove(this.group)
        }

        if (this.body && this.physics.world.bodies.includes(this.body)) {
            this.physics.world.removeBody(this.body)
        }
    }


}