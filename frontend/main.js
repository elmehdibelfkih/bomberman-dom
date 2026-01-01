import { Game } from "./engine/core.js"
import { dom, eventEmitter, Router, usePathname, useHash, useNavigate, createSignal, createEffect } from "./framwork/index.js"
import { GameRouter } from './components/GameRouter.js';
import { ReactiveGameState } from './components/ReactiveGameState.js';
import { ReactiveUI } from './components/ReactiveUI.js';

// Initialize router
Router.instance.initRouter();

// Initialize reactive state management
const gameState = ReactiveGameState.getInstance();
const reactiveUI = ReactiveUI.getInstance();

// Initialize game router
const gameRouter = GameRouter.getInstance();

// Get reactive router state
const pathname = usePathname();
const hash = useHash();
const navigate = useNavigate();

// Reactive game initialization
const gameInitialized = createSignal(false);
let gameInstance = null;

// Initialize game when ready
async function initializeGame() {
    try {
        gameInstance = Game.getInstance();
        window.game = gameInstance;
        await gameInstance.intiElements();
        
        gameInitialized[1](true);
        reactiveUI.init();
        
        // Enable start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'START GAME';
        }
    } catch (error) {
        console.error('Failed to initialize game:', error);
        // Enable button anyway to allow retry
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'START GAME';
        }
    }
}

// Start initialization
initializeGame();

// Reactive event listeners
createEffect(() => {
    const status = gameState.gameStatus[0]();
    console.log('Game status changed:', status);
});

// Listen for game events
eventEmitter.on('gameStarted', () => {
    gameState.startGame();
});

eventEmitter.on('scoreUpdated', (data) => {
    gameState.addScore(data.score || 0);
});

eventEmitter.on('playerDied', () => {
    reactiveUI.showNotification('Player died!', 'danger');
});

eventEmitter.on('powerUpCollected', (data) => {
    reactiveUI.showNotification(`${data.type} collected!`, 'powerup');
});

window.startGame = async function () {
    try {
        if (!window.game) {
            // Try to initialize if not ready
            await initializeGame();
        }
        
        await window.game.waitForLevel();
        document.getElementById('instructions').classList.add('hidden');
        const levelDisplay = document.getElementById('level-display');
        levelDisplay.textContent = `${window.game.map.level.name}`
        levelDisplay.classList.add('show')
        window.game.state.stopTimer();
        window.game.state.resetTimer();
        window.game.state.setTime(300); // Set 5 minutes instead of level time
        window.game.state.startTimer();
        window.game.run();
        eventEmitter.emit('gameStarted', { level: window.game.state.getLevel() });
        navigate('/game');
        setTimeout(() => {
            // Remove the automatic pause call
            levelDisplay.classList.remove('show');
        }, 2000);
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}

// Add event listener for start button
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        // Disable button initially
        startBtn.disabled = true;
        startBtn.textContent = 'Loading...';
        
        startBtn.addEventListener('click', () => {
            if (window.startGame) {
                window.startGame();
            } else {
                console.error('Game not ready yet');
            }
        });
    }
});