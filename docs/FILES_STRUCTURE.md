# Server File Structure & Descriptions

## Entry Point

### `src/index.js`
**Purpose**: Application entry point and WebSocket server initialization

**Responsibilities:**
- Create WebSocket server (ws library)
- Initialize RoomManager
- Handle new client connections
- Set up global error handlers
- Configure logging

**Key Code:**
```javascript
import WebSocket from 'ws';
import { RoomManager } from './core/RoomManager.js';

const wss = new WebSocket.Server({ port: 3000 });
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
  // Create Connection wrapper
  // Set up message handlers
  // Handle disconnect
});
```

---

## Core System (`src/core/`)

### `GameEngine.js`
**Purpose**: ECS orchestrator - manages entities and systems

**Responsibilities:**
- Initialize and store all entity collections
- Initialize and orchestrate all systems
- Provide entity creation methods
- Handle system execution order
- Manage grid instance

**Key Methods:**
```javascript
constructor(room, mapData)
createPlayer(playerId, nickname, gridX, gridY)
createBomb(player, gridX, gridY)
createExplosion(gridX, gridY, direction)
createPowerUp(gridX, gridY, type)
processPlayerMove(player, direction)
processPlaceBomb(player)
serializeFullState() // For new players
checkWinCondition()
```

**What it contains:**
```javascript
{
  room: GameRoom,
  grid: Grid,
  entities: {
    players: Map<playerId, Player>,
    bombs: Map<bombId, Bomb>,
    explosions: Set<Explosion>,
    powerups: Map<powerupId, PowerUp>,
    blocks: Set<Block>
  },
  systems: {
    movement: MovementSystem,
    bomb: BombSystem,
    explosion: ExplosionSystem,
    collision: CollisionSystem,
    powerup: PowerUpSystem,
    game: GameSystem
  }
}
```

---

### `GameRoom.js`
**Purpose**: Manages a single game session

**Responsibilities:**
- Store player connections
- Route player inputs to GameEngine
- Broadcast events to all players
- Handle player disconnections
- Track game status (PLAYING, ENDED)
- Clean up on game end

**Key Methods:**
```javascript
constructor(roomId, playerIds)
async initialize()
addPlayerConnection(playerId, connection)
handlePlayerInput(playerId, input)
handlePlayerDisconnect(playerId)
broadcast(message, excludePlayerId?)
broadcastToPlayer(playerId, message)
endGame(winner)
cleanup()
```

**What it contains:**
```javascript
{
  roomId: string,
  playerConnections: Map<playerId, Connection>,
  engine: GameEngine,
  status: 'INITIALIZING' | 'PLAYING' | 'ENDED',
  startTime: timestamp,
  endTime: timestamp | null
}
```

---

### `RoomManager.js`
**Purpose**: Manages lobbies and game room lifecycle

**Responsibilities:**
- Create/manage lobbies
- Handle player join/leave
- Implement auto-start timers (20s wait, 10s countdown)
- Create GameRoom when game starts
- Track active games
- Handle disconnections

**Key Methods:**
```javascript
constructor()
createLobby() // Auto-created on first join
joinLobby(playerId, nickname)
leaveLobby(playerId)
startCountdown() // When 4 players or 20s expires
startGame(lobbyId)
getRoomForPlayer(playerId)
handleDisconnect(playerId)
```

**What it contains:**
```javascript
{
  lobby: {
    players: Map<playerId, {nickname, connection}>,
    status: 'WAITING' | 'COUNTDOWN',
    createdAt: timestamp,
    waitTimer: NodeJS.Timeout | null,  // 20s timer
    countdownTimer: NodeJS.Timeout | null  // 10s timer
  },
  activeGames: Map<roomId, GameRoom>,
  playerToRoom: Map<playerId, roomId>
}
```

**Timer Logic:**
```javascript
// When 2nd player joins
if (playerCount === 2) {
  waitTimer = setTimeout(() => {
    startCountdown(); // 10s countdown
  }, 20000);
}

// When 4th player joins
if (playerCount === 4) {
  clearTimeout(waitTimer);
  startCountdown(); // 10s countdown immediately
}
```

---

## Entities (`src/entities/`)

### `Entity.js`
**Purpose**: Base class for all game entities

**Responsibilities:**
- Generate unique IDs
- Manage alive/dead state
- Provide serialization interface

