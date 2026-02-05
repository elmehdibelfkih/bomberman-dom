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
            const localPlayer = game.players.get(data.playerId);
            localPlayer.decrementBombCount()
    });

    networkManager.on('BOMB_EXPLODED', (data) => {
        if (!game) return;
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

        console.log("pwer up data: ", data);

        const powerupElement = document.getElementById(data.powerupId);
        if (powerupElement) {
            powerupElement.remove();
        }

        const player = game.players.get(data.playerId);
        if (player && data.newStats) {
            const oldMaxBombs = player.getMaxBombs();

            player.setBombRange(data.newStats.bombRange)
            player.setMaxBombs(data.newStats.maxBombs)
            player.setSpeed(data.newStats.speed)

            const bombCountDiff = data.newStats.maxBombs - oldMaxBombs;
            if (bombCountDiff > 0) {
                for (let i = 0; i < bombCountDiff; i++) {
                    player.incrementBombCount();
                }
            }

            game.ui.updatePlayerState(data.playerId, {
                bombRange: data.newStats.bombRange,
                speed: data.newStats.speed,
            });
        }
    });

    networkManager.on('PLAYER_DAMAGED', (data) => {
        const player = game.players.get(data.playerId);
        if (player) {
            player.kill();
            game.ui.updatePlayerState(data.playerId, { lives: data.livesRemaining });
        }
    });

    networkManager.on('PLAYER_DIED', (data) => {
        const player = game.players.get(data.playerId);
        if (player) {
            player.kill();
            game.ui.updatePlayerState(data.playerId, { lives: 0, alive: false });
        }
    });

    // Handle game over
    networkManager.on('GAME_OVER', (data) => {
        console.log('Game Over! Winner:', data.winner);
    });
}