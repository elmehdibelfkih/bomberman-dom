# Project Structure

## Directory Organization

### Frontend (`/frontend/`)
**Client-side game implementation and web framework**

- `framework/` - Custom web framework components
  - `dom/` - DOM manipulation utilities (dom.js, tags.js, show.js)
  - `event/` - Event system (event_emitter.js, event.js)
  - `router/` - Client-side routing (router.js, useRouter.js)
  - `state/` - State management (signal.js)
  - `libs/` - Utility libraries (fetch_config.js, validate_html_node.js)

- `game/` - Core game implementation
  - `components/` - Game entities (player.js, bomb.js, enemy.js, map.js, ui.js)
  - `engine/` - Game engine (core.js, state.js)
  - `network/` - Multiplayer networking (NetworkManager.js, MultiplayerSync.js)
  - `utils/` - Game utilities (consts.js, helpers.js, ChatNotification.js)
  - `assets/` - Game resources (images, audio, maps)

### Server (`/server/`)
**Node.js backend for multiplayer functionality**

- `core/` - Game server core (AuthoritativeGameState.js, GameEngine.js, RoomManager.js)
- `entities/` - Server-side game objects (Player.js, Bomb.js, Entity.js, Explosion.js)
- `systems/` - Game logic systems (BombSystem.js, CollisionSystem.js, MovementSystem.js)
- `network/` - Network communication (Connection.js, MessageHandler.js, MessageBuilder.js)
- `handlers/` - Request handlers (roomHandler.js, mapHandler.js, staticHandler.js)
- `utils/` - Server utilities (Grid.js, Logger.js, IdGenerator.js, validation.js)

### Shared (`/shared/`)
**Common code between client and server**
- `constants.js` - Game constants
- `game-config.js` - Configuration settings
- `message-types.js` - Network message definitions
- `helpers.js` - Shared utility functions

## Core Components

### Game Architecture
- **Client-Server Model**: Authoritative server with client prediction
- **Entity-Component System**: Modular game object architecture
- **State Synchronization**: Real-time state updates via WebSockets
- **Custom Framework**: Lightweight DOM manipulation and routing

### Key Relationships
- Frontend framework provides DOM utilities and routing for game UI
- Game components interact with engine for state management
- Network layer synchronizes client and server game states
- Shared modules ensure consistency between client and server logic
- Asset management handles game resources (sprites, audio, maps)

## Architectural Patterns
- **Singleton Pattern**: Game instance, NetworkManager, RoomManager
- **Observer Pattern**: Event system for game state changes
- **Factory Pattern**: Entity creation and message building
- **Module Pattern**: ES6 modules for code organization
- **MVC Pattern**: Separation of game logic, rendering, and user input