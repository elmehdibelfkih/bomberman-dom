# Bomberman-DOM Multiplayer Analysis

This document provides a detailed analysis of the multiplayer mode in the Bomberman-DOM project. It covers the overall architecture, frontend-backend communication, movement handling, and a report on potential design flaws.

## 1. Overall Multiplayer Architecture

The multiplayer architecture is designed around a central WebSocket server that acts as the authoritative source of truth for the game state. Clients (browsers) connect to this server and exchange messages to stay in sync.

The architecture follows a client-server model with a server-authoritative game state. This is a robust approach for multiplayer games as it prevents cheating and ensures a consistent experience for all players.

### Key Components:

*   **HTTP Server (`server/index.js`)**: A simple Node.js HTTP server to serve the frontend files.
*   **WebSocket Server (`server/index.js`)**: Built on top of the HTTP server using the `ws` library. It listens for WebSocket connections on port 9090.
*   **`RoomManager` (`server/core/RoomManager.js`)**: A singleton that manages game lobbies and active game rooms. It handles players joining, leaving, and the creation of new games.
*   **`GameRoom` (`server/core/GameRoom.js`)**: Represents a single game match. It contains a `GameEngine` instance and manages the connections for all players in that room.
*   **`GameEngine` (`server/core/GameEngine.js`)**: Contains the core server-side game logic, such as entity management and action processing.
*   **`AuthoritativeGameState` (`server/core/AuthoritativeGameState.js`)**: The brain of the server-side game. It validates all player actions, enforces game rules, and ensures the game state is consistent.
*   **`SharedWorker` (`frontend/game/shared_worker.js`)**: A crucial component on the frontend that ensures a single WebSocket connection is shared across all browser tabs. It handles connection management, automatic reconnection, and message broadcasting to all tabs.
*   **`NetworkManager` (`frontend/game/network/NetworkManager.js`)**: A singleton on the client-side that provides a clean API for interacting with the `SharedWorker`. It uses an event-based system for handling messages from the server.
*   **`MultiplayerGameEngine` (`frontend/game/engine/MultiplayerGameEngine.js`)**: The main client-side game engine for multiplayer mode. It maintains a local representation of the game state and renders the game based on updates from the server.
*   **`MultiplayerSync` (`frontend/game/network/MultiplayerSync.js`)**: A bridge between the `NetworkManager` and the game components. It registers handlers for game-related network messages.
*   **`MultiplayerPlayerManager` (`frontend/game/components/MultiplayerPlayerManager.js`)**: Manages local and remote players on the client-side, including rendering, controls, and client-side prediction.

## 2. Frontend-Backend Communication

Communication between the frontend and backend is handled exclusively through a WebSocket connection. The protocol is message-based, with each message being a JSON object with a `type` field.

### Connection Flow:

1.  The client's `NetworkManager` initializes a `SharedWorker`.
2.  The `SharedWorker` establishes a WebSocket connection to `ws://localhost:9090`.
3.  All communication between the client and server happens over this single WebSocket connection, even if the game is open in multiple tabs.

### Message Flow:

*   **Client to Server**: When the client wants to perform an action (e.g., move the player), it calls a method on the `NetworkManager` (e.g., `sendPlayerMove()`). The `NetworkManager` sends a message to the `SharedWorker`, which then forwards it to the WebSocket server.
*   **Server to Client**: When the server wants to send an update to the clients (e.g., a player has moved), it broadcasts a message to the relevant client(s). The `SharedWorker` on the client-side receives the message and broadcasts it to all connected tabs. The `NetworkManager` in each tab receives the message and dispatches it to the appropriate handlers.

## 3. Movement Handling

Movement handling is a critical part of the game and is implemented using a combination of client-side prediction and server-side validation.

### Client-Side (for responsiveness):

1.  **Input Capturing**: The `MultiplayerPlayerManager` listens for `keydown` events.
2.  **Client-Side Prediction**: When an arrow key is pressed, the client *immediately* tries to move the local player on the screen. It performs its own collision detection (`canMoveTo`) to see if the move is valid.
3.  **Request to Server**: If the client-side check passes, the player's character is moved on the screen, and a `MOVE` message is sent to the server via the `NetworkManager`.

This client-side prediction is essential for a smooth and responsive feel. The player sees their character move instantly, without having to wait for the server's response.

### Server-Side (for authority):

1.  **Message Reception**: The server's `MessageHandler` receives the `MOVE` message and passes it to the `RoomManager`.
2.  **Action Validation**: The `RoomManager` finds the correct `GameRoom` and calls the `processPlayerMove` method on the `GameEngine`, which in turn calls `validatePlayerMove` on the `AuthoritativeGameState`.
3.  **Server-Side Collision Detection**: `validatePlayerMove` performs a rigorous check to see if the move is valid (i.e., not into a wall, another player, or a bomb). This is the *true* validation.
4.  **State Update & Broadcast**: If the move is valid, the server updates the player's position in its authoritative game state and then broadcasts a `PLAYER_MOVED` message to all clients in the room.

### Reconciliation:

