import { dom, createSignal, createEffect, createMemo, Show, eventEmitter } from '../framwork/index.js';
import { ReactiveGameState } from './ReactiveGameState.js';

export class ReactiveUI {
    static instance = null;

    static getInstance() {
        if (!ReactiveUI.instance) {
            ReactiveUI.instance = new ReactiveUI();
        }
        return ReactiveUI.instance;
    }

    constructor() {
        this.gameState = ReactiveGameState.getInstance();
        this.notifications = createSignal([]);
        this.setupUI();
    }

    setupUI() {
        this.createReactiveScoreboard();
        this.createNotificationSystem();
        this.createGameStatusIndicator();
    }

    createReactiveScoreboard() {
        const scoreboard = dom({
            tag: 'div',
            attributes: {
                id: 'reactive-scoreboard',
                style: 'position: fixed; top: 20px; left: 20px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-family: monospace;'
            },
            children: [
                {
                    tag: 'div',
                    children: [() => `Lives: ${'❤️'.repeat(this.gameState.playerLives[0]())}`]
                },
                {
                    tag: 'div',
                    children: [() => `Score: ${this.gameState.playerScore[0]()}`]
                },
                {
                    tag: 'div',
                    children: [() => `Level: ${this.gameState.currentLevel[0]()}`]
                },
                {
                    tag: 'div',
                    children: [() => `Time: ${this.gameState.timeDisplay()}`]
                },
                Show({
                    when: () => this.gameState.gameStatus[0]() === 'paused',
                    children: [{
                        tag: 'div',
                        attributes: { style: 'color: yellow; font-weight: bold;' },
                        children: ['PAUSED']
                    }]
                })
            ]
        });

        document.body.appendChild(scoreboard);
    }

    createNotificationSystem() {
        const notificationContainer = dom({
            tag: 'div',
            attributes: {
                id: 'notifications',
                style: 'position: fixed; top: 20px; right: 20px; z-index: 1000;'
            },
            children: () => {
                const notifs = this.notifications[0]();
                return Array.isArray(notifs) ? notifs.map(notification => ({
                    tag: 'div',
                    attributes: {
                        class: `notification ${notification.type}`,
                        style: `background: ${this.getNotificationColor(notification.type)}; color: white; padding: 10px; margin: 5px 0; border-radius: 5px; animation: slideIn 0.3s ease;`
                    },
                    children: [notification.message]
                })) : [];
            }
        });

        document.body.appendChild(notificationContainer);

        // Listen for events to show notifications
        eventEmitter.on('scoreAdded', (data) => {
            this.showNotification(`+${data.points} points!`, 'success');
        });

        eventEmitter.on('powerUpCollected', (data) => {
            this.showNotification(`${data.type.toUpperCase()} power-up!`, 'powerup');
        });

        eventEmitter.on('playerDied', () => {
            this.showNotification('Player died!', 'danger');
        });

        eventEmitter.on('levelComplete', () => {
            this.showNotification('Level Complete!', 'success');
        });
    }

    createGameStatusIndicator() {
        const statusIndicator = dom({
            tag: 'div',
            attributes: {
                id: 'game-status',
                style: () => {
                    const status = this.gameState.gameStatus[0]();
                    const colors = {
                        menu: 'blue',
                        playing: 'green',
                        paused: 'orange',
                        gameOver: 'red',
                        victory: 'gold'
                    };
                    return `position: fixed; bottom: 20px; left: 20px; background: ${colors[status] || 'gray'}; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px;`;
                }
            },
            children: [() => `Status: ${this.gameState.gameStatus[0]().toUpperCase()}`]
        });

        document.body.appendChild(statusIndicator);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: Date.now()
        };

        this.notifications[1](prev => [...prev, notification]);

        // Auto-remove notification
        setTimeout(() => {
            this.notifications[1](prev => prev.filter(n => n.id !== notification.id));
        }, duration);
    }

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            danger: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8',
            powerup: '#6f42c1'
        };
        return colors[type] || colors.info;
    }

    // Game state display methods
    createGameOverScreen() {
        return Show({
            when: () => this.gameState.gameStatus[0]() === 'gameOver',
            children: [{
                tag: 'div',
                attributes: {
                    style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 2000;'
                },
                children: [{
                    tag: 'div',
                    attributes: {
                        style: 'text-align: center; color: white; font-family: Arial, sans-serif;'
                    },
                    children: [
                        {
                            tag: 'h1',
                            attributes: { style: 'font-size: 48px; color: red; margin-bottom: 20px;' },
                            children: ['GAME OVER']
                        },
                        {
                            tag: 'p',
                            attributes: { style: 'font-size: 24px; margin-bottom: 30px;' },
                            children: [() => `Final Score: ${this.gameState.playerScore[0]()}`]
                        },
                        {
                            tag: 'button',
                            attributes: {
                                style: 'font-size: 18px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;',
                                onclick: () => {
                                    this.gameState.resetGame();
                                    eventEmitter.emit('navigateToMenu');
                                }
                            },
                            children: ['Play Again']
                        }
                    ]
                }]
            }]
        });
    }

    createVictoryScreen() {
        return Show({
            when: () => this.gameState.gameStatus[0]() === 'victory',
            children: [{
                tag: 'div',
                attributes: {
                    style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 2000;'
                },
                children: [{
                    tag: 'div',
                    attributes: {
                        style: 'text-align: center; color: white; font-family: Arial, sans-serif;'
                    },
                    children: [
                        {
                            tag: 'h1',
                            attributes: { style: 'font-size: 48px; color: gold; margin-bottom: 20px;' },
                            children: ['VICTORY!']
                        },
                        {
                            tag: 'p',
                            attributes: { style: 'font-size: 24px; margin-bottom: 30px;' },
                            children: [() => `Final Score: ${this.gameState.playerScore[0]()}`]
                        },
                        {
                            tag: 'button',
                            attributes: {
                                style: 'font-size: 18px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;',
                                onclick: () => {
                                    this.gameState.resetGame();
                                    eventEmitter.emit('navigateToMenu');
                                }
                            },
                            children: ['Play Again']
                        }
                    ]
                }]
            }]
        });
    }

    // Initialize all reactive UI elements
    init() {
        // Add game over and victory screens to body
        document.body.appendChild(this.createGameOverScreen());
        document.body.appendChild(this.createVictoryScreen());

        // Setup keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.gameState.pauseGame();
            }
        });

        // Load saved state on init
        this.gameState.loadSavedState();
    }
}