export const GAME_CONFIG = {
    GRID_WIDTH: 15,
    GRID_HEIGHT: 11,
    BLOCK_SIZE: 68,
    BOMB_TIMER: 3000,
    EXPLOSION_DURATION: 1000,
    POWERUP_SPAWN_CHANCE: 0.9,
    STARTING_LIVES: 3,
    WAIT_TIMER: 2000,
    COUNTDOWN_TIMER: 1000,
    SPAWN_POSITIONS: [
        { x: 1, y: 1, corner: 'top-left' },
        { x: 13, y: 1, corner: 'top-right' },
        { x: 1, y: 9, corner: 'bottom-left' },
        { x: 13, y: 9, corner: 'bottom-right' }
    ],
    PLAYER_DIMENSIONS: {
        WIDTH_HORIZONTAL: 25,
        WIDTH_VERTICAL: 33,
        HEIGHT: 64
    },
    POWERUP_DURATION: 4000,
    PLAYER_MAX_STATS: {
        SPEED: 5,
        MAX_BOMBS: 2,
        BOMB_RANGE: 2,
    }
};
