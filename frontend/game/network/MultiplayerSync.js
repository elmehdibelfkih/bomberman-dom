import { dom } from '../../framework/index.js';
import { ChatNotification } from '../utils/ChatNotification.js';
import { MultiplayerPlayerManager } from '../components/MultiplayerPlayerManager.js';
import { NetworkStateSynchronizer } from './NetworkStateSynchronizer.js';

// Setup multiplayer synchronization
export function setupMultiplayerSync(game, networkManager) {
    // Initialize multiplayer player manager
    game.playerManager = new MultiplayerPlayerManager(game, networkManager);
    game.remoteBombs = new Map();
    
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
    networkManager.on('PLAYER_MOVED', (data) => {
        if (data.playerId !== networkManager.getPlayerId()) {
            game.playerManager.updateRemotePlayer(data);
        }
    });

    // Handle bomb placement
    networkManager.on('BOMB_PLACED', (data) => {
        createRemoteBomb(game, data);
    });

    // Handle bomb explosions
    networkManager.on('BOMB_EXPLODED', (data) => {
        handleBombExplosion(game, data);
    });

    // Handle power-up collection
    networkManager.on('POWERUP_COLLECTED', (data) => {
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
        handleGameOver(game, data);
    });

    // Remove old player movement override - handled by PlayerManager
}

// Sync full game state
function syncGameState(game, data) {
    // Update all players
    if (data.players) {
        data.players.forEach(playerData => {
            if (playerData.playerId !== game.networkManager.getPlayerId()) {
                updateRemotePlayer(game, playerData);
            }
        });
    }

    // Update bombs
    if (data.bombs) {
        data.bombs.forEach(bombData => {
            if (!game.remoteBombs.has(bombData.bombId)) {
                createRemoteBomb(game, bombData);
            }
        });
    }

    // Update map state
    if (data.mapState) {
        updateMapState(game, data.mapState);
    }
}

// Update remote player position
function updateRemotePlayer(game, data) {
    let remotePlayer = game.remotePlayers.get(data.playerId);
    
    if (!remotePlayer) {
        // Create new remote player
        remotePlayer = createRemotePlayer(game, data);
        game.remotePlayers.set(data.playerId, remotePlayer);
    }
    
    // Update position
    if (data.gridX !== undefined && data.gridY !== undefined) {
        remotePlayer.gridX = data.gridX;
        remotePlayer.gridY = data.gridY;
        remotePlayer.x = data.gridX * game.map.blockSize;
        remotePlayer.y = data.gridY * game.map.blockSize;
        
        // Update DOM position
        if (remotePlayer.element) {
            remotePlayer.element.style.left = remotePlayer.x + 'px';
            remotePlayer.element.style.top = remotePlayer.y + 'px';
        }
    }
}

// Create remote player
function createRemotePlayer(game, data) {
    const playerElement = dom({
        tag: 'div',
        attributes: {
            class: 'remote-player',
            id: `remote-player-${data.playerId}`,
            style: `position: absolute; width: ${game.map.blockSize}px; height: ${game.map.blockSize}px; z-index: 10;`
        },
        children: [
            {
                tag: 'img',
                attributes: {
                    src: '/game/assets/player/player.png',
                    alt: 'Remote Player',
                    style: 'width: 100%; height: 100%;'
                },
                children: []
            }
        ]
    });
    
    document.getElementById('grid').appendChild(playerElement);
    
    return {
        playerId: data.playerId,
        nickname: data.nickname,
        element: playerElement,
        gridX: data.gridX || 0,
        gridY: data.gridY || 0,
        x: (data.gridX || 0) * game.map.blockSize,
        y: (data.gridY || 0) * game.map.blockSize,
        lives: data.lives || 3
    };
}

// Create remote bomb
function createRemoteBomb(game, data) {
    const bombElement = dom({
        tag: 'div',
        attributes: {
            class: 'remote-bomb',
            id: `remote-bomb-${data.bombId}`,
            style: `position: absolute; width: ${game.map.blockSize}px; height: ${game.map.blockSize}px; left: ${data.gridX * game.map.blockSize}px; top: ${data.gridY * game.map.blockSize}px; z-index: 5;`
        },
        children: [
            {
                tag: 'img',
                attributes: {
                    src: '/game/assets/bomb/bomb.png',
                    alt: 'Bomb',
                    style: 'width: 100%; height: 100%;'
                },
                children: []
            }
        ]
    });
    
    document.getElementById('grid').appendChild(bombElement);
    
    game.remoteBombs.set(data.bombId, {
        bombId: data.bombId,
        element: bombElement,
        gridX: data.gridX,
        gridY: data.gridY,
        range: data.range
    });
}

