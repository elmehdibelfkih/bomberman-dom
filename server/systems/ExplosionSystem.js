// server/src/systems/ExplosionSystem.js
class Explosion {
    constructor() {

    }

    getFreeDirections(gridX, gridY, grid) {
        const directions = [];

        // LEFT
        if (grid.get(gridX - 1, gridY) !== WALL) {
            directions.push({ dir: 'LEFT', x: gridX - 1, y: gridY });
        }

        // RIGHT
        if (grid.get(gridX + 1, gridY) !== WALL) {
            directions.push({ dir: 'RIGHT', x: gridX + 1, y: gridY });
        }

        // UP
        if (grid.get(gridX, gridY - 1) !== WALL) {
            directions.push({ dir: 'UP', x: gridX, y: gridY - 1 });
        }

        // DOWN
        if (grid.get(gridX, gridY + 1) !== WALL) {
            directions.push({ dir: 'DOWN', x: gridX, y: gridY + 1 });
        }

        return directions;
    }

    propagate(bomb, grid) {
        const explosions = [];

        explosions.push({ x: bomb.gridX, y: bomb.gridY, direction: 'CENTER' });

        const directions = this.getFreeDirections(bomb.gridX, bomb.gridY, grid);

        for (const dir of directions) {
            for (let dist = 1; dist <= bomb.range; dist++) {
                const x = dir.x + (dir.dir === 'LEFT' ? -dist + 1 : dir.dir === 'RIGHT' ? dist - 1 : 0);
                const y = dir.y + (dir.dir === 'UP' ? -dist + 1 : dir.dir === 'DOWN' ? dist - 1 : 0);

                if (grid.get(x, y) === WALL) break;

                explosions.push({ x, y, direction: dir.dir });

                if (grid.get(x, y) === BLOCK) {
                    this.destroyBlock(x, y);
                    break;
                }
            }
        }

        return explosions;
    }

    destroyBlock(gridX, gridY) {
        this.engine.grid.set(gridX, gridY, FLOOR);

        const blockToRemove = Array.from(this.engine.entities.blocks)
            .find(b => b.gridX === gridX && b.gridY === gridY);

        if (blockToRemove) {
            this.engine.entities.blocks.delete(blockToRemove);
            blockToRemove.kill();
        }

        if (Math.random() < 0.30) {
            return this.spawnRandomPowerUp(gridX, gridY);
        }

        return null;
    }

    spawnRandomPowerUp(gridX, gridY) {
        const types = ['BOMB', 'FLAME', 'SPEED'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        const powerup = new PowerUp(gridX, gridY, randomType);
        this.engine.entities.powerups.set(powerup.id, powerup);

        return powerup;
    }
}