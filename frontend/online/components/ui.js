import { NetworkManager } from '../network/networkManager.js';
import { dom } from '../../framework/framework/index.js';

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
        players.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playersInfo.appendChild(playerCard);
            this.playerElements.set(player.playerId, playerCard);
        });
    }

    createPlayerCard(player) {
        const playerCard = dom({
            tag: 'div',
            attributes: {
                class: `player-card ${!player.alive ? 'dead' : ''}`,
                'data-player-id': player.playerId,
                'data-alive': player.alive
            },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'player-nickname' },
                    children: [player.nickname]
                },
                {
                    tag: 'div',
                    attributes: { class: 'player-stats' },
                    children: [
                        {
                            tag: 'div',
                            attributes: { class: 'player-stat lives-stat' },
                            children: [
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-icon' },
                                    children: ['❤️']
                                },
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-value lives-value' },
                                    children: [player.lives.toString()]
                                }
                            ]
                        },
                        {
                            tag: 'div',
                            attributes: { class: 'player-stat bomb-stat' },
                            children: [
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-icon' },
                                    children: ['💣']
                                },
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-value bomb-value' },
                                    children: [player.bombCount.toString()]
                                }
                            ]
                        },
                        {
                            tag: 'div',
                            attributes: { class: 'player-stat range-stat' },
                            children: [
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-icon' },
                                    children: ['🔥']
                                },
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-value range-value' },
                                    children: [player.bombRange.toString()]
                                }
                            ]
                        },
                        {
                            tag: 'div',
                            attributes: { class: 'player-stat speed-stat' },
                            children: [
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-icon' },
                                    children: ['🚀']
                                },
                                {
                                    tag: 'span',
                                    attributes: { class: 'stat-value speed-value' },
                                    children: [player.speed.toString()]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        return playerCard;
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

    // updateAllPlayers(players) {
    //     players.forEach(player => {
    //         const existingCard = this.playerElements.get(player.playerId);
    //         if (existingCard) {
    //             // Update individual stats
    //             this.updatePlayerState(player.playerId, {
    //                 alive: player.alive,
    //                 lives: player.lives,
    //                 bombCount: player.bombCount,
    //                 bombRange: player.bombRange,
    //                 speed: player.speed
    //             });
    //         } else {
    //             // Create new card if player doesn't exist yet
    //             const playerCard = this.createPlayerCard(player);
    //             const playersInfo = document.getElementById('players-info');
    //             if (playersInfo) {
    //                 playersInfo.appendChild(playerCard);
    //                 this.playerElements.set(player.playerId, playerCard);
    //             }
    //         }
    //     });
    // }

    initPingDisplay() {
        const playersInfo = document.getElementById('players-info');
        if (playersInfo) {
            let pingDisplay = document.getElementById('ping-display');
            if (!pingDisplay) {
                pingDisplay = dom({
                    tag: 'div',
                    attributes: {
                        id: 'ping-display',
                        class: 'ping-display'
                    },
                    children: ['Ping: ...']
                });
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