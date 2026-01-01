# Bomberman DOM - Multiplayer Game

A fully-featured multiplayer bomberman game built with a custom reactive framework, WebSockets, and Node.js.

## 🎮 Features

### Core Gameplay
- **Multiplayer Support**: 2-4 players per game
- **Real-time Gameplay**: WebSocket-based synchronization
- **Classic Mechanics**: Bombs, explosions, power-ups, destructible blocks
- **Lives System**: 3 lives per player
- **Power-ups**: Speed boost, extra bombs, increased explosion range

### Technical Features
- **Custom Framework**: Built with reactive signals and effects
- **60 FPS Performance**: Optimized game loop with requestAnimationFrame
- **Reactive State Management**: Automatic UI updates
- **Client-Server Architecture**: Authoritative server with client prediction
- **Lobby System**: Automatic matchmaking with countdown timers
- **Chat System**: Real-time messaging between players

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Modern web browser with WebSocket support

### Installation & Running

1. **Start the server**
   ```bash
   ./start-server.sh
   ```
   Or manually:
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Open the game**
   - Navigate to `http://localhost:9090` in your browser
   - Enter a nickname
   - Wait for other players or start with 2+ players

## 🎯 How to Play

### Controls
- **Arrow Keys**: Move your character
- **Spacebar**: Place bomb
- **P**: Pause/Resume game
- **Escape**: Open menu

### Game Rules
1. **Objective**: Be the last player standing
2. **Lives**: Each player starts with 3 lives
3. **Bombs**: Place bombs to destroy blocks and eliminate opponents
4. **Power-ups**: Collect power-ups from destroyed blocks

### Multiplayer Flow
1. **Lobby**: Enter nickname and wait for players (2-4)
2. **Countdown**: 20-second wait, then 10-second countdown
3. **Game**: Real-time multiplayer battle
4. **Results**: Winner announcement and score display

---

**Happy Gaming! 🎮💣**
