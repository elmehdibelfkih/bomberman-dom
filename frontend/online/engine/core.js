// import { Scoreboard } from '../components/scoreboard.js';
import { Player } from '../components/player.js';
import { Map as gameMap } from '../components/map.js';
import { State } from './state.js';
import { UI } from '../components/ui.js';
import { NetworkManager } from '../network/networkManager.js';
import { setupMultiplayerSync } from '../network/MultiplayerSync.js';
export class Game {

    static #instance = null;

    static getInstance(gameData) {
        if (!Game.#instance || gameData) {
            Game.#instance = new Game(gameData);
        }
        return Game.#instance;
    }

    static resetInstance() {
        Game.#instance = null;
    }

    constructor(gameData) {
        this.gameData = gameData;
        this.networkManager = NetworkManager.getInstance();

        this.state = State.getInstance(this);
        // this.scoreboard = Scoreboard.getInstance(this)
        this.map = gameMap.getInstance(this, gameData.mapData)

        this.players = new Map();

        for (const playerData of Object.values(gameData.players)) {
            this.players.set(playerData.playerId, new Player(this, playerData, playerData.playerId === this.networkManager.getPlayerId()));
        }
        this.ui = UI.getInstance(this)
        this.IDRE = null
    }



    async intiElements() {
        setupMultiplayerSync(this, this.networkManager);

        this.state.initArrowState()
        await this.map.initMap()
        for (const player of this.players.values()) {
            await player.initPlayer();
        }
        return
    }

    reconcileLocalPlayer(data) {
        this.players.get(data.playerId).reconcileWithServer(data);
    }

    updateRemotePlayer() {
        this.players.get(data.playerId).updateStateFromServer(data);
    }

    run = () => {
        if (this.IDRE) return;
        this.loop = this.loop.bind(this);
        this.IDRE = requestAnimationFrame(this.loop);
    }

    stop = () => {
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }

        if (this.players) {
            for (const player of this.players.values()) {
                player.removeplayer();
            }
            this.players.clear();
            this.players = null;
        }
        if (this.map) {
            this.map.destructor();
            this.map.bombs = [];
            this.map = null;
            Map.resetInstance();
        }
        if (this.ui) {
            this.ui = null;
            UI.resetInstance();
        }

        if (this.state) {
            this.state.removeEventListeners();
            this.state.initState();
            this.state = null;
            State.resetInstance();
        }

        this.gameData = null;
        Game.resetInstance();
    }

    loop(timestamp) {
        this.updateRender(timestamp);
        this.IDRE = requestAnimationFrame(this.loop);
    }

    async updateRender(timestamp) {
        for (const player of this.players.values()) {
            player.updateRender(timestamp);
        }
        this.map.bombs = this.map.bombs?.filter(b => b.updateRender(timestamp) && !b.done);
        this.state.update()
        this.checkState()
    }

    async checkState() {
    }
}
