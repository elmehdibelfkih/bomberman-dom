import { BLOCK, BLOCK_SIZE, WALL } from "../../shared/constants"

class Grid {
    constructor() {

    }

    Canmove(row, col) {
        this.gridArray[row] && this.gridArray[row][col] === 0
    }

    isBlock(x, y) {
        this.gridArray[y][x] === BLOCK
    }

    isFreeSpaceInGrid(x, y) {
        this.gridArray[y][x] !== consts.BLOCK && this.gridArray[y][x] !== WALL
    }

    canPlayerMoveTo(x, y) {
        const width = this.player.getPlayerWidth();
        const height = this.player.getPlayerHeight();
        const corners = [
            [x, y],
            [x + width, y],
            [x, y + height],
            [x + width, y + height]
        ];
        for (const [cx, cy] of corners) {
            const gridX = Math.floor(cx / BLOCK_SIZE);
            const gridY = Math.floor(cy / BLOCK_SIZE);
            if (!this.isFreeSpaceInGrid(gridX, gridY)) return false
        }
        return true;
    }
}