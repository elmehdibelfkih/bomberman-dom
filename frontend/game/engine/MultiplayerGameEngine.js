import { Player } from '../components/player.js'
import { Map } from '../components/map.js'
import { State } from './state.js'
import { UI } from '../components/ui.js'

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
        this.map = Map.getInstance(this)
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
        await this.map.initMap(mapData)
        return
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
        // Player rendering is now handled by MultiplayerPlayerManager
        this.state.update()
    }

    // Handle server state updates
    handleServerState(gameState) {
        // Update players
        if (gameState.players) {
            gameState.players.forEach(serverPlayer => {
                this.updatePlayerFromServer(serverPlayer)
            })
        }

        // Update bombs
        if (gameState.bombs) {
            this.updateBombsFromServer(gameState.bombs)
        }

        // Update powerups
        if (gameState.powerups) {
            this.updatePowerupsFromServer(gameState.powerups)
        }

        // Update map grid
        if (gameState.grid) {
            this.updateMapFromServer(gameState.grid)
        }
    }

    // Handle initial game start with map data
    handleGameStart(gameData) {
        if (gameData.mapData && gameData.players) {
            // Find this player's spawn position
            const thisPlayer = gameData.players.find(p => p.playerId === this.networkManager.getPlayerId())
            if (thisPlayer) {
                this.playerSpawn = { x: thisPlayer.spawnX, y: thisPlayer.spawnY }
            }
            this.initializeWithMap(gameData.mapData)
        }
    }

    async initializeWithMap(mapData) {
        document.body.innerHTML = ''
        
        const gameContainer = dom({
            tag: 'div',
            attributes: { id: 'multiplayer-game' },
            children: []
        })
        document.body.appendChild(gameContainer)
        
        await this.intiElements(mapData)
        
        await this.waitForLevel()
        this.startGame()
    }

    updatePlayerFromServer(serverPlayer) {
        if (serverPlayer.playerId !== this.networkManager.getPlayerId()) {
            // Update other players
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
            this.map.level.initial_grid = grid
        }
    }

    // Send player movement to server
    sendPlayerMove(direction) {
        if (this.networkManager) {
            this.networkManager.sendPlayerMove(direction)
        }
    }

    // Send bomb placement to server
    sendPlaceBomb() {
        if (this.networkManager) {
            this.networkManager.sendPlaceBomb()
        }
    }

    // Handle game events from server
    handlePlayerJoined(playerData) {
        this.players.set(playerData.playerId, playerData)
    }

    handlePlayerLeft(playerId) {
        this.players.delete(playerId)
    }

    handlePlayerMoved(playerId, x, y, direction) {
        const player = this.players.get(playerId)
        if (player) {
            player.gridX = x
            player.gridY = y
            player.direction = direction
        }
    }

    handleBombPlaced(bombData) {
        this.bombs.set(bombData.bombId, bombData)
    }

    handleBombExploded(bombId, explosions, destroyedBlocks) {
        this.bombs.delete(bombId)
        
        // Update map with destroyed blocks
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
    }

    handlePlayerDied(playerId) {
        const player = this.players.get(playerId)
        if (player) {
            player.alive = false
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
    }

    handleGameEnded(winner) {
        this.gameStarted = false
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE)
            this.IDRE = null
        }
        
        // Show game over UI
        if (winner && winner.playerId === this.networkManager.getPlayerId()) {
            this.ui.win()
        } else {
            this.ui.GameOver()
        }
    }

    startGame() {
        this.gameStarted = true
        this.run()
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