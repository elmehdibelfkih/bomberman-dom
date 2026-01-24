# Multiplayer Player State Management

## Overview
Each player now manages its own state with client-side prediction and server reconciliation.

## Architecture

### MultiplayerPlayer Class
Each player instance (local or remote) manages:
- Position (x, y, gridX, gridY)
- Stats (lives, speed, bombCount, bombRange)
- Animation state (direction, frameIndex, movement)
- For local players: sequence numbers and pending moves

### Game Loop Flow

#### Local Player:
1. **Input Handling** → Player detects arrow keys in `movePlayer()`
2. **Client Prediction** → Player immediately updates position locally
3. **Send to Server** → PlayerManager sends move with sequence number
4. **Server Response** → Receive `PLAYER_MOVED` broadcast
5. **Reconciliation** → Player corrects position if server differs

#### Remote Player:
1. **Receive Broadcast** → Get `PLAYER_MOVED` from server
2. **Update State** → Call `updateStateFromServer()` with new position
3. **Animate** → Automatically animate based on position change

## Key Methods

### MultiplayerPlayer

```javascript
// For local player - predict movement
predictMove(direction, game)
// Returns: { sequenceNumber, direction, x, y } or null

// For local player - reconcile with server
reconcileWithServer(serverData, networkManager)
// Corrects position if prediction was wrong

// For remote player - update from server
updateStateFromServer(serverData)
// Updates position and stats, triggers animation
```

### MultiplayerPlayerManager

```javascript
// Called every frame
update(timestamp)
// Updates all players, sends local player moves to server

// Handle server response for local player
reconcileLocalPlayer(data)
// Delegates to player.reconcileWithServer()

// Handle server broadcast for remote players
updateRemotePlayer(data)
// Delegates to player.updateStateFromServer()
```

## Sequence Number Flow

```
Client (Local Player):
  sequenceNumber = 1
  Move UP → predict position
  Send: { direction: 'UP', sequenceNumber: 1 }
  pendingMoves = [{ seq: 1, x: 100, y: 95 }]

Server:
  Validates move
  Broadcasts: { playerId, x: 100, y: 95, sequenceNumber: 1 }

Client (Local Player):
  Receives broadcast
  Removes moves with seq <= 1 from pendingMoves
  Checks if position matches prediction
  If error > 5px → corrects position
```

## Benefits

1. **Responsive Controls** - Local player moves immediately
2. **Smooth Remote Players** - Animation based on position changes
3. **Self-Contained State** - Each player manages its own data
4. **Easy to Debug** - State is encapsulated in player class
5. **Scalable** - Adding new player properties is simple
