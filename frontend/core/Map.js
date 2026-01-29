export class Map {
    constructor(width = 23, height = 11, cellSize = 68) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = [];
        this.generateGrid();
    }

    generateGrid() {
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
                    this.grid[y][x] = 1; // Wall
                } else if (x % 2 === 0 && y % 2 === 0) {
                    this.grid[y][x] = 1; // Wall
                } else {
                    this.grid[y][x] = 0; // Floor
                }
            }
        }
    }

    getCell(x, y) {
        return this.grid[y]?.[x];
    }

    setCell(x, y, value) {
        if (this.grid[y]) {
            this.grid[y][x] = value;
        }
    }

    isWalkable(x, y) {
        return this.getCell(x, y) === 0;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    pixelToGrid(px, py) {
        return {
            x: Math.floor(px / this.cellSize),
            y: Math.floor(py / this.cellSize)
        };
    }

    gridToPixel(gx, gy) {
        return {
            x: gx * this.cellSize,
            y: gy * this.cellSize
        };
    }
}
