# Frontend Structure

This frontend follows a clean architecture pattern similar to the backend structure.

## Directory Structure

```
frontend/
├── framework/              # Custom framework (DOM, router, state, events)
├── core/                   # Core game logic
│   ├── GameEngine.js       # Client-side game engine
│   ├── GameState.js        # Local game state management
│   └── InputManager.js     # Player input handling
├── entities/               # Game entities
│   ├── Entity.js           # Base entity class
│   ├── Player.js           # Player entity
│   ├── Bomb.js             # Bomb entity
│   └── PowerUp.js          # PowerUp entity
├── network/                # Network layer
│   ├── NetworkManager.js   # WebSocket connection
│   ├── MessageHandler.js   # Message routing
│   └── StateSync.js        # State synchronization
├── renderer/               # Rendering layer
│   ├── Renderer.js         # Base renderer
│   ├── GridRenderer.js     # Map rendering
│   └── EntityRenderer.js   # Entity rendering
├── ui/                     # UI components
│   ├── components/         # Reusable components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   └── Modal.js
│   ├── pages/              # Page components
│   │   ├── HomePage.js
│   │   ├── LobbyPage.js
│   │   └── GamePage.js
│   └── layouts/            # Layout components
│       └── MainLayout.js
├── utils/                  # Utilities
│   ├── Logger.js
│   ├── collision.js
│   └── helpers.js
├── assets/                 # Static assets
│   ├── images/
│   ├── sounds/
│   └── styles/
├── config/                 # Configuration
│   └── client-config.js
└── index.js                # Entry point
```

## Architecture Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Entity-Based**: All game objects inherit from Entity base class
3. **Framework Integration**: Uses custom framework for DOM/routing/state
4. **Network Abstraction**: Clean network layer with message handling
5. **Minimal Code**: Only essential code, no bloat

## Layer Responsibilities

- **core/**: Game loop, state management, input handling
- **entities/**: Game object definitions and behaviors
- **network/**: WebSocket communication and state sync
- **renderer/**: Canvas rendering logic
- **ui/**: User interface components using framework
- **utils/**: Shared utility functions

## Usage

Import from the appropriate layer:

```javascript
import { GameEngine } from './core/GameEngine.js';
import { Player } from './entities/Player.js';
import { NetworkManager } from './network/NetworkManager.js';
import { Renderer } from './renderer/Renderer.js';
```
