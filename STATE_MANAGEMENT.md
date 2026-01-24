# State Management - Solo vs Multiplayer

## Overview
The state management has been split into two separate classes to handle the different requirements of solo and multiplayer modes.

## Architecture

```
BaseState (Common functionality)
    ├── SoloState (Solo mode features)
    └── MultiplayerState (Multiplayer mode features)
```

### BaseState
Contains common functionality for both modes:
- Arrow key state management (up, down, left, right)
- Keyboard event listeners
- Signal-based state updates

### SoloState
Extends BaseState with solo-specific features:
- **Timer management** - startTimer(), stopTimer(), resetTimer()
- **Level progression** - nextLevel(), getLevel(), maxLevel()
- **Lives and score** - setLives(), getLives(), setScore(), getScore()
- **Pause functionality** - pauseStart(), isPaused()
- **Bomb management** - setBombCount(), getMaxAllowdBombCount()
- **Sound controls** - switch(), isSoundOn()
- **Game over handling** - GameOver(), isGameOver()
- **Restart functionality** - Restar(), Isrestar()

### MultiplayerState
Extends BaseState with minimal multiplayer features:
- **No timer** - Timer methods are no-ops
- **No levels** - Always returns level 1
- **No score** - Score methods are no-ops
- **No pause** - Pause is always false (game runs continuously)
- **No lives** - Lives managed by server
- **No bomb count** - Managed by player stats from server
- **No sound toggle** - Sound always on
- **No game over** - Handled by game engine
- **No restart** - Not applicable in multiplayer

## Usage

### Automatic Mode Detection
The State factory automatically creates the correct state type:

```javascript
// In SoloGameEngine
this.isMultiplayer = false;
this.state = State.getInstance(this); // Creates SoloState

// In MultiplayerGameEngine
this.isMultiplayer = true;
this.state = State.getInstance(this); // Creates MultiplayerState
```

### Direct Usage
You can also import and use states directly:

```javascript
import { SoloState, MultiplayerState } from './engine/state.js';

const soloState = new SoloState(game);
const multiState = new MultiplayerState(game);
```

## Key Differences

| Feature | Solo Mode | Multiplayer Mode |
|---------|-----------|------------------|
| Timer | ✅ Yes | ❌ No |
| Levels | ✅ Yes (1-10) | ❌ No (always 1) |
| Pause | ✅ Yes (P key) | ❌ No |
| Score | ✅ Yes | ❌ No |
| Lives | ✅ Yes (managed locally) | ❌ No (server-managed) |
| Bomb Count | ✅ Yes (local tracking) | ❌ No (player stats) |
| Sound Toggle | ✅ Yes | ❌ No |
| Restart | ✅ Yes (R key) | ❌ No |
| Game Over | ✅ Yes (local) | ❌ No (server decides) |

## Benefits

1. **Separation of Concerns** - Each mode has only the features it needs
2. **No Dead Code** - Multiplayer doesn't carry solo-specific logic
3. **Type Safety** - Clear interface for each mode
4. **Easy Maintenance** - Changes to one mode don't affect the other
5. **Performance** - No unnecessary checks for unused features

## State Lifecycle

### Solo Mode
```
SoloGameEngine created
  → isMultiplayer = false
  → State.getInstance() creates SoloState
  → Timer starts, pause enabled, levels tracked
```

### Multiplayer Mode
```
MultiplayerGameEngine created
  → isMultiplayer = true
  → State.getInstance() creates MultiplayerState
  → No timer, no pause, server manages game state
```

### Cleanup
```javascript
// Reset state when switching modes
State.resetInstance();
SoloGameEngine.resetInstance();
// or
MultiplayerGameEngine.resetInstance();
```
