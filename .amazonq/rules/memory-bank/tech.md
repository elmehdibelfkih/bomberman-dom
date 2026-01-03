# Technology Stack

## Programming Languages
- **JavaScript (ES6+)**: Primary language for both client and server
- **HTML5**: Markup for game interface and structure
- **CSS3**: Styling and animations for game UI
- **JSON**: Configuration files for maps and game data

## Runtime Environments
- **Node.js**: Server-side JavaScript runtime
- **Web Browsers**: Client-side execution environment

## Core Dependencies

### Server Dependencies
- **ws (^8.18.0)**: WebSocket library for real-time communication
- **Node.js built-ins**: http, fs, path, url modules

### Frontend Dependencies
- **Native Web APIs**: WebSocket, Canvas, Audio, DOM APIs
- **ES6 Modules**: Native module system for code organization

## Build System
- **Native ES Modules**: No bundler required, direct module imports
- **Package.json Scripts**:
  - `npm start`: Launches the game server
- **Makefile**: Additional build automation (if present)

## Development Tools
- **Git**: Version control system
- **npm**: Package management
- **Shell Scripts**: Server startup and testing utilities
  - `start-server.sh`: Server launch script
  - `test-*.sh`: Various testing scripts

## Architecture Technologies
- **WebSockets**: Real-time bidirectional communication
- **Custom DOM Framework**: Lightweight alternative to React/Vue
- **Client-side Routing**: SPA navigation without external router
- **Canvas API**: Game rendering and animations
- **Web Audio API**: Sound effects and background music

## File Formats
- **PNG**: Sprite images and game assets
- **MP3/OGG**: Audio files for sound effects and music
- **JSON**: Map data, configuration, and coordinate files
- **SVG**: UI icons and vector graphics

## Development Commands
```bash
# Start the server
npm start
# or
node server/index.js

# Launch server with script
./start-server.sh

# Run tests
./test-lobby.sh
./test-multiplayer-engine.sh
./test-network-state.sh
```

## Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **ES6+ Support**: Required for module imports and modern JavaScript features
- **WebSocket Support**: Essential for multiplayer functionality
- **Canvas Support**: Needed for game rendering