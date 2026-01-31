import { NetworkManager } from '../network/NetworkManager.js';
import { MessageHandler } from '../network/MessageHandler.js';
import { GameState } from './GameState.js';
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
            // initialize input manager so client sends MOVE/STOP messages to server
            if (!this.inputManager) {
                this.inputManager = new InputManager();
                this.inputManager.init();
            }

            // populate local game state
            this.gameState.mapData = msg.mapData;
            this.gameState.clear();
            if (Array.isArray(msg.players)) {
                msg.players.forEach(p => this.gameState.players.set(p.playerId, p));
            }

            this.renderPage('game', {
                mapData: msg.mapData,
                players: msg.players,
                yourPlayerId: msg.yourPlayerId
            });
        });

        this.messageHandler.register(ServerMessages.PLAYER_MOVED, (msg) => {
            this.gameState.updatePlayer(msg.playerId, msg);
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
        });

        this.messageHandler.register(ServerMessages.BOMB_EXPLODED, (msg) => {
            this.gameState.bombs.delete(msg.bombId);
        });

        this.messageHandler.register(ServerMessages.PLAYER_DIED, (msg) => {
            this.gameState.updatePlayer(msg.playerId, { alive: false });
        });

        this.messageHandler.register(ServerMessages.GAME_OVER, (msg) => {
            console.log('Game Over! Winner:', msg.winner);
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
                }
            });
            this._gamePage = gamePage;
            this.container.appendChild(gamePage.element);
        }
    }
}
