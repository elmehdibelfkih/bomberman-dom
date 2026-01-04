export const GAME_CONFIG = {
    GRID_WIDTH: 15,
    GRID_HEIGHT: 11,
    BLOCK_SIZE: 64, // In pixels
    BOMB_TIMER: 3000, // 3 seconds
    EXPLOSION_DURATION: 1000, // 1 second
    POWERUP_SPAWN_CHANCE: 0.5, // 50%
    STARTING_LIVES: 3,
    WAIT_TIMER: 2000, // 20 seconds
    COUNTDOWN_TIMER: 1000, // 10 seconds
    SPAWN_POSITIONS: [
        { x: 1, y: 1, corner: 'top-left' },
        { x: 13, y: 1, corner: 'top-right' },
        { x: 1, y: 9, corner: 'bottom-left' },
        { x: 13, y: 9, corner: 'bottom-right' }
    ]
};
