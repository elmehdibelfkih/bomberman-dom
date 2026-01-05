export const GAME_CONFIG = {
    GRID_WIDTH: 15,
    GRID_HEIGHT: 11,
    BLOCK_SIZE: 64,
    BOMB_TIMER: 3000,
    EXPLOSION_DURATION: 1000,
    POWERUP_SPAWN_CHANCE: 0.5,
    STARTING_LIVES: 3,
    WAIT_TIMER: 2000,
    COUNTDOWN_TIMER: 1000,
    SPAWN_POSITIONS: [
        { x: 1, y: 1, corner: 'top-left' },
        { x: 13, y: 1, corner: 'top-right' },
        { x: 1, y: 9, corner: 'bottom-left' },
        { x: 13, y: 9, corner: 'bottom-right' }
    ]
};
