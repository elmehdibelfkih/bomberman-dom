export const CLIENT_CONFIG = {
    WS_URL: 'ws://localhost:9090',
    // Keep these values in sync with server/shared/game-config.js
    GRID_WIDTH: 32,
    GRID_HEIGHT: 20,
    CELL_SIZE: 32,
    CANVAS_WIDTH: 32 * 32,
    CANVAS_HEIGHT: 20 * 32,
    FPS: 60,
    PREDICTION_ENABLED: true,
    INTERPOLATION_ENABLED: true,
    BOMB_TIMER: 3000,
    EXPLOSION_DURATION: 1000,
    POWERUP_TYPES: {
        BOMB_COUNT: 'BOMB_COUNT',
        SPEED: 'SPEED', 
        BOMB_RANGE: 'BOMB_RANGE'
    }
};
