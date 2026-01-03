import { Player } from '../components/player.js'
import { MultiplayerMap } from '../components/MultiplayerMap.js'
import { State } from './state.js'
import { UI } from '../components/ui.js'
import { dom } from '../../framwork/index.js'

export class MultiplayerGameEngine {
    static #instance = null

    static getInstance() {
        if (!MultiplayerGameEngine.#instance) MultiplayerGameEngine.#instance = new MultiplayerGameEngine()
        return MultiplayerGameEngine.#instance
    }

    constructor() {
        if (MultiplayerGameEngine.#instance) {
            throw new Error('Use MultiplayerGameEngine.getInstance()')
        }
        this.state = State.getInstance(this)
        this.map = new MultiplayerMap(this)
        this.player = Player.getInstance(this)
        this.ui = UI.getInstance(this)
        this.networkManager = null
        this.IDRE = null
        this.isMultiplayer = true
        this.gameStarted = false
        this.players = new Map()
        this.bombs = new Map()
        this.powerups = new Map()
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager
    }

    async waitForLevel() {
        while (!this.map || !this.map.level) {
            await new Promise(r => setTimeout(r, 50))
        }
    }

    async intiElements(mapData = null) {
        this.state.initArrowState()
        await this.map.initMultiplayerMap(mapData)
        await this.player.initPlayer()
        this.setupInputHandling()
        return
    }

    setupInputHandling() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameStarted) return
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault()
                    this.sendPlayerMove('UP')
                    break
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault()
                    this.sendPlayerMove('DOWN')
                    break
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault()
                    this.sendPlayerMove('LEFT')
                    break
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault()
                    this.sendPlayerMove('RIGHT')
                    break
                case ' ':
                case 'Enter':
                    e.preventDefault()
                    this.sendPlaceBomb()
                    break
            }
        })
    }

    sendPlayerMove(direction) {
        if (this.networkManager) {
            this.networkManager.sendPlayerMove(direction)
        }
    }

    sendPlaceBomb() {
        if (this.networkManager) {
            this.networkManager.sendPlaceBomb()
        }
    }

    run = () => {
        if (this.IDRE) return
        this.IDRE = requestAnimationFrame(this.loop.bind(this))
    }

    async loop(timestamp) {
        if (!this.gameStarted) return
        
        if (!this.state.isPaused()) {
            this.updateRender(timestamp)
        }
        this.IDRE = requestAnimationFrame(this.loop.bind(this))
    }

    async updateRender(timestamp) {
        this.player.updateRender(timestamp)
        this.state.update()
    }

    handleServerState(gameState) {
        if (gameState.players) {
            gameState.players.forEach(serverPlayer => {
                this.updatePlayerFromServer(serverPlayer)
            })
        }

        if (gameState.bombs) {
            this.updateBombsFromServer(gameState.bombs)
        }

        if (gameState.powerups) {
            this.updatePowerupsFromServer(gameState.powerups)
        }

        if (gameState.grid) {
            this.updateMapFromServer(gameState.grid)
        }
    }

    handleGameStart(gameData) {
        if (gameData.mapData && gameData.players) {
            const thisPlayer = gameData.players.find(p => p.playerId === this.networkManager.getPlayerId())
            if (thisPlayer) {
                this.playerSpawn = { x: thisPlayer.spawnX, y: thisPlayer.spawnY }
                this.playerNickname = thisPlayer.nickname
            }
            this.initializeWithMap(gameData.mapData)
        }
    }

    async initializeWithMap(mapData) {
        document.body.innerHTML = ''
        
        const gameContainer = dom({
            tag: 'div',
            attributes: { id: 'multiplayer-game' },
            children: [
                {
                    tag: 'div',
                    attributes: { id: 'player-info', style: 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; z-index: 1000;' },
                    children: []
                }
            ]
        })
        document.body.appendChild(gameContainer)
        
        await this.intiElements(mapData)
        
        if (this.playerSpawn && this.player && this.player.playerCoordinate) {
            this.player.playerCoordinate.x = this.playerSpawn.x * 64
            this.player.playerCoordinate.y = this.playerSpawn.y * 64
        }
        
        await this.waitForLevel()
        this.startGame()
    }

    updatePlayerFromServer(serverPlayer) {
        if (serverPlayer.playerId === this.networkManager.getPlayerId()) {
            if (this.player && this.player.playerCoordinate) {
                this.player.playerCoordinate.x = serverPlayer.gridX * 64
                this.player.playerCoordinate.y = serverPlayer.gridY * 64
                this.player.lives = serverPlayer.lives
                this.player.alive = serverPlayer.alive
                this.updatePlayerInfo()
            }
        } else {
            this.players.set(serverPlayer.playerId, serverPlayer)
        }
    }

    updateBombsFromServer(bombs) {
        this.bombs.clear()
        bombs.forEach(bomb => {
            this.bombs.set(bomb.bombId, bomb)
        })
    }

    updatePowerupsFromServer(powerups) {
        this.powerups.clear()
        powerups.forEach(powerup => {
            this.powerups.set(powerup.powerUpId, powerup)
        })
    }

    updateMapFromServer(grid) {
        if (this.map && this.map.level) {
            this.map.updateFromServer(grid)
        }
    }

    handlePlayerJoined(playerData) {
        this.players.set(playerData.playerId, playerData)
    }

    handlePlayerLeft(playerId) {
        this.players.delete(playerId)
    }

    handlePlayerMoved(playerId, x, y, direction) {
        if (playerId === this.networkManager.getPlayerId()) {
            // Update local player position
            if (this.player && this.player.playerCoordinate) {
                this.player.playerCoordinate.x = x * 64
                this.player.playerCoordinate.y = y * 64
            }
        } else {
            // Update other players
            const player = this.players.get(playerId)
            if (player) {
                player.gridX = x
                player.gridY = y
                player.direction = direction
            }
        }
    }

    handleBombPlaced(bombData) {
        this.bombs.set(bombData.bombId, bombData)
    }

    handleBombExploded(bombId, explosions, destroyedBlocks) {
        this.bombs.delete(bombId)
        
        if (destroyedBlocks && this.map && this.map.level) {
            destroyedBlocks.forEach(block => {
                if (this.map.level.initial_grid[block.gridY]) {
                    this.map.level.initial_grid[block.gridY][block.gridX] = 0
                }
            })
        }
    }

    handlePlayerDamaged(playerId, livesRemaining) {
        const player = this.players.get(playerId)
        if (player) {
            player.lives = livesRemaining
        }
        
        if (playerId === this.networkManager.getPlayerId() && this.player) {
            this.player.lives = livesRemaining
            this.updatePlayerInfo()
        }
    }

    handlePlayerDied(playerId) {
        const player = this.players.get(playerId)
        if (player) {
            player.alive = false
        }
        
        if (playerId === this.networkManager.getPlayerId() && this.player) {
            this.player.alive = false
        }
    }

    handlePowerupSpawned(powerupData) {
        this.powerups.set(powerupData.powerUpId, powerupData)
    }

    handlePowerupCollected(playerId, powerUpId, type, newStats) {
        this.powerups.delete(powerUpId)
        
        const player = this.players.get(playerId)
        if (player) {
            Object.assign(player, newStats)
        }
        
        if (playerId === this.networkManager.getPlayerId() && this.player) {
            Object.assign(this.player, newStats)
        }
    }

    handleGameEnded(winner) {
        this.gameStarted = false
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE)
            this.IDRE = null
        }
        
        if (winner && winner.playerId === this.networkManager.getPlayerId()) {
            this.ui.win()
        } else {
            this.ui.GameOver()
        }
    }

    startGame() {
        this.gameStarted = true
        this.updatePlayerInfo()
        this.run()
    }

    updatePlayerInfo() {
        const playerInfo = document.getElementById('player-info')
        if (!playerInfo || !this.player) return
        
        const nickname = this.playerNickname || 'Player'
        const hearts = '❤️'.repeat(this.player.lives || 3)
        
        playerInfo.innerHTML = `${nickname}<br>${hearts}`
    }

    stop() {
        this.gameStarted = false
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE)
            this.IDRE = null
        }
        if (this.state) {
            this.state.stopTimer()
        }
    }

    static resetInstance() {
        MultiplayerGameEngine.#instance = null
    }
}