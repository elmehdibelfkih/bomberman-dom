import { NetworkManager } from '../network/NetworkManager.js';
import { ClientMessages } from '../../shared/message-types.js';

export class InputManager {
    constructor() {
        this.keys = new Map();
        this.listeners = [];
        this.network = NetworkManager.getInstance();
        this._seq = 0;
    }

    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    nextSequence() {
        this._seq = (this._seq + 1) % Number.MAX_SAFE_INTEGER;
        return this._seq;
    }

    handleKeyDown(e) {
        const key = e.key;
        // if typing into an input/textarea, ignore game controls
        const activeTag = document.activeElement && document.activeElement.tagName && document.activeElement.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        // Place bomb on Space (don't treat as a held key)
        if (e.code === 'Space' || key === ' ' || key === 'Spacebar') {
            e.preventDefault();
            const seq = this.nextSequence();
            this.network.send({ type: ClientMessages.PLACE_BOMB, sequenceNumber: seq });
            return;
        }

        if (this.keys.get(key)) return; // already pressed
        this.keys.set(key, true);

        const dir = this._keyToDirection(key);
        if (dir) {
            const seq = this.nextSequence();
            this.network.send({ type: ClientMessages.MOVE, direction: dir, sequenceNumber: seq });
        }

        this.notifyListeners('keydown', key);
    }

    handleKeyUp(e) {
        const key = e.key;
        this.keys.set(key, false);

        const dir = this._keyToDirection(key);
        if (dir) {
            const seq = this.nextSequence();
            this.network.send({ type: ClientMessages.STOP_MOVE, sequenceNumber: seq });
        }

        this.notifyListeners('keyup', key);
    }

    _keyToDirection(key) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                return 'UP';
            case 'ArrowDown':
            case 's':
            case 'S':
                return 'DOWN';
            case 'ArrowLeft':
            case 'a':
            case 'A':
                return 'LEFT';
            case 'ArrowRight':
            case 'd':
            case 'D':
                return 'RIGHT';
            default:
                return null;
        }
    }

    isKeyPressed(key) {
        return this.keys.get(key) || false;
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(type, key) {
        this.listeners.forEach(cb => cb(type, key));
    }

    destroy() {
        this.keys.clear();
        this.listeners = [];
    }
}
