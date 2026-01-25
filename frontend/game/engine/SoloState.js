import * as helpers from '../utils/helpers.js';
import { eventManager, createSignal } from '../../framework/index.js';

export class SoloState {
    #CURRENT_LEVEL = 1
    #LIVES = 3
    #SCORE = 0
    #PAUSE = true
    #PLAYER_SPEED = 3
    #BOMB_COUNT = 0
    #MAX_ALLOWED_BOMBS = 1
    #GAME_OVER = false
    #SOUND = true
    #TIME = 0
    #TIMER_ID = null
    #RESTART = false
    #STATE = false
    #MAXLEVEL = 10

    constructor(game) {
        this.game = game;
        this.isStar = true;
        
        // Arrow key state
        const [getArrowUp, setArrowUp] = createSignal(false, "arrowUp");
        const [getArrowDown, setArrowDown] = createSignal(false, "arrowDown");
        const [getArrowRight, setArrowRight] = createSignal(false, "arrowRight");
        const [getArrowLeft, setArrowLeft] = createSignal(false, "arrowLeft");

        this.arrowUp = { get: getArrowUp, set: setArrowUp };
        this.arrowDown = { get: getArrowDown, set: setArrowDown };
        this.arrowRight = { get: getArrowRight, set: setArrowRight };
        this.arrowLeft = { get: getArrowLeft, set: setArrowLeft };
        
        this._boundTransfer = this.pauseStart.bind(this);
        this._boundRestar = this.Restar.bind(this);
        this._boundSwitch = this.switch.bind(this);
        this._boundKeyDown = this.setArrowStateKeyDown.bind(this);
        this._boundKeyUp = this.setArrowStateKeyUp.bind(this);
        this._throttledRestar = helpers.throttle(this._boundRestar, 1000);
    }

    isArrowUp = () => this.arrowUp.get()
    isArrowDown = () => this.arrowDown.get()
    isArrowRight = () => this.arrowRight.get()
    isArrowLeft = () => this.arrowLeft.get()

    // Level management
    nextLevel = () => this.#CURRENT_LEVEL += 1
    getcurentlevel = () => this.#CURRENT_LEVEL
    maxlevel = () => this.#MAXLEVEL
    resetLevel = () => this.#CURRENT_LEVEL = 1
    setLevel = (val) => this.#CURRENT_LEVEL = val
    getLevel = () => this.#CURRENT_LEVEL

    // Lives and score
    setLives = (val = 1) => this.#LIVES += val
    getLives = () => this.#LIVES
    getScore = () => this.#SCORE
    setScore = (val) => {
        this.#SCORE += val;
        if (this.game?.scoreboard) this.game.scoreboard.updateScore();
    }

    // Bomb management
    getBombCount = () => this.#BOMB_COUNT
    setBombCount = (val = 1) => this.#BOMB_COUNT += val
    getMaxAllowdBombCount = () => this.#MAX_ALLOWED_BOMBS
    setMaxAllowdBombCount = (val = 1) => this.#MAX_ALLOWED_BOMBS += val

    // Player speed
    setPlayerspped = (val) => this.#PLAYER_SPEED = val
    getPlayerSpeed = () => this.#PLAYER_SPEED

    // Pause and game state
    SetPause = (env) => this.#PAUSE = env
    isPaused = () => this.#PAUSE
    isGameOver = () => this.#GAME_OVER
    GameOver = () => this.#GAME_OVER = true
    Isrestar = () => this.#RESTART
    Restar = () => this.#RESTART = !this.#RESTART
    updateStateof = (val) => this.#STATE = val
    GetState = () => this.#STATE

    // Sound
    isSoundOn = () => this.#SOUND
    updatesound = (ff) => this.#SOUND = ff

    updateSoundIcon = () => {
        const ic = document.getElementById('Icon');
        if (!ic) return;
        ic.src = this.#SOUND ? './icon/volume-2.svg' : './icon/volume-x.svg';
    }

    // Timer management
    getTime = () => this.#TIME
    addtime = (val) => this.#TIME += val
    
    setTime = (seconds) => {
        this.#TIME = seconds;
        if (this.game?.scoreboard) this.game.scoreboard.updateTimer();
    }

    startTimer = () => {
        if (this.#TIMER_ID) clearInterval(this.#TIMER_ID);
        this.#TIMER_ID = setInterval(() => {
            if (!this.isPaused()) {
                if (this.#TIME > 0) {
                    this.#TIME--;
                    if (this.game?.scoreboard) this.game.scoreboard.updateTimer();
                } else {
                    this.stopTimer();
                    this.#GAME_OVER = true;
                }
            }
        }, 1000);
    }

    stopTimer = () => {
        if (this.#TIMER_ID) {
            clearInterval(this.#TIMER_ID);
            this.#TIMER_ID = null;
        }
    }

    resetTimer = () => {
        this.stopTimer();
        this.#TIME = 0;
        if (this.game?.scoreboard) this.game.scoreboard.updateTimer();
    }

    update = () => !this.#LIVES ? this.GameOver() : 0

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

    setArrowStateKeyDown(event) {
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.arrowUp.set(true);
        if (key === 'ArrowDown') this.arrowDown.set(true);
        if (key === 'ArrowRight') this.arrowRight.set(true);
        if (key === 'ArrowLeft') this.arrowLeft.set(true);
        if (key.toLowerCase() === 'p') this.pauseStart();
    }

    setArrowStateKeyUp(event) {
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.arrowUp.set(false);
        if (key === 'ArrowDown') this.arrowDown.set(false);
        if (key === 'ArrowRight') this.arrowRight.set(false);
        if (key === 'ArrowLeft') this.arrowLeft.set(false);
    }

    initArrowState() {
        eventManager.addEventListener(document.body, 'keydown', this._boundKeyDown);
        eventManager.addEventListener(document.body, 'keyup', this._boundKeyUp);
        
        const refBtn = document.getElementById('ref');
        const pauseBtn = document.getElementById('star_pause');
        const soundBtn = document.getElementById('sound');

        if (refBtn) eventManager.addEventListener(refBtn, 'click', this._throttledRestar);
        if (pauseBtn) eventManager.addEventListener(pauseBtn, 'click', this._boundTransfer);
        if (soundBtn) eventManager.addEventListener(soundBtn, 'click', this._boundSwitch);
    }

    pauseStart = helpers.throttle(() => {
        this.#PAUSE = !this.#PAUSE;
        this.updatePauseIcon();
    }, 300)

    updatePauseIcon = () => {
        const icon = document.getElementById('icon');
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

    switch() {
        const ic = document.getElementById('Icon');
        if (!this.game.map.backGroundMusic) return;
        if (this.#SOUND) {
            ic.src = './icon/volume-x.svg';
            this.game.map.backGroundMusic.volume = 0.0;
            this.#SOUND = false;
        } else {
            ic.src = './icon/volume-2.svg';
            this.game.map.backGroundMusic.volume = 0.3;
            this.#SOUND = true;
        }
    }

    removeEventListeners() {
        eventManager.removeEventListener(document.body, 'keydown', this._boundKeyDown);
        eventManager.removeEventListener(document.body, 'keyup', this._boundKeyUp);
        
        const refBtn = document.getElementById('ref');
        const pauseBtn = document.getElementById('star_pause');
        const soundBtn = document.getElementById('sound');
        
        if (refBtn) eventManager.removeEventListener(refBtn, 'click', this._throttledRestar);
        if (pauseBtn) eventManager.removeEventListener(pauseBtn, 'click', this._boundTransfer);
        if (soundBtn) eventManager.removeEventListener(soundBtn, 'click', this._boundSwitch);
    }
}