**What it contains:**
```javascript
class Entity {
  constructor(type) {
    this.id = generateId();
    this.type = type;
    this.alive = true;
  }
  
  kill()
  isAlive()
  isDead()
  serialize() // Abstract - must override
}
```

---

### `Player.js`
**Purpose**: Player entity with all player-specific data

**Responsibilities:**
- Store position, direction, lives
- Track bomb capacity and usage
- Store powerup effects
- Manage damage/death

**What it contains:**
```javascript
class Player extends Entity {
  constructor(playerId, nickname, gridX, gridY) {
    super('PLAYER');
    
    // Identity
    this.playerId = playerId;
    this.nickname = nickname;
    
    // Position
    this.gridX = gridX;
    this.gridY = gridY;
    this.direction = 'DOWN';
    
    // Stats
    this.lives = 3;
    this.score = 0;
    
    // Bomb abilities
    this.maxBombs = 1;
    this.activeBombs = 0;
    this.bombRange = 1;
    
    // Movement
    this.speed = 1; // Cells per move
    
    // PowerUps
    this.powerups = [];
  }
  
  takeDamage()
  canPlaceBomb()
  incrementActiveBombs()
  decrementActiveBombs()
  addPowerUp(type)
  serialize()
}
```

---

### `Bomb.js`
**Purpose**: Bomb entity with explosion timer

**Responsibilities:**
- Store bomb position and owner
- Manage 3-second countdown timer
- Trigger explosion callback

**What it contains:**
```javascript
class Bomb extends Entity {
  constructor(gridX, gridY, owner, range) {
    super('BOMB');
    
    this.gridX = gridX;
    this.gridY = gridY;
    this.owner = owner; // Player reference
    this.range = range;
    this.placedTime = Date.now();
    
    // Timer (set by BombSystem)
    this.timerId = null;
  }
  
  startTimer(callback) {
    this.timerId = setTimeout(callback, 3000);
  }
  
  cancelTimer() {
    clearTimeout(this.timerId);
  }
  
  serialize()
}
```

---

### `Explosion.js`
**Purpose**: Explosion sprite entity (short-lived)

**Responsibilities:**
- Store explosion position and direction
- Track creation time (for animation sync)

**What it contains:**
```javascript
class Explosion extends Entity {
  constructor(gridX, gridY, direction) {
    super('EXPLOSION');
    
    this.gridX = gridX;
    this.gridY = gridY;
    this.direction = direction; // 'CENTER', 'UP', 'DOWN', 'LEFT', 'RIGHT'
    this.createdAt = Date.now();
  }
  
  serialize()
}
```

**Note**: Explosions are temporary - created for broadcast, then discarded. No cleanup timer needed on server.

---

### `PowerUp.js`
**Purpose**: PowerUp entity on grid

**Responsibilities:**
- Store position and type
- Track spawn time

**What it contains:**
```javascript
class PowerUp extends Entity {
  constructor(gridX, gridY, type) {
    super('POWERUP');
    
    this.gridX = gridX;
    this.gridY = gridY;
    this.type = type; // 'BOMB', 'FLAME', 'SPEED'
    this.spawnedAt = Date.now();
  }
  
  serialize()
}
```

---

### `Block.js`
**Purpose**: Destructible block entity

**Responsibilities:**
- Store block position
- Track destruction state

**What it contains:**
```javascript
class Block extends Entity {
  constructor(gridX, gridY) {
    super('BLOCK');
    
    this.gridX = gridX;
    this.gridY = gridY;
    this.destructible = true;
  }
  
  destroy() {
    this.kill();
  }
  
  serialize()
}
```

---

## Systems (`src/systems/`)

### `MovementSystem.js`
**Purpose**: Handle player movement validation and execution

**Responsibilities:**
- Validate move direction
- Check collision with walls/blocks
- Update player position
- Broadcast PLAYER_MOVED event

**Key Methods:**
```javascript
constructor(engine)

processMove(player, direction) {
  // 1. Calculate new position
  // 2. Check if valid (grid.canMoveTo)
  // 3. Update player.gridX, player.gridY
  // 4. Broadcast PLAYER_MOVED
  // 5. Check powerup collection (call CollisionSystem)
}

canMoveTo(gridX, gridY) {
  // Check grid for walls/blocks
}
```

---

### `BombSystem.js`
**Purpose**: Handle bomb placement and explosion timing

