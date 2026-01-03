import { MultiplayerGameEngine } from '../engine/MultiplayerGameEngine.js'
import { NetworkManager } from '../network/NetworkManager.js'
import { dom } from '../../framwork/index.js'

export class MultiplayerMode {
    constructor(router) {
        this.router = router
        this.networkManager = null
        this.game = null
        this.isActive = false
        this.currentView = null
        this.eventListeners = []
    }

    async start() {
        if (this.isActive) return
        this.isActive = true

        document.body.innerHTML = ''
        this.networkManager = NetworkManager.getInstance()
        this.showNicknameEntry()
    }

    showNicknameEntry() {
        const container = dom({
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
                            children: ['Multiplayer Mode']
                        },
                        {
                            tag: 'input',
                            attributes: {
                                type: 'text',
                                id: 'nickname-input',
                                placeholder: 'Enter nickname',
                                maxlength: '20'
                            },
                            children: []
                        },
                        {
                            tag: 'button',
                            attributes: { id: 'join-btn', class: 'menu-btn' },
                            children: ['Join Game']
                        },
                        {
                            tag: 'button',
                            attributes: { id: 'home-btn', class: 'menu-btn' },
                            children: ['Home']
                        }
                    ]
                }
            ]
        })

        document.body.appendChild(container)
        this.currentView = container

        setTimeout(() => {
            const input = document.getElementById('nickname-input')
            const joinBtn = document.getElementById('join-btn')
            const homeBtn = document.getElementById('home-btn')

            const handleJoin = () => {
                const nickname = input.value.trim()
                if (nickname) {
                    sessionStorage.setItem('playerNickname', nickname)
                    this.networkManager.joinGame(nickname)
                    this.showLobby()
                }
            }

            const homeHandler = () => {
                this.destroy()
                this.router.navigate('/', true)
            }

            const keyHandler = (e) => {
                if (e.key === 'Enter') handleJoin()
            }

            joinBtn.addEventListener('click', handleJoin)
            input.addEventListener('keypress', keyHandler)
            homeBtn.addEventListener('click', homeHandler)

            this.eventListeners.push(
                { element: joinBtn, event: 'click', handler: handleJoin },
                { element: input, event: 'keypress', handler: keyHandler },
                { element: homeBtn, event: 'click', handler: homeHandler }
            )

            input.focus()
        }, 0)
    }

    showLobby() {
        document.body.innerHTML = ''
        
        const container = dom({
            tag: 'div',
            attributes: { class: 'page-container' },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'lobby-box' },
                    children: [
                        {
                            tag: 'h1',
                            attributes: {},
                            children: ['Game Lobby']
                        },
                        {
                            tag: 'div',
                            attributes: { id: 'player-count' },
                            children: ['Players: 0/4']
                        },
                        {
                            tag: 'div',
                            attributes: { id: 'player-list' },
                            children: []
                        },
                        {
                            tag: 'div',
                            attributes: { id: 'countdown-display' },
                            children: []
                        },
                        {
                            tag: 'button',
                            attributes: { id: 'leave-btn', class: 'menu-btn' },
                            children: ['Leave']
                        }
                    ]
                }
            ]
        })

        document.body.appendChild(container)
        this.currentView = container

        setTimeout(() => {
            this.setupLobbyEvents()
        }, 0)
    }

    setupLobbyEvents() {
        const leaveBtn = document.getElementById('leave-btn')
        
        const leaveHandler = () => {
            this.networkManager.quitGame()
            this.destroy()
            this.router.navigate('/', true)
        }
        
        leaveBtn.addEventListener('click', leaveHandler)
        this.eventListeners.push({ element: leaveBtn, event: 'click', handler: leaveHandler })

        this.networkManager.on('LOBBY_JOINED', (data) => {
            this.updatePlayerList(data.players)
        })

        this.networkManager.on('PLAYER_JOINED', (data) => {
            this.updatePlayerList(data.players)
        })

        this.networkManager.on('GAME_STARTED', (data) => {
            // Initialize game with server-provided map data
            this.game = MultiplayerGameEngine.getInstance()
            this.game.setNetworkManager(this.networkManager)
            window.game = this.game
            this.game.handleGameStart(data)
        })
    }

    updatePlayerList(players) {
        const playerCount = document.getElementById('player-count')
        const playerList = document.getElementById('player-list')
        
        playerCount.textContent = `Players: ${players.length}/4`
        playerList.innerHTML = ''
        
        players.forEach((player, index) => {
            const playerEl = dom({
                tag: 'div',
                attributes: {},
                children: [`P${index + 1}: ${player.nickname}`]
            })
            playerList.appendChild(playerEl)
        })
    }

    startMultiplayerGame() {
        document.body.innerHTML = ''
        
        // Initialize multiplayer game engine
        this.game = MultiplayerGameEngine.getInstance()
        this.game.setNetworkManager(this.networkManager)
        window.game = this.game
        
        const gameContainer = dom({
            tag: 'div',
            attributes: { id: 'multiplayer-game' },
            children: [
                {
                    tag: 'div',
                    attributes: {},
                    children: ['Multiplayer Game Starting...']
                },
                {
                    tag: 'button',
                    attributes: { id: 'leave-game-btn', class: 'menu-btn' },
                    children: ['Leave Game']
                }
            ]
        })
        
        document.body.appendChild(gameContainer)
        
        // Setup multiplayer game initialization
        this.initializeMultiplayerGame()
        
        setTimeout(() => {
            const leaveGameBtn = document.getElementById('leave-game-btn')
            const leaveGameHandler = () => {
                this.destroy()
                this.router.navigate('/', true)
            }
            leaveGameBtn.addEventListener('click', leaveGameHandler)
            this.eventListeners.push({ element: leaveGameBtn, event: 'click', handler: leaveGameHandler })
        }, 0)
    }

    async initializeMultiplayerGame() {
        await this.game.intiElements()
        
        while (!this.game.player || !this.game.player.playerCoordinate) {
            await new Promise(r => setTimeout(r, 0))
        }
        
        await this.game.waitForLevel()
        this.game.startGame()
        
        // Setup network event handlers for multiplayer game
        this.setupMultiplayerNetworkHandlers()
    }

    setupMultiplayerNetworkHandlers() {
        this.networkManager.on('GAME_STATE_UPDATE', (data) => {
            this.game.handleServerState(data)
        })

        this.networkManager.on('PLAYER_MOVED', (data) => {
            this.game.handlePlayerMoved(data.playerId, data.x, data.y, data.direction)
        })

        this.networkManager.on('BOMB_PLACED', (data) => {
            this.game.handleBombPlaced(data)
        })

        this.networkManager.on('BOMB_EXPLODED', (data) => {
            this.game.handleBombExploded(data.bombId, data.explosions, data.destroyedBlocks)
        })

        this.networkManager.on('PLAYER_DAMAGED', (data) => {
            this.game.handlePlayerDamaged(data.playerId, data.livesRemaining)
        })

        this.networkManager.on('PLAYER_DIED', (data) => {
            this.game.handlePlayerDied(data.playerId)
        })

        this.networkManager.on('POWERUP_SPAWNED', (data) => {
            this.game.handlePowerupSpawned(data)
        })

        this.networkManager.on('POWERUP_COLLECTED', (data) => {
            this.game.handlePowerupCollected(data.playerId, data.powerUpId, data.type, data.newStats)
        })

        this.networkManager.on('GAME_ENDED', (data) => {
            this.game.handleGameEnded(data.winner)
        })
    }

    destroy() {
        if (!this.isActive) return
        
        this.isActive = false
        
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler)
        })
        this.eventListeners = []

        // Disconnect from network
        if (this.networkManager) {
            this.networkManager.quitGame()
        }

        // Stop multiplayer game
        if (this.game) {
            this.game.stop()
        }

        // Reset game instance
        if (MultiplayerGameEngine._instance) {
            MultiplayerGameEngine._instance = null
        }

        // Clear DOM
        document.body.innerHTML = ''
        this.currentView = null
    }
}