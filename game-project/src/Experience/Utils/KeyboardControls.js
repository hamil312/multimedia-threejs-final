// Experience/Utils/KeyboardControls.js
import EventEmitter from './EventEmitter.js'

export default class KeyboardControls extends EventEmitter {
    constructor() {
        super()

        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        }

        this.setListeners()
    }

    setListeners() {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'w') this.keys.up = true
            if (event.key === 's') this.keys.down = true
            if (event.key === 'a') this.keys.left = true
            if (event.key === 'd') this.keys.right = true
            if (event.code === 'Space') this.keys.space = true
            this.trigger('change', this.keys)
        })

        window.addEventListener('keyup', (event) => {
            if (event.key === 'w') this.keys.up = false
            if (event.key === 's') this.keys.down = false
            if (event.key === 'a') this.keys.left = false
            if (event.key === 'd') this.keys.right = false
            if (event.code === 'Space') this.keys.space = false
            this.trigger('change', this.keys)
        })
    }

    getState() {
        return this.keys
    }
}
