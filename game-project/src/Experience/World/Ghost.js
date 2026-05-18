import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

export default class Ghost {
    constructor({ experience, playerRef, position }) {
        this.experience = experience
        this.scene = experience.scene
        this.physics = experience.physics
        this.resources = experience.resources
        this.time = experience.time

        this.playerRef = playerRef

        this.speed = 1.5
        this.attackDistance = 1.5
        this.attackCooldown = 2000
        this.lastAttackTime = 0
        this.verticalOffset = 0.3

        this.setModel(position)
        this.setAnimation()
    }

    setModel(position) {
        const resource = this.resources.items.ghostModel

        this.model = SkeletonUtils.clone(resource.scene)
        this.model.scale.set(0.6, 0.6, 0.6)

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.group.position.copy(position)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                if (child.material) {
                    child.material.transparent = true
                    child.material.opacity = 0.7
                }
            }
        })
    }

    setAnimation() {
        const resource = this.resources.items.ghostModel

        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        resource.animations.forEach((clip) => {
            this.animation.actions[clip.name] = this.animation.mixer.clipAction(clip)
        })

        const actions = Object.values(this.animation.actions)
        this.animation.idleAction = actions[2] || actions.find(a => a)
        this.animation.flyAction = actions.find(a =>
            a._clip?.name?.toLowerCase().includes('Fast_Flying')
        ) || this.animation.idleAction
        this.animation.attackAction = actions.find(a =>
            a._clip?.name?.toLowerCase().includes('Headbutt')
        ) || this.animation.idleAction

        const start = this.animation.flyAction || this.animation.idleAction
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

        const enemyPos = this.group.position
        const playerPos = this.playerRef.body.position

        const dx = playerPos.x - enemyPos.x
        const dz = playerPos.z - enemyPos.z
        const targetY = playerPos.y + this.verticalOffset
        const dy = targetY - enemyPos.y

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (!isFinite(dx) || !isFinite(dz)) return

        if (distance > this.attackDistance) {
            this.attacking = false

            const nx = dx / distance
            const ny = dy / distance
            const nz = dz / distance

            this.group.position.x += nx * this.speed * delta
            this.group.position.y += ny * this.speed * delta
            this.group.position.z += nz * this.speed * delta

            const angle = Math.atan2(nx, nz)
            this.group.rotation.y = angle

            this.playAnimation(this.animation.flyAction || this.animation.idleAction)
        } else {
            this.attack()
        }
    }

    separateFromOtherGhosts(delta) {
        const allGhosts = this.experience.world.enemies.filter(e => e instanceof Ghost && e !== this)
        const minDistance = 1.0

        for (const other of allGhosts) {
            if (!other.group) continue

            const dx = this.group.position.x - other.group.position.x
            const dy = this.group.position.y - other.group.position.y
            const dz = this.group.position.z - other.group.position.z
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

            if (dist < minDistance && dist > 0.01) {
                const push = (minDistance - dist) * 0.5
                const nx = dx / dist
                const ny = dy / dist
                const nz = dz / dist

                this.group.position.x += nx * push
                this.group.position.y += ny * push
                this.group.position.z += nz * push
            }
        }
    }

    attack() {
        const now = Date.now()
        if (now - this.lastAttackTime < this.attackCooldown) return
        this.lastAttackTime = now

        this.attacking = true
        this.playAnimation(this.animation.attackAction || this.animation.idleAction)

        if (this.playerRef?.takeDamage) {
            this.playerRef.takeDamage(20)
        }
    }

    update(delta) {
        const timeDelta = this.time.delta * 0.001

        if (this.animation?.mixer) {
            this.animation.mixer.update(timeDelta)
        }

        if (this.delayActivation > 0) {
            this.delayActivation -= timeDelta
            return
        }

        this.group.position.y += Math.sin(this.time.elapsed * 0.002) * 0.002

        this.followPlayer(timeDelta)
        this.separateFromOtherGhosts(timeDelta)
    }

    destroy() {
        if (this.group) {
            this.scene.remove(this.group)
        }
    }
}
