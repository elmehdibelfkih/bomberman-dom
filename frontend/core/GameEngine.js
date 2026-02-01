import { GameLoop } from './GameLoop.js';

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
        this.gameLoop = new GameLoop();
        this.performanceMonitor = {
            frameDrops: 0,
            lastFPS: 60
        };
    }

    initialize(mapData, players) {
        this.mapData = mapData;
        this.customMap = null; // Renamed to avoid conflict with built-in Map
        this.gameState.status = 'RUNNING';
        this.gameState.startTime = Date.now();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        this.gameLoop.start();
    }

    startPerformanceMonitoring() {
        this.gameLoop.addUpdateCallback((deltaTime) => {
            const currentFPS = this.gameLoop.getFPS();
            
            // Detect frame drops (FPS below 55)
            if (currentFPS < 55 && currentFPS > 0) {
                this.performanceMonitor.frameDrops++;
                console.warn(`⚠️ Frame drop detected: ${currentFPS} FPS`);
            }
            
            this.performanceMonitor.lastFPS = currentFPS;
        });
    }

    update(deltaTime) {
        // Update game logic
    }

    getEntity(type, id) {
        return this.entities[type]?.get(id);
    }

    addEntity(type, id, entity) {
        if (this.entities[type]) {
            this.entities[type].set(id, entity);
        }
    }

    removeEntity(type, id) {
        this.entities[type]?.delete(id);
    }

    getPerformanceStats() {
        return {
            ...this.gameLoop.getPerformanceInfo(),
            frameDrops: this.performanceMonitor.frameDrops,
            lastFPS: this.performanceMonitor.lastFPS
        };
    }

    destroy() {
        this.gameLoop.stop();
        this.gameState.status = 'STOPPED';
    }
}
