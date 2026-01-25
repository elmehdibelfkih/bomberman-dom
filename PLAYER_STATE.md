# Player-Specific State Management

## Overview
Each multiplayer player now has its own `PlayerState` instance that manages arrow key input independently.

## Architecture

```
MultiplayerPlayer
    ├── PlayerState (own instance)
    │   ├── Arrow key signals (up, down, left, right)
    │   ├── Event listeners (local player only)
    │   └── Direction setters (remote player only)
    └── Movement logic
```

## How It Works

### Local Player
1. **Keyboard Input** → PlayerState listens to arrow keys
2. **State Update** → Arrow signals are set to true/false
3. **Movement Check** → Player checks `this.state.isArrowUp()` etc.
4. **Predict Move** → Player moves immediately (client-side prediction)
5. **Send to Server** → Movement sent with sequence number
6. **Server Reconciliation** → Correct position if needed

### Remote Player
1. **Server Broadcast** → Receive `PLAYER_MOVED` event
2. **Update State** → Call `updateStateFromServer()`
3. **Set Direction** → `this.state.setDirection('walkingUp')` simulates input
4. **Movement** → Player moves based on simulated state
5. **Animation** → Automatically animates based on direction

## PlayerState Class

### Constructor
```javascript
new PlayerState(isLocal)
```
- `isLocal`: true for local player, false for remote players

### Methods

#### For All Players
```javascript
isArrowUp()     // Check if up arrow is pressed/simulated
isArrowDown()   // Check if down arrow is pressed/simulated
isArrowLeft()   // Check if left arrow is pressed/simulated
isArrowRight()  // Check if right arrow is pressed/simulated
```

#### For Local Players
```javascript
initListeners()      // Start listening to keyboard events
removeListeners()    // Stop listening to keyboard events
handleKeyDown(event) // Handle key press
handleKeyUp(event)   // Handle key release
```

#### For Remote Players
```javascript
setDirection(direction)  // Simulate arrow key press based on server direction
clearDirection()         // Clear all arrow states
```

## Example Flow

### Local Player Movement
```javascript
// User presses arrow up
→ PlayerState.handleKeyDown() sets arrowUp = true
→ Player.up() checks this.state.isArrowUp() → true
→ Player moves up (prediction)
→ Send move to server with sequence number
→ Server validates and broadcasts
→ Player.reconcileWithServer() corrects if needed
```

### Remote Player Movement
```javascript
// Server broadcasts PLAYER_MOVED
→ Player.updateStateFromServer({ x, y, direction: 'walkingUp' })
→ Player.state.setDirection('walkingUp') sets arrowUp = true
→ Player.up() checks this.state.isArrowUp() → true
→ Player moves to new position
→ Animation plays
```

## Benefits

1. **Independent State** - Each player manages its own input
2. **No Conflicts** - Local and remote players don't interfere
3. **Clean Separation** - Local listens to keyboard, remote listens to server
4. **Consistent Logic** - Same movement code for both player types
5. **Easy to Debug** - Each player's state is isolated

## Key Differences from Before

| Before | After |
|--------|-------|
| Shared game.state for all players | Each player has own state |
| gameState parameter passed everywhere | Players use this.state |
| Remote players had no state | Remote players simulate state from server |
| Keyboard events global | Local player only listens to keyboard |

## Cleanup

When a player is removed:
```javascript
player.remove()
  → player.state.removeListeners()  // Clean up event listeners
  → Remove DOM element
```
