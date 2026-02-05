export function setupMultiplayerSync(game, networkManager) {
    networkManager.on('PLAYER_CORRECTION', (data) => {
        if (data.playerId !== networkManager.getPlayerId()) {
            game.updateRemotePlayer(data);
        }
    });

    networkManager.on('PLAYER_MOVED', (data) => {
        if (data.playerId === networkManager.getPlayerId()) {
            game.reconcileLocalPlayer(data);
        } else {
            game.updateRemotePlayer(data);
        }
    });

    networkManager.on('BOMB_PLACED', (data) => {
        game.map.addBomb(data.playerId, data.gridX, data.gridY);
    });


    // BOMB_EXPLODED is handled in onlineApp.js
    // POWERUP_SPAWNED is handled in onlineApp.js via BOMB_EXPLODED
    // POWERUP_COLLECTED is handled in onlineApp.js

    // Handle player damage

    networkManager.on('BOMB_EXPLODED', (data) => {
        if (!game) return;

        console.log(data);
        
        const bombIndex = game.map.bombs.findIndex(b =>
            b.player.state.id === data.playerId &&
            b.xMap === data.explosions[0]?.gridX &&
            b.yMap === data.explosions[0]?.gridY
        );

        if (bombIndex !== -1) {
            const bomb = game.map.bombs[bombIndex];
            bomb.cleanDOM();
            game.map.bombs.splice(bombIndex, 1);
        }

        // if (data.destroyedBlocks) {
        //     data.destroyedBlocks.forEach(block => {
        //         game.map.blowingUpBlock(block.gridX, block.gridY);
        //     });
        // }

        if (data.spawnedPowerup) {
            game.map.spawnPowerUp(
                data.spawnedPowerup.powerUpId,
                data.spawnedPowerup.type,
                data.spawnedPowerup.gridX,
                data.spawnedPowerup.gridY
            );
        }
    });


    networkManager.on('POWERUP_COLLECTED', (data) => {
        if (!game) return;

        const powerupElement = document.getElementById(data.powerupId);
        if (powerupElement) {
            powerupElement.remove();
        }

        const player = game.players.get(data.playerId);
        if (player && data.newStats) {
            player.setBombRange(data.newStats.bombRange)
            player.setBombCount(data.newStats.maxBombs)
            player.setSpeed(data.newStats.speed)
            console.log("BombRange: ", player.getBombRange());
            console.log("BombCount: ", player.getBombCount());
            console.log("Speed: ", player.getSpeed());
            
        }
        console.log("data dyaly bonus:", data);
        
    });

    networkManager.on('PLAYER_DAMAGED', (data) => {
        const player = game.players.get(data.playerId);
        if (player) {
            player.kill();
        }
    });

    // Handle player death
    networkManager.on('PLAYER_DIED', (data) => {
        const player = game.players.get(data.playerId);
        if (player) {
            player.kill();
        }
    });

    // Handle game over
    networkManager.on('GAME_OVER', (data) => {
        console.log('Game Over! Winner:', data.winner);
    });
}