import { dom } from '../framwork/index.js'
import { Game } from '../game/engine/core.js'

class SoloApp {
    constructor() {
        this.game = null
        this.eventListeners = []
        this.init()
    }

    async init() {
        this.createMenu()
    }

    createMenu() {
        const menu = dom({
            tag: 'div',
            attributes: { class: 'page-container' },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'menu-box' },
                    children: [
                        {
                            tag: 'h1',
                            attributes: {},
                            children: ['BOMBERMAN SOLO']
                        },
                        {
                            tag: 'p',
                            attributes: { class: 'menu-subtitle' },
                            children: ['Play against AI enemies']
                        },
                        {
                            tag: 'button',
                            attributes: { id: 'start-solo-btn', class: 'menu-btn' },
                            children: ['Start Game']
                        },
                        {
                            tag: 'a',
                            attributes: {
                                href: '../index.html',
                                class: 'menu-btn',
                                style: 'margin-top: 1rem; text-decoration: none;'
                            },
                            children: ['Back to Home']
                        }
                    ]
                }
            ]
        })

        document.body.appendChild(menu)

        setTimeout(() => {
            const startBtn = document.getElementById('start-solo-btn')
            const startHandler = () => this.startGame()
            startBtn.addEventListener('click', startHandler)
            this.eventListeners.push({ element: startBtn, event: 'click', handler: startHandler })
        }, 0)
    }

    async startGame() {
        // Clean up menu
        document.body.innerHTML = ''
        this.cleanupEventListeners()

        // Create new game instance (no longer singleton)
        this.game = new Game()
        window.game = this.game

        await this.game.intiElements()

        while (!this.game.player || !this.game.player.playerCoordinate) {
            await new Promise(r => setTimeout(r, 0))
        }

        this.createGameUI()
        await this.initializeGame()
    }

    createGameUI() {
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

        // Add home button event listener
        setTimeout(() => {
            const homeBtn = document.getElementById('home-btn')
            const homeHandler = () => {
                this.cleanup()
                window.location.href = '../index.html'
            }
            homeBtn.addEventListener('click', homeHandler)
            this.eventListeners.push({ element: homeBtn, event: 'click', handler: homeHandler })
        }, 0)
    }

    async initializeGame() {
        await this.game.waitForLevel()

        const levelDisplay = document.getElementById('level-display')
        levelDisplay.textContent = `${this.game.map.level.name}`
        levelDisplay.classList.add('show')

        this.game.state.stopTimer()
        this.game.state.resetTimer()
        this.game.state.setTime(this.game.map.level.level_time)
        this.game.state.startTimer()
        this.game.run()

        setTimeout(() => {
            this.game.state.pauseStart()
            levelDisplay.classList.remove('show')
        }, 2000)
    }

    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler)
            }
        })
        this.eventListeners = []
    }

    cleanup() {
        // Stop game loop
        if (this.game) {
            if (this.game.IDRE) {
                cancelAnimationFrame(this.game.IDRE)
                this.game.IDRE = null
            }
            if (this.game.state) {
                this.game.state.stopTimer()
                this.game.state.removeEventListeners()
            }
        }

        // Clean up event listeners
        this.cleanupEventListeners()

        // Clear DOM
        document.body.innerHTML = ''

        // Clear game reference
        this.game = null
        window.game = null
    }
}

// Initialize solo app
new SoloApp()
