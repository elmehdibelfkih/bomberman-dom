import { GAME_CONFIG } from "../../shared/game-config.js"
import { Logger } from "../utils/Logger.js"

export class GameEngine {
    constructor(gameRoom) {
        this.gameRoom = gameRoom
        this.grid = []
        this.bombs = new Map()
        this.powerUps = new Map()
        this.blocks = new Set()
        this.lastUpdate = Date.now()
    }

    initialize() {
        this.createGrid()
        this.generateBlocks()
        Logger.info(`Game engine initialized for room ${this.gameRoom.roomId}`)
    }

    createGrid() {
        // Create 15x13 grid (standard bomberman size)
        this.grid = Array(GAME_CONFIG.GRID_HEIGHT).fill().map(() => 
            Array(GAME_CONFIG.GRID_WIDTH).fill(0)
        )
        
        // Place walls (odd positions)
        for (let y = 0; y < GAME_CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.GRID_WIDTH; x++) {
                if (x === 0 || x === GAME_CONFIG.GRID_WIDTH - 1 || 
                    y === 0 || y === GAME_CONFIG.GRID_HEIGHT - 1 ||
                    (x % 2 === 0 && y % 2 === 0)) {
                    this.grid[y][x] = 1 // Wall
                }
            }
        }
    }

    generateBlocks() {
        // Generate destructible blocks randomly
        for (let y = 1; y < GAME_CONFIG.GRID_HEIGHT - 1; y++) {
            for (let x = 1; x < GAME_CONFIG.GRID_WIDTH - 1; x++) {
                if (this.grid[y][x] === 0 && !this.isStartingArea(x, y)) {
                    if (Math.random() < GAME_CONFIG.BLOCK_DENSITY) {
                        this.grid[y][x] = 2 // Destructible block
                        this.blocks.add(`${x},${y}`)
                    }
                }
            }
        }
    }

    isStartingArea(x, y) {
        // Keep starting areas clear (3x3 around each corner)
        const startingAreas = [
            { x: 1, y: 1 },     // Top-left
            { x: 13, y: 1 },    // Top-right
            { x: 1, y: 11 },    // Bottom-left
            { x: 13, y: 11 }    // Bottom-right
        ]
        
        return startingAreas.some(area => 
            Math.abs(x - area.x) <= 1 && Math.abs(y - area.y) <= 1
        )
    }

    update() {
        const now = Date.now()
        const deltaTime = now - this.lastUpdate
        
        this.updateBombs(deltaTime)
        this.updatePowerUps(deltaTime)
        
        this.lastUpdate = now
    }

    processPlayerInput(playerId, input) {
        const player = this.gameRoom.players.get(playerId)
        if (!player || !player.isAlive) return

        switch (input.type) {
            case 'MOVE':
                this.handlePlayerMove(playerId, input.direction)
                break
            case 'PLACE_BOMB':
                this.handleBombPlacement(playerId)
                break
        }
    }

    handlePlayerMove(playerId, direction) {
        const player = this.gameRoom.players.get(playerId)
        if (!player) return

        const { x, y } = player.position
        let newX = x, newY = y

        switch (direction) {
            case 'UP': newY = Math.max(0, y - 1); break
            case 'DOWN': newY = Math.min(GAME_CONFIG.GRID_HEIGHT - 1, y + 1); break
            case 'LEFT': newX = Math.max(0, x - 1); break
            case 'RIGHT': newX = Math.min(GAME_CONFIG.GRID_WIDTH - 1, x + 1); break
        }

        // Check if new position is valid
        if (this.canMoveTo(newX, newY)) {
            player.position = { x: newX, y: newY }
            
            // Check for power-up collection
            const powerUpKey = `${newX},${newY}`
            if (this.powerUps.has(powerUpKey)) {
                this.collectPowerUp(playerId, powerUpKey)
            }
        }
    }

    canMoveTo(x, y) {
        if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || 
            y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) {
            return false
        }
        
        // Can't move through walls or blocks
        if (this.grid[y][x] === 1 || this.grid[y][x] === 2) {
            return false
        }
        
        // Can't move through bombs
        if (this.bombs.has(`${x},${y}`)) {
            return false
        }
        
        return true
    }

    handleBombPlacement(playerId) {
        const player = this.gameRoom.players.get(playerId)
        if (!player) return

        const { x, y } = player.position
        const bombKey = `${x},${y}`
        
        // Check if bomb can be placed
        if (this.bombs.has(bombKey)) return
        
        // Create bomb
        const bomb = {
            id: `${playerId}_${Date.now()}`,
            playerId,
            x, y,
            timer: 3000, // 3 seconds
            range: 2 // Default range
        }
        
        this.bombs.set(bombKey, bomb)
        
        // Broadcast bomb placement
        this.gameRoom.broadcast({
            type: 'BOMB_PLACED',
            bomb: bomb
        })
    }

    updateBombs(deltaTime) {
        const bombsToExplode = []
        
        this.bombs.forEach((bomb, key) => {
            bomb.timer -= deltaTime
            
            if (bomb.timer <= 0) {
                bombsToExplode.push({ bomb, key })
            }
        })
        
        bombsToExplode.forEach(({ bomb, key }) => {
            this.explodeBomb(bomb, key)
        })
    }

    explodeBomb(bomb, bombKey) {
        this.bombs.delete(bombKey)
        
        const explosionCells = this.getExplosionCells(bomb.x, bomb.y, bomb.range)
        
        // Damage players in explosion
        this.gameRoom.players.forEach((player, playerId) => {
            if (explosionCells.some(cell => 
                cell.x === player.position.x && cell.y === player.position.y)) {
                this.damagePlayer(playerId)
            }
        })
        
        // Destroy blocks and spawn power-ups
        explosionCells.forEach(cell => {
            const cellKey = `${cell.x},${cell.y}`
            if (this.blocks.has(cellKey)) {
                this.blocks.delete(cellKey)
                this.grid[cell.y][cell.x] = 0
                
                // Chance to spawn power-up
                if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
                    this.spawnPowerUp(cell.x, cell.y)
                }
            }
        })
        
        // Broadcast explosion
        this.gameRoom.broadcast({
            type: 'BOMB_EXPLODED',
            bombId: bomb.id,
            explosionCells: explosionCells
        })
    }

    getExplosionCells(centerX, centerY, range) {
        const cells = [{ x: centerX, y: centerY }]
        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ]
        
        directions.forEach(dir => {
            for (let i = 1; i <= range; i++) {
                const x = centerX + dir.dx * i
                const y = centerY + dir.dy * i
                
                if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || 
                    y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) break
                
                if (this.grid[y][x] === 1) break // Wall stops explosion
                
                cells.push({ x, y })
                
                if (this.grid[y][x] === 2) break // Block stops explosion after destroying it
            }
        })
        
        return cells
    }

    damagePlayer(playerId) {
        const player = this.gameRoom.players.get(playerId)
        if (!player || !player.isAlive) return
        
        player.lives--
        
        if (player.lives <= 0) {
            player.isAlive = false
            
            // Check for game end
            const alivePlayers = Array.from(this.gameRoom.players.values())
                .filter(p => p.isAlive)
            
            if (alivePlayers.length <= 1) {
                this.gameRoom.endGame(alivePlayers[0]?.id)
            }
        }
        
        // Broadcast player damage
        this.gameRoom.broadcast({
            type: 'PLAYER_DAMAGED',
            playerId: playerId,
            lives: player.lives,
            isAlive: player.isAlive
        })
    }

    spawnPowerUp(x, y) {
        const powerUpTypes = ['SPEED', 'BOMBS', 'FLAMES']
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
        
        const powerUp = {
            id: `powerup_${Date.now()}`,
            type: type,
            x: x,
            y: y
        }
        
        this.powerUps.set(`${x},${y}`, powerUp)
        
        // Broadcast power-up spawn
        this.gameRoom.broadcast({
            type: 'POWERUP_SPAWNED',
            powerUp: powerUp
        })
    }

    collectPowerUp(playerId, powerUpKey) {
        const powerUp = this.powerUps.get(powerUpKey)
        if (!powerUp) return
        
        this.powerUps.delete(powerUpKey)
        
        const player = this.gameRoom.players.get(playerId)
        if (player) {
            player.powerUps.push(powerUp.type)
            player.score += 50
        }
        
        // Broadcast power-up collection
        this.gameRoom.broadcast({
            type: 'POWERUP_COLLECTED',
            playerId: playerId,
            powerUpId: powerUp.id,
            powerUpType: powerUp.type
        })
    }

    updatePowerUps(deltaTime) {
        // Power-ups don't need updates currently
        // Could add expiration timer here if needed
    }

    getBombs() {
        return Array.from(this.bombs.values())
    }

    getPowerUps() {
        return Array.from(this.powerUps.values())
    }

    getBlocks() {
        return Array.from(this.blocks).map(key => {
            const [x, y] = key.split(',').map(Number)
            return { x, y }
        })
    }

    getGameState() {
        return {
            grid: this.grid,
            bombs: this.getBombs(),
            powerUps: this.getPowerUps(),
            blocks: this.getBlocks()
        }
    }
}