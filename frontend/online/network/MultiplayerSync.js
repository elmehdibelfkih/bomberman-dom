// import { ChatNotification } from '../utils/ChatNotification.js';
// import { NetworkStateSynchronizer } from './NetworkStateSynchronizer.js';

// Setup multiplayer synchronization
export function setupMultiplayerSync(game, networkManager) {
    // Managers are now initialized in OnlineGmeEngine

    // Initialize network state synchronizer if not already present
    // if (!game.stateSynchronizer) {
    //     game.stateSynchronizer = new NetworkStateSynchronizer(game, networkManager);
    // }

    // Initialize chat notifications
    // const chatNotification = ChatNotification.getInstance();
    // chatNotification.showChatHelp();

    // Handle full game state - use synchronizer
    // networkManager.on('FULL_STATE', (data) => {
    //     game.stateSynchronizer.handleFullState(data);
    // });


    networkManager.on('PLAYER_CORRECTION', (data) => {
        if (data.playerId !== networkManager.getPlayerId()) {
            game.updateRemotePlayer(data);
        }
    });

    // Handle player movements
    networkManager.on('PLAYER_MOVED', (data) => {
        console.log('Received PLAYER_MOVED:', data);
        if (data.playerId === networkManager.getPlayerId()) {
            game.reconcileLocalPlayer(data);
        } else {
            game.updateRemotePlayer(data);
        }
    });

    // networkManager.on('PLAYER_STOPPED', (data) => {
    //     console.log('Received PLAYER_STOPED:', data);
    //     const player = game.players.get(data.playerId);
    //     if (player) {
    //         player.state.movement = false;
    //         if (player.state.direction && player.state.direction.includes("walking")) {
    //             player.state.direction = player.state.direction.replace("walking", '');
    //         }
    //     }
    // });


    // // Handle bomb placement
    networkManager.on('BOMB_PLACED', (data) => {
        console.log(data);
        game.map.addBomb(data.playerId, data.gridX, data.gridY)
        
        // game.bombManager.createBomb(data);
    });

    // // Handle bomb explosions
    // networkManager.on('BOMB_EXPLODED', (data) => {
    //     game.bombManager.handleExplosion(data);
    // });

    // // Handle power-up spawn
    // networkManager.on('POWERUP_SPAWNED', (data) => {
    //     game.powerUpManager.spawnPowerUp(data);
    // });

    // // Handle power-up collection
    // networkManager.on('POWERUP_COLLECTED', (data) => {
    //     game.powerUpManager.removePowerUp(data.powerupId);
    //     game.playerManager.handlePowerUpCollection(data.playerId, data.powerupType, data.newStats);
    // });

    // // Handle player damage
    networkManager.on('PLAYER_DAMAGED', (data) => {
        game.playerManager.damagePlayer(data.playerId, data.livesRemaining);
    });

    // // Handle player death
    // networkManager.on('PLAYER_DIED', (data) => {
    //     game.playerManager.killPlayer(data.playerId);
    // });

    // // Handle game over
    // networkManager.on('GAME_OVER', (data) => {
    //     game.playerManager.handleGameOver(data.winner);
    // });
}