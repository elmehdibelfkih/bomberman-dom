# Multiplayer Architecture Documentation

## Overview

The multiplayer system uses **NetworkManager as the ONLY connection layer** between frontend and backend. All communication flows through a single WebSocket connection managed by a SharedWorker.

## Communication Flow

```
Backend WebSocket Server (port 9090)
         ↕
    SharedWorker (shared_worker.js)
         ↕
  NetworkManager (singleton)
         ↕
   Game Components
```

## Message Flow Example: GAME_STARTED

When the backend sends a `GAME_STARTED` message:

### 1. Backend sends message:
```json
{
    "type": "GAME_STARTED",
    "roomId": "room_1767459100073_0",
    "mapId": 4,
    "mapData": {
        "name": "Double Trouble",
        "initial_grid": [[1,1,1,...], ...],
        "block_size": 68,
        "explosion_time": 2000,
        ...
    },
    "players": [
        {
            "playerId": "player_1767459072931_hphbyw6xq",
            "nickname": "ssss",
            "gridX": 1,
            "gridY": 1,
            "lives": 3,
            "speed": 1,
            "bombCount": 1,
            "bombRange": 1,
            "alive": true
        },
        ...
    ],
    "yourPlayerId": "player_1767458258216_sa41w1v6n",
    "initialState": {
        "bombs": [],
        "powerups": [],
        "timestamp": 1767459100075
    }
}
```

### 2. SharedWorker receives and broadcasts:
- WebSocket receives message in `shared_worker.js:24`
- Message is broadcast to all connected ports via `#broadcast()` at line 26
- All tabs/windows with active NetworkManager instances receive the message

### 3. NetworkManager processes:
- Port receives message in `NetworkManager.js:33`
- `#handleMessage()` parses JSON and identifies message type at line 58
- Checks for registered handlers for type 'GAME_STARTED' at line 66
- Executes all registered handlers with the data

### 4. MultiplayerApp handles GAME_STARTED:
In `main.js:247-250`:
```javascript
const gameStartedHandler = (data) => {
    this.gameData = data;
    this.router.navigate('/game', true);
};
```

### 5. Game initialization:
In `main.js:359-370`:
```javascript
async startMultiplayerGame() {
    this.game = MultiplayerGameEngine.getInstance();
    this.game.setNetworkManager(this.networkManager);

    // Setup multiplayer synchronization
    setupMultiplayerSync(this.game, this.networkManager);

    await this.game.intiElements(this.gameData.mapData);
    // ... rest of game setup
}
```

### 6. MultiplayerSync registers handlers:
In `MultiplayerSync.js:20-22`:
```javascript
networkManager.on('GAME_STARTED', (data) => {
    game.playerManager.initializePlayers(data);
});
```

### 7. Players are initialized:
In `MultiplayerPlayerManager.js:20-59`:
- Gets local player ID from NetworkManager
- Creates player objects for all players
- Assigns spawn positions
- Creates DOM elements for local and remote players
- Sets up keyboard controls

## All Message Types Handled by NetworkManager

### Outgoing Messages (Client → Server)
All sent via `NetworkManager` methods:

| Method | Message Type | Purpose |
|--------|-------------|---------|
| `joinGame(nickname)` | `JOIN_GAME` | Join the lobby with a nickname |
| `sendPlayerMove(direction)` | `MOVE` | Send player movement (UP/DOWN/LEFT/RIGHT) |
| `sendPlaceBomb()` | `PLACE_BOMB` | Place a bomb at current position |
| `sendChat(text)` | `CHAT_MESSAGE` | Send chat message |
| `quitGame()` | `QUIT_GAME` | Leave the game |
| `requestGameState()` | `REQUEST_STATE` | Request full game state update |

### Incoming Messages (Server → Client)
All received via `NetworkManager.on()`:

