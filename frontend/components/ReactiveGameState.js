import { createSignal, createMemo, createEffect, eventEmitter } from '../framwork/index.js';

export class ReactiveGameState {
    static instance = null;

    static getInstance() {
        if (!ReactiveGameState.instance) {
            ReactiveGameState.instance = new ReactiveGameState();
        }
        return ReactiveGameState.instance;
    }

    constructor() {
        // Core game state signals
        this.gameStatus = createSignal('menu'); // 'menu', 'playing', 'paused', 'gameOver', 'victory'
        this.currentLevel = createSignal(1);
        this.playerLives = createSignal(3);
        this.playerScore = createSignal(0);
        this.gameTime = createSignal(0);
        this.bombsPlaced = createSignal(0);
        this.maxBombs = createSignal(1);
        this.playerSpeed = createSignal(4);
        this.soundEnabled = createSignal(true);
        
        // Player state
        this.playerPosition = createSignal({ x: 0, y: 0 });
        this.playerDirection = createSignal('down');
        this.playerHealth = createSignal(100);
        
        // Game objects state
        this.activeBombs = createSignal([]);
        this.enemies = createSignal([]);
        this.powerUps = createSignal([]);
        this.blocks = createSignal([]);
        
        // Input state
        this.keyStates = createSignal({
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        });
        
        // Computed values
        this.isGameActive = createMemo(() => {
            const status = this.gameStatus[0]();
            return status === 'playing';
        });
        
        this.canPlaceBomb = createMemo(() => {
            return this.bombsPlaced[0]() < this.maxBombs[0]();
        });
        
        this.gameProgress = createMemo(() => {
            const level = this.currentLevel[0]();
            const maxLevel = 10;
            return (level / maxLevel) * 100;
        });
        
        this.playerStats = createMemo(() => ({
            lives: this.playerLives[0](),
            score: this.playerScore[0](),
            level: this.currentLevel[0](),
            health: this.playerHealth[0](),
            speed: this.playerSpeed[0]()
        }));
        
        this.timeDisplay = createMemo(() => {
            const time = this.gameTime[0]();
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        });
        
        // Effects for automatic state management
        this.setupEffects();
        this.setupEventListeners();
    }
    
    setupEffects() {
        // Game over when lives reach 0
        createEffect(() => {
            if (this.playerLives[0]() <= 0) {
                this.gameStatus[1]('gameOver');
                eventEmitter.emit('gameOver', { 
                    reason: 'noLives', 
                    finalScore: this.playerScore[0]() 
                });
            }
        });
        
        // Victory when max level reached
        createEffect(() => {
            if (this.currentLevel[0]() > 10) {
                this.gameStatus[1]('victory');
                eventEmitter.emit('gameWon', { 
                    finalScore: this.playerScore[0]() 
                });
            }
        });
        
        // Emit events when key state changes
        createEffect(() => {
            const stats = this.playerStats();
            try {
                eventEmitter.emit('playerStatsChanged', stats);
            } catch (e) {
                // Ignore if no listeners
            }
        });
        
        // Auto-save game state
        createEffect(() => {
            const gameState = {
                level: this.currentLevel[0](),
                score: this.playerScore[0](),
                lives: this.playerLives[0](),
                soundEnabled: this.soundEnabled[0]()
            };
            localStorage.setItem('bomberman-save', JSON.stringify(gameState));
        });
    }
    
    setupEventListeners() {
        // Listen for game events
        eventEmitter.on('playerDied', () => {
            this.playerLives[1](prev => Math.max(0, prev - 1));
        });
        
        eventEmitter.on('scoreUpdated', (data) => {
            this.playerScore[1](prev => prev + data.points);
        });
        
        eventEmitter.on('bombPlaced', () => {
            this.bombsPlaced[1](prev => prev + 1);
        });
        
        eventEmitter.on('bombExploded', () => {
            this.bombsPlaced[1](prev => Math.max(0, prev - 1));
        });
        
        eventEmitter.on('levelComplete', () => {
            this.currentLevel[1](prev => prev + 1);
        });
        
        eventEmitter.on('powerUpCollected', (data) => {
            this.handlePowerUp(data.type);
        });
    }
    
    // Action methods
    startGame() {
        this.gameStatus[1]('playing');
        this.resetLevel();
        eventEmitter.emit('gameStarted', { level: this.currentLevel[0]() });
    }
    
    pauseGame() {
        const current = this.gameStatus[0]();
        if (current === 'playing') {
            this.gameStatus[1]('paused');
        } else if (current === 'paused') {
            this.gameStatus[1]('playing');
        }
        eventEmitter.emit('gamePaused', { paused: current === 'playing' });
    }
    
    resetGame() {
        this.gameStatus[1]('menu');
        this.currentLevel[1](1);
        this.playerLives[1](3);
        this.playerScore[1](0);
        this.gameTime[1](0);
        this.bombsPlaced[1](0);
        this.playerHealth[1](100);
        eventEmitter.emit('gameReset');
    }
    
    resetLevel() {
        this.gameTime[1](0);
        this.bombsPlaced[1](0);
        this.playerHealth[1](100);
        this.activeBombs[1]([]);
        this.powerUps[1]([]);
    }
    
    nextLevel() {
        this.currentLevel[1](prev => prev + 1);
        this.resetLevel();
        eventEmitter.emit('levelChanged', { level: this.currentLevel[0]() });
    }
    
    addScore(points) {
        this.playerScore[1](prev => prev + points);
        eventEmitter.emit('scoreAdded', { points, total: this.playerScore[0]() });
    }
    
    handlePowerUp(type) {
        switch (type) {
            case 'speed':
                this.playerSpeed[1](prev => Math.min(8, prev + 1));
                break;
            case 'bombs':
                this.maxBombs[1](prev => prev + 1);
                break;
            case 'health':
                this.playerLives[1](prev => prev + 1);
                break;
        }
    }
    
    updatePlayerPosition(x, y) {
        this.playerPosition[1]({ x, y });
    }
    
    updateKeyState(key, pressed) {
        const current = this.keyStates[0]();
        this.keyStates[1]({ ...current, [key]: pressed });
    }
    
    // Getters for compatibility
    getGameStatus() { return this.gameStatus[0](); }
    getCurrentLevel() { return this.currentLevel[0](); }
    getPlayerLives() { return this.playerLives[0](); }
    getPlayerScore() { return this.playerScore[0](); }
    getGameTime() { return this.gameTime[0](); }
    canPlayerPlaceBomb() { return this.canPlaceBomb(); }
    isGameRunning() { return this.isGameActive(); }
    
    // Load saved state
    loadSavedState() {
        const saved = localStorage.getItem('bomberman-save');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.currentLevel[1](state.level || 1);
                this.playerScore[1](state.score || 0);
                this.playerLives[1](state.lives || 3);
                this.soundEnabled[1](state.soundEnabled !== false);
            } catch (e) {
                console.warn('Failed to load saved state:', e);
            }
        }
    }
}