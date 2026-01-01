import * as helpers from '../utils/helpers.js';
import { dom, eventEmitter, useNavigate, createSignal, createMemo, createEffect } from '../framwork/index.js';
export class State {

    // Reactive getters and setters
    isSoundOn = () => this.sound[0]()
    isArrowUp = () => this.arrowStates[0]().up
    isArrowDown = () => this.arrowStates[0]().down
    isArrowRight = () => this.arrowStates[0]().right
    isArrowLeft = () => this.arrowStates[0]().left
    updatesound = (ff) => this.sound[1](ff)
    nextLevel = () => this.currentLevel[1](prev => prev + 1)
    getcurentlevel = () => this.currentLevel[0]()
    maxlevel = () => 10
    resetLevel = () => this.currentLevel[1](1)
    update = () => this.lives[0]() <= 0 ? this.GameOver() : 0
    Isrestar = () => this.restart[0]()
    SetPause = (env) => this.paused[1](env)
    Restar = () => this.restart[1](prev => !prev)
    getTime = () => this.time[0]()
    setLives = (val = 1) => this.lives[1](prev => prev + val)
    getLives = () => this.lives[0]()
    setLevel = (val) => this.currentLevel[1](val)
    getLevel = () => this.currentLevel[0]()
    setPlayerspped = (val) => this.playerSpeed[1](val)
    getScore = () => this.score[0]()
    getBombCount = () => this.bombCount[0]()
    setBombCount = (val = 1) => this.bombCount[1](prev => prev + val)
    getMaxAllowdBombCount = () => this.maxAllowedBombs[0]()
    setMaxAllowdBombCount = (val = 1) => this.maxAllowedBombs[1](prev => prev + val)
    isPaused = () => this.paused[0]()
    isGameOver = () => this.gameOver[0]()
    getPlayerSpeed = () => this.playerSpeed[0]()
    addtime = (val) => this.time[1](prev => prev + val)
    updateStateof = (val) => this.state[1](val)
    GetState = () => this.state[0]()