| Message Type | Handler Location | Purpose |
|-------------|------------------|---------|
| `LOBBY_JOINED` | `main.js:221` | Confirm lobby join, get player list |
| `PLAYER_JOINED` | `main.js:225` | New player joined lobby |
| `PLAYER_LEFT` | `main.js:230` | Player left lobby |
| `COUNTDOWN_START` | `main.js:235` | Game countdown started |
| `COUNTDOWN_TICK` | `main.js:240` | Countdown tick update |
| `GAME_STARTED` | `main.js:247` + `MultiplayerSync.js:20` | Game started with initial state |
| `CHAT_MESSAGE` | `main.js:252` + `main.js:450` | Chat message received |
| `FULL_STATE` | `MultiplayerSync.js:25` | Complete authoritative game state |
| `PLAYER_MOVED` | `MultiplayerSync.js:30` | Player movement update |
| `BOMB_PLACED` | `MultiplayerSync.js:37` | Bomb placed on grid |
| `BOMB_EXPLODED` | `MultiplayerSync.js:42` | Bomb exploded with effects |
| `POWERUP_COLLECTED` | `MultiplayerSync.js:47` | Power-up collected by player |
| `PLAYER_DAMAGED` | `MultiplayerSync.js:52` | Player took damage |
| `PLAYER_DIED` | `MultiplayerSync.js:57` | Player died |
| `GAME_OVER` | `MultiplayerSync.js:62` | Game ended with winner |

## Key Components

### 1. SharedWorker (`shared_worker.js`)
- **Purpose**: Maintain a single WebSocket connection shared across all browser tabs
- **WebSocket URL**: `ws://localhost:9090`
- **Features**:
  - Automatic reconnection (5-second delay)
  - Message queuing for messages sent before connection is ready
  - Port management for multiple tabs
  - Broadcasts all incoming messages to all connected ports

### 2. NetworkManager (`NetworkManager.js`)
- **Pattern**: Singleton
- **Purpose**: Provide a clean API for all network communication
- **Features**:
  - Event-based message handling (observer pattern)
  - Type-safe message sending methods
  - Automatic playerId tracking
  - Connection state management
- **Key Methods**:
  - `getInstance()` - Get singleton instance
  - `on(messageType, handler)` - Register message handler
  - `off(messageType, handler)` - Unregister handler
  - `send(message)` - Send raw message
  - Specialized sending methods (see table above)

### 3. MultiplayerSync (`MultiplayerSync.js`)
- **Purpose**: Set up all game-related network event handlers
- **Initializes**:
  - `MultiplayerPlayerManager` - Player synchronization
  - `NetworkStateSynchronizer` - Server-authoritative state sync
  - All game event handlers

### 4. MultiplayerPlayerManager (`MultiplayerPlayerManager.js`)
- **Purpose**: Manage all players (local and remote)
- **Responsibilities**:
  - Create and position player elements
  - Handle keyboard input for local player
  - Send movement/bomb commands via NetworkManager
  - Update remote player positions
  - Track player stats (lives, speed, bomb count, etc.)
  - Handle player damage and death

### 5. NetworkStateSynchronizer (`NetworkStateSynchronizer.js`)
- **Purpose**: Keep game state in sync with authoritative server
- **Features**:
  - Server authority - server state is always correct
  - Client prediction for local player (with reconciliation)
  - Interpolation buffer for smooth remote player movement
  - Syncs: players, bombs, power-ups, map state
  - Lag compensation

## Single Player Movement Example

Shows how a simple movement flows through the entire system:

1. **Player presses arrow key**
   - `MultiplayerPlayerManager.js:113` - Event listener catches keydown

2. **Local prediction**
   - `MultiplayerPlayerManager.js:143` - `movePlayer()` validates and updates local position
   - Player element moves immediately on screen (no lag)

3. **Send to server**
   - `MultiplayerPlayerManager.js:138` - `networkManager.sendPlayerMove(direction)`
   - `NetworkManager.js:119-124` - Sends MOVE message

4. **Message travels**
   - NetworkManager → SharedWorker → WebSocket → Backend

5. **Server validates and broadcasts**
   - Server validates movement is legal
   - Server broadcasts PLAYER_MOVED to all players

6. **Receive update**
   - WebSocket → SharedWorker → NetworkManager
   - `MultiplayerSync.js:30` - PLAYER_MOVED handler

