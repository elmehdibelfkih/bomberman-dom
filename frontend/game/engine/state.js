import * as helpers from '../utils/helpers.js';
import { eventManager } from '../../framework/index.js';
export class State {

    #CURRENT_LEVEL = 1
    #LIVES = 3
    #SCORE = 0
    #PAUSE = true
    #PLAYER_SPEED = 3
    #BOMB_COUNT = 0
    #MAX_ALLOWED_BOMBS = 1
    #GAME_OVER = false
    #SOUND = true
    #ARROW_UP = false
    #ARROW_DOWN = false
    #ARROW_RIGHT = false
    #ARROW_LEFT = false
    #TIME = 0
    #TIMER_ID = null
    #RESTART = false
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
    Isrestar = () => this.#RESTART
    SetPause = (env) => this.#PAUSE = env
    Restar = () => this.#RESTART = !this.#RESTART
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
    getMaxAllowdBombCount = () => this.#MAX_ALLOWED_BOMBS
    setMaxAllowdBombCount = (val = 1) => this.#MAX_ALLOWED_BOMBS += val
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
        this.#MAX_ALLOWED_BOMBS = 1;
        this.#GAME_OVER = false;
        this.#SOUND = true;
        this.#TIME = 0;
        this.#TIMER_ID = null;
    }

    updateSoundIcon = () => {
        const soundBtn = document.getElementById('sound');
        if (!soundBtn) return;
        
        const soundIcon = soundBtn.querySelector('img');
        if (!soundIcon) return;
        
        const newSrc = this.#SOUND ? '/game/icon/volume-2.svg' : '/game/icon/volume-x.svg';
        soundIcon.src = newSrc;
    };

    setArrowStateKeyDown = (event) => {
        // Access native event from synthetic event
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.#ARROW_UP = true
        if (key === 'ArrowDown') this.#ARROW_DOWN = true
        if (key === 'ArrowRight') this.#ARROW_RIGHT = true
        if (key === 'ArrowLeft') this.#ARROW_LEFT = true
        if (key.toLowerCase() === 'p') this.pauseStart()
    }

    setArrowStateKeyUp = (event) => {
        // Access native event from synthetic event
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.#ARROW_UP = false
        if (key === 'ArrowDown') this.#ARROW_DOWN = false
        if (key === 'ArrowRight') this.#ARROW_RIGHT = false
        if (key === 'ArrowLeft') this.#ARROW_LEFT = false
    }

    initArrowState() {
        // Use event manager for all event listeners
        const refBtn = document.getElementById('ref');
        const pauseBtn = document.getElementById('star_pause');
        const soundBtn = document.getElementById('sound');

        if (refBtn) {
            eventManager.addEventListener(refBtn, 'click', this._throttledRestar);
        }
        if (pauseBtn) {
            eventManager.addEventListener(pauseBtn, 'click', this._boundTransfer);
        }
        if (soundBtn) {
            eventManager.addEventListener(soundBtn, 'click', this._boundSwitch);
        }
        eventManager.addEventListener(document.body, 'keydown', this._boundKeyDown);
        eventManager.addEventListener(document.body, 'keyup', this._boundKeyUp);
        
        // Set initial icons based on current state
        this.updateSoundIcon();
        this.updatePauseIcon();
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
        const pauseBtn = document.getElementById('star_pause');
        if (!pauseBtn) return;
        
        const icon = pauseBtn.querySelector('img');
        if (!icon) return;
        
        if (!this.#PAUSE) {
            icon.src = '/game/icon/pause.svg';
            icon.alt = 'pause';
            this.isStar = false;
        } else {
            icon.src = '/game/icon/play.svg';
            icon.alt = 'play';
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
                    if (this.game && this.game.scoreboard) {
                        this.game.scoreboard.updateTimer();
                    }
                } else {
                    this.stopTimer();
                    this.#GAME_OVER = true;
                }
            }
        }, 1000);
    };

    switch() {
        // Check if background music exists
        if (!this.game || !this.game.map || !this.game.map.backGroundMusic) {
            console.warn('Sound switch: Background music not available');
            return;
        }
        
        console.log('Sound state before toggle:', this.#SOUND);
        
        // Toggle sound state
        if (this.#SOUND) {
            this.game.map.backGroundMusic.volume = 0.0;
            this.#SOUND = false;
        } else {
            this.game.map.backGroundMusic.volume = 0.3;
            this.#SOUND = true;
        }
        
        console.log('Sound state after toggle:', this.#SOUND);
        
        // Update the icon to reflect the new state
        this.updateSoundIcon();
    }

    removeEventListeners() {
        const refBtn = document.getElementById('ref');
        const pauseBtn = document.getElementById('star_pause');
        const soundBtn = document.getElementById('sound');
        
        if (refBtn) {
            eventManager.removeEventListener(refBtn, 'click', this._throttledRestar);
        }
        if (pauseBtn) {
            eventManager.removeEventListener(pauseBtn, 'click', this._boundTransfer);
        }
        if (soundBtn) {
            eventManager.removeEventListener(soundBtn, 'click', this._boundSwitch);
        }
        eventManager.removeEventListener(document.body, 'keydown', this._boundKeyDown);
        eventManager.removeEventListener(document.body, 'keyup', this._boundKeyUp);
    }
}
