import { SoloState } from './SoloState.js';
import { PlayerState } from './PlayerState.js';

export class State {
    static #instance = null;

    static getInstance(game) {
        if (!State.#instance) {
            const isMultiplayer = game?.isMultiplayer || false;
            State.#instance = isMultiplayer ? new PlayerState(false) : new SoloState(game);
        }
        return State.#instance;
    }

    static resetInstance() {
        if (State.#instance) {
            State.#instance.removeListeners?.();
            State.#instance.removeEventListeners?.();
            State.#instance = null;
        }
    }
}

export { SoloState } from './SoloState.js';
export { PlayerState } from './PlayerState.js';