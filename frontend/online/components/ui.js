import { NetworkManager } from '../network/networkManager.js';
import { createPlayerCard, createPingDisplay } from '../utils/helpers.js';

export class UI {
    constructor(game) {
        UI.instance = this;
        this.game = game;
        this.networkManager = NetworkManager.getInstance();
        this.pingInterval = null;
        this.playerElements = new Map();
    }

    renderPlayers(players) {
        const playersInfo = document.getElementById('players-info');
        if (!playersInfo) return;

        // Clear existing player cards (keep the h3 title and ping display)
        const existingCards = playersInfo.querySelectorAll('.player-card');
        existingCards.forEach(card => card.remove());

        // Create and append player cards
        players.forEach(playerData => {
            const playerObject = this.game.players.get(playerData.playerId);
            const playerIndex = playerObject ? playerObject.playerIndex : -1;
            const playerCard = createPlayerCard(playerData, playerIndex);
            playersInfo.appendChild(playerCard);
            this.playerElements.set(playerData.playerId, playerCard);
        });
    }

    updatePlayerState(playerId, updates) {
        const playerCard = this.playerElements.get(playerId);
        if (!playerCard) return;

        // Update alive status
        if (updates.hasOwnProperty('alive')) {
            playerCard.dataset.alive = updates.alive;
            if (!updates.alive) {
                playerCard.classList.add('dead');
            } else {
                playerCard.classList.remove('dead');
            }
        }

        // Update lives
        if (updates.hasOwnProperty('lives')) {
            const livesEl = playerCard.querySelector('.lives-value');
            if (livesEl) livesEl.textContent = updates.lives;
        }

        // Update bomb count
        if (updates.hasOwnProperty('bombCount')) {
            const bombEl = playerCard.querySelector('.bomb-value');
            if (bombEl) bombEl.textContent = updates.bombCount;
        }

        // Update bomb range
        if (updates.hasOwnProperty('bombRange')) {
            const rangeEl = playerCard.querySelector('.range-value');
            if (rangeEl) rangeEl.textContent = updates.bombRange;
        }

        // Update speed
        if (updates.hasOwnProperty('speed')) {
            const speedEl = playerCard.querySelector('.speed-value');
            if (speedEl) speedEl.textContent = updates.speed;
        }
    }

    initPingDisplay() {
        const playersInfo = document.getElementById('players-info');
        if (playersInfo) {
            let pingDisplay = document.getElementById('ping-display');
            if (!pingDisplay) {
                pingDisplay = createPingDisplay();
                playersInfo.appendChild(pingDisplay);
            }

            this.pingInterval = setInterval(() => {
                pingDisplay.textContent = `Ping: ${this.networkManager.getPing()}ms`;
            }, 1000);
        }
    }

    destroyPingDisplay() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        const pingDisplay = document.getElementById('ping-display');
        if (pingDisplay) {
            pingDisplay.remove();
        }
    }

    static getInstance = (game) => UI.instance ? UI.instance : new UI(game)
    static resetInstance() {
        UI.instance = null;
    }
}
