import { eventManager, createSignal } from '../../framework/index.js';

export class PlayerState {
    constructor(isLocal) {
        this.isLocal = isLocal;
        
        // Arrow key state signals
        const [getArrowUp, setArrowUp] = createSignal(false, `arrowUp_${Date.now()}`);
        const [getArrowDown, setArrowDown] = createSignal(false, `arrowDown_${Date.now()}`);
        const [getArrowRight, setArrowRight] = createSignal(false, `arrowRight_${Date.now()}`);
        const [getArrowLeft, setArrowLeft] = createSignal(false, `arrowLeft_${Date.now()}`);

        this.arrowUp = { get: getArrowUp, set: setArrowUp };
        this.arrowDown = { get: getArrowDown, set: setArrowDown };
        this.arrowRight = { get: getArrowRight, set: setArrowRight };
        this.arrowLeft = { get: getArrowLeft, set: setArrowLeft };
        
        if (this.isLocal) {
            this._boundKeyDown = this.handleKeyDown.bind(this);
            this._boundKeyUp = this.handleKeyUp.bind(this);
        }
    }

    isArrowUp = () => this.arrowUp.get()
    isArrowDown = () => this.arrowDown.get()
    isArrowRight = () => this.arrowRight.get()
    isArrowLeft = () => this.arrowLeft.get()

    // Stub methods for compatibility with game engine
    // SetPause = () => {}
    // isPaused = () => false
    // getTime = () => 0
    // startTimer = () => {}
    // stopTimer = () => {}
    // resetTimer = () => {}
    // nextLevel = () => {}
    // getcurentlevel = () => 1
    // maxlevel = () => 1
    // resetLevel = () => {}
    // setLevel = () => {}
    // getLevel = () => 1
    // getScore = () => 0
    // setScore = () => {}
    // setLives = () => {}
    // getLives = () => 0
    // getBombCount = () => 0
    // setBombCount = () => {}
    // getMaxAllowdBombCount = () => 0
    // setMaxAllowdBombCount = () => {}
    // setPlayerspped = () => {}
    // getPlayerSpeed = () => 3
    // isGameOver = () => false
    // GameOver = () => {}
    // Isrestar = () => false
    // Restar = () => {}
    // updateStateof = () => {}
    // GetState = () => false
    // isSoundOn = () => true
    // updatesound = () => {}
    // updateSoundIcon = () => {}
    // update = () => {}
    // initState = () => {}
    // initArrowState = () => {}

    handleKeyDown(event) {
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.arrowUp.set(true);
        if (key === 'ArrowDown') this.arrowDown.set(true);
        if (key === 'ArrowRight') this.arrowRight.set(true);
        if (key === 'ArrowLeft') this.arrowLeft.set(true);
    }

    handleKeyUp(event) {
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.arrowUp.set(false);
        if (key === 'ArrowDown') this.arrowDown.set(false);
        if (key === 'ArrowRight') this.arrowRight.set(false);
        if (key === 'ArrowLeft') this.arrowLeft.set(false);
    }

    // For remote players - set direction from server
    setDirection(direction) {
        this.arrowUp.set(false);
        this.arrowDown.set(false);
        this.arrowLeft.set(false);
        this.arrowRight.set(false);

        if (direction.includes('Up')) this.arrowUp.set(true);
        else if (direction.includes('Down')) this.arrowDown.set(true);
        else if (direction.includes('Left')) this.arrowLeft.set(true);
        else if (direction.includes('Right')) this.arrowRight.set(true);
    }

    clearDirection() {
        this.arrowUp.set(false);
        this.arrowDown.set(false);
        this.arrowLeft.set(false);
        this.arrowRight.set(false);
    }

    initListeners() {
        if (this.isLocal) {
            eventManager.addEventListener(document.body, 'keydown', this._boundKeyDown);
            eventManager.addEventListener(document.body, 'keyup', this._boundKeyUp);
        }
    }

    removeListeners() {
        if (this.isLocal && this._boundKeyDown && this._boundKeyUp) {
            eventManager.removeEventListener(document.body, 'keydown', this._boundKeyDown);
            eventManager.removeEventListener(document.body, 'keyup', this._boundKeyUp);
        }
    }
}
