import { SoloState } from './SoloState.js';
import { MultiplayerState } from './MultiplayerState.js';

export class State {
    static #instance = null;

    static getInstance(game) {
        if (!State.#instance) {
            // Determine mode based on game type
            const isMultiplayer = game?.isMultiplayer || false;
            State.#instance = isMultiplayer ? new MultiplayerState(game) : new SoloState(game);
        }
        return State.#instance;
    }

    static resetInstance() {
        if (State.#instance) {
            State.#instance.removeEventListeners?.();
            State.#instance = null;
        }
    }
}

// Export individual classes for direct use
export { SoloState } from './SoloState.js';
export { MultiplayerState } from './MultiplayerState.js';
export { BaseState } from './BaseState.js';