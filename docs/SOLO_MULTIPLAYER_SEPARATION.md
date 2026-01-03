# Solo vs Multiplayer Logic Separation

## Overview
The Bomberman game has been split into two distinct game modes with separate logic paths:

### Solo Mode
- **Engine**: `SoloGameEngine.js`
- **Entry Point**: 
  - `/frontend/solo/main.js` (standalone)
- **Features**:
  - Local gameplay only
  - Enemy AI system
  - Level progression (10 levels)
  - Lives system (3 lives)
  - Timer-based gameplay
  - Power-up collection
  - Score tracking

### Multiplayer Mode
- **Engine**: `MultiplayerGameEngine.js`
- **Entry Point**:
  - `/frontend/multiplayer/main.js` (standalone)
- **Features**:
  - Network-synchronized gameplay
  - Real-time player interactions
  - Server-authoritative game state
  - Lobby system with chat
  - Limited map pool (5 maps)
  - Single life per round
  - No AI enemies

## Architecture Changes

### Frontend Separation

#### Solo Game Engine (`SoloGameEngine.js`)
```javascript
- Inherits all original Game class functionality
- Manages local game state
- Handles enemy AI
- Processes level progression
- No network dependencies
```

#### Multiplayer Game Engine (`MultiplayerGameEngine.js`)
```javascript
- Network-aware game engine
- Receives state updates from server
- Sends player actions to server
- Handles multiplayer-specific events
- No local AI or progression logic
```

### Server-Side Changes

#### Multiplayer-Only Server
- Server only handles multiplayer games
- Uses limited map pool (maps 1-5)
- Authoritative game state management
- Real-time synchronization
- Player matchmaking and lobbies

#### Map Handler Separation
- `getMultiplayerMap()`: Returns maps 1-5 for multiplayer
- Solo mode uses all maps 1-10 locally

## File Structure

```
frontend/
├── framework/
│   ├── dom/
│   ├── event/
│   ├── libs/
│   ├── router/
│   └── state/
├── solo/
│   ├── index.html          # Standalone solo entry
│   └── main.js            # Solo-only application
├── multiplayer/
│   ├── index.html          # Standalone multiplayer entry
│   └── main.js            # Multiplayer-only application
├── game/
│   ├── engine/
│   │   ├── SoloGameEngine.js      # Solo game logic
│   │   └── MultiplayerGameEngine.js # Multiplayer game logic
server/
├── core/                         # Multiplayer-only server logic
├── handlers/
│   └── mapHandler.js            # Multiplayer map serving
└── ...
shared/
├── mode-config.js               # Game mode configuration
└── ...
```

## Usage

### Standalone Applications
- **Main Menu**: Navigate to `/frontend/index.html`
- From the main menu, you can choose:
  - **Solo**: Which will take you to `/frontend/solo/index.html`
  - **Multiplayer**: Which will take you to `/frontend/multiplayer/index.html`

### Server
- Only serves multiplayer functionality
- Start with `npm start` or `node server/index.js`

## Benefits

1. **Clean Separation**: Solo and multiplayer logic are completely isolated
2. **Reduced Complexity**: Each engine handles only its specific requirements
3. **Better Performance**: No unnecessary network code in solo mode
4. **Easier Maintenance**: Changes to one mode don't affect the other
5. **Scalability**: Each mode can be optimized independently

## Migration Notes

- Old `Game` class in `core.js` is deprecated
- Use `SoloGameEngine.getInstance()` for solo games
- Use `MultiplayerGameEngine.getInstance()` for multiplayer games
- Server only handles multiplayer - no solo server logic needed