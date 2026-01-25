# State Management - Simplified Architecture

## Overview
The state management has been simplified to just two state classes:
- **SoloState** - For single-player mode
- **PlayerState** - For multiplayer mode (per-player state)

## Architecture

```
Solo Mode:
  SoloGameEngine → SoloState (game-level state)

Multiplayer Mode:
  MultiplayerGameEngine → PlayerState (dummy, for compatibility)
  Each MultiplayerPlayer → PlayerState (real player state)
```

## SoloState
Complete game state for single-player mode:
- ✅ Arrow key input
- ✅ Timer management
- ✅ Level progression (1-10)
- ✅ Lives and score
- ✅ Pause functionality
- ✅ Bomb management
- ✅ Sound controls
- ✅ Game over handling

## PlayerState
Minimal state for multiplayer players:
- ✅ Arrow key input (per player)
- ✅ Local player: Listens to keyboard
- ✅ Remote player: Simulates from server
- ❌ No timer, levels, score (server manages)
- ❌ Stub methods for compatibility

## Usage

### Solo Mode
```javascript
const state = State.getInstance(game); // Returns SoloState
state.startTimer();
state.nextLevel();
state.setScore(100);
```

### Multiplayer Mode
```javascript
// Game engine gets dummy state
const gameState = State.getInstance(game); // Returns PlayerState (dummy)

// Each player has real state
const player = new MultiplayerPlayer(data, isLocal, image);
player.state.isArrowUp(); // Real player input
```

## Files

1. **state.js** - Factory that returns appropriate state
2. **SoloState.js** - Full game state for solo mode
3. **PlayerState.js** - Per-player state for multiplayer

## Cleanup

Removed files:
- ❌ BaseState.js (merged into SoloState)
- ❌ MultiplayerState.js (replaced by PlayerState)

## Benefits

1. **Simpler** - Only 2 state classes instead of 4
2. **Clear Purpose** - SoloState for solo, PlayerState for multiplayer
3. **No Inheritance** - No confusing base class
4. **Self-Contained** - Each state has everything it needs
