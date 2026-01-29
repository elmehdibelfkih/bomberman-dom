export const checkCollision = (x1, y1, w1, h1, x2, y2, w2, h2) => {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
};

export const pixelToGrid = (pixel, blockSize) => {
    return Math.floor(pixel / blockSize);
};

export const gridToPixel = (grid, blockSize) => {
    return grid * blockSize;
};

export const isValidGridPosition = (gridX, gridY, gridWidth, gridHeight) => {
    return gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight;
};
