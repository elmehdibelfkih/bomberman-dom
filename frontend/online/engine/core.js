import { Scoreboard } from '../components/scoreboard.js';
import { Player } from '../components/player.js';
import { Map } from '../components/map.js';
import { State } from './state.js';
import { UI } from '../components/ui.js';

export class Game {

    static #instance = null;

    static getInstance(gameData) {
        console.log("ha data =>", gameData);
        
        if (!Game.#instance) Game.#instance = new Game();
        return Game.#instance;
    }

    constructor() {
        this.state = State.getInstance(this);
        // this.scoreboard = Scoreboard.getInstance(this)
        this.map = Map.getInstance(this)
        this.player = new Player(this)
        this.ui =  UI.getInstance(this)
        this.IDRE = null
        this.nextLevelTimeoutId = null;
        this.levelComplete = false;
        this.Detect = false
    }

    async waitForLevel() {
        while (!this.map || !this.map.level) {
            await new Promise(r => setTimeout(r, 50));
        }
    }

    async intiElements() {
        this.state.initArrowState()
        await this.map.initMap()
        await this.player.initPlayer()
        return
    }

    run = () => {
        if (this.IDRE) return;
        this.IDRE = requestAnimationFrame(this.loop.bind(this));
    }
    
    async loop(timestamp) {
        console.log("hani f loop");
        
        if (this.state.isGameOver() || this.state.Isrestar()) {
            this.state.SetPause(false)
            this.Detect = this.state.Isrestar() ? true : false
            this.state.updateStateof(this.Detect)
            await this.gameOver()
            return
        }
        if (!this.state.isPaused()) this.updateRender(timestamp);
        this.IDRE = requestAnimationFrame(this.loop.bind(this));
    }

    async updateRender(timestamp) {
        this.player.updateRender(timestamp);
        this.map.bombs = this.map.bombs?.filter(b => b.updateRender(timestamp) && !b.done);
        this.state.update()
        this.checkState()
    }

    async gameOver() {
        this.state.stopTimer();
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        this.levelComplete = false;
        this.ui.GameOver()
        this.state.setScore(0)
        this.state.initState()
        // this.scoreboard.initScoreBaord()
        // this.scoreboard.updateLives()
        // this.scoreboard.updateScore()
        this.map.bombs = []
        this.player.removeplayer()
        this.map.destructor()
        this.state.removeEventListeners();
        this.state = State.getInstance(this)
        this.state.initArrowState();
        Map.instance = null
        this.map = Map.getInstance(this)
        this.player = new Player(this)
        await this.map.initMap()
        await this.player.initPlayer()
    }

    async nextLevel() {
        this.state.stopTimer();
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        this.ui.nextLevel()
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.state.setScore(0);
        this.state.initState();
        // this.scoreboard.initScoreBaord();
        // this.scoreboard.updateLives();
        // this.scoreboard.updateScore();
        this.map.bombs = [];
        this.player.removeplayer();
        this.map.destructor();
        this.state.removeEventListeners();
        this.state.initArrowState();
        this.state.nextLevel();
        // this.scoreboard.updateLevel();
        Map.instance = null
        this.map = Map.getInstance(this);
        this.player = new Player(this);
        await this.map.initMap();
        await this.player.initPlayer();
        await this.waitForLevel();
        this.state.stopTimer();
        this.state.resetTimer();
        this.state.setTime(this.map.level.level_time);
        this.state.startTimer();
        this.levelComplete = false;
    }

    async handleWin() {
        this.state.stopTimer();
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.state.setScore(0);
        this.state.initState();
        // this.scoreboard.initScoreBaord();
        // this.scoreboard.updateLives();
        // this.scoreboard.updateScore();
        this.map.bombs = [];
        this.player.removeplayer();
        this.map.destructor();
        this.state.removeEventListeners();
        this.state = State.getInstance(this);
        this.state.initArrowState();
        this.state.resetLevel();
        // this.scoreboard.updateLevel();
        Map.instance = null
        this.map = Map.getInstance(this);
        this.player = new Player(this);
        await this.map.initMap();
        await this.player.initPlayer();
        await this.waitForLevel();
        this.state.stopTimer();
        this.state.resetTimer();
        this.state.setTime(this.map.level.level_time);
        this.state.startTimer();
        this.levelComplete = false;
    }

    async checkState() {
    }
}
