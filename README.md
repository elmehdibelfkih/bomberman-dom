# Bomberman DOM - Multiplayer Workflow

This document outlines the multiplayer game flow, game logic, state synchronization mechanisms, and potential areas for improvement in the Bomberman DOM project.

## Multiplayer Game Flow

The multiplayer mode is designed to allow up to four players to compete in a classic Bomberman-style arena. The flow of the game is as follows:

1.  **Joining the Game**:
    *   A player enters their nickname on the entry page.
    *   The client sends a `JOIN_GAME` message to the server with the nickname.
    *   The server validates the nickname and adds the player to a lobby.

2.  **Lobby**:
    *   Players wait in a lobby until enough players have joined.
    *   The game starts when four players have joined, or after a 20-second timer if at least two players are present.
    *   A 10-second countdown is initiated before the game starts.
    *   Players can chat with each other in the lobby.

3.  **Game Start**:
    *   The server creates a `GameRoom` and a `GameEngine`.
    *   A random map is selected.
    *   The server sends a `GAME_STARTED` message to all clients, which includes the initial game state (map layout, player positions, etc.).
    *   Clients initialize their local game engine and render the game world.

4.  **Gameplay**:
    *   Players move around the map and place bombs.
    *   Player actions (movement, placing bombs) are sent to the server for validation.
    *   The server validates the actions and, if valid, broadcasts the updated state to all clients.
    *   Clients receive these updates and adjust their local game state accordingly.

5.  **Game End**:
    *   The game ends when only one player is left alive.
    *   The server broadcasts a `GAME_OVER` message with the winner.
    *   The client displays a "Game Over" or "You Win" screen.

## Game Logic and State Synchronization

The game uses an authoritative server model, where the server is the source of truth for the game state. State is synchronized to clients using an event-based model.

### Server-Side Authoritative State

*   The core of the server-side game logic resides in `server/core/AuthoritativeGameState.js`.
*   This class is responsible for validating all player actions and maintaining the true state of the game (player positions, bomb states, power-ups, etc.).
*   No game state changes can occur without being validated by this class.

### Event-Based Synchronization

*   Instead of sending the entire game state to clients on every update, the server sends messages for individual game events.
*   These events include `PLAYER_MOVED`, `BOMB_PLACED`, `BOMB_EXPLODED`, `PLAYER_DIED`, etc.
*   Clients listen for these events and update their local representation of the game world accordingly. This approach is bandwidth-efficient.

### Player Movement and Server Validation

1.  **Client Action**: When a player presses a movement key, the client immediately updates its local player's position (client-side prediction) and sends a `MOVE` message to the server. This message includes a `sequenceNumber`.

2.  **Server Validation**:
    *   The server's `AuthoritativeGameState` receives the `MOVE` message.
    *   It validates the move, checking for collisions with walls, blocks, and bombs.
    *   It also uses the `sequenceNumber` to discard old or out-of-order requests.

3.  **Broadcast**: If the move is valid, the server updates its internal state and broadcasts a `PLAYER_MOVED` message to all clients in the room, including the correct new position and the last processed `sequenceNumber`.

### Client-Side Prediction and Reconciliation

*   The client uses client-side prediction to make the local player's movement feel responsive. It moves the player on the screen immediately without waiting for the server's response.
*   When the client receives a `PLAYER_MOVED` message from the server for its own player, it performs reconciliation.
*   It compares the server-authoritative position with its predicted position. If there's a discrepancy, it corrects the local player's position. This ensures the client stays in sync with the server while providing a smooth experience.

## Incomplete Work and Potential Issues

*   **No Disconnection Handling During Active Game**: While there is some logic for handling disconnections in the lobby and `GameRoom`, it is not fully implemented or tested for all edge cases during an active game.
*   **Lack of Robust Anti-Cheat**: The server performs basic validation, but a determined cheater could still manipulate client-side code to gain an advantage (e.g., see through walls, move faster than allowed). More comprehensive server-side validation is needed.
*   **No Lag Compensation for Remote Players**: Remote players' positions are updated as `PLAYER_MOVED` messages arrive. This can lead to jerky movement on the client's screen if there is network latency or packet loss. Implementing interpolation or extrapolation for remote players would provide a smoother visual experience.
*   **State Synchronization on Reconnect**: The current implementation does not handle rejoining a game in progress. If a player disconnects and reconnects, they will not receive the current game state. A mechanism to request and receive a full game state snapshot is needed.
*   **Chat functionality in game**: there's a bug where the `t` key to open the chat doesn't work as expected.
*   **Unused `NetworkStateSynchronizer`**: The file `frontend/game/network/NetworkStateSynchronizer.js` exists and is even initialized in `MultiplayerSync.js`, but it's not fully integrated. It seems intended for a more robust state synchronization mechanism, possibly incorporating snapshots, but the current implementation relies solely on the event-based system.
*   **Bomb Pass and Block Pass Power-Ups**: The logic for these power-ups is partially implemented on the server-side (`AuthoritativeGameState.js`) but not fully integrated or functional on the client-side.
*   **Hardcoded Values**: There are several hardcoded values (e.g., player dimensions in `AuthoritativeGameState.js`) that should be moved to the shared configuration (`shared/game-config.js`).
*   **Quit game**: The `handleQuitGame` in `MessageHandler.js` is not fully implemented
*   **leave game**: The `leave-game-btn` is not fully implemented
*   **Player vs Player collision**: Player can walk over each other, there's no collision between players.
*   **Game not ending properly**: When there's a winner, the game doesn't end properly. The game over screen is not displayed.
*   **Timers**: are not displayed in the UI

This analysis provides a comprehensive overview of the multiplayer functionality and highlights areas for future development.