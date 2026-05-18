import * as THREE from 'three'

export default class FinalPrizeParticles {
  constructor({ scene, targetPosition, sourcePosition, experience }) {
    this.scene = scene
    this.experience = experience
    this.clock = new THREE.Clock()

    this.count = 250
    const colors = []
    const positions = new Float32Array(this.count * 3)
    const sizes = new Float32Array(this.count)
    const angles = new Float32Array(this.count)
    const radii = new Float32Array(this.count)
    const yOffsets = new Float32Array(this.count)
    const speeds = new Float32Array(this.count)

    const palette = [
      new THREE.Color(0xff0040),
      new THREE.Color(0xffaa00),
      new THREE.Color(0x00ff88),
      new THREE.Color(0x00aaff),
      new THREE.Color(0xff00ff),
      new THREE.Color(0xffffff),
    ]

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      const angle = Math.random() * Math.PI * 2
      const radius = 0.3 + Math.random() * 3.5
      const yOffset = (Math.random() - 0.5) * 3

      angles[i] = angle
      radii[i] = radius
      yOffsets[i] = yOffset
      speeds[i] = 0.6 + Math.random() * 1.4

      positions[i3 + 0] = targetPosition.x + Math.cos(angle) * radius
      positions[i3 + 1] = targetPosition.y + yOffset
      positions[i3 + 2] = targetPosition.z + Math.sin(angle) * radius

      sizes[i] = 0.12 + Math.random() * 0.25

      const color = palette[Math.floor(Math.random() * palette.length)]
      colors.push(color.r, color.g, color.b)
    }

    this.angles = angles
    this.radii = radii
    this.yOffsets = yOffsets
    this.speeds = speeds
    this.target = targetPosition.clone()

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(this.geometry, material)
    this.scene.add(this.points)

    this.experience.time.on('tick', this.update)
  }

  update = () => {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.elapsedTime
    const pos = this.geometry.attributes.position.array

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      this.angles[i] += this.speeds[i] * delta

      const ringRadius = 0.5 + Math.sin(elapsed * 0.3 + i * 0.1) * 1.5
      const spiral = Math.sin(elapsed * 0.8 + i * 0.05) * 0.5

      pos[i3 + 0] = this.target.x + Math.cos(this.angles[i]) * (this.radii[i] + spiral)
      pos[i3 + 2] = this.target.z + Math.sin(this.angles[i]) * (this.radii[i] + spiral)
      pos[i3 + 1] = this.target.y + this.yOffsets[i] * 0.3 + Math.sin(elapsed * 0.6 + i * 0.15) * 0.8
    }

    this.geometry.attributes.position.needsUpdate = true
  }

  dispose() {
    this.experience.time.off('tick', this.update)
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.points.material.dispose()
  }
}
