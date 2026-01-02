import { dom, eventManager } from '../../framwork/index.js';
import { NetworkManager } from '../network/NetworkManager.js';

export class Multiplayer {
    static #instance = null;

    static getInstance(game) {
        if (!Multiplayer.#instance) {
            Multiplayer.#instance = new Multiplayer(game);
        }
        return Multiplayer.#instance;
    }

    constructor(game) {
        if (Multiplayer.#instance) {
            throw new Error('Use Multiplayer.getInstance()');
        }

        this.game = game;
        this.network = NetworkManager.getInstance();
        this.isMultiplayer = false;
        this.lobbyUI = null;

        this.#setupMessageHandlers();
    }

    #setupMessageHandlers() {
        // Handle player joined
        this.network.on('PLAYER_JOINED', (data) => {
            console.log('Player joined:', data);
            this.#updateLobbyUI(data);
        });

        // Handle player left
        this.network.on('PLAYER_LEFT', (data) => {
            console.log('Player left:', data);
            this.#updateLobbyUI(data);
        });

        // Handle countdown start
        this.network.on('COUNTDOWN_START', (data) => {
            console.log('Countdown starting:', data);
            this.#showCountdown(data.countdown);
        });

        // Handle countdown tick
        this.network.on('COUNTDOWN_TICK', (data) => {
            console.log('Countdown tick:', data.remaining);
            this.#updateCountdown(data.remaining);
        });

        // Handle game started
        this.network.on('GAME_STARTED', (data) => {
            console.log('Game started:', data);
            this.#startMultiplayerGame(data);
        });

        // Handle full state updates
        this.network.on('FULL_STATE', (data) => {
            this.#syncGameState(data);
        });

        // Handle player movements
        this.network.on('PLAYER_MOVED', (data) => {
            this.#handlePlayerMoved(data);
        });

        // Handle bomb placement
        this.network.on('BOMB_PLACED', (data) => {
            this.#handleBombPlaced(data);
        });

        // Handle bomb explosions
        this.network.on('BOMB_EXPLODED', (data) => {
            this.#handleBombExploded(data);
        });

        // Handle player damage
        this.network.on('PLAYER_DAMAGED', (data) => {
            this.#handlePlayerDamaged(data);
        });

        // Handle player death
        this.network.on('PLAYER_DIED', (data) => {
            this.#handlePlayerDied(data);
        });

        // Handle game over
        this.network.on('GAME_OVER', (data) => {
            this.#handleGameOver(data);
        });

        // Handle chat messages
        this.network.on('CHAT_MESSAGE', (data) => {
            this.#handleChatMessage(data);
        });

