// import { Scoreboard } from '../components/scoreboard.js';
import { Player } from '../components/player.js';
import { Map } from '../components/map.js';
import { State } from './state.js';
import { UI } from '../components/ui.js';

export class Game {

    static #instance = null;

    static getInstance(gameData) {
        console.log("ha data =>", gameData);
        
        if (!Game.#instance || gameData) {
            Game.#instance = new Game(gameData);
        }
        return Game.#instance;
    }

    static resetInstance() {
        Game.#instance = null;
    }

    static resetInstance() {
        Game.#instance = null;
    }

    constructor(gameData) {
        this.gameData = gameData;
        this.state = State.getInstance(this);
        // this.scoreboard = Scoreboard.getInstance(this)
        this.map = Map.getInstance(this, gameData.mapData)
        
        this.player = new Player(this)
        this.ui =  UI.getInstance(this)
        this.IDRE = null
    }

    // async waitForLevel() {
    //     while (!this.map || !this.map.level) {
    //         await new Promise(r => setTimeout(r, 50));
    //     }
    // }

    async intiElements() {
        this.state.initArrowState()
        await this.map.initMap()
        await this.player.initPlayer()
        return
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

        if (this.player) {
            this.player.removeplayer();
            this.player = null;
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
        this.player.updateRender(timestamp);
        this.map.bombs = this.map.bombs?.filter(b => b.updateRender(timestamp) && !b.done);
        this.state.update()
        this.checkState()
    }

    async checkState() {
    }
}
