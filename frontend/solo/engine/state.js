import * as helpers from '../utils/helpers.js';
export class State {

    #CURRENT_LEVEL = 1
    #LIVES = 3
    #SCORE = 0
    #PAUSE = true
    #PLAYER_SPEED = 3
    #BOMB_COUNT = 0
    #MAX_ALLOWD_BOMBS = 1
    #GAME_OVER = false
    #SOUND = true
    #ARROW_UP = false
    #ARROW_DOWN = false
    #ARROW_RIGHT = false
    #ARROW_LEFT = false
    #TIME = 0
    #TIMER_ID = null
    #RESTAR = false
    #STATE = false
    #MAXLEVEL = 10

    constructor(game) {
        State.instance = this;
        this.game = game
        this.isStar = true;
        this._boundTransfer = this.pauseStart.bind(this);
        this._boundRestar = this.Restar.bind(this);
        this._boundSwitch = this.switch.bind(this);
        this._boundKeyDown = this.setArrowStateKeyDown.bind(this);
        this._boundKeyUp = this.setArrowStateKeyUp.bind(this);
        this._throttledRestar = helpers.throttle(this._boundRestar, 1000);
    }

    static getInstance = (game) => State.instance ? State.instance : new State(game)
    isSoundOn = () => this.#SOUND;
    isArrowUp = () => this.#ARROW_UP
    isArrowDown = () => this.#ARROW_DOWN
    isArrowRight = () => this.#ARROW_RIGHT
    isArrowLeft = () => this.#ARROW_LEFT
    updatesound = (ff) => this.#SOUND = ff
    nextLevel = () => this.#CURRENT_LEVEL = this.#CURRENT_LEVEL += 1
    getcurentlevel = () => this.#CURRENT_LEVEL
    maxlevel = () => this.#MAXLEVEL
    resetLevel = () => this.#CURRENT_LEVEL = 1;
    update = () => !this.#LIVES ? this.GameOver() : 0
    Isrestar = () => this.#RESTAR
    SetPause = (env) => this.#PAUSE = env
    Restar = () => this.#RESTAR = !this.#RESTAR
    getTime = () => this.#TIME
    setLives = (val = 1) => this.#LIVES += val
    getLives = () => this.#LIVES
    setLevel = (val) => this.#CURRENT_LEVEL = val
    getLevel = () => this.#CURRENT_LEVEL
    setPlayerspped = (val) => this.#PLAYER_SPEED = val
    getScore = () => this.#SCORE
    setScore = (val) => this.#SCORE = val
    getBombCount = () => this.#BOMB_COUNT
    setBombCount = (val = 1) => this.#BOMB_COUNT += val
    getMaxAllowdBombCount = () => this.#MAX_ALLOWD_BOMBS
    setMaxAllowdBombCount = (val = 1) => this.#MAX_ALLOWD_BOMBS += val
    isPaused = () => this.#PAUSE
    isGameOver = () => this.#GAME_OVER
    GameOver = () => this.#GAME_OVER = true
    getPlayerSpeed = () => this.#PLAYER_SPEED
    addtime = (val) => this.#TIME += val;
    updateStateof = (val) => this.#STATE = val
    GetState = () => this.#STATE

    resetTimer = () => {
        this.stopTimer();
        this.#TIME = 0;
        if (this.game && this.game.scoreboard) this.game.scoreboard.updateTimer();
    }

    stopTimer = () => {
        if (this.#TIMER_ID) {
            clearInterval(this.#TIMER_ID);
            this.#TIMER_ID = null;
        }
    }
    
    initState() {
        this.stopTimer();
        this.#LIVES = 3;
        this.#SCORE = 0;
        this.#PAUSE = true;
        this.#PLAYER_SPEED = 4;
        this.#BOMB_COUNT = 0;
        this.#MAX_ALLOWD_BOMBS = 3;
        this.#GAME_OVER = false;
        this.#SOUND = true;
        this.#TIME = 0;
        this.#TIMER_ID = null;
    }

    updateSoundIcon = () => {
        const ic = document.getElementById('volume-icon');
        if (!ic) return;
        ic.src = this.#SOUND ? './icon/volume-2.svg' : './icon/volume-x.svg';
    };

    setArrowStateKeyDown = (event) => {
        if (event.key === 'ArrowUp') this.#ARROW_UP = true
        if (event.key === 'ArrowDown') this.#ARROW_DOWN = true
        if (event.key === 'ArrowRight') this.#ARROW_RIGHT = true
        if (event.key === 'ArrowLeft') this.#ARROW_LEFT = true
        if (event.key.toLowerCase() === 'p') this.pauseStart()
    }

    setArrowStateKeyUp = (event) => {
        if (event.key === 'ArrowUp') this.#ARROW_UP = false
        if (event.key === 'ArrowDown') this.#ARROW_DOWN = false
        if (event.key === 'ArrowRight') this.#ARROW_RIGHT = false
        if (event.key === 'ArrowLeft') this.#ARROW_LEFT = false
    }

    initArrowState() {
        document.getElementById('ref').addEventListener('click', this._throttledRestar);
        document.getElementById('star_pause').addEventListener('click', this._boundTransfer)
        document.getElementById('sound').addEventListener('click', this._boundSwitch)
        document.addEventListener('keydown', this._boundKeyDown)
        document.addEventListener('keyup', this._boundKeyUp)
    }

    pauseStart = helpers.throttle(() => {
        this.#PAUSE = !this.#PAUSE;
        this.updatePauseIcon();
    }, 300)

    setScore = (val) => {
        this.#SCORE += val;
        if (this.game && this.game.scoreboard) {
            this.game.scoreboard.updateScore();
        }
    }
    updatePauseIcon = () => {
        const icon = document.getElementById('play-icon');
        if (!icon) return;
        if (!this.#PAUSE) {
            icon.src = './icon/pause.svg';
            icon.alt = 'pause';
            this.isStar = false;
        } else {
            icon.src = './icon/play.svg';
            icon.alt = 'star';
            this.isStar = true;
        }
    }

    setTime = (seconds) => {
        this.#TIME = seconds;
        if (this.game && this.game.scoreboard) {
            this.game.scoreboard.updateTimer();
        }
    }

    startTimer = () => {
        if (this.#TIMER_ID) clearInterval(this.#TIMER_ID);

        this.#TIMER_ID = setInterval(() => {
            if (!this.isPaused()) {
                if (this.#TIME > 0) {
                    this.#TIME--;
                    this.game.scoreboard.updateTimer();

                } else {
                    clearInterval(this.#TIMER_ID);
                    this.#GAME_OVER = true
                }
            }
        }, 1000);
    };

    switch() {
        const ic = document.getElementById('volume-icon')
        if (!this.game.map.backGroundMusic) return;
        if (this.#SOUND) {
            ic.src = './icon/volume-x.svg'
            this.game.map.backGroundMusic.volume = 0.0;
            this.#SOUND = false
        } else {
            ic.src = './icon/volume-2.svg'
            this.game.map.backGroundMusic.volume = 0.3;
            this.#SOUND = true
        }
    }

    removeEventListeners() {
        document.getElementById('ref')?.removeEventListener('click', this._throttledRestar);
        document.getElementById('star_pause')?.removeEventListener('click', this._boundTransfer);
        document.getElementById('sound')?.removeEventListener('click', this._boundSwitch);
        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);
    }
}
