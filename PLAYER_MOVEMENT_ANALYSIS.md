# Player Movement Analysis

This document provides a detailed report on the player movement logic in the Bomberman-DOM project, covering both frontend and backend implementations and their communication.

## 1. Overview

The player movement is built on an **authoritative server** architecture with **client-side prediction** and **server reconciliation**.

-   **Authoritative Server**: The server is the single source of truth for the game state, including player positions. It has the final say on whether a move is valid. This prevents cheating and ensures all players have a consistent view of the game.
-   **Client-Side Prediction**: To make the game feel responsive, the client doesn't wait for the server's response to show movement. When a player presses a movement key, the frontend immediately moves the character on the screen.
-   **Server Reconciliation**: After predicting the move, the client sends it to the server. The server validates it and sends back the *actual*, authoritative position. The client then checks if its predicted position matches the server's authoritative position. If not, it "reconciles" its state by correcting the player's position.

This model provides a good balance between responsiveness (from prediction) and consistency (from the authoritative server).

## 2. Frontend (Client) Logic

The primary logic for handling player movement on the client-side is located in `frontend/game/components/MultiplayerPlayerManager.js`.

### 2.1. Input Handling

-   The `setupControls()` method in `MultiplayerPlayerManager.js` sets up a `keydown` event listener on the `window`.
-   When a movement key (W, A, S, D, or arrow keys) is pressed, this listener fires.

### 2.2. Client-Side Prediction & Sending to Server

1.  **Sequence Number**: A local `sequenceNumber` is attached to each move request. This number is incremented for every new move, allowing the server and client to distinguish between different move requests and process them in the correct order.

2.  **Prediction**: The `movePlayer()` function is called immediately. It updates the player's `x` and `y` coordinates locally and re-renders the player sprite on the canvas. This provides instant visual feedback.

3.  **Buffering**: The move (direction and sequence number) is stored in a local `pendingMoves` buffer.

4.  **Sending**: The move is then sent to the server. The `NetworkManager` (`frontend/game/network/NetworkManager.js`) is used to format the message and pass it to the `shared_worker.js`.

5.  **Shared Worker**: The `shared_worker.js` manages the actual WebSocket connection to the server. It receives the message from `NetworkManager` and sends it over the WebSocket.

## 3. Communication Protocol

Communication relies on specific JSON message types.

### 3.1. Client-to-Server Message (`MOVE`)

When the player initiates a move, the client sends a message of type `MOVE`.

```json
{
  "type": "MOVE",
  "payload": {
    "direction": "UP",
    "sequenceNumber": 123
  }
}
```

### 3.2. Server-to-Client Message (`PLAYER_MOVED`)

After validating a move, the server broadcasts a `PLAYER_MOVED` message to all clients in the room.

```json
{
    "type": "PLAYER_MOVED",
    "payload": {
        "playerId": "player-id-123",
        "x": 100,
        "y": 150,
        "lastSequenceNumber": 123
    }
}
```

## 4. Backend (Server) Logic

The server's main responsibility is to receive moves, validate them, update its internal state, and broadcast the result.

### 4.1. Message Reception

-   Incoming WebSocket messages are handled by `server/network/MessageHandler.js`.
-   The `handleMove()` function is invoked for messages of type `MOVE`.
-   It identifies the player and the game room and passes the request to the `RoomManager` (`server/core/RoomManager.js`).

### 4.2. Authoritative Validation

1.  The `RoomManager` forwards the move request to the `GameEngine`, which in turn calls the `validatePlayerMove()` method in `server/core/AuthoritativeGameState.js`. This is the core of the authoritative logic.

2.  `validatePlayerMove()` performs several checks:
    -   **Bounds Checking**: Ensures the new position is within the map's boundaries.
    -   **Collision Detection**: The `isValidPosition()` helper checks if the new position collides with a wall or an un-passable block.
    -   **Sequence Number**: The server keeps track of the last processed sequence number for each player. If the incoming move's sequence number is older than the last one processed, it's considered a duplicate or out-of-order packet and is ignored.

3.  If the move is valid, the `AuthoritativeGameState` updates the player's position in its state.

### 4.3. Broadcasting the New State

-   After a successful state update, the server constructs a `PLAYER_MOVED` message using `server/network/MessageBuilder.js`.
-   This message, containing the player's ID, their new authoritative `x` and `y` coordinates, and the `lastSequenceNumber` it just processed, is broadcast to **all** clients in the game room.

## 5. State Reconciliation (Client-Side)

The client is constantly receiving `PLAYER_MOVED` events from the server. The `MultiplayerPlayerManager.js` handles these messages.

1.  **Remote Players**: If the message is for a remote player (not the local user), the client simply calls `updateRemotePlayer()` to update that player's position on the screen.

2.  **Local Player**: If the `PLAYER_MOVED` message is for the local player, the `reconcileLocalPlayer()` method is called.
    -   It gets the authoritative state (position and last processed sequence number) from the server's message.
    -   It discards all pending moves in its local buffer that have a sequence number less than or equal to the `lastSequenceNumber` from the server.
    -   It then checks if the client's current predicted position matches the server's authoritative position.
    -   **Correction**: If there's a mismatch (a "mis-prediction"), the client **corrects** its local player's position to match the server's.
    -   **Re-prediction**: It then re-applies any pending moves that happened *after* the one the server just acknowledged, providing a smooth correction without losing the player's most recent inputs.