7. **Reconciliation**
   - For remote players: update position immediately
   - For local player: `NetworkStateSynchronizer.js:76` reconciles prediction
   - If position differs significantly, snap to server position

## Multi-Player Synchronization

When multiple players are in the game:

1. **Each player has their own NetworkManager instance** (singleton per tab/window)
2. **All share the same WebSocket connection** (via SharedWorker)
3. **Server is authoritative** - server decides what happens
4. **Client prediction** - local player moves instantly for responsive feel
5. **Server reconciliation** - corrections applied when needed
6. **Remote players** - always use server position (no prediction)

Example with 2 players:

```
Player A presses right arrow:
  A's client: Moves A locally (prediction)
  A's client: Sends MOVE message via NetworkManager
  Server: Validates A's movement
  Server: Broadcasts PLAYER_MOVED to all players
  A's client: Reconciles prediction with server state
  B's client: Updates A's position on their screen
```

## Error Handling and Resilience

1. **Connection Loss**
   - SharedWorker automatically attempts reconnection every 5 seconds
   - Messages sent during disconnect are queued
   - Queue bursts when connection restored

2. **Port Validation**
   - SharedWorker validates ports are alive before sending
   - Dead ports are automatically removed

3. **Message Validation**
   - NetworkManager validates JSON parsing
   - Invalid messages are logged and ignored

4. **State Synchronization**
   - NetworkStateSynchronizer can request full state update
   - Triggered if too much time passes without server update (>1s)

## Best Practices

1. **Always use NetworkManager methods** - Never send raw messages
2. **Register handlers early** - Before game state changes
3. **Unregister handlers on cleanup** - Prevent memory leaks
4. **Trust server state** - Client predictions are hints only
5. **Handle all message types** - Server may send unexpected messages

## Adding New Message Types

To add a new message type:

1. **Add sending method to NetworkManager**:
```javascript
sendNewAction(param) {
    this.send({
        type: 'NEW_ACTION',
        param
    });
}
```

2. **Register handler in appropriate component**:
```javascript
networkManager.on('NEW_ACTION_RESPONSE', (data) => {
    // Handle response
});
```

3. **Update this documentation**!

## Testing Network Communication

A comprehensive test page is available at `/frontend/game/test-network.html` that allows you to:

### Test Page Features:
1. **Initialize NetworkManager** - Set up the SharedWorker connection
2. **Join Lobby** - Enter a nickname and join the game lobby
3. **Game Actions** - Test movement (UP/DOWN/LEFT/RIGHT) and bomb placement
4. **Request Game State** - Manually request full game state from server
5. **Chat** - Send and receive chat messages
6. **Real-time Logging** - See all incoming and outgoing messages
7. **Connection Status** - Visual indicator of connection state

### How to Use:
1. Open `/frontend/game/test-network.html` in your browser
2. Click "Initialize SharedWorker" to connect
3. Enter a nickname and click "Join Lobby"
4. Open the same page in another tab/window to simulate multiple players
5. Watch the real-time logs to see all network messages

### NetworkManager Methods Used in Test:
```javascript
// Connection
network = NetworkManager.getInstance();

// Lobby
network.joinGame(nickname);

// Game Actions
network.sendPlayerMove('UP' | 'DOWN' | 'LEFT' | 'RIGHT');
network.sendPlaceBomb();
network.requestGameState();

// Communication
network.sendChat(message);
network.quitGame();

// Event Handlers
network.on(messageType, handler);
```

All events are logged in real-time with color-coded severity (success/info/error).

## Summary

**There is only ONE connection method in the multiplayer system: NetworkManager**

The architecture is clean, centralized, and follows these principles:
- Single Responsibility: Each component has one job
- Singleton: Only one NetworkManager per tab
- Observer Pattern: Event-based message handling
- Server Authority: Server state is always correct
- Client Prediction: Responsive local player movement

**No redundant connection methods exist.** All backend communication flows through:
SharedWorker → NetworkManager → Game Components

This ensures:
- Consistent connection state
- Easy debugging (single point of communication)
- Efficient resource usage (one WebSocket for all tabs)
- Clean separation of concerns