// Handle bomb explosion
function handleBombExplosion(game, data) {
    // Remove bomb element
    const bomb = game.remoteBombs.get(data.bombId);
    if (bomb && bomb.element) {
        bomb.element.remove();
        game.remoteBombs.delete(data.bombId);
    }
    
    // Create explosion effects
    if (data.explosions) {
        data.explosions.forEach(explosion => {
            createExplosionEffect(game, explosion);
        });
    }
    
    // Remove destroyed blocks
    if (data.destroyedBlocks) {
        data.destroyedBlocks.forEach(block => {
            removeBlock(game, block);
        });
    }
}

// Create explosion effect
function createExplosionEffect(game, explosion) {
    const explosionElement = dom({
        tag: 'div',
        attributes: {
            class: 'explosion-effect',
            style: `position: absolute; width: ${game.map.blockSize}px; height: ${game.map.blockSize}px; left: ${explosion.gridX * game.map.blockSize}px; top: ${explosion.gridY * game.map.blockSize}px; z-index: 15; background: radial-gradient(circle, #ff6b35 0%, #f7931e 50%, transparent 100%); border-radius: 50%;`
        },
        children: []
    });
    
    document.getElementById('grid').appendChild(explosionElement);
    
    // Remove after animation
    setTimeout(() => {
        explosionElement.remove();
    }, 500);
}

// Remove destroyed block
function removeBlock(game, block) {
    const blockElement = document.querySelector(`[data-grid-x="${block.gridX}"][data-grid-y="${block.gridY}"]`);
    if (blockElement) {
        blockElement.remove();
    }
}

// Handle power-up collection
function handlePowerUpCollection(game, data) {
    // Remove power-up from map
    const powerUpElement = document.getElementById(`powerup-${data.powerupId}`);
    if (powerUpElement) {
        powerUpElement.remove();
    }
    
    // Update player stats if it's local player
    if (data.playerId === game.networkManager.getPlayerId()) {
        updateLocalPlayerStats(game, data.newStats);
    }
}

// Update local player stats
function updateLocalPlayerStats(game, stats) {
    if (stats.speed) game.player.speed = stats.speed;
    if (stats.bombCount) game.player.bombCount = stats.bombCount;
    if (stats.bombRange) game.player.bombRange = stats.bombRange;
    if (stats.lives) game.player.lives = stats.lives;
}

// Handle player damage
function handlePlayerDamage(game, data) {
    if (data.playerId === game.networkManager.getPlayerId()) {
        game.player.lives = data.livesRemaining;
        game.scoreboard.updateLives();
    } else {
        const remotePlayer = game.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.lives = data.livesRemaining;
        }
    }
}

// Handle player death
function handlePlayerDeath(game, data) {
    if (data.playerId === game.networkManager.getPlayerId()) {
        // Local player died
        game.player.lives = 0;
        game.ui.GameOver();
    } else {
        // Remote player died
        const remotePlayer = game.remotePlayers.get(data.playerId);
        if (remotePlayer && remotePlayer.element) {
            remotePlayer.element.style.opacity = '0.5';
            remotePlayer.lives = 0;
        }
    }
}

// Handle game over
function handleGameOver(game, data) {
    game.ui.GameOver();
    
    // Show winner
    if (data.winner) {
        const winnerMessage = dom({
            tag: 'div',
            attributes: {
                style: 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: white; padding: 2rem; border-radius: 10px; z-index: 2000; text-align: center;'
            },
            children: [`Winner: ${data.winner.nickname}!`]
        });
        document.body.appendChild(winnerMessage);
        
        setTimeout(() => {
            winnerMessage.remove();
            router.navigate('/', true);
        }, 3000);
    }
}

// Update map state
function updateMapState(game, mapState) {
    // Update destructible blocks
    if (mapState.blocks) {
        mapState.blocks.forEach(block => {
            if (!block.exists) {
                removeBlock(game, block);
            }
        });
    }
}