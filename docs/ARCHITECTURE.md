# Bomberman-DOM Backend Architecture

## Architecture Diagrams

### System Flow
```
Client (Browser) ←→ WebSocket ←→ Server (Node.js)
     ↓                                ↓
  UI Layer                      Room Manager
  Input Handler                      ↓
  Render (60fps)               Game Room Instance
  State Signals                      ↓
                                 Game Engine (ECS)
                                 ↓    ↓    ↓
                              Entities Systems Grid
```

### Game Flow States
```
DISCONNECTED → CONNECTED → LOBBY → COUNTDOWN → PLAYING → ENDED
```

---

## Core Components

### 1. Room Manager

**Responsibilities:**
- Manage lobbies (waiting rooms)
- Player counting and matchmaking
- Automatic game start timers

**Auto-Start Rules:**
- 2nd player joins → start 20s timer
- 4 players join (before 20s) → start 10s countdown → game starts
- 20s expires (2-3 players) → start 10s countdown → game starts
- Game cannot start with <2 players

### 2. Game Room

**Responsibilities:**
- Manage single game session
- Handle player connections
- Route inputs to game engine
- Broadcast events to all clients

**Lifecycle:**
1. Created by Room Manager
2. Initialize Game Engine
3. Spawn players at corners
4. Handle game events
5. Clean up on game end

### 3. Game Engine (ECS)

**Entity Collections:**
- `players: Map<playerId, Player>`
- `bombs: Map<bombId, Bomb>`
- `explosions: Set<Explosion>`
- `powerups: Map<powerupId, PowerUp>`
- `blocks: Set<Block>`
- `grid: Grid` (2D array)

**Systems:**
- **MovementSystem**: Process player movement, validate collision
- **BombSystem**: Place bombs, manage timers (3s), trigger explosions
- **ExplosionSystem**: Propagate explosions, destroy blocks, chain reactions
- **CollisionSystem**: Detect damage, powerup collection
- **PowerUpSystem**: Spawn (33% chance), apply effects
- **GameSystem**: Check win condition (last player standing)

---

## Game Mechanics

### Map
- Fixed size grid
- **Walls**: Indestructible, fixed positions
- **Blocks**: Destructible, randomly generated (avoid spawn corners)
- **Spawn Points**: 4 corners

### Bomb Mechanics
1. Player places bomb → creates Bomb entity
2. Server starts `setTimeout(3000ms)`
3. Timer expires → BombSystem.explode()
4. Propagate explosion in 4 directions (range tiles)
5. Stop at walls, destroy blocks, damage players
6. 33% chance to spawn powerup from destroyed block

### PowerUps
- **Bombs**: maxBombs++
- **Flames**: bombRange++
- **Speed**: speed++

### Win Condition
- Last player with lives > 0
- All others have 0 lives

---

## State Synchronization

**No Tick Broadcasting** - Pure event-driven:

1. **On Join**: Send FULL_STATE once
2. **On Event**: Broadcast specific event with complete data
3. **Client**: Maintains local state updated by events
4. **Rendering**: Client 60fps RAF loop (independent of server)

---

## File Structure
```
server/
├── src/
│   ├── index.js                 # Entry point
│   ├── core/
│   │   ├── GameEngine.js        # ECS orchestrator
│   │   ├── GameRoom.js          # Session manager
│   │   └── RoomManager.js       # Lobby manager
│   ├── entities/
│   │   ├── Entity.js            # Base class
│   │   ├── Player.js
│   │   ├── Bomb.js
│   │   ├── Explosion.js
│   │   ├── PowerUp.js
│   │   └── Block.js
│   ├── systems/
│   │   ├── MovementSystem.js
│   │   ├── BombSystem.js
│   │   ├── ExplosionSystem.js
│   │   ├── CollisionSystem.js
│   │   ├── PowerUpSystem.js
│   │   └── GameSystem.js
│   ├── network/
│   │   ├── Connection.js
│   │   ├── MessageHandler.js
│   │   └── NetworkProtocol.js
│   └── utils/
│       ├── Grid.js
│       └── Logger.js
└── package.json

client/
├── framework/                   # Custom framework
├── src/
│   ├── components/
│   ├── services/
│   │   ├── NetworkService.js
│   │   └── GameStateService.js
│   └── game/
│       ├── GameView.js
│       ├── Chat.js
│       └── Lobby.js
└── package.json
```

---

## Security Considerations

- Input validation (rate limiting, bounds checking)
- No client-side game logic
- WebSocket authentication via tokens
- Sanitize chat messages (XSS prevention)