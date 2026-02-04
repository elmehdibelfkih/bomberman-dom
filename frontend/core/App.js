import { NetworkManager } from '../network/NetworkManager.js';
import { MessageHandler } from '../network/MessageHandler.js';
import { GameState } from './GameState.js';
import { GameEngine } from './GameEngine.js';
import { HomePage } from '../ui/pages/HomePage.js';
import { LobbyPage } from '../ui/pages/LobbyPage.js';
import { GamePage } from '../ui/pages/GamePage.js';
import { InputManager } from './InputManager.js';
import { CLIENT_CONFIG } from '../config/client-config.js';
import { ClientMessages, ServerMessages } from '../shared/message-types.js';

export class App {
    constructor() {
        this.networkManager = NetworkManager.getInstance();
        this.messageHandler = new MessageHandler();
        this.gameState = new GameState();
        this.container = document.getElementById('app');
    }

    async init() {
        this.setupMessageHandlers();
        this.renderPage('home');
        this.setupGlobalShortcuts();
    }

    setupGlobalShortcuts() {
        window.addEventListener('keydown', (e) => {
            // focus chat input with 't' key (ignore when typing into inputs)
            if (e.key === 't' && document.activeElement && document.activeElement.tagName.toLowerCase() === 'body') {
                // prefer lobby input if present, otherwise game input
                if (this._lobbyPage && this._lobbyPage.chatInput) {
                    this._lobbyPage.chatInput.focus();
                    e.preventDefault();
                    return;
                }
                if (this._gamePage && this._gamePage.chatInput) {
                    this._gamePage.chatInput.focus();
                    e.preventDefault();
                }
            }
        });
    }

