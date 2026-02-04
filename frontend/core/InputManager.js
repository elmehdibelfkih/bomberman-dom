import { NetworkManager } from '../network/NetworkManager.js';
import { ClientMessages } from '../../shared/message-types.js';
import { CLIENT_CONFIG } from '../config/client-config.js';

export class InputManager {
    constructor(gameEngine) {
        this.keys = new Map();
        this.listeners = [];
        this.network = NetworkManager.getInstance();
        this._seq = 0;
        this.gameEngine = gameEngine;
        this.mapData = null;
        this.movementLockUntil = 0; // timestamp (ms) to throttle per-press movement
        this.playerSpeed = 1; // default speed multiplier from server (1..5)
        this.baseCooldownMs = 120; // base cooldown per step at speed=1

        // Expose a global hook so network layer can update speed without tight coupling
        // window.__updateLocalSpeed(playerId, speed)
        if (typeof window !== 'undefined') {
            window.__updateLocalSpeed = (playerId, speed) => {
                const localId = this._getLocalPlayerIdFromDOM();
                if (!localId) return;
                if (String(playerId) !== String(localId)) return;
                this.setLocalPlayerSpeed(speed);
            };
        }
    }

    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    setLocalPlayerSpeed(speed) {
        const s = Number(speed);
        if (!Number.isFinite(s)) return;
        // clamp 1..5 as per server logic
        this.playerSpeed = Math.max(1, Math.min(5, Math.round(s)));
    }

    _getEffectiveCooldownMs() {
        // Faster speed -> smaller cooldown between steps
        // factor: 1 + (speed-1)*0.5 => 1,1.5,2.0,2.5,3.0
        const factor = 1 + (this.playerSpeed - 1) * 0.5;
        const ms = Math.round(this.baseCooldownMs / factor);
        return Math.max(40, ms); // cap at 40ms min to avoid flooding
    }

    _getLocalPlayerIdFromDOM() {
        const el = document.querySelector('.local-player');
        if (!el || !el.id) return null;
        const m = el.id.match(/^player-(.+)$/);
        return m ? m[1] : null;
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

        // Ignore OS/browser key auto-repeat; we want single-step per physical press
        if (e.repeat) return;

        // Place bomb on Space (don't treat as a held key)
        if (e.code === 'Space' || key === ' ' || key === 'Spacebar') {
            e.preventDefault();
            const seq = this.nextSequence();
            this.network.send({ type: ClientMessages.PLACE_BOMB, sequenceNumber: seq });
            return;
        }

        // Prevent multiple moves: honor a short cooldown window
        const now = performance.now();
        if (now < this.movementLockUntil) return;

        // Prevent key repeat - only move on first keydown
        if (this.keys.get(key)) return;
        this.keys.set(key, true);

        const dir = this._keyToDirection(key);
        if (dir) {
            // Move one block per keypress
            this.movePlayer(dir);
            
            const seq = this.nextSequence();
            this.network.send({ type: ClientMessages.MOVE, direction: dir, sequenceNumber: seq });

            // Lock for a short period to ensure single step per press, scaled by speed
            this.movementLockUntil = now + this._getEffectiveCooldownMs();
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

    movePlayer(direction) {
        const localPlayerElement = document.querySelector('.local-player');
        if (!localPlayerElement) return;
        
        const BLOCK_SIZE = (CLIENT_CONFIG && CLIENT_CONFIG.CELL_SIZE) || 32;
        let dx = 0, dy = 0;
        switch (direction) {
            case 'UP': dy = -BLOCK_SIZE; break;
            case 'DOWN': dy = BLOCK_SIZE; break;
            case 'LEFT': dx = -BLOCK_SIZE; break;
            case 'RIGHT': dx = BLOCK_SIZE; break;
        }
        
        // Get current position from DOM
        const currentLeft = parseInt(localPlayerElement.style.left) || 0;
        const currentTop = parseInt(localPlayerElement.style.top) || 0;
        
        // Calculate new position
        const newLeft = currentLeft + dx;
        const newTop = currentTop + dy;
        
        // Check collision before moving
        if (this.canMoveTo(newLeft, newTop)) {
            localPlayerElement.style.left = newLeft + 'px';
            localPlayerElement.style.top = newTop + 'px';
        }
    }

    canMoveTo(x, y) {
        if (!this.mapData || !this.mapData.initial_grid) return true;
        
        const BLOCK_SIZE = (CLIENT_CONFIG && CLIENT_CONFIG.CELL_SIZE) || 32;
        const playerSize = Math.round(BLOCK_SIZE * 0.7); // 70% of block size
        
        // Check bounds
        if (x < 0 || y < 0) return false;
        if (x + playerSize > this.mapData.initial_grid[0].length * BLOCK_SIZE) return false;
        if (y + playerSize > this.mapData.initial_grid.length * BLOCK_SIZE) return false;
        
        // Check grid cells the player would occupy
        const left = Math.floor(x / BLOCK_SIZE);
        const top = Math.floor(y / BLOCK_SIZE);
        const right = Math.floor((x + playerSize - 1) / BLOCK_SIZE);
        const bottom = Math.floor((y + playerSize - 1) / BLOCK_SIZE);
        
        for (let gy = top; gy <= bottom; gy++) {
            for (let gx = left; gx <= right; gx++) {
                if (gx < 0 || gx >= this.mapData.initial_grid[0].length || 
                    gy < 0 || gy >= this.mapData.initial_grid.length) return false;
                
                const cellValue = this.mapData.initial_grid[gy][gx];
                // 1 = WALL, 2 = BLOCK
                if (cellValue === 1 || cellValue === 2) return false;
            }
        }
        
        return true;
    }

    setMapData(mapData) {
        this.mapData = mapData;
    }

    destroy() {
        this.keys.clear();
        this.listeners = [];
    }
}
