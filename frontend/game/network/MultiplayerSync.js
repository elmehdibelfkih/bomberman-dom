import { dom } from '../../framework/index.js';
import { ChatNotification } from '../utils/ChatNotification.js';
import { MultiplayerPlayerManager } from '../components/MultiplayerPlayerManager.js';
import { NetworkStateSynchronizer } from './NetworkStateSynchronizer.js';
import { BombManager } from '../components/BombManager.js';
import { PowerUpManager } from '../components/PowerUpManager.js';

// Setup multiplayer synchronization
export function setupMultiplayerSync(game, networkManager) {
    // Initialize managers
    game.playerManager = new MultiplayerPlayerManager(game, networkManager);
    game.bombManager = new BombManager(game);
    game.powerUpManager = new PowerUpManager(game);
    game.remoteBombs = game.remoteBombs || new Map();
    
    // Initialize network state synchronizer
    game.stateSynchronizer = new NetworkStateSynchronizer(game, networkManager);
    
    // Initialize chat notifications
    const chatNotification = ChatNotification.getInstance();
    chatNotification.showChatHelp();
    
    // Handle game started - initialize players
    networkManager.on('GAME_STARTED', (data) => {
        game.playerManager.initializePlayers(data);
    });
    
    // Handle full game state - use synchronizer
    networkManager.on('FULL_STATE', (data) => {
        game.stateSynchronizer.handleFullState(data);
    });

    // Handle player movements
    const handlePlayerMoved = (data) => {
        // Normalize server payload (server sends x/y as grid coords)
        const normalized = {
            ...data,
            gridX: data.gridX ?? data.x,
            gridY: data.gridY ?? data.y
        };

        if (normalized.playerId === networkManager.getPlayerId()) {
            game.playerManager.reconcileLocalPlayer(normalized);
        } else {
            game.playerManager.updateRemotePlayer(normalized);
        }
    };

    networkManager.on('PLAYER_MOVED', handlePlayerMoved);
    networkManager.on('PLAYER_STATE', handlePlayerMoved); // fallback if server sends different type

    // Handle bomb placement
    networkManager.on('BOMB_PLACED', (data) => {
        game.bombManager.createBomb(data);
    });

    // Handle bomb explosions
    networkManager.on('BOMB_EXPLODED', (data) => {
        game.bombManager.handleExplosion(data);
    });

    // Handle power-up spawn
    networkManager.on('POWERUP_SPAWNED', (data) => {
        game.powerUpManager.spawnPowerUp(data);
    });

    // Handle power-up collection
    networkManager.on('POWERUP_COLLECTED', (data) => {
        game.powerUpManager.removePowerUp(data.powerupId);
        game.playerManager.handlePowerUpCollection(data.playerId, data.powerupType, data.newStats);
    });

    // Handle player damage
    networkManager.on('PLAYER_DAMAGED', (data) => {
        game.playerManager.damagePlayer(data.playerId, data.livesRemaining);
    });

    // Handle player death
    networkManager.on('PLAYER_DIED', (data) => {
        game.playerManager.killPlayer(data.playerId);
    });

    // Handle game over
    networkManager.on('GAME_OVER', (data) => {
        game.playerManager.handleGameOver(data.winner);
    });
}