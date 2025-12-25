/**
 * Find first coordinate of specific tile type
 * @param {number[][]} grid
 * @param {number} target - Tile type (WALL, BLOCK, PLAYER, etc.)
 * @returns {[number, number] | [null, null]}
 */
export function getCoordinates(grid, target) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === target) {
        return [y, x];
      }
    }
  }
  return [null, null];
}

/**
 * Find all coordinates of specific tile type
 * @param {number[][]} grid
 * @param {number} target
 * @returns {Array<[number, number]>}
 */
export function getAllCoordinates(grid, target) {
  const coords = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === target) {
        coords.push([y, x]);
      }
    }
  }
  return coords;
}

/**
 * Get next cell coordinates in a direction
 * @param {number} x - Current X
 * @param {number} y - Current Y
 * @param {string} direction - UP, DOWN, LEFT, RIGHT
 * @param {number} distance - How many cells away (default 1)
 * @returns {[number, number]}
 */
export function getNextCell(x, y, direction, distance = 1) {
  switch (direction) {
    case 'UP':
      return [x, y - distance];
    case 'DOWN':
      return [x, y + distance];
    case 'LEFT':
      return [x - distance, y];
    case 'RIGHT':
      return [x + distance, y];
    default:
      return [x, y];
  }
}

/**
 * Get opposite direction
 * @param {string} direction
 * @returns {string}
 */
export function getOppositeDirection(direction) {
  const opposites = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT'
  };
  return opposites[direction] || direction;
}

/**
 * Calculate Manhattan distance between two points
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function manhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Check if coordinate is within grid bounds
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
export function isInBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Get all adjacent cells (4-directional)
 * @param {number} x
 * @param {number} y
 * @returns {Array<{x: number, y: number, direction: string}>}
 */
export function getAdjacentCells(x, y) {
  return [
    { x: x, y: y - 1, direction: 'UP' },
    { x: x, y: y + 1, direction: 'DOWN' },
    { x: x - 1, y: y, direction: 'LEFT' },
    { x: x + 1, y: y, direction: 'RIGHT' }
  ];
}

/**
 * Get cells in explosion range
 * @param {number} x - Bomb X
 * @param {number} y - Bomb Y
 * @param {number} range - Explosion range
 * @returns {Array<{x: number, y: number, direction: string, distance: number}>}
 */
export function getExplosionCells(x, y, range) {
  const cells = [{ x, y, direction: 'CENTER', distance: 0 }];
  
  const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  
  for (const dir of directions) {
    for (let dist = 1; dist <= range; dist++) {
      const [nx, ny] = getNextCell(x, y, dir, dist);
      cells.push({ x: nx, y: ny, direction: dir, distance: dist });
    }
  }
  
  return cells;
}