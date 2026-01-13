import { Map } from '../components/map.js';
import { State } from './state.js';
import { UI } from '../components/ui.js';
import { MultiplayerPlayerManager } from '../components/MultiplayerPlayerManager.js';
import { BombManager } from '../components/BombManager.js';
import { PowerUpManager } from '../components/PowerUpManager.js';
import { setupMultiplayerSync } from '../network/MultiplayerSync.js';

export class MultiplayerGameEngine {
    static #instance = null;

    static getInstance() {
        if (!MultiplayerGameEngine.#instance) {
            MultiplayerGameEngine.#instance = new MultiplayerGameEngine();
        }
        return MultiplayerGameEngine.#instance;
    }

    constructor() {
        if (MultiplayerGameEngine.#instance) {
            throw new Error('Use MultiplayerGameEngine.getInstance()');
        }
        this.state = State.getInstance(this);
        this.map = Map.getInstance(this);
        this.ui = UI.getInstance(this);
        this.networkManager = null;
        this.router = null;
        this.playerManager = null;
        this.bombManager = null;
        this.powerUpManager = null;
        this.IDRE = null;
        this.isMultiplayer = true;
        this.gameStarted = false;
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager;
    }

    setRouter(router) {
        this.router = router;
    }

    async initGame(gameData) {
        if (gameData.mapData && gameData.players) {
            await this.initializeWithMap(gameData.mapData);
            
            this.playerManager = new MultiplayerPlayerManager(this, this.networkManager, this.router);
            this.bombManager = new BombManager(this);
            this.powerUpManager = new PowerUpManager(this);

            await this.playerManager.initializePlayers(gameData);
            
            setupMultiplayerSync(this, this.networkManager);

            this.startGame();
        }
    }

    async initializeWithMap(mapData) {
        await this.intiElements(mapData);
        await this.waitForLevel();
    }

    async intiElements(mapData = null) {
        this.state.initArrowState();
        await this.map.initMap(mapData);
    }

    async waitForLevel() {
        while (!this.map || !this.map.level) {
            await new Promise(r => setTimeout(r, 50));
        }
    }

    run = () => {
        if (this.IDRE) return;
        this.IDRE = requestAnimationFrame(this.loop.bind(this));
    }

    async loop(timestamp) {
        if (!this.gameStarted) return;
        
        if (!this.state.isPaused()) {
            this.updateRender(timestamp);
        }
        this.IDRE = requestAnimationFrame(this.loop.bind(this));
    }

    async updateRender(timestamp) {
        if (this.playerManager) {
            this.playerManager.update(timestamp);
        }
        if (this.bombManager) {
            this.bombManager.update(timestamp);
        }
        this.state.update();
    }

    handleServerState(gameState) {
        if (gameState.players && this.playerManager) {
            gameState.players.forEach(serverPlayer => {
                if (serverPlayer.playerId !== this.networkManager.getPlayerId()) {
                    this.playerManager.updateRemotePlayer(serverPlayer);
                } else {
                    this.playerManager.reconcileLocalPlayer(serverPlayer);
                }
            });
        }
        if (gameState.bombs && this.bombManager) this.bombManager.updateBombsFromServer(gameState.bombs);
        if (gameState.powerups && this.powerUpManager) this.powerUpManager.updatePowerupsFromServer(gameState.powerups);
        if (gameState.grid) this.updateMapFromServer(gameState.grid);
    }

    updateMapFromServer(grid) {
        if (this.map && this.map.level) {
            this.map.level.initial_grid = grid;
        }
    }

    handleGameEnded(winner) {
        this.gameStarted = false;
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        if (this.playerManager) {
            this.playerManager.handleGameOver(winner);
        }
    }

    startGame() {
        this.gameStarted = true;
        this.run();
    }

    stop() {
        this.gameStarted = false;
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        if (this.state) {
            this.state.stopTimer();
        }
        if (this.playerManager) {
            this.playerManager.cleanup();
        }
    }

    static resetInstance() {
        MultiplayerGameEngine.#instance = null;
    }
}