**Responsibilities:**
- Validate bomb placement
- Create bomb entity
- Start 3-second timer
- Trigger explosion when timer expires
- Manage player bomb count

**Key Methods:**
```javascript
constructor(engine)

placeBomb(player) {
  // 1. Check player.canPlaceBomb()
  // 2. Create Bomb entity
  // 3. player.incrementActiveBombs()
  // 4. Start setTimeout(3000)
  // 5. Broadcast BOMB_PLACED
}

explode(bomb) {
  // 1. Call ExplosionSystem.propagate()
  // 2. Get explosion data
  // 3. Call CollisionSystem.checkDamage()
  // 4. Remove bomb
  // 5. player.decrementActiveBombs()
  // 6. Broadcast BOMB_EXPLODED with all effects
}
```

---

### `ExplosionSystem.js`
**Purpose**: Calculate explosion propagation and block destruction

**Responsibilities:**
- Propagate explosion in 4 directions
- Stop at walls
- Destroy blocks (33% powerup spawn)
- Handle chain reactions (bomb hits bomb)
- Create explosion entities

**Key Methods:**
```javascript
constructor(engine)

propagate(bomb) {
  const result = {
    explosions: [],
    destroyedBlocks: [],
    triggeredBombs: [],
    spawnedPowerup: null
  };
  
  // Center explosion
  result.explosions.push({ x: bomb.gridX, y: bomb.gridY, dir: 'CENTER' });
  
  // Propagate in 4 directions
  for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
    for (let dist = 1; dist <= bomb.range; dist++) {
      const [x, y] = getNextCell(bomb.gridX, bomb.gridY, dir, dist);
      
      // Hit wall? Stop
      if (grid.isWall(x, y)) break;
      
      // Hit block? Destroy and stop
      if (grid.isBlock(x, y)) {
        result.destroyedBlocks.push({ x, y });
        destroyBlock(x, y);
        
        // 33% chance spawn powerup
        if (Math.random() < 0.33) {
          result.spawnedPowerup = spawnRandomPowerUp(x, y);
        }
        break;
      }
      
      // Hit bomb? Trigger chain reaction
      if (hasBomb(x, y)) {
        const chainBomb = getBombAt(x, y);
        result.triggeredBombs.push(chainBomb);
        // Don't break - explosion continues
      }
      
      // Create explosion
      result.explosions.push({ x, y, dir });
    }
  }
  
  return result;
}

destroyBlock(gridX, gridY)
spawnRandomPowerUp(gridX, gridY)
```

---

### `CollisionSystem.js`
**Purpose**: Detect and resolve collisions

**Responsibilities:**
- Check explosion vs players (damage)
- Check player vs powerups (collection)
- Apply damage/effects
- Broadcast collision events

**Key Methods:**
```javascript
constructor(engine)

checkExplosionDamage(explosions) {
  const damagedPlayers = [];
  
  for (const player of engine.entities.players.values()) {
    for (const explosion of explosions) {
      if (player.gridX === explosion.x && player.gridY === explosion.y) {
        player.takeDamage();
        damagedPlayers.push({
          playerId: player.playerId,
          livesRemaining: player.lives
        });
        
        if (player.lives <= 0) {
          player.kill();
          // Broadcast PLAYER_DIED
        } else {
          // Broadcast PLAYER_DAMAGED
        }
        break;
      }
    }
  }
  
  return damagedPlayers;
}

checkPowerUpCollection(player) {
  for (const powerup of engine.entities.powerups.values()) {
    if (player.gridX === powerup.gridX && player.gridY === powerup.gridY) {
      // Apply effect
      engine.systems.powerup.applyEffect(player, powerup);
      
      // Remove powerup
      engine.entities.powerups.delete(powerup.id);
      powerup.kill();
      
      // Broadcast POWERUP_COLLECTED
      return powerup;
    }
  }
  return null;
}
```

---

### `PowerUpSystem.js`
**Purpose**: Spawn and apply powerup effects

**Responsibilities:**
- Spawn powerup with random type
- Apply effects to player
- Update player stats

