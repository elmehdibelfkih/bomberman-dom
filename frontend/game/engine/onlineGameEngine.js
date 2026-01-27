import { Map } from '../components/Map.js';
import { State } from './State.js';
import { UI } from '../components/Ui.js';
import { MultiplayerPlayerManager } from '../managers/OnlinePlayersManager.js';
import { BombManager } from '../managers/BombManager.js';
import { PowerUpManager } from '../managers/PowerUpManager.js';
import { setupMultiplayerSync } from '../network/MultiplayerSync.js';

export class OnlineGmeEngine {
    static #instance = null;

    static getInstance() {
        if (!OnlineGmeEngine.#instance) {
            OnlineGmeEngine.#instance = new OnlineGmeEngine();
        }
        return OnlineGmeEngine.#instance;
    }

    constructor() {
        if (OnlineGmeEngine.#instance) {
            throw new Error('Use OnlineGmeEngine.getInstance()');
        }
        this.isMultiplayer = true;
        // this.state = State.getInstance(this);
        this.map = Map.getInstance(this);
        this.ui = UI.getInstance(this);
        this.networkManager = null;
        this.router = null;
        this.playerManager = null;
        this.bombManager = null;
        this.powerUpManager = null;
        this.IDRE = null;
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
        // await this.intiElements(mapData);
        await this.map.initMap(mapData);
        await this.waitForLevel();
    }

    // async intiElements(mapData = null) {
    //     // this.state.initArrowState();
    // }

    async waitForLevel() {
        while (!this.map || !this.map.level) {
            await new Promise(r => setTimeout(r, 50));
        }
    }

    startGame() {
        this.gameStarted = true;
        this.run();
    }

    run = () => {
        if (this.IDRE) return;
        this.IDRE = requestAnimationFrame(this.loop.bind(this));
    }

    async loop(timestamp) {
        if (!this.gameStarted) return;

        // if (!this.state.isPaused()) {
        // }
        this.updateRender(timestamp);
        this.IDRE = requestAnimationFrame(this.loop.bind(this));
    }

    async updateRender(timestamp) {
        if (this.playerManager) {

            this.playerManager.update(timestamp);
        }
        // if (this.bombManager) {
        //     this.bombManager.update(timestamp);
        // }
        // this.state.update();
    }

    handleServerState(gameState) {
        // makayban walo
        console.log(gameState);

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

    stop() {
        this.gameStarted = false;
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        // if (this.state) {
        //     this.state.stopTimer();
        // }
        if (this.playerManager) {
            this.playerManager.cleanup();
        }
    }

    static resetInstance() {
        // State.resetInstance();
        OnlineGmeEngine.#instance = null;
    }
}