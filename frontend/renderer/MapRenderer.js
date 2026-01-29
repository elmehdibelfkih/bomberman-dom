export class MapRenderer {
    constructor(ctx, map) {
        this.ctx = ctx;
        this.map = map;
        this.colors = {
            0: '#90EE90', // Floor - light green
            1: '#4A4A4A', // Wall - dark gray
            2: '#8B4513'  // Block - brown
        };
    }

    render() {
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                this.renderCell(x, y);
            }
        }
    }

    renderCell(x, y) {
        const cellType = this.map.getCell(x, y);
        const px = x * this.map.cellSize;
        const py = y * this.map.cellSize;

        this.ctx.fillStyle = this.colors[cellType] || this.colors[0];
        this.ctx.fillRect(px, py, this.map.cellSize, this.map.cellSize);

        // Grid lines
        this.ctx.strokeStyle = '#00000020';
        this.ctx.strokeRect(px, py, this.map.cellSize, this.map.cellSize);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.map.width * this.map.cellSize, this.map.height * this.map.cellSize);
    }
}
