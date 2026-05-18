import * as THREE from 'three'

export default class Fox {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug

        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder('fox')
        }

        this.resource = this.resources.items.foxModel

        this.setModel()
        this.setAnimation()

        this.targetOffset = new THREE.Vector3(0, 0, -2)
        this.teleportDistance = 10
        this.lerpSpeed = 5
    }

    setModel() {
        this.model = this.resource.scene
        this.model.scale.set(0.5, 0.5, 0.5)
        this.model.position.set(0, 0, 0)
        this.scene.add(this.model)
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
        console.log('🦊 Fox model loaded:', this.model)
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        const clips = this.resource.animations
        console.log('🦊 Animaciones del zorro:', clips.map(c => c.name))

        this.animation.actions.idle    = this._findClip(clips, ['Idle']) || this.animation.mixer.clipAction(clips[11])
        this.animation.actions.walking = this._findClip(clips, ['Walk']) || this.animation.mixer.clipAction(clips[8])
        this.animation.actions.running = this._findClip(clips, ['Gallop']) || this.animation.mixer.clipAction(clips[3])
        this.animation.actions.jumping = this._findClip(clips, ['Gallop_Jump']) || this.animation.mixer.clipAction(clips[4])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current
            if (!newAction || newAction === oldAction) return

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 0.3)
            this.animation.actions.current = newAction
        }

        if (this.debug.active) {
            const debugObject = {
                playIdle:    () => { this.animation.play('idle') },
                playWalking: () => { this.animation.play('walking') },
                playRunning: () => { this.animation.play('running') },
                playJumping: () => { this.animation.play('jumping') }
            }
            this.debugFolder.add(debugObject, 'playIdle')
            this.debugFolder.add(debugObject, 'playWalking')
            this.debugFolder.add(debugObject, 'playRunning')
            this.debugFolder.add(debugObject, 'playJumping')
        }
    }

    _findClip(clips, names) {
        for (const name of names) {
            const found = clips.find(c => c.name.toLowerCase().includes(name))
            if (found) return this.animation.mixer.clipAction(found)
        }
        return null
    }
    

    update() {
        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)

        const robot = this.experience.world?.robot
        if (!robot?.group || !robot?.body) return

        const targetPos = robot.group.position.clone()
        const targetQuat = robot.group.quaternion.clone()

        const offset = this.targetOffset.clone().applyQuaternion(targetQuat)
        const desiredPos = targetPos.clone().add(offset)

        const dist = this.model.position.distanceTo(desiredPos)

        if (dist > this.teleportDistance) {
            this.model.position.copy(desiredPos)
            this.model.quaternion.copy(targetQuat)
        } else {
            this.model.position.lerp(desiredPos, this.lerpSpeed * delta)
            this.model.quaternion.slerp(targetQuat, this.lerpSpeed * delta)
        }

        const keys = this.experience.keyboard?.getState?.()
        const isMoving = keys?.up || keys?.down
        const isRunning = keys?.shift
        const isJumping = keys?.space && Math.abs(robot.body.velocity.y) > 0.5

        if (isJumping) {
            this.animation.play('jumping')
        } else if (isRunning && isMoving) {
            this.animation.play('running')
        } else if (isMoving) {
            this.animation.play('walking')
        } else {
            this.animation.play('idle')
        }
    }
}