    setupMessageHandlers() {
        let lobbyData = { players: [], countdown: null };

        this.messageHandler.register(ServerMessages.LOBBY_JOINED, (msg) => {
            this.gameState.setLocalPlayer(msg.playerId);
            lobbyData.players = msg.players;
            // If lobby is already rendered, update it in-place, otherwise render
            if (this._lobbyPage && this._lobbyPage.updatePlayers) {
                this._lobbyPage.updatePlayers(msg.players);
                if (this._lobbyPage.updateCountdown) this._lobbyPage.updateCountdown(msg.countdown || null);
            } else {
                this.renderPage('lobby', lobbyData);
            }
        });

        this.messageHandler.register(ServerMessages.PLAYER_JOINED, (msg) => {
            lobbyData.players = msg.players;
            if (this._lobbyPage && this._lobbyPage.updatePlayers) {
                this._lobbyPage.updatePlayers(msg.players);
            } else {
                this.renderPage('lobby', lobbyData);
            }
        });

        this.messageHandler.register(ServerMessages.PLAYER_LEFT, (msg) => {
            lobbyData.players = msg.players;
            if (this._lobbyPage && this._lobbyPage.updatePlayers) {
                this._lobbyPage.updatePlayers(msg.players);
            } else {
                this.renderPage('lobby', lobbyData);
            }
        });

        this.messageHandler.register(ServerMessages.COUNTDOWN_START, (msg) => {
            console.log('⏰ COUNTDOWN_START:', msg);
            lobbyData.countdown = msg.seconds;
            if (this._lobbyPage && this._lobbyPage.updateCountdown) {
                this._lobbyPage.updateCountdown(msg.seconds);
            } else {
                this.renderPage('lobby', lobbyData);
            }
        });

        this.messageHandler.register(ServerMessages.COUNTDOWN_TICK, (msg) => {
            console.log('⏰ COUNTDOWN_TICK:', msg.remaining);
            lobbyData.countdown = msg.remaining;
            if (this._lobbyPage && this._lobbyPage.updateCountdown) {
                this._lobbyPage.updateCountdown(msg.remaining);
            } else {
                this.renderPage('lobby', lobbyData);
            }
        });

        this.messageHandler.register(ServerMessages.GAME_STARTED, (msg) => {
            console.log('🎮 GAME_STARTED:', msg);
            
            // Create game engine for client-side prediction
            if (!this.gameEngine) {
                this.gameEngine = new GameEngine();
            }
            
            // initialize input manager so client sends MOVE/STOP messages to server
            if (!this.inputManager) {
                this.inputManager = new InputManager(this.gameEngine);
                this.inputManager.init();
            }
            
            // Set map data for collision detection
            this.inputManager.setMapData(msg.mapData);

            // populate local game state
            this.gameState.mapData = msg.mapData;
            this.gameState.clear();
            if (Array.isArray(msg.players)) {
                msg.players.forEach(p => {
                    // Mark local player for client prediction
                    if (p.playerId === msg.yourPlayerId) {
                        p.isLocal = true;
                    }
                    this.gameState.players.set(p.playerId, p);
                    this.gameEngine.addEntity('players', p.playerId, p);
                });
            }

            this.renderPage('game', {
                mapData: msg.mapData,
                players: msg.players,
                yourPlayerId: msg.yourPlayerId
            });
        });

        this.messageHandler.register(ServerMessages.PLAYER_MOVED, (msg) => {
            this.gameState.updatePlayer(msg.playerId, msg);
            
            // Update game engine entity for client prediction reconciliation
            if (this.gameEngine) {
                const player = this.gameEngine.getEntity('players', msg.playerId);
                if (player) {
                    // Server reconciliation - update position from server
                    player.x = msg.x;
                    player.y = msg.y;
                    player.gridX = msg.gridX;
                    player.gridY = msg.gridY;
                }
            }
            
            // update board if present
            if (this._gamePage && this._gamePage.updatePlayers) {
                const playersArray = Array.from(this.gameState.players.values());
                this._gamePage.updatePlayers(playersArray);
            }
        });

        this.messageHandler.register(ServerMessages.PLAYER_STOPPED, (msg) => {
            // server told us a player stopped (blocked or client released key)
            this.gameState.updatePlayer(msg.playerId, msg);
            if (this._gamePage && this._gamePage.updatePlayers) {
                const playersArray = Array.from(this.gameState.players.values());
                this._gamePage.updatePlayers(playersArray);
            }
        });

        this.messageHandler.register(ServerMessages.BOMB_PLACED, (msg) => {
            this.gameState.bombs.set(msg.bombId, msg);
            if (this._gamePage && this._gamePage.updateBombs) {
                this._gamePage.updateBombs(Array.from(this.gameState.bombs.values()));
            }
        });

        this.messageHandler.register(ServerMessages.BOMB_EXPLODED, (msg) => {
            // Apply destroyed blocks to local map copy (so tiles change to floor)
            try {
                if (Array.isArray(msg.destroyedBlocks) && this.gameState.mapData && this.gameState.mapData.initial_grid) {
                    msg.destroyedBlocks.forEach(b => {
                        if (this.gameState.mapData.initial_grid[b.gridY] && typeof this.gameState.mapData.initial_grid[b.gridY][b.gridX] !== 'undefined') {
                            this.gameState.mapData.initial_grid[b.gridY][b.gridX] = 0; // set to floor
                        }
                    });
                }
            } catch (err) {
                console.warn('Error applying destroyed blocks locally:', err);
            }

            // Trigger board update: show destroyed blocks and play explosions
            if (this._gamePage && this._gamePage.updateBlocks) {
                this._gamePage.updateBlocks(msg.destroyedBlocks || [], msg.explosions || []);
            }

            this.gameState.bombs.delete(msg.bombId);
            if (this._gamePage && this._gamePage.updateBombs) {
                this._gamePage.updateBombs(Array.from(this.gameState.bombs.values()));
            }
        });

        this.messageHandler.register(ServerMessages.PLAYER_DIED, (msg) => {
            this.gameState.updatePlayer(msg.playerId, { alive: false, lives: 0 });
            
            // Check if it's the local player who died
            if (msg.playerId === this.gameState.localPlayerId && this._gamePage) {
                this._gamePage.showNotification('☠️ You died! Respawning...', 3000);
            }
            
            // Update player display
            if (this._gamePage && this._gamePage.updatePlayers) {
                const playersArray = Array.from(this.gameState.players.values());
                this._gamePage.updatePlayers(playersArray);
            }
        });

        this.messageHandler.register(ServerMessages.PLAYER_DAMAGED, (msg) => {
            // msg: { playerId, livesRemaining }
            this.gameState.updatePlayer(msg.playerId, { lives: msg.livesRemaining });
            
            // Show damage notification for local player
            if (msg.playerId === this.gameState.localPlayerId && this._gamePage) {
                this._gamePage.showNotification(`❤️ Lives remaining: ${msg.livesRemaining}`, 2000);
            }
            
            // Update player display
            if (this._gamePage && this._gamePage.updatePlayers) {
                const playersArray = Array.from(this.gameState.players.values());
                this._gamePage.updatePlayers(playersArray);
            }
        });

        this.messageHandler.register(ServerMessages.POWERUP_SPAWNED, (msg) => {
            // msg: { powerupId, powerupType, gridX, gridY }
            const p = { powerupId: msg.powerupId, type: msg.powerupType, gridX: msg.gridX, gridY: msg.gridY };
            this.gameState.powerups.set(p.powerupId, p);
            if (this._gamePage && this._gamePage.updatePowerups) {
                this._gamePage.updatePowerups(Array.from(this.gameState.powerups.values()));
            }
        });

        this.messageHandler.register(ServerMessages.POWERUP_COLLECTED, (msg) => {
            // msg: { playerId, powerupId, powerupType, newStats }
            if (msg.powerupId && this.gameState.powerups.has(msg.powerupId)) {
                this.gameState.powerups.delete(msg.powerupId);
            }
            if (this._gamePage && this._gamePage.updatePowerups) {
                this._gamePage.updatePowerups(Array.from(this.gameState.powerups.values()));
            }

            // Show power-up notification if it's the local player
            if (msg.playerId === this.gameState.localPlayerId && this._gamePage && this._gamePage.showPowerUpNotification) {
                this._gamePage.showPowerUpNotification(msg.powerupType);
            }

            // update player stats locally
            if (msg.playerId && msg.newStats) {
                this.gameState.updatePlayer(msg.playerId, msg.newStats);

                // If local player speed changed, update input cooldown scaling
                if (msg.playerId === this.gameState.localPlayerId && msg.newStats.speed && typeof window !== 'undefined' && typeof window.__updateLocalSpeed === 'function') {
                    window.__updateLocalSpeed(msg.playerId, msg.newStats.speed);
                }

                if (this._gamePage && this._gamePage.updatePlayers) {
                    const playersArray = Array.from(this.gameState.players.values());
                    this._gamePage.updatePlayers(playersArray);
                }
            }
        });

        this.messageHandler.register(ServerMessages.GAME_OVER, (msg) => {
            console.log('Game Over! Winner:', msg.winner);
            
            if (this._gamePage) {
                const isLocalPlayerWinner = msg.winner && msg.winner.playerId === this.gameState.localPlayerId;
                
                if (isLocalPlayerWinner) {
                    // Local player won
                    this._gamePage.showEndMessage(`🏆 Congratulations!\n\nYou are the winner!\n\n🎉 Victory! 🎉`);
                } else if (msg.winner) {
                    // Another player won
                    this._gamePage.showEndMessage(`💀 Game Over\n\nWinner: ${msg.winner.nickname || msg.winner.playerId}\n\n🏆 Better luck next time!`);
                } else {
                    // No winner (draw or error)
                    this._gamePage.showEndMessage(`💀 Game Over\n\nNo winner\n\n🤝 It's a draw!`);
                }
            }
        });

        // Chat messages
        this.messageHandler.register(ServerMessages.CHAT_MESSAGE, (msg) => {
            // If lobby page is active, display message
            if (this._lobbyPage && this._lobbyPage.addChatMessage) {
                this._lobbyPage.addChatMessage(msg);
            }
            // If in-game page is active, display message there too
            if (this._gamePage && this._gamePage.addChatMessage) {
                this._gamePage.addChatMessage(msg);
            }
        });

        this.messageHandler.register(ServerMessages.ERROR, (msg) => {
            console.error('Server error:', msg.message);
        });

        this.networkManager.setMessageHandler(this.messageHandler);
    }


