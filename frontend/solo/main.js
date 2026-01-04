import { dom } from '../framework/index.js';
import { SoloGameEngine } from '../game/engine/SoloGameEngine.js';

class SoloApp {
    constructor() {
        this.game = null;
        this.eventListeners = [];
        this.mainContainer = null;  // Main container for managing DOM
        this.currentView = null;    // Track current view element
        this.init();
    }

    async init() {
        // Create and set main container if it doesn't exist
        if (!this.mainContainer) {
            this.mainContainer = dom({
                tag: 'div',
                attributes: { id: 'app-container' },
                children: []
            });
            document.body.appendChild(this.mainContainer);
        }
        this.createMenu();
    }

    clearCurrentView() {
        if (this.currentView && this.currentView.parentNode === this.mainContainer) {
            this.mainContainer.removeChild(this.currentView);
        }
        this.currentView = null;
    }

    createMenu() {
        // Clear any existing view
        this.clearCurrentView();
        
        const menu = dom({
            tag: 'div',
            attributes: { class: 'page-container' },
            children: [
                {
                    tag: 'div',
                    attributes: { class: 'menu-box' },
                    children: [
                        {
                            tag: 'h1',
                            attributes: {},
                            children: ['SOLO MODE']
                        },
                        {
                            tag: 'p',
                            attributes: { class: 'menu-subtitle' },
                            children: ['Play against AI enemies']
                        },
                        {
                            tag: 'div',
                            attributes: { class: 'menu-buttons' },
                            children: [
                                {
                                    tag: 'button',
                                    attributes: { id: 'start-solo-btn', class: 'menu-btn' },
                                    children: ['START GAME']
                                },
                                {
                                    tag: 'a',
                                    attributes: {
                                        href: '../index.html',
                                        class: 'menu-btn'
                                    },
                                    children: ['BACK TO HOME']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        this.currentView = menu;
        this.mainContainer.appendChild(menu);

        setTimeout(() => {
            const startBtn = document.getElementById('start-solo-btn');
            if (startBtn) {
                const startHandler = () => this.startGame();
                startBtn.addEventListener('click', startHandler);
                this.eventListeners.push({ element: startBtn, event: 'click', handler: startHandler });
            }
        }, 0);
    }

    async startGame() {
        // Clear current view and cleanup
        this.clearCurrentView();
        this.cleanupEventListeners();

        // Create solo game instance
        this.game = SoloGameEngine.getInstance();
        window.game = this.game;

        await this.game.intiElements();

        while (!this.game.player || !this.game.player.playerCoordinate) {
            await new Promise(r => setTimeout(r, 0));
        }

        this.createGameUI();
        await this.initializeGame();
    }

    createGameUI() {
        this.clearCurrentView();
        
        const gameContainer = dom({
            tag: 'div',
            attributes: { id: 'solo-game-container', style: 'position: relative;' },
            children: [
                {
                    tag: 'div',
                    attributes: { id: 'level-display' },
                    children: []
                }
            ]
        });

        // Create control panel
        const controls = dom({
            tag: 'div',
            attributes: { class: 'Controls' },
            children: [
                {
                    tag: 'button',
                    attributes: { id: 'star_pause' },
                    children: [
                        {
                            tag: 'img',
                            attributes: {
                                src: '/game/icon/play.svg',
                                alt: 'pause/play',
                                width: '16',
                                height: '16'
                            },
                            children: []
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: { id: 'ref' },
                    children: [
                        {
                            tag: 'img',
                            attributes: {
                                src: '/game/icon/rotate-ccw.svg',
                                alt: 'restart',
                                width: '16',
                                height: '16'
                            },
                            children: []
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: { id: 'sound' },
                    children: [
                        {
                            tag: 'img',
                            attributes: {
                                src: '/game/icon/volume-2.svg',
                                alt: 'sound',
                                width: '16',
                                height: '16'
                            },
                            children: []
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: { id: 'home-btn', class: 'menu-btn' },
                    children: ['HOME']
                }
            ]
        });

        // Add game elements to container
        this.mainContainer.appendChild(gameContainer);
        this.mainContainer.appendChild(controls);
        this.currentView = gameContainer;  // Track the game view

        // Add home button event listener
        setTimeout(() => {
            const homeBtn = document.getElementById('home-btn');
            if (homeBtn) {
                const homeHandler = () => {
                    this.cleanup();
                    window.location.href = '../index.html';
                };
                homeBtn.addEventListener('click', homeHandler);
                this.eventListeners.push({ element: homeBtn, event: 'click', handler: homeHandler });
            }
        }, 0);
    }

    async initializeGame() {
        await this.game.waitForLevel();

        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay && this.game.map && this.game.map.level) {
            const levelText = dom({
                tag: 'div',
                attributes: {
                    style: 'text-align: center; color: white; font-size: 24px; padding: 20px;'
                },
                children: [this.game.map.level.name]
            });
            levelDisplay.appendChild(levelText);
            levelDisplay.classList.add('show');
        }

        this.game.state.initArrowState();
        this.game.state.stopTimer();
        this.game.state.resetTimer();
        this.game.state.setTime(this.game.map.level.level_time);
        this.game.state.startTimer();
        this.game.run();

        setTimeout(() => {
            this.game.state.pauseStart();
            this.game.state.updatePauseIcon();  // Update icon to show pause state
            if (levelDisplay) {
                levelDisplay.classList.remove('show');
            }
        }, 2000);

        // Monitor for restart and handle it
        this.monitorRestart();
    }

    monitorRestart() {
        const checkRestart = setInterval(() => {
            // Check if restart flag is set and game is in rest state
            if (this.game && this.game.stateofrest && this.game.state.Isrestar()) {
                clearInterval(checkRestart);
                this.game.state.Restar(); // Reset the restart flag
                this.startGame(); // Restart the game
            }
        }, 100);
    }

    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
    }

    cleanup() {
        if (this.game) {
            this.game.stop();
        }

        this.cleanupEventListeners();
        
        // Properly remove the current view element
        this.clearCurrentView();
        
        SoloGameEngine.resetInstance();
        this.game = null;
        window.game = null;
    }
}

new SoloApp();
