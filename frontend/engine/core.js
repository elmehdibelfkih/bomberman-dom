import { Scoreboard } from '../components/scoreboard.js';
import { Player } from '../components/player.js';
import { Map } from '../components/map.js';
import { State } from './state.js';
import { Enemy } from '../components/enemy.js';
import { UI } from '../components/ui.js';
import { eventEmitter, useNavigate } from '../framwork/index.js';

export class Game {

    static #instance = null;

    static getInstance() {
        if (!Game.#instance) Game.#instance = new Game();
        return Game.#instance;
    }
    constructor() {
        this.state = State.getInstance(this);
        this.scoreboard = Scoreboard.getInstance(this)
        this.map = Map.getInstance(this)
        this.player = Player.getInstance(this)
        this.ui =  UI.getInstance(this)
        this.navigate = useNavigate();
        this.IDRE = null
        this.stateofrest = false
        this.nextLevelTimeoutId = null;
        this.levelComplete = false;
        this.Detect = false
        
        eventEmitter.on('playerDied', this.handlePlayerDeath.bind(this));
        eventEmitter.on('allEnemiesDefeated', this.handleAllEnemiesDefeated.bind(this));
        eventEmitter.on('bombExploded', this.handleBombExplosion.bind(this));
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
        if (this.stateofrest) return
        this.player.updateRender(timestamp);
        this.map.bombs = this.map.bombs?.filter(b => b.updateRender(timestamp) && !b.done);
        this.map.enemys = this.map.enemys?.filter(b => {
            b.updateRender(timestamp)
            return !b.dead
        });
        this.state.update()
        this.checkState()
    }

    async gameOver() {
        this.state.stopTimer();
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        this.stateofrest = true
        this.levelComplete = false;
        this.ui.GameOver()
        this.state.setScore(0)
        this.state.initState()
        this.scoreboard.initScoreBaord()
        this.scoreboard.updateLives()
        this.scoreboard.updateScore()
        this.map.enemys = []
        this.map.Booms = []
        this.player.removeplayer()
        this.map.destructeur()
        this.state.removeEventListeners();
        this.state = State.getInstance(this)
        this.state.initArrowState();
        this.map = Map.getInstance(this)
        this.player = Player.getInstance(this)
        await this.map.initMap()
        await this.player.initPlayer()
        this.enemie = new Enemy(this);
        this.stateofrest = false
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
        this.scoreboard.initScoreBaord();
        this.scoreboard.updateLives();
        this.scoreboard.updateScore();
        this.map.enemys = [];
        this.map.Booms = [];
        this.player.removeplayer();
        this.map.destructeur();
        this.state.removeEventListeners();
        this.state.initArrowState();
        this.state.nextLevel();
        this.scoreboard.updateLevel();
        this.map = null
        this.map = Map.getInstance(this);
        this.player = Player.getInstance(this);
        await this.map.initMap();
        await this.player.initPlayer();
        await this.waitForLevel();
        this.state.stopTimer();
        this.state.resetTimer();
        this.state.setTime(this.map.level.level_time);
        this.state.startTimer();
        this.stateofrest = false;
        this.levelComplete = false;
    }

    async handleWin() {
        this.state.stopTimer();
        if (this.IDRE) {
            cancelAnimationFrame(this.IDRE);
            this.IDRE = null;
        }
        this.stateofrest = true
        this.ui.win()
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.state.setScore(0);
        this.state.initState();
        this.scoreboard.initScoreBaord();
        this.scoreboard.updateLives();
        this.scoreboard.updateScore();
        this.map.enemys = [];
        this.map.Booms = [];
        this.player.removeplayer();
        this.map.destructeur();
        this.state.removeEventListeners();
        this.state = State.getInstance(this);
        this.state.initArrowState();
        this.state.resetLevel();
        this.scoreboard.updateLevel();
        this.map = null
        this.map = Map.getInstance(this);
        this.player = Player.getInstance(this);
        await this.map.initMap();
        await this.player.initPlayer();
        await this.waitForLevel();
        this.state.stopTimer();
        this.state.resetTimer();
        this.state.setTime(map.level.level_time);
        this.state.startTimer();
        this.stateofrest = false;
        this.levelComplete = false;
    }

    handlePlayerDeath(data) {
        console.log('Player died:', data);
    }

    handleAllEnemiesDefeated() {
        if (!this.levelComplete) {
            this.levelComplete = true;
            eventEmitter.emit('levelComplete');
        }
    }

    handleBombExplosion(data) {
        console.log('Bomb exploded at:', data.x, data.y);
    }

    async checkState() {
        if (this.map.enemys.length === 0 && !this.levelComplete) {
            this.levelComplete = true;
            eventEmitter.emit('allEnemiesDefeated');
            if (this.state.getcurentlevel() >= this.state.maxlevel()) {
                const Id = setTimeout(() => {
                    this.handleWin();
                    eventEmitter.emit('gameWon');
                    if (this.navigate) this.navigate('/victory');
                    clearTimeout(Id)
                }, 1600)
            } else {
                const id = setTimeout(() => {
                    this.nextLevel();
                    eventEmitter.emit('levelComplete');
                    if (this.navigate) this.navigate('/level-complete');
                    clearTimeout(id)
                }, 1600);
            }
        }
    }
}
