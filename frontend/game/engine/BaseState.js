import { eventManager, createSignal } from '../../framework/index.js';

export class BaseState {
    constructor(game) {
        this.game = game;
        
        // Common state for both modes
        const [getArrowUp, setArrowUp] = createSignal(false, "arrowUp");
        const [getArrowDown, setArrowDown] = createSignal(false, "arrowDown");
        const [getArrowRight, setArrowRight] = createSignal(false, "arrowRight");
        const [getArrowLeft, setArrowLeft] = createSignal(false, "arrowLeft");

        this.arrowUp = { get: getArrowUp, set: setArrowUp };
        this.arrowDown = { get: getArrowDown, set: setArrowDown };
        this.arrowRight = { get: getArrowRight, set: setArrowRight };
        this.arrowLeft = { get: getArrowLeft, set: setArrowLeft };
        
        this._boundKeyDown = this.setArrowStateKeyDown.bind(this);
        this._boundKeyUp = this.setArrowStateKeyUp.bind(this);
    }

    isArrowUp = () => this.arrowUp.get()
    isArrowDown = () => this.arrowDown.get()
    isArrowRight = () => this.arrowRight.get()
    isArrowLeft = () => this.arrowLeft.get()

    setArrowStateKeyDown(event) {
        const key = event.nativeEvent ? event.nativeEvent.key : event.key;
        if (key === 'ArrowUp') this.arrowUp.set(true);
        if (key === 'ArrowDown') this.arrowDown.set(true);
        if (key === 'ArrowRight') this.arrowRight.set(true);
        if (key === 'ArrowLeft') this.arrowLeft.set(true);
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
    }

    removeEventListeners() {
        eventManager.removeEventListener(document.body, 'keydown', this._boundKeyDown);
        eventManager.removeEventListener(document.body, 'keyup', this._boundKeyUp);
    }
}
