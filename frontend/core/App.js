import { NetworkManager } from '../network/NetworkManager.js';
import { MessageHandler } from '../network/MessageHandler.js';
import { GameState } from './GameState.js';
import { HomePage } from '../ui/pages/HomePage.js';
import { LobbyPage } from '../ui/pages/LobbyPage.js';
import { GamePage } from '../ui/pages/GamePage.js';
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
    }

    setupMessageHandlers() {
        let lobbyData = { players: [], countdown: null };

        this.messageHandler.register(ServerMessages.LOBBY_JOINED, (msg) => {
            this.gameState.setLocalPlayer(msg.playerId);
            lobbyData.players = msg.players;
            this.renderPage('lobby', lobbyData);
        });

        this.messageHandler.register(ServerMessages.PLAYER_JOINED, (msg) => {
            lobbyData.players = msg.players;
            this.renderPage('lobby', lobbyData);
        });

        this.messageHandler.register(ServerMessages.PLAYER_LEFT, (msg) => {
            lobbyData.players = msg.players;
            this.renderPage('lobby', lobbyData);
        });

        this.messageHandler.register(ServerMessages.COUNTDOWN_START, (msg) => {
            console.log('⏰ COUNTDOWN_START:', msg);
            lobbyData.countdown = msg.seconds;
            this.renderPage('lobby', lobbyData);
        });

        this.messageHandler.register(ServerMessages.COUNTDOWN_TICK, (msg) => {
            console.log('⏰ COUNTDOWN_TICK:', msg.remaining);
            lobbyData.countdown = msg.remaining;
            this.renderPage('lobby', lobbyData);
        });

        this.messageHandler.register(ServerMessages.GAME_STARTED, (msg) => {
            console.log('🎮 GAME_STARTED:', msg);
            this.renderPage('game', {
                mapData: msg.mapData,
                players: msg.players,
                yourPlayerId: msg.yourPlayerId
            });
        });

        this.messageHandler.register(ServerMessages.PLAYER_MOVED, (msg) => {
            this.gameState.updatePlayer(msg.playerId, msg);
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
                countdown: data.countdown
            });
            this.container.appendChild(lobbyPage.element);
            return lobbyPage;
        } else if (page === 'game') {
            pageElement = GamePage({
                mapData: data.mapData,
                players: data.players,
                yourPlayerId: data.yourPlayerId
            });
            this.container.appendChild(pageElement);
        }
    }
}