**Key Methods:**
```javascript
constructor(engine)

spawnRandom(gridX, gridY) {
  const types = ['BOMB', 'FLAME', 'SPEED'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const powerup = new PowerUp(gridX, gridY, type);
  engine.entities.powerups.set(powerup.id, powerup);
  
  return powerup;
}

applyEffect(player, powerup) {
  switch (powerup.type) {
    case 'BOMB':
      player.maxBombs++;
      break;
    case 'FLAME':
      player.bombRange++;
      break;
    case 'SPEED':
      player.speed++;
      break;
  }
  
  player.powerups.push(powerup.type);
}
```

---

### `GameSystem.js`
**Purpose**: Check win condition and manage game state

**Responsibilities:**
- Count alive players
- Determine winner
- Trigger GAME_OVER event

**Key Methods:**
```javascript
constructor(engine)

checkWinCondition() {
  const alivePlayers = Array.from(engine.entities.players.values())
    .filter(p => p.isAlive());
  
  if (alivePlayers.length === 1) {
    // Winner!
    const winner = alivePlayers[0];
    this.endGame(winner);
    return true;
  }
  
  if (alivePlayers.length === 0) {
    // Draw (rare - multiple players die at once)
    this.endGame(null);
    return true;
  }
  
  return false;
}

endGame(winner) {
  engine.room.endGame(winner);
  // Broadcast GAME_OVER
}
```

---

## Network (`src/network/`)

### `Connection.js`
**Purpose**: Wrapper around WebSocket connection

**Responsibilities:**
- Store client ID and WebSocket
- Provide clean send interface
- Handle connection state
- Track player info (nickname)

**What it contains:**
```javascript
class Connection {
  constructor(ws, clientId) {
    this.ws = ws;
    this.clientId = clientId;
    this.playerId = null; // Set after joining
    this.nickname = null;
    this.connected = true;
  }
  
  send(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  close() {
    this.connected = false;
    this.ws.close();
  }
}
```

---

### `MessageHandler.js`
**Purpose**: Route incoming WebSocket messages

**Responsibilities:**
- Parse incoming messages
- Validate message format
- Route to appropriate handler
- Handle errors

**Key Methods:**
```javascript
constructor(roomManager)

handle(connection, rawMessage) {
  try {
    const message = JSON.parse(rawMessage);
    
    switch (message.type) {
      case 'JOIN_GAME':
        this.handleJoinGame(connection, message);
        break;
      
      case 'MOVE':
        this.handleMove(connection, message);
        break;
      
      case 'PLACE_BOMB':
        this.handlePlaceBomb(connection, message);
        break;
      
      case 'CHAT_MESSAGE':
        this.handleChat(connection, message);
        break;
      
      default:
        this.sendError(connection, 'Unknown message type');
    }
  } catch (error) {
    this.sendError(connection, 'Invalid message format');
  }
}

handleJoinGame(connection, message) {
  // 1. Validate nickname
  // 2. Call roomManager.joinLobby()
  // 3. Send LOBBY_STATE
}

handleMove(connection, message) {
  // 1. Get player's game room
  // 2. Validate direction
  // 3. Call room.handlePlayerInput()
}

handlePlaceBomb(connection, message) {
  // 1. Get player's game room
  // 2. Call room.handlePlayerInput()
}

handleChat(connection, message) {
  // 1. Sanitize message
  // 2. Get player's game room
  // 3. Broadcast to all players
}
```

---

### `NetworkProtocol.js`
**Purpose**: Define all message types and structures

**Responsibilities:**
- Export message type constants
- Provide message creation helpers
- Document message formats

