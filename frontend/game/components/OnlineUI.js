import { dom } from '../../framework/index.js';

export class OnlineUi {
    constructor(game, networkManager, router) {
        this.game = game;
        this.networkManager = networkManager;
        this.router = router;
        this.elements = {};
        this.gameStatus = 'WAITING';
        this.init();
    }

    init() {
        this.createPlayerListUI();
        this.createGameStatusUI();
        this.createStatsUI();
    }

    createPlayerListUI() {
        const playersInfo = document.getElementById('players-info');
        if (!playersInfo) return;

        // Clear existing content
        playersInfo.innerHTML = '';

        // Create player list container
        const playerListContainer = dom({
            tag: 'div',
            attributes: { class: 'player-list-container' },
            children: [
                {
                    tag: 'h3',
                    attributes: { class: 'players-title' },
                    children: ['Players']
                },
                {
                    tag: 'div',
                    attributes: { id: 'players-list', class: 'players-list' },
                    children: []
                }
            ]
        });

        playersInfo.appendChild(playerListContainer);
        this.elements.playersList = document.getElementById('players-list');
    }

    createGameStatusUI() {
        // Create game status indicator
        const statusIndicator = dom({
            tag: 'div',
            attributes: {
                id: 'game-status-indicator',
                class: 'game-status-indicator'
            },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'status-icon' },
                    children: ['🎮']
                },
                {
                    tag: 'div',
                    attributes: { id: 'status-text', class: 'status-text' },
                    children: ['Waiting...']
                }
            ]
        });

        document.body.appendChild(statusIndicator);
        this.elements.statusText = document.getElementById('status-text');
        this.elements.statusIndicator = document.getElementById('game-status-indicator');
    }

    createStatsUI() {
        // Create local player stats display
        const statsContainer = dom({
            tag: 'div',
            attributes: {
                id: 'local-player-stats',
                class: 'local-player-stats'
            },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'stat-item' },
                    children: [
                        {
                            tag: 'span',
                            attributes: { class: 'stat-icon' },
                            children: ['💣']
                        },
                        {
                            tag: 'span',
                            attributes: { id: 'bomb-count-display' },
                            children: ['1']
                        }
                    ]
                },
                {
                    tag: 'div',
                    attributes: { class: 'stat-item' },
                    children: [
                        {
                            tag: 'span',
                            attributes: { class: 'stat-icon' },
                            children: ['🔥']
                        },
                        {
                            tag: 'span',
                            attributes: { id: 'bomb-range-display' },
                            children: ['1']
                        }
                    ]
                },
                {
                    tag: 'div',
                    attributes: { class: 'stat-item' },
                    children: [
                        {
                            tag: 'span',
                            attributes: { class: 'stat-icon' },
                            children: ['⚡']
                        },
                        {
                            tag: 'span',
                            attributes: { id: 'speed-display' },
                            children: ['1']
                        }
                    ]
                }
            ]
        });

        document.body.appendChild(statsContainer);
        this.elements.bombCountDisplay = document.getElementById('bomb-count-display');
        this.elements.bombRangeDisplay = document.getElementById('bomb-range-display');
        this.elements.speedDisplay = document.getElementById('speed-display');
    }

    updatePlayerList(players) {
        if (!this.elements.playersList) return;

        this.elements.playersList.innerHTML = '';

        players.forEach((player, index) => {
            const isLocal = player.playerId === this.networkManager.getPlayerId();
            const playerItem = dom({
                tag: 'div',
                attributes: {
                    class: `player-item ${isLocal ? 'local-player-item' : 'remote-player-item'} ${!player.alive ? 'dead-player' : ''}`,
                    id: `player-item-${player.playerId}`
                },
                children: [
                    {
                        tag: 'div',
                        attributes: { class: 'player-info' },
                        children: [
                            {
                                tag: 'div',
                                attributes: { class: 'player-name' },
                                children: [
                                    {
                                        tag: 'span',
                                        attributes: { class: 'player-number' },
                                        children: [`P${index + 1}`]
                                    },
                                    {
                                        tag: 'span',
                                        attributes: { class: 'nickname' },
                                        children: [player.nickname + (isLocal ? ' (You)' : '')]
                                    }
                                ]
                            },
                            {
                                tag: 'div',
                                attributes: { class: 'player-stats' },
                                children: [
                                    {
                                        tag: 'div',
                                        attributes: { class: 'lives-display' },
                                        children: [
                                            {
                                                tag: 'span',
                                                attributes: { class: 'lives-icon' },
                                                children: ['❤️']
                                            },
                                            {
                                                tag: 'span',
                                                attributes: { class: 'lives-count' },
                                                children: [player.lives.toString()]
                                            }
                                        ]
                                    },
                                    {
                                        tag: 'div',
                                        attributes: { class: 'status-display' },
                                        children: [player.alive ? '🟢' : '💀']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            this.elements.playersList.appendChild(playerItem);
        });
    }

    updateGameStatus(status, message = '') {
        this.gameStatus = status;
        
        const statusConfig = {
            'WAITING': { icon: '⏳', text: 'Waiting for players...', color: '#ffa502' },
            'STARTING': { icon: '🚀', text: 'Game starting...', color: '#2ed573' },
            'PLAYING': { icon: '🎮', text: 'Game in progress', color: '#3742fa' },
            'PAUSED': { icon: '⏸️', text: 'Game paused', color: '#ff6b35' },
            'FINISHED': { icon: '🏆', text: 'Game finished', color: '#ff4757' }
        };

        const config = statusConfig[status] || statusConfig['WAITING'];
        
        if (this.elements.statusText) {
            this.elements.statusText.textContent = message || config.text;
        }
        
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.style.borderColor = config.color;
            const iconElement = this.elements.statusIndicator.querySelector('.status-icon');
            if (iconElement) {
                iconElement.textContent = config.icon;
            }
        }
    }

    updateLocalPlayerStats(player) {
        if (this.elements.bombCountDisplay) {
            this.elements.bombCountDisplay.textContent = player.bombCount.toString();
        }
        if (this.elements.bombRangeDisplay) {
            this.elements.bombRangeDisplay.textContent = player.bombRange.toString();
        }
        if (this.elements.speedDisplay) {
            this.elements.speedDisplay.textContent = player.speed.toString();
        }
    }

    showCountdown(seconds) {
        this.updateGameStatus('STARTING', `Starting in ${seconds}...`);
        
        // Create countdown overlay
        const countdownOverlay = dom({
            tag: 'div',
            attributes: {
                id: 'countdown-overlay',
                class: 'countdown-overlay'
            },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'countdown-number' },
                    children: [seconds.toString()]
                }
            ]
        });

        document.body.appendChild(countdownOverlay);

        // Remove after animation
        setTimeout(() => {
            const overlay = document.getElementById('countdown-overlay');
            if (overlay) {
                overlay.remove();
            }
        }, 1000);
    }

    showGameOver(winner) {
        this.updateGameStatus('FINISHED', winner ? `${winner.nickname} wins!` : 'Game Over');
        
        const gameOverScreen = dom({
            tag: 'div',
            attributes: {
                id: 'game-over-screen',
                class: 'game-over-screen'
            },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'game-over-content' },
                    children: [
                        {
                            tag: 'h1',
                            attributes: { class: 'game-over-title' },
                            children: ['Game Over']
                        },
                        {
                            tag: 'h2',
                            attributes: { class: 'winner-text' },
                            children: [winner ? `🏆 ${winner.nickname} Wins!` : 'No Winner']
                        },
                        {
                            tag: 'div',
                            attributes: { class: 'final-stats' },
                            children: [
                                {
                                    tag: 'h3',
                                    attributes: {},
                                    children: ['Final Results']
                                },
                                {
                                    tag: 'div',
                                    attributes: { id: 'final-player-list' },
                                    children: []
                                }
                            ]
                        },
                        {
                            tag: 'button',
                            attributes: {
                                class: 'menu-btn',
                                onclick: () => { this.router.navigate('/', true); }
                            },
                            children: ['Back to Menu']
                        }
                    ]
                }
            ]
        });

        document.body.appendChild(gameOverScreen);
    }

    showPlayerDamaged(playerId) {
        const playerItem = document.getElementById(`player-item-${playerId}`);
        if (playerItem) {
            playerItem.classList.add('damaged');
            setTimeout(() => {
                playerItem.classList.remove('damaged');
            }, 500);
        }
    }

    showPlayerDied(playerId) {
        const playerItem = document.getElementById(`player-item-${playerId}`);
        if (playerItem) {
            playerItem.classList.add('dead-player');
        }
    }

    showPowerUpCollected(playerId, powerUpType) {
        const playerItem = document.getElementById(`player-item-${playerId}`);
        if (playerItem) {
            const powerUpIcon = {
                'SPEED': '⚡',
                'BOMB_COUNT': '💣',
                'BOMB_RANGE': '🔥'
            }[powerUpType] || '⭐';

            const notification = dom({
                tag: 'div',
                attributes: { class: 'power-up-notification' },
                children: [`+${powerUpIcon}`]
            });

            playerItem.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }
    }

    cleanup() {
        // Remove UI elements
        const elementsToRemove = [
            'game-status-indicator',
            'local-player-stats',
            'countdown-overlay',
            'game-over-screen'
        ];

        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });

        this.elements = {};
    }
}