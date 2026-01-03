import { SoloGameEngine } from '../engine/SoloGameEngine.js'
import { dom } from '../../framwork/index.js'

export class SoloMode {
    constructor(router) {
        this.router = router
        this.game = null
        this.isActive = false
        this.animationIds = []
        this.eventListeners = []
        this.timers = []
    }

    async start() {
        if (this.isActive) return
        this.isActive = true

        document.body.innerHTML = ''

        this.game = SoloGameEngine.getInstance()
        window.game = this.game

        await this.game.intiElements()

        while (!this.game.player || !this.game.player.playerCoordinate) {
            await new Promise(r => setTimeout(r, 0))
        }

        this.createUI()
        await this.startGame()
    }

    createUI() {
        const levelDisplay = dom({
            tag: 'div',
            attributes: { id: 'level-display' },
            children: []
        })
        document.body.appendChild(levelDisplay)

        const controls = dom({
            tag: 'div',
            attributes: { class: 'Controls' },
            children: [
                {
                    tag: 'button',
                    attributes: { id: 'star_pause' },
                    children: [
                        {
                            tag: 'img',
                            attributes: {
                                src: '/game/icon/play.svg',
                                alt: 'pause/play',
                                width: '16',
                                height: '16'
                            },
                            children: []
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: { id: 'ref' },
                    children: [
                        {
                            tag: 'img',
                            attributes: {
                                src: '/game/icon/rotate-ccw.svg',
                                alt: 'restart',
                                width: '16',
                                height: '16'
                            },
                            children: []
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: { id: 'sound' },
                    children: [
                        {
                            tag: 'img',
                            attributes: {
                                src: '/game/icon/volume-2.svg',
                                alt: 'sound',
                                width: '16',
                                height: '16'
                            },
                            children: []
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: { id: 'home-btn', class: 'menu-btn' },
                    children: ['Home']
                }
            ]
        })
        document.body.appendChild(controls)

        setTimeout(() => {
            const homeBtn = document.getElementById('home-btn')
            const homeHandler = () => {
                this.destroy()
                this.router.navigate('/', true)
            }
            homeBtn.addEventListener('click', homeHandler)
            this.eventListeners.push({ element: homeBtn, event: 'click', handler: homeHandler })
        }, 0)
    }

    async startGame() {
        await this.game.waitForLevel()

        const levelDisplay = document.getElementById('level-display')
        levelDisplay.textContent = `${this.game.map.level.name}`
        levelDisplay.classList.add('show')

        this.game.state.stopTimer()
        this.game.state.resetTimer()
        this.game.state.setTime(this.game.map.level.level_time)
        this.game.state.startTimer()
        this.game.run()

        const hideTimer = setTimeout(() => {
            this.game.state.pauseStart()
            levelDisplay.classList.remove('show')
        }, 2000)
        this.timers.push(hideTimer)
    }

    destroy() {
        if (!this.isActive) return
        
        this.isActive = false
        
        // Cancel all animation frames
        this.animationIds.forEach(id => cancelAnimationFrame(id))
        this.animationIds = []

        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer))
        this.timers = []

        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler)
        })
        this.eventListeners = []

        // Stop game and all its animations
        if (this.game) {
            this.game.state.stopTimer()
            if (this.game.animationId) {
                cancelAnimationFrame(this.game.animationId)
                this.game.animationId = null
            }
            if (this.game.stop) {
                this.game.stop()
            }
        }

        // Clear DOM
        document.body.innerHTML = ''
        
        // Reset game instance
        if (SoloGameEngine._instance) {
            SoloGameEngine._instance = null
        }
        
        window.game = null
    }
}