**What it contains:**
```javascript
// Message Types
export const MessageTypes = {
  // Client → Server
  JOIN_GAME: 'JOIN_GAME',
  MOVE: 'MOVE',
  PLACE_BOMB: 'PLACE_BOMB',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  
  // Server → Client
  CONNECTED: 'CONNECTED',
  LOBBY_STATE: 'LOBBY_STATE',
  PLAYER_JOINED: 'PLAYER_JOINED',
  COUNTDOWN_START: 'COUNTDOWN_START',
  COUNTDOWN_TICK: 'COUNTDOWN_TICK',
  GAME_STARTED: 'GAME_STARTED',
  FULL_STATE: 'FULL_STATE',
  PLAYER_MOVED: 'PLAYER_MOVED',
  BOMB_PLACED: 'BOMB_PLACED',
  BOMB_EXPLODED: 'BOMB_EXPLODED',
  POWERUP_SPAWNED: 'POWERUP_SPAWNED',
  POWERUP_COLLECTED: 'POWERUP_COLLECTED',
  PLAYER_DAMAGED: 'PLAYER_DAMAGED',
  PLAYER_DIED: 'PLAYER_DIED',
  GAME_OVER: 'GAME_OVER',
  ERROR: 'ERROR'
};

// Message Builders
export function createFullStateMessage(engine) {
  return {
    type: MessageTypes.FULL_STATE,
    grid: engine.grid.serialize(),
    players: Array.from(engine.entities.players.values()).map(p => p.serialize()),
    bombs: Array.from(engine.entities.bombs.values()).map(b => b.serialize()),
    powerups: Array.from(engine.entities.powerups.values()).map(p => p.serialize())
  };
}

export function createBombExplodedMessage(bombId, explosionData) {
  return {
    type: MessageTypes.BOMB_EXPLODED,
    bombId,
    explosions: explosionData.explosions,
    destroyedBlocks: explosionData.destroyedBlocks,
    damagedPlayers: explosionData.damagedPlayers,
    spawnedPowerup: explosionData.spawnedPowerup
  };
}

// ... more message builders
```

---

## Utils (`src/utils/`)

### `Grid.js`
**Purpose**: 2D grid manager with collision detection

**Responsibilities:**
- Store 2D grid array
- Provide collision queries
- Update grid state

**What it contains:**
```javascript
class Grid {
  constructor(width, height, initialGrid) {
    this.width = width;
    this.height = height;
    this.grid = initialGrid || this.generateEmpty();
    
    // Grid values
    this.FLOOR = 0;
    this.WALL = 1;
    this.BLOCK = 2;
  }
  
  get(x, y) {
    if (!this.isInBounds(x, y)) return this.WALL;
    return this.grid[y][x];
  }
  
  set(x, y, value) {
    if (this.isInBounds(x, y)) {
      this.grid[y][x] = value;
    }
  }
  
  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  
  isWall(x, y) {
    return this.get(x, y) === this.WALL;
  }
  
  isBlock(x, y) {
    return this.get(x, y) === this.BLOCK;
  }
  
  canMoveTo(x, y) {
    return this.get(x, y) === this.FLOOR;
  }
  
  serialize() {
    return {
      width: this.width,
      height: this.height,
      grid: this.grid
    };
  }
  
  generateEmpty() {
    return Array(this.height).fill(null).map(() => 
      Array(this.width).fill(this.FLOOR)
    );
  }
}
```

---

### `Logger.js`
**Purpose**: Centralized logging utility

**Responsibilities:**
- Log with levels (debug, info, warn, error)
- Format log messages
- Optional file logging

**What it contains:**
```javascript
class Logger {
  static levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  static currentLevel = Logger.levels.INFO;
  
  static setLevel(level) {
    this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
  }
  
  static debug(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()}`, message, ...args);
    }
  }
  
  static info(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log(`[INFO] ${new Date().toISOString()}`, message, ...args);
    }
  }
  
  static warn(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()}`, message, ...args);
    }
  }
  
  static error(message, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()}`, message, ...args);
    }
  }
}

export { Logger };
```

---

## Additional Utilities (Optional)

### `IdGenerator.js`
```javascript
export class IdGenerator {
  static counter = 0;
  
  static generateEntityId() {
    return `entity_${Date.now()}_${this.counter++}`;
  }
  
  static generateRoomId() {
    return `room_${Date.now()}`;
  }
  
  static generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### `MapGenerator.js`
```javascript
export class MapGenerator {
  static generate(width, height) {
    const grid = new Grid(width, height);
    
    // Place walls (chess pattern)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x % 2 === 1 && y % 2 === 1) {
          grid.set(x, y, grid.WALL);
        }
      }
    }
    
    // Place random blocks (avoid corners)
    const safeZones = [
      {x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, // Top-left
      {x: width-1, y: 0}, {x: width-2, y: 0}, {x: width-1, y: 1}, // Top-right
      // ... other corners
    ];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid.get(x, y) === grid.FLOOR && !isInSafeZone(x, y, safeZones)) {
          if (Math.random() < 0.5) { // 50% block density
            grid.set(x, y, grid.BLOCK);
          }
        }
      }
    }
    
    return grid;
  }
}
```
---

## Additional Images
### Flow Diagram

![](./flow-diagram.png)

---
### Classes Diagram
![](./classes-diagram.png)