*   When a client receives a `PLAYER_MOVED` message for its own player, it should ideally reconcile its position with the server's authoritative position. The current implementation does a basic update.
*   When a client receives a `PLAYER_MOVED` message for a *remote* player, it updates that player's position on the screen.

## 4. Frontend Requests & Backend Responses (Message Types)

This is a summary of the main message types used in multiplayer mode.

### Client → Server (Requests):

| Message Type | Sent from | Purpose |
| :--- | :--- | :--- |
| `JOIN_GAME` | `NetworkManager.joinGame()` | Join the multiplayer lobby with a nickname. |
| `MOVE` | `NetworkManager.sendPlayerMove()` | Inform the server that the player has moved. |
| `PLACE_BOMB` | `NetworkManager.sendPlaceBomb()` | Request to place a bomb at the player's current position. |
| `CHAT_MESSAGE` | `NetworkManager.sendChat()` | Send a chat message to other players. |
| `QUIT_GAME` | `NetworkManager.quitGame()` | Leave the current game or lobby. |
| `REQUEST_STATE`| `NetworkManager.requestGameState()`| Request a full game state update from the server. |

### Server → Client (Responses/Updates):

| Message Type | Handled in | Purpose |
| :--- | :--- | :--- |
| `LOBBY_JOINED` | `main.js` | Confirmation of joining the lobby; provides player list. |
| `PLAYER_JOINED` | `main.js` | A new player has joined the lobby. |
| `PLAYER_LEFT` | `main.js` | A player has left the lobby. |
| `COUNTDOWN_START`| `main.js` | The game countdown has started. |
| `COUNTDOWN_TICK` | `main.js` | A tick in the game start countdown. |
| `GAME_STARTED` | `MultiplayerSync.js` | The game has started; provides the initial game state. |
| `FULL_STATE` | `MultiplayerSync.js` | A complete snapshot of the current game state. |
| `PLAYER_MOVED` | `MultiplayerSync.js` | A player has moved to a new position. |
| `BOMB_PLACED` | `MultiplayerSync.js` | A bomb has been placed on the grid. |
| `BOMB_EXPLODED` | `MultiplayerSync.js` | A bomb has exploded, with details of the explosion. |
| `POWERUP_COLLECTED`| `MultiplayerSync.js`| A player has collected a power-up. |
| `PLAYER_DAMAGED`| `MultiplayerSync.js` | A player has taken damage. |
| `PLAYER_DIED` | `MultiplayerSync.js` | A player has died. |
| `GAME_OVER` | `MultiplayerSync.js` | The game has ended, with details of the winner. |

## 5. Problems and Design Flaws Report

The codebase is well-documented and follows a good overall architecture. However, there are several areas that could be improved:

1.  **DOM Manipulation in `MultiplayerSync.js`**:
    *   **Problem**: `MultiplayerSync.js` directly creates and manipulates DOM elements for remote players, bombs, and explosions.
    *   **Impact**: This violates the separation of concerns, making the code harder to maintain. Rendering logic should be encapsulated within view-related components.
    *   **Recommendation**: Move the DOM manipulation logic into the respective components (e.g., `MultiplayerPlayerManager` for players, a new `Bomb` component for bombs).

2.  **Empty `server/systems` Files**:
    *   **Problem**: The `server/systems` directory contains empty files like `MovementSystem.js`, suggesting an incomplete refactoring towards an Entity-Component-System (ECS) architecture.
    *   **Impact**: This creates confusion for developers and indicates an inconsistent design pattern in the project.
    *   **Recommendation**: Either complete the refactoring by moving the logic from `AuthoritativeGameState.js` into the respective systems or remove the unused `systems` directory to clean up the codebase.

3.  **Duplicated Client-Side Logic**:
    *   **Problem**: The client-side `MultiplayerPlayerManager.js` duplicates server-side logic for collision detection and action validation.
    *   **Impact**: This can lead to synchronization issues if the client and server logic diverge.
    *   **Recommendation**: Treat all client-side checks as purely predictive and ensure the client can gracefully handle a rejection from the server, even if the client's own checks passed.

4.  **Simplistic Client-Side Prediction**:
    *   **Problem**: The client-side prediction and server reconciliation are basic. The system does not appear to handle input buffering or more complex reconciliation scenarios.
    *   **Impact**: In high-latency situations, this could lead to a clunky experience where the player's character "jumps" or "snaps" back to a previous position.
    *   **Recommendation**: Implement a more advanced client-side prediction system with input buffering and smoother server reconciliation. This would involve storing a history of local inputs and re-applying them after receiving a server state update.

5.  **Hardcoded Values**:
    *   **Problem**: Many important values (map dimensions, spawn positions, etc.) are hardcoded throughout the codebase.
    *   **Impact**: This makes the game difficult to configure and modify.
    *   **Recommendation**: Centralize all configurable values in the `shared/game-config.js` file.

6.  **Potential for Cheating**:
    *   **Problem**: The server seems to trust client inputs without sufficient validation against cheating (e.g., input spamming).
    *   **Impact**: Malicious clients could potentially exploit the system to gain an unfair advantage.
    *   **Recommendation**: Implement rate-limiting for incoming client messages and perform more rigorous validation on all data received from clients.
