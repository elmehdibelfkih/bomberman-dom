import { Map } from './Map.js';

export class GameEngine {
    constructor() {
        this.entities = {
            players: new Map(),
            bombs: new Map(),
            powerups: new Map()
        };
        this.gameState = {
            status: 'IDLE',
            startTime: null
        };
        this.map = null;
    }

    initialize(mapData, players) {
        this.mapData = mapData;
        this.map = new Map();
        this.gameState.status = 'RUNNING';
        this.gameState.startTime = Date.now();
    }

    update(deltaTime) {
        // Update game logic
    }

    getEntity(type, id) {
        return this.entities[type]?.get(id);
    }

    addEntity(type, id, entity) {
        this.entities[type]?.set(id, entity);
    }

    removeEntity(type, id) {
        this.entities[type]?.delete(id);
    }
}
