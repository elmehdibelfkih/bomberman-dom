export class EntityRenderer {
    constructor(ctx, blockSize) {
        this.ctx = ctx;
        this.blockSize = blockSize;
    }

    renderPlayer(player) {
        this.ctx.fillStyle = '#0000FF';
        this.ctx.fillRect(player.x, player.y, this.blockSize, this.blockSize);
    }

    renderBomb(bomb) {
        const x = bomb.gridX * this.blockSize;
        const y = bomb.gridY * this.blockSize;
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x + this.blockSize / 2, y + this.blockSize / 2, this.blockSize / 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderPowerUp(powerup) {
        const x = powerup.gridX * this.blockSize;
        const y = powerup.gridY * this.blockSize;
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x + 8, y + 8, this.blockSize - 16, this.blockSize - 16);
    }
}
