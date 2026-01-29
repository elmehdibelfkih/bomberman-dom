export class GridRenderer {
    constructor(ctx, blockSize) {
        this.ctx = ctx;
        this.blockSize = blockSize;
    }

    render(mapData) {
        if (!mapData?.initial_grid) return;

        const grid = mapData.initial_grid;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                this.renderCell(x, y, grid[y][x]);
            }
        }
    }

    renderCell(x, y, cellType) {
        const px = x * this.blockSize;
        const py = y * this.blockSize;

        switch (cellType) {
            case 0: // Floor
                this.ctx.fillStyle = '#90EE90';
                break;
            case 1: // Wall
                this.ctx.fillStyle = '#808080';
                break;
            case 2: // Block
                this.ctx.fillStyle = '#8B4513';
                break;
        }

        this.ctx.fillRect(px, py, this.blockSize, this.blockSize);
    }
}
