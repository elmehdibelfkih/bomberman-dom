import { dom } from '../framwork/index.js'
import { SoloGameEngine } from '../game/engine/SoloGameEngine.js'

class SoloApp {
    constructor() {
        this.game = null
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
                            children: ['🎮 Bomberman Solo']
                        },
                        {
                            tag: 'button',
                            attributes: { id: 'start-solo-btn', class: 'menu-btn' },
                            children: ['Start Game']
                        }
                    ]
                }
            ]
        })

        document.body.appendChild(menu)

        setTimeout(() => {
            document.getElementById('start-solo-btn').addEventListener('click', () => {
                this.startGame()
            })
        }, 0)
    }

    async startGame() {
        document.body.innerHTML = ''
        
        this.game = SoloGameEngine.getInstance()
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
                }
            ]
        })
        document.body.appendChild(controls)
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
}

new SoloApp()