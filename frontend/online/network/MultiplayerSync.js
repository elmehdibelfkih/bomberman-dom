import { Game } from '../engine/core.js';
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
        // console.log('Received PLAYER_MOVED:', data);
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


    // Handle bomb placement
    networkManager.on('BOMB_PLACED', (data) => {
        game.map.addBomb(data.playerId, data.gridX, data.gridY);
    });

    // BOMB_EXPLODED is handled in onlineApp.js
    // POWERUP_SPAWNED is handled in onlineApp.js via BOMB_EXPLODED
    // POWERUP_COLLECTED is handled in onlineApp.js

    // Handle player damage
    networkManager.on('PLAYER_DAMAGED', (data) => {
        const player = game.players.get(data.playerId);
        if (player) {
            player.kill();
        }
    });

    // Handle player death
    networkManager.on('PLAYER_DIED', (data) => {
        game.players.get(data.playerId).gameOver()

    });

    // // Handle game over
    networkManager.on('GAME_OVER', (data) => {
        const game = Game.getInstance();
        if (game) {
            game.handleGameOver(data);
        }
    });
}