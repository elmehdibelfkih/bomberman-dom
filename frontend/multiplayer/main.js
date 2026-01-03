import { Router, dom, usePathname } from '../framwork/index.js'
import { createEffect } from '../framwork/state/signal.js'
import { MultiplayerGameEngine } from '../game/engine/MultiplayerGameEngine.js'
import { NetworkManager } from '../game/network/NetworkManager.js'
import { setupMultiplayerSync } from '../game/network/MultiplayerSync.js'

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
        this.game = MultiplayerGameEngine.getInstance()
        this.game.setNetworkManager(networkManager)
        window.game = this.game

        setupMultiplayerSync(this.game, networkManager)

        await this.game.intiElements()

        while (!this.game.player || !this.game.player.playerCoordinate) {
            await new Promise(r => setTimeout(r, 0))
        }

        const gameContainer = dom({
            tag: 'div',
            attributes: { id: 'multiplayer-game-container' },
            children: [
                {
                    tag: 'div',
                    attributes: { id: 'chat-messages-game', class: 'chat-messages-small' },
                    children: []
                },
                {
                    tag: 'input',
                    attributes: {
                        type: 'text',
                        id: 'chat-input-game',
                        placeholder: 'Press T to chat...',
                        style: 'display: none;'
                    },
                    children: []
                }
            ]
        })
        document.body.appendChild(gameContainer)

        await this.game.waitForLevel()
        this.game.startGame()

        this.setupGameChat(networkManager)
    }

    setupGameChat(networkManager) {
        const chatInput = document.getElementById('chat-input-game')
        let chatVisible = false

        networkManager.on('CHAT_MESSAGE', (data) => {
            this.addGameChatMessage(data.nickname, data.text)
        })

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't' && !chatVisible) {
                e.preventDefault()
                chatVisible = true
                chatInput.style.display = 'block'
                chatInput.focus()
            } else if (e.key === 'Enter' && chatVisible) {
                e.preventDefault()
                const message = chatInput.value.trim()
                if (message) {
                    networkManager.sendChat(message)
                    chatInput.value = ''
                }
                chatVisible = false
                chatInput.style.display = 'none'
            }
        })
    }

    addGameChatMessage(nickname, text) {
        const chatMessages = document.getElementById('chat-messages-game')
        const messageEl = dom({
            tag: 'div',
            attributes: { class: 'game-chat-message' },
            children: [`${nickname}: ${text}`]
        })
        chatMessages.appendChild(messageEl)
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove()
            }
        }, 5000)
    }
}

new MultiplayerApp()