        // Handle errors
        this.network.on('ERROR', (data) => {
            console.error('Network error:', data);
            this.#showError(data.message);
        });
    }

    createLobbyUI() {
        const lobbyContainer = dom({
            tag: 'div',
            attributes: {
                id: 'multiplayer-lobby',
                class: 'multiplayer-lobby hidden',
                style: 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.9); padding: 2rem; border-radius: 10px; z-index: 1000;'
            },
            children: [
                {
                    tag: 'h2',
                    attributes: { style: 'color: white; margin-bottom: 1rem;' },
                    children: ['Join Multiplayer Game']
                },
                {
                    tag: 'div',
                    attributes: { class: 'lobby-form', style: 'margin-bottom: 1rem;' },
                    children: [
                        {
                            tag: 'input',
                            attributes: {
                                type: 'text',
                                id: 'player-nickname',
                                placeholder: 'Enter your nickname',
                                maxlength: '16',
                                style: 'display: block; width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; font-family: "Press Start 2P", monospace; font-size: 0.8rem;'
                            },
                            children: []
                        },
                        {
                            tag: 'select',
                            attributes: {
                                id: 'map-select',
                                style: 'display: block; width: 100%; padding: 0.5rem; margin-bottom: 1rem; font-family: "Press Start 2P", monospace; font-size: 0.8rem;'
                            },
                            children: [
                                { tag: 'option', attributes: { value: '1' }, children: ['Map 1'] },
                                { tag: 'option', attributes: { value: '2' }, children: ['Map 2'] },
                                { tag: 'option', attributes: { value: '3' }, children: ['Map 3'] },
                                { tag: 'option', attributes: { value: '4' }, children: ['Map 4'] },
                                { tag: 'option', attributes: { value: '5' }, children: ['Map 5'] },
                                { tag: 'option', attributes: { value: '6' }, children: ['Map 6'] },
                                { tag: 'option', attributes: { value: '7' }, children: ['Map 7'] },
                                { tag: 'option', attributes: { value: '8' }, children: ['Map 8'] },
                                { tag: 'option', attributes: { value: '9' }, children: ['Map 9'] },
                                { tag: 'option', attributes: { value: '10' }, children: ['Map 10'] },
                            ]
                        },
                        {
                            tag: 'button',
                            attributes: {
                                id: 'join-lobby-btn',
                                class: 'start-btn',
                                style: 'display: block; width: 100%; margin-bottom: 0.5rem;'
                            },
                            children: ['JOIN LOBBY']
                        },
                        {
                            tag: 'button',
                            attributes: {
                                id: 'cancel-lobby-btn',
                                class: 'start-btn',
                                style: 'display: block; width: 100%;'
                            },
                            children: ['CANCEL']
                        }
                    ]
                },
                {
                    tag: 'div',
                    attributes: {
                        id: 'lobby-status',
                        style: 'color: white; font-size: 0.7rem; text-align: center; min-height: 2rem;'
                    },
                    children: []
                }
            ]
        });

        document.body.appendChild(lobbyContainer);
        this.lobbyUI = lobbyContainer;

        // Set up event handlers
        const joinBtn = document.getElementById('join-lobby-btn');
        const cancelBtn = document.getElementById('cancel-lobby-btn');

        eventManager.addEventListener(joinBtn, 'click', () => this.#handleJoinLobby());
        eventManager.addEventListener(cancelBtn, 'click', () => this.hideLobbyUI());

        return lobbyContainer;
    }

    showLobbyUI() {
        if (!this.lobbyUI) {
            this.createLobbyUI();
        }
        this.lobbyUI.classList.remove('hidden');
    }

    hideLobbyUI() {
        if (this.lobbyUI) {
            this.lobbyUI.classList.add('hidden');
        }
    }

    #handleJoinLobby() {
        const nicknameInput = document.getElementById('player-nickname');
        const mapSelect = document.getElementById('map-select');

        const nickname = nicknameInput.value.trim();
        const mapId = parseInt(mapSelect.value);

        if (!nickname) {
            this.#showError('Please enter a nickname');
            return;
        }

        if (nickname.length < 2 || nickname.length > 16) {
            this.#showError('Nickname must be 2-16 characters');
            return;
        }

        // Join the lobby
        this.network.joinGame(nickname, mapId);
        this.isMultiplayer = true;

        // Update UI
        const status = document.getElementById('lobby-status');
        status.textContent = 'Joining lobby...';
    }

    #updateLobbyUI(data) {
        const status = document.getElementById('lobby-status');
        if (status && data.playerCount) {
            status.textContent = `Players: ${data.playerCount}/4`;
        }
    }

    #showCountdown(seconds) {
        const status = document.getElementById('lobby-status');
        if (status) {
            status.textContent = `Game starting in ${seconds} seconds...`;
        }
    }

    #updateCountdown(remaining) {
        const status = document.getElementById('lobby-status');
        if (status) {
            status.textContent = `Game starting in ${remaining} seconds...`;
        }
    }

    #startMultiplayerGame(data) {
        this.hideLobbyUI();
        // Start the game with multiplayer mode enabled
        // The game should handle this data to set up players
        console.log('Starting multiplayer game with data:', data);
    }

    #syncGameState(data) {
        // Sync the full game state
        console.log('Syncing game state:', data);
        // TODO: Update game state based on server data
    }

    #handlePlayerMoved(data) {
        // Handle remote player movement
        console.log('Player moved:', data);
        // TODO: Update remote player position
    }

    #handleBombPlaced(data) {
        // Handle remote bomb placement
        console.log('Bomb placed:', data);
        // TODO: Create bomb on the map
    }

    #handleBombExploded(data) {
        // Handle remote bomb explosion
        console.log('Bomb exploded:', data);
        // TODO: Trigger explosion animation
    }

    #handlePlayerDamaged(data) {
        // Handle player damage
        console.log('Player damaged:', data);
        // TODO: Update player health/lives
    }

    #handlePlayerDied(data) {
        // Handle player death
        console.log('Player died:', data);
        // TODO: Remove player or show death animation
    }

    #handleGameOver(data) {
        // Handle game over
        console.log('Game over:', data);
        this.game.ui.GameOver();
    }

    #handleChatMessage(data) {
        // Handle chat message
        console.log('Chat message:', data);
        // TODO: Display chat message in UI
    }

    #showError(message) {
        const status = document.getElementById('lobby-status');
        if (status) {
            status.style.color = '#ff4444';
            status.textContent = message;
            setTimeout(() => {
                status.style.color = 'white';
            }, 3000);
        }
    }

    /**
     * Send local player movement to server
     */
    sendMove(direction) {
        if (this.isMultiplayer) {
            this.network.move(direction);
        }
    }

    /**
     * Send local bomb placement to server
     */
    sendBombPlacement(x, y) {
        if (this.isMultiplayer) {
            this.network.placeBomb(x, y);
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        if (this.isMultiplayer) {
            this.network.quitGame();
        }
        this.hideLobbyUI();
        this.isMultiplayer = false;
    }
}