    async handleJoinLobby(nickname) {
        await this.networkManager.connect(CLIENT_CONFIG.WS_URL);
        this.networkManager.send({ type: ClientMessages.JOIN_GAME, nickname });
    }

    renderPage(page, data = {}) {
        this.container.innerHTML = '';
        let pageElement;

        if (page === 'home') {
            pageElement = HomePage({
                onJoinLobby: (nickname) => this.handleJoinLobby(nickname)
            });
            this.container.appendChild(pageElement);
        } else if (page === 'lobby') {
            const lobbyPage = LobbyPage({
                players: data.players || [],
                countdown: data.countdown,
                onSendChat: (text) => {
                    this.networkManager.send({ type: ClientMessages.CHAT_MESSAGE, text });
                }
            });
            this._lobbyPage = lobbyPage;
            this.container.appendChild(lobbyPage.element);
            return lobbyPage;
        } else if (page === 'game') {
            const gamePage = GamePage({
                mapData: data.mapData,
                players: data.players,
                yourPlayerId: data.yourPlayerId,
                onSendChat: (text) => {
                    this.networkManager.send({ type: ClientMessages.CHAT_MESSAGE, text });
                },
                onPlaceBomb: () => {
                    this.networkManager.send({ type: ClientMessages.PLACE_BOMB });
                }
            });
            this._gamePage = gamePage;
            this.container.appendChild(gamePage.element);
        }
    }
}
