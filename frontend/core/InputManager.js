export class InputManager {
    constructor() {
        this.keys = new Map();
        this.listeners = [];
    }

    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        this.keys.set(e.key, true);
        this.notifyListeners('keydown', e.key);
    }

    handleKeyUp(e) {
        this.keys.set(e.key, false);
        this.notifyListeners('keyup', e.key);
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
