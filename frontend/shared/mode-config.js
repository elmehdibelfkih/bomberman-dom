export const GAME_MODE_CONFIG = {
    SOLO: {
        ENGINE: 'SoloGameEngine',
        TOTAL_MAPS: 10,
        HAS_ENEMIES: true,
        HAS_LEVELS: true,
        HAS_PROGRESSION: true,
        HAS_NETWORK: false,
        STARTING_LIVES: 3,
        TIMER_ENABLED: true
    },
    MULTIPLAYER: {
        ENGINE: 'MultiplayerGameEngine',
        TOTAL_MAPS: 5,
        HAS_ENEMIES: false,
        HAS_LEVELS: false,
        HAS_PROGRESSION: false,
        HAS_NETWORK: true,
        STARTING_LIVES: 1,
        TIMER_ENABLED: false
    }
}

export const SERVER_CONFIG = {
    MULTIPLAYER_ONLY: true,
    SUPPORTED_MODES: ['MULTIPLAYER'],
    MAP_POOL: {
        MULTIPLAYER: [1, 2, 3, 4, 5] // Only use first 5 maps for multiplayer
    }
}