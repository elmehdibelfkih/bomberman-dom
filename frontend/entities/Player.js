import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(playerId, nickname, x, y, gridX, gridY) {
        super(playerId, 'player');
        this.playerId = playerId;
        this.nickname = nickname;
        this.x = x;
        this.y = y;
        this.gridX = gridX;
        this.gridY = gridY;
        this.lives = 1;
        this.speed = 2;
        this.bombCount = 1;
        this.bombRange = 1;
        this.direction = 'down';
    }

    updatePosition(x, y, gridX, gridY) {
        this.x = x;
        this.y = y;
        this.gridX = gridX;
        this.gridY = gridY;
    }

    serialize() {
        return {
            ...super.serialize(),
            playerId: this.playerId,
            nickname: this.nickname,
            x: this.x,
            y: this.y,
            gridX: this.gridX,
            gridY: this.gridY,
            lives: this.lives,
            speed: this.speed,
            bombCount: this.bombCount,
            bombRange: this.bombRange,
            direction: this.direction
        };
    }
}
