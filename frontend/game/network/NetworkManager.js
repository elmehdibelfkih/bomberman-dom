import { eventManager } from '../../framework/index.js';

export class NetworkManager {
    static #instance = null;

    static getInstance() {
        if (!NetworkManager.#instance) {
            NetworkManager.#instance = new NetworkManager();
        }
        return NetworkManager.#instance;
    }

    constructor() {
        if (NetworkManager.#instance) {
            throw new Error('Use NetworkManager.getInstance()');
        }

        this.worker = null;
        this.port = null;
        this.connected = false;
        this.playerId = null;
        this.nickname = null;
        this.messageHandlers = new Map();

        this.#initWorker();
    }

    #initWorker() {
        try {
            this.worker = new SharedWorker('/frontend/game/shared_worker.js', { type: 'module' });
            console.log(this.worker);

            this.port = this.worker.port;

            this.port.onmessage = (e) => {
                this.#handleMessage(e.data);
            };

            this.port.onerror = (err) => {
                console.error('SharedWorker port error:', err);
            };

            this.port.start();

            this.port.postMessage("INIT_WS");

            console.log('NetworkManager initialized with SharedWorker');
        } catch (error) {
            console.error('Failed to initialize SharedWorker:', error);
        }
    }

    #handleMessage(rawData) {
        try {
            // Skip ping messages from SharedWorker
            if (rawData === 'ping') {
                return;
            }

            const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            console.log('Received message:', data);

            // Store playerId when joining lobby
            if (data.type === 'LOBBY_JOINED' && data.playerId) {
                this.playerId = data.playerId;
            }

            if (data.type && this.messageHandlers.has(data.type)) {
                const handlers = this.messageHandlers.get(data.type);
                handlers.forEach(handler => handler(data));
            }

            if (this.messageHandlers.has('*')) {
                const handlers = this.messageHandlers.get('*');
                handlers.forEach(handler => handler(data));
            }

        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    send(message) {
        if (!this.port) {
            console.warn('Cannot send message: SharedWorker port not initialized');
            return;
        }

        try {
            this.port.postMessage(message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    joinGame(nickname) {
        this.nickname = nickname;
        this.send({
            type: 'JOIN_GAME',
            nickname
        });
    }

    sendPlayerMove(direction, sequenceNumber) {
        this.send({
            type: 'MOVE',
            direction,
            sequenceNumber
        });
    }

    sendPlaceBomb() {
        this.send({
            type: 'PLACE_BOMB'
        });
    }

    sendChat(text) {
        this.send({
            type: 'CHAT_MESSAGE',
            text
        });
    }

    quitGame() {
        this.send({
            type: 'QUIT_GAME'
        });
    }

    requestGameState() {
        this.send({
            type: 'REQUEST_STATE'
        });
    }

    isConnected() {
        return this.connected;
    }

    getPlayerId() {
        return this.playerId;
    }

    disconnect() {
        if (this.port) {
            this.port.close();
        }
        this.messageHandlers.clear();
        this.connected = false;
        this.playerId = null;
        this.nickname = null;
    }
}
