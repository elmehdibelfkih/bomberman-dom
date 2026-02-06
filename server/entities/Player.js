import { INITIAL_SPEED } from "../../config/constants.js";
import { GAME_CONFIG } from "../../config/game-config.js";
import { Entity } from "./Entity.js";

export class Player extends Entity {
    constructor(playerId, nickname, x, y, gridX, gridY) {
        super('PLAYER');
        this.playerId = playerId;
        this.nickname = nickname;
        this.x = x;
        this.y = y;
        this.gridX = gridX;
        this.gridY = gridY;
        this.spawnX = x;
        this.spawnY = y;
        this.lives = 3;
        this.maxBombs = 1;
        this.activeBombs = 0;
        this.bombRange = 1;
        this.speed = INITIAL_SPEED;
        this.isMoving = false;
        this.direction = null
        this.powerUpTimers = new Map();
    }

    takeDamage() {
        this.lives--;
        if (this.lives <= 0) this.kill();
        return this.lives;
    }

    sendToSpawnPosition() {
        this.x = this.spawnX
        this.y = this.spawnY
        this.gridX = this.spawnX / GAME_CONFIG.BLOCK_SIZE;
        this.gridY = this.spawnY / GAME_CONFIG.BLOCK_SIZE;
    }

    stopMove() {
        this.isMoving = false
    }

    startMove() {
        this.isMoving = true
    }

    canPlaceBomb() {
        return this.activeBombs < this.maxBombs;
    }

    incrementActiveBombs() {
        this.activeBombs++;
    }

    decrementActiveBombs() {
        this.activeBombs--;
    }

    serialize() {
        return {
            playerId: this.playerId,
            nickname: this.nickname,
            x: this.x,
            y: this.y,
            gridX: this.gridX,
            gridY: this.gridY,
            lives: this.lives,
            speed: this.speed,
            maxBombs: this.maxBombs,
            bombRange: this.bombRange,
            alive: this.alive
        };
    }
}