    constructor(game) {
        State.instance = this;
        this.game = game
        this.navigate = useNavigate();
        
        // Convert to reactive signals
        this.currentLevel = createSignal(1);
        this.lives = createSignal(3);
        this.score = createSignal(0);
        this.paused = createSignal(false);
        this.playerSpeed = createSignal(3);
        this.bombCount = createSignal(0);
        this.maxAllowedBombs = createSignal(1);
        this.gameOver = createSignal(false);
        this.sound = createSignal(true);
        this.arrowStates = createSignal({ up: false, down: false, left: false, right: false });
        this.time = createSignal(0);
        this.restart = createSignal(false);
        this.state = createSignal(false);
        
        // Computed values
        this.isGameActive = createMemo(() => !this.paused[0]() && !this.gameOver[0]());
        this.canPlaceBomb = createMemo(() => this.bombCount[0]() < this.maxAllowedBombs[0]());
        this.timeDisplay = createMemo(() => {
            const totalSeconds = this.time[0]();
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}m ${seconds}s`;
        });
        
        this.isStar = true;
        this._boundTransfer = this.pauseStart.bind(this);
        this._boundRestar = this.Restar.bind(this);
        this._boundSwitch = this.switch.bind(this);
        this._boundKeyDown = this.setArrowStateKeyDown.bind(this);
        this._boundKeyUp = this.setArrowStateKeyUp.bind(this);
        this._throttledRestar = helpers.throttle(this._boundRestar, 1000);
        
        // Effects for reactive updates
        createEffect(() => {
            if (this.lives[0]() <= 0) {
                this.GameOver();
            }
        });
        
        createEffect(() => {
            if (this.game && this.game.scoreboard) {
                this.game.scoreboard.updateScore();
            }
        });
        
        eventEmitter.on('scoreChanged', this.handleScoreChange.bind(this));
        eventEmitter.on('gameOver', this.handleGameOver.bind(this));
        eventEmitter.on('pauseToggled', this.handlePauseToggle.bind(this));
    }

    static getInstance = (game) => State.instance ? State.instance : new State(game)
    
    GameOver = () => {
        this.gameOver[1](true);
        eventEmitter.emit('gameOver', { reason: 'lives', finalScore: this.score[0]() });
        if (this.navigate) {
            this.navigate('/game-over');
        }
    }

    resetTimer = () => {
        this.stopTimer();
        this.time[1](0);
        if (this.game && this.game.scoreboard) this.game.scoreboard.updateTimer();
    }

    stopTimer = () => {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    
    initState() {
        this.stopTimer();
        this.lives[1](3);
        this.score[1](0);
        this.paused[1](false);
        this.playerSpeed[1](4);
        this.bombCount[1](0);
        this.maxAllowedBombs[1](3);
        this.gameOver[1](false);
        this.sound[1](true);
        this.time[1](0);
        this.timerId = null;
    }

    updateSoundIcon = () => {
        const ic = document.getElementById('Icon');
        if (!ic) return;
        const soundOn = this.sound[0]();
        ic.src = soundOn ? './icon/volume-2.svg' : './icon/volume-x.svg';
    };

    handleScoreChange(data) {
        this.setScore(data.points);
    }

    handleGameOver() {
        this.GameOver();
    }

    handlePauseToggle() {
        this.pauseStart();
    }

    setArrowStateKeyDown = (event) => {
        const arrows = this.arrowStates[0]();
        if (event.key === 'ArrowUp') this.arrowStates[1]({ ...arrows, up: true });
        if (event.key === 'ArrowDown') this.arrowStates[1]({ ...arrows, down: true });
        if (event.key === 'ArrowRight') this.arrowStates[1]({ ...arrows, right: true });
        if (event.key === 'ArrowLeft') this.arrowStates[1]({ ...arrows, left: true });
        if (event.key.toLowerCase() === 'p') {
            this.pauseStart()
            eventEmitter.emit('pauseToggled', { paused: this.paused[0]() });
        }
    }

    setArrowStateKeyUp = (event) => {
        const arrows = this.arrowStates[0]();
        if (event.key === 'ArrowUp') this.arrowStates[1]({ ...arrows, up: false });
        if (event.key === 'ArrowDown') this.arrowStates[1]({ ...arrows, down: false });
        if (event.key === 'ArrowRight') this.arrowStates[1]({ ...arrows, right: false });
        if (event.key === 'ArrowLeft') this.arrowStates[1]({ ...arrows, left: false });
    }

    initArrowState() {
        document.getElementById('ref').addEventListener('click', this._throttledRestar);
        document.getElementById('star_pause').addEventListener('click', this._boundTransfer)
        document.getElementById('sound').addEventListener('click', this._boundSwitch)
        document.addEventListener('keydown', this._boundKeyDown)
        document.addEventListener('keyup', this._boundKeyUp)
    }

    pauseStart = helpers.throttle(() => {
        this.paused[1](prev => !prev);
        this.updatePauseIcon();
        if (this.navigate) {
            this.navigate(this.paused[0]() ? '/game#/paused' : '/game#/playing');
        }
    }, 300)

    setScore = (val) => {
        this.score[1](prev => prev + val);
        eventEmitter.emit('scoreUpdated', { score: this.score[0]() });
        if (this.game && this.game.scoreboard) {
            this.game.scoreboard.updateScore();
        }
    }
    updatePauseIcon = () => {
        const icon = document.getElementById('icon');
        if (!icon) return;
        const isPaused = this.paused[0]();
        if (!isPaused) {
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
        this.time[1](seconds);
        if (this.game && this.game.scoreboard) {
            this.game.scoreboard.updateTimer();
        }
    }

    startTimer = () => {
        if (this.timerId) clearInterval(this.timerId);

        this.timerId = setInterval(() => {
            if (!this.isPaused()) {
                const currentTime = this.time[0]();
                if (currentTime > 0) {
                    this.time[1](prev => prev - 1);
                    this.game.scoreboard.updateTimer();
                } else {
                    clearInterval(this.timerId);
                    this.gameOver[1](true);
                }
            }
        }, 1000);
    };

    switch() {
        const ic = document.getElementById('Icon')
        if (!this.game.map.backGroundMusic) return;
        const currentSound = this.sound[0]();
        if (currentSound) {
            ic.src = './icon/volume-x.svg'
            this.game.map.backGroundMusic.volume = 0.0;
            this.sound[1](false);
        } else {
            ic.src = './icon/volume-2.svg'
            this.game.map.backGroundMusic.volume = 0.3;
            this.sound[1](true);
        }
    }

    removeEventListeners() {
        const refEl = document.getElementById('ref');
        const pauseEl = document.getElementById('star_pause');
        const soundEl = document.getElementById('sound');
        if (refEl) refEl.removeEventListener('click', this._throttledRestar);
        if (pauseEl) pauseEl.removeEventListener('click', this._boundTransfer);
        if (soundEl) soundEl.removeEventListener('click', this._boundSwitch);
        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);
        
        eventEmitter.off('scoreChanged', this.handleScoreChange);
        eventEmitter.off('gameOver', this.handleGameOver);
        eventEmitter.off('pauseToggled', this.handlePauseToggle);
    }
}
