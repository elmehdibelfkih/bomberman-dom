import { dom, Router, usePathname, useHash, useNavigate, createEffect, eventEmitter } from '../framwork/index.js';

export class GameRouter {
    static instance = null;

    static getInstance() {
        if (!GameRouter.instance) {
            GameRouter.instance = new GameRouter();
        }
        return GameRouter.instance;
    }

    constructor() {
        this.pathname = usePathname();
        this.hash = useHash();
        this.navigate = useNavigate();
        this.currentView = null;
        this.setupRoutes();
    }

    setupRoutes() {
        // React to route changes
        createEffect(() => {
            const path = this.pathname();
            const hashValue = this.hash();
            this.handleRouteChange(path, hashValue);
        });

        // Listen for navigation events
        eventEmitter.on('navigateToMenu', () => this.navigate('/'));
        eventEmitter.on('navigateToGame', () => this.navigate('/game'));
        eventEmitter.on('navigateToSettings', () => this.navigate('/settings'));
        eventEmitter.on('navigateToLobby', () => this.navigate('/lobby'));
    }

    handleRouteChange(path, hash) {
        console.log('Route changed:', path, hash);
        
        switch (path) {
            case '/':
                this.showMainMenu();
                break;
            case '/game':
                this.showGame(hash);
                break;
            case '/game-over':
                this.showGameOver();
                break;
            case '/level-complete':
                this.showLevelComplete();
                break;
            case '/victory':
                this.showVictory();
                break;
            case '/settings':
                this.showSettings();
                break;
            case '/lobby':
                this.showLobby();
                break;
            default:
                this.showMainMenu();
        }
    }

    showMainMenu() {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.classList.remove('hidden');
        }
        eventEmitter.emit('routeChanged', { route: 'menu' });
    }

    showGame(hash) {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.classList.add('hidden');
        }
        
        // Handle game sub-routes via hash
        if (hash === '#/paused') {
            eventEmitter.emit('gamePaused');
        } else if (hash === '#/playing') {
            eventEmitter.emit('gameResumed');
        }
        
        eventEmitter.emit('routeChanged', { route: 'game', hash });
    }

    showGameOver() {
        eventEmitter.emit('routeChanged', { route: 'gameOver' });
        // Auto-redirect to menu after 5 seconds
        setTimeout(() => {
            this.navigate('/');
        }, 5000);
    }

    showLevelComplete() {
        eventEmitter.emit('routeChanged', { route: 'levelComplete' });
        // Auto-redirect to next level after 3 seconds
        setTimeout(() => {
            this.navigate('/game');
        }, 3000);
    }

    showVictory() {
        eventEmitter.emit('routeChanged', { route: 'victory' });
        // Auto-redirect to menu after 10 seconds
        setTimeout(() => {
            this.navigate('/');
        }, 10000);
    }

    showSettings() {
        this.createSettingsView();
        eventEmitter.emit('routeChanged', { route: 'settings' });
    }

    showLobby() {
        this.createLobbyView();
        eventEmitter.emit('routeChanged', { route: 'lobby' });
    }

    createSettingsView() {
        const existingSettings = document.getElementById('settings-view');
        if (existingSettings) return;

        const settingsView = dom({
            tag: 'div',
            attributes: {
                id: 'settings-view',
                style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;'
            },
            children: [
                {
                    tag: 'div',
                    attributes: {
                        style: 'background: white; padding: 20px; border-radius: 10px; text-align: center;'
                    },
                    children: [
                        {
                            tag: 'h2',
                            children: ['Game Settings']
                        },
                        {
                            tag: 'div',
                            children: [
                                {
                                    tag: 'label',
                                    children: ['Sound: ']
                                },
                                {
                                    tag: 'input',
                                    attributes: {
                                        type: 'checkbox',
                                        checked: true,
                                        onchange: (e) => {
                                            eventEmitter.emit('soundToggled', { enabled: e.target.checked });
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            tag: 'button',
                            attributes: {
                                onclick: () => {
                                    document.body.removeChild(settingsView);
                                    this.navigate('/');
                                },
                                style: 'margin-top: 20px; padding: 10px 20px;'
                            },
                            children: ['Back to Menu']
                        }
                    ]
                }
            ]
        });

        document.body.appendChild(settingsView);
    }

    createLobbyView() {
        const existingLobby = document.getElementById('lobby-view');
        if (existingLobby) return;

        const lobbyView = dom({
            tag: 'div',
            attributes: {
                id: 'lobby-view',
                style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; color: white;'
            },
            children: [
                {
                    tag: 'div',
                    attributes: {
                        style: 'text-align: center;'
                    },
                    children: [
                        {
                            tag: 'h2',
                            children: ['Multiplayer Lobby']
                        },
                        {
                            tag: 'p',
                            children: ['Waiting for players...']
                        },
                        {
                            tag: 'div',
                            attributes: { id: 'player-count' },
                            children: ['Players: 1/4']
                        },
                        {
                            tag: 'button',
                            attributes: {
                                onclick: () => {
                                    document.body.removeChild(lobbyView);
                                    this.navigate('/');
                                },
                                style: 'margin-top: 20px; padding: 10px 20px;'
                            },
                            children: ['Leave Lobby']
                        }
                    ]
                }
            ]
        });

        document.body.appendChild(lobbyView);
    }

    // Navigation helpers
    goToGame() {
        this.navigate('/game');
    }

    goToMenu() {
        this.navigate('/');
    }

    goToSettings() {
        this.navigate('/settings');
    }

    goToLobby() {
        this.navigate('/lobby');
    }

    // Game state routing
    pauseGame() {
        this.navigate('/game#/paused');
    }

    resumeGame() {
        this.navigate('/game#/playing');
    }
}