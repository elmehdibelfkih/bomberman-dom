# Bomberman DOM

Bomberman DOM is a modern web-based implementation of the classic Bomberman game, built with a focus on performance and a responsive multiplayer experience. It features both a solo mode and a real-time online multiplayer mode where you can challenge your friends.

## Features

* **Solo Mode**: Play against AI-controlled enemies and try to beat your high score.
* **Online Multiplayer Mode**:
  * Play with up to 4 players in a real-time arena.
  * Lobby system with a countdown timer.
  * Real-time chat with other players in the lobby.
* **Custom Game Engine**: The game is built on a lightweight, custom-made JavaScript framework for reactivity, routing, and DOM manipulation.
* **Authoritative Server**: The multiplayer mode uses an authoritative server architecture to prevent cheating and ensure a fair game.
* **Client-Side Prediction**: For a smooth and responsive player experience, even with network latency.

## Technologies Used

* **Frontend**:
  * HTML5, CSS3, JavaScript
  * **@mlarbi/reactive**: A custom lightweight JavaScript framework for building reactive web applications.
* **Backend**:
  * Node.js
  * **ws**: A high-performance WebSocket library for real-time communication.
  * Custom HTTP server for serving static files.
* **Architecture**:
  * Authoritative Server
  * Client-Side Prediction and Reconciliation

## Getting Started

Follow these instructions to get the game up and running on your local machine.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your system.

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/bomberman-dom.git
    cd bomberman-dom
    ```

2. Install the server dependencies using the provided Makefile:

    ```bash
    make install
    ```

    This will run `npm install` in the `server` directory.

### Running the Game

1. Start the game server:

    ```bash
    make start
    ```

    The server will be running at `http://localhost:9090`.

2. Open your web browser and navigate to `http://localhost:9090`.

3. From the main page, you can choose between **Solo Mode** and **Multiplayer Mode**.

### Stopping the Server

To stop the server, you can either press `Ctrl+C` in the terminal where the server is running, or use the Makefile command:

```bash
make stop
```

## Game Modes

### Solo Mode

In solo mode, you navigate through a maze, dropping bombs to destroy blocks and enemies. Your goal is to be the last one standing.

### Online Multiplayer Mode

In multiplayer mode, you can join a lobby and play against other players.

1. Enter a nickname to join the lobby.
2. The game will start when at least two players are in the lobby.
3. Use the chat to communicate with other players.
4. The last player standing wins the game.

## Multiplayer Architecture

The multiplayer mode is designed to allow up to four players to compete in a classic Bomberman-style arena. The flow of the game is as follows:

1. **Joining the Game**:
    * A player enters their nickname on the entry page.
    * The client sends a `JOIN_GAME` message to the server with the nickname.
    * The server validates the nickname and adds the player to a lobby.

2. **Lobby**:
    * Players wait in a lobby until enough players have joined.
    * The game starts when four players have joined, or after a 20-second timer if at least two players are present.
    * A 10-second countdown is initiated before the game starts.
    * Players can chat with each other in the lobby.

3. **Game Start**:
    * The server creates a `GameRoom` and a `GameEngine`.
    * A random map is selected.
    * The server sends a `GAME_STARTED` message to all clients, which includes the initial game state (map layout, player positions, etc.).
    * Clients initialize their local game engine and render the game world.

4. **Gameplay**:
    * Players move around the map and place bombs.
    * Player actions (movement, placing bombs) are sent to the server for validation.
    * The server validates the actions and, if valid, broadcasts the updated state to all clients.
    * Clients receive these updates and adjust their local game state accordingly.

5. **Game End**:
    * The game ends when only one player is left alive.
    * The server broadcasts a `GAME_OVER` message with the winner.
    * The client displays a "Game Over" or "You Win" screen.

## Future Improvements

This project is still under development. Here are some of the areas that could be improved:

* **Disconnection Handling**: Improve handling of player disconnections during an active game.
* **Anti-Cheat**: Implement more robust server-side validation to prevent cheating.
* **Lag Compensation**: Implement interpolation or extrapolation for remote players to provide a smoother visual experience.
* **State Synchronization on Reconnect**: Allow players to rejoin a game in progress.
* **In-Game Chat**: Fix the bug with the in-game chat.
* **Power-Ups**: Fully implement the Bomb Pass and Block Pass power-ups on the client-side.
* **Configuration**: Move hardcoded values to the shared configuration file.
* **Quit/Leave Game**: Fully implement the "quit game" and "leave game" functionalities.
* **Player Collision**: Implement collision between players.
* **Game End**: Ensure the game ends properly and the game over screen is always displayed.
* **UI**: Display timers in the UI.
