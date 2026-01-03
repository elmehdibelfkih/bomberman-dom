import { Router, dom, usePathname } from '../framwork/index.js'
import { createEffect } from '../framwork/state/signal.js'
import { MultiplayerGameEngine } from '../game/engine/MultiplayerGameEngine.js'
import { NetworkManager } from '../game/network/NetworkManager.js'

class MultiplayerApp {
    constructor() {
        this.router = Router.instance
        this.router.initRouter()
        this.pathname = usePathname()
        this.currentPage = null
        this.game = null
        this.init()
    }

    init() {
        createEffect(() => {
            this.renderRoute()
        })
    }

    async renderRoute() {
        const path = this.pathname()

        if (this.currentPage && this.currentPage.parentNode === document.body) {
            document.body.removeChild(this.currentPage)
            this.currentPage = null
        }

        if (path === '/' || path === '') {
            this.currentPage = this.createEntryPage()
            document.body.appendChild(this.currentPage)
        } else if (path === '/lobby') {
            this.currentPage = this.createLobbyPage()
            document.body.appendChild(this.currentPage)
        } else if (path === '/game') {
            await this.startMultiplayerGame()
        } else {
            this.router.navigate('/', true)
        }
    }

    createEntryPage() {
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
                            children: ['🎮 Bomberman Multiplayer']
                        },
                        {
                            tag: 'input',
                            attributes: {
                                type: 'text',
                                id: 'nickname-input',
                                placeholder: 'Enter your nickname',
                                maxlength: '20'
                            },
                            children: []
                        },
                        {
                            tag: 'button',
                            attributes: { id: 'join-btn', class: 'menu-btn' },
                            children: ['Join Game']
                        }
                    ]
                }
            ]
        })

        setTimeout(() => {
            const input = document.getElementById('nickname-input')
            const joinBtn = document.getElementById('join-btn')
            const networkManager = NetworkManager.getInstance()

            const handleJoin = () => {
                const nickname = input.value.trim()
                if (nickname) {
                    sessionStorage.setItem('playerNickname', nickname)
                    networkManager.joinGame(nickname)
                    this.router.navigate('/lobby', true)
                } else {
                    input.focus()
                }
            }

            joinBtn.addEventListener('click', handleJoin)
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleJoin()
            })
            input.focus()
        }, 0)

        return container
    }

    createLobbyPage() {
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
                            attributes: { id: 'player-list', class: 'player-list' },
                            children: []
                        },
                        {
                            tag: 'div',
                            attributes: { id: 'countdown-display' },
                            children: []
                        },
                        {
                            tag: 'div',
                            attributes: { id: 'chat-messages', class: 'chat-messages' },
                            children: []
                        },
                        {
                            tag: 'input',
                            attributes: {
                                type: 'text',
                                id: 'chat-input',
                                placeholder: 'Type message...'
                            },
                            children: []
                        }
                    ]
                }
            ]
        })

        setTimeout(() => {
            this.setupLobby()
        }, 0)

        return container
    }

    setupLobby() {
        const networkManager = NetworkManager.getInstance()
        const playerList = document.getElementById('player-list')
        const playerCount = document.getElementById('player-count')
        const chatMessages = document.getElementById('chat-messages')
        const chatInput = document.getElementById('chat-input')
        const countdownDisplay = document.getElementById('countdown-display')

        networkManager.on('LOBBY_JOINED', (data) => {
            this.updatePlayerList(data.players)
        })

        networkManager.on('PLAYER_JOINED', (data) => {
            this.updatePlayerList(data.players)
            this.addChatMessage('System', `${data.nickname} joined`)
        })

        networkManager.on('PLAYER_LEFT', (data) => {
            this.updatePlayerList(data.players)
            this.addChatMessage('System', `${data.nickname} left`)
        })

        networkManager.on('COUNTDOWN_TICK', (data) => {
            countdownDisplay.textContent = `Starting in ${data.remaining}...`
        })

        networkManager.on('GAME_STARTED', () => {
            this.router.navigate('/game', true)
        })

        networkManager.on('CHAT_MESSAGE', (data) => {
            this.addChatMessage(data.nickname, data.text)
        })

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = chatInput.value.trim()
                if (message) {
                    networkManager.sendChat(message)
                    chatInput.value = ''
                }
            }
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
                attributes: { class: 'player-item' },
                children: [`P${index + 1}: ${player.nickname}`]
            })
            playerList.appendChild(playerEl)
        })
    }

    addChatMessage(nickname, text) {
        const chatMessages = document.getElementById('chat-messages')
        const messageEl = dom({
            tag: 'div',
            attributes: { class: 'chat-message' },
            children: [`${nickname}: ${text}`]
        })
        chatMessages.appendChild(messageEl)
        chatMessages.scrollTop = chatMessages.scrollHeight
    }

    async startMultiplayerGame() {
        document.body.innerHTML = ''
        
        const networkManager = NetworkManager.getInstance()
        const game = MultiplayerGameEngine.getInstance()
        game.setNetworkManager(networkManager)
        window.game = game

        // Wait for game start message from server with random map
        networkManager.on('GAME_STARTED', (gameData) => {
            game.handleGameStart(gameData)
        })

        // Handle server state updates
        networkManager.on('FULL_STATE', (gameState) => {
            game.handleServerState(gameState)
        })

        // Handle game events
        networkManager.on('PLAYER_MOVED', (data) => {
            game.handlePlayerMoved(data.playerId, data.gridX, data.gridY, data.direction)
        })

        networkManager.on('BOMB_PLACED', (data) => {
            game.handleBombPlaced(data)
        })

        networkManager.on('BOMB_EXPLODED', (data) => {
            game.handleBombExploded(data.bombId, data.explosions, data.destroyedBlocks)
        })

        networkManager.on('PLAYER_DAMAGED', (data) => {
            game.handlePlayerDamaged(data.playerId, data.livesRemaining)
        })

        networkManager.on('PLAYER_DIED', (data) => {
            game.handlePlayerDied(data.playerId)
        })

        networkManager.on('POWERUP_SPAWNED', (data) => {
            game.handlePowerupSpawned(data)
        })

        networkManager.on('POWERUP_COLLECTED', (data) => {
            game.handlePowerupCollected(data.playerId, data.powerUpId, data.type, data.newStats)
        })

        networkManager.on('GAME_OVER', (data) => {
            game.handleGameEnded(data.winner)
        })
    }
}

new MultiplayerApp()