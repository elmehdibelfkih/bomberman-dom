export const MessageBuilder = {
  connected(clientId) {
    return {
      type: 'CONNECTED',
      clientId,
    };
  },

  lobbyJoined(lobbyId, playerId, players, playerPosition) {
    return {
      type: 'LOBBY_JOINED',
      lobbyId,
      playerId,
      players,
      playerCount: players.length,
      playerPosition,
    };
  },

  playerJoined(playerId, nickname, players) {
    return {
      type: 'PLAYER_JOINED',
      playerId,
      nickname,
      players,
    };
  },

  playerLeft(playerId, nickname, players) {
    return {
      type: 'PLAYER_LEFT',
      playerId,
      nickname,
      players,
    };
  },

  countdownStart(seconds) {
    return {
      type: 'COUNTDOWN_START',
      seconds,
    };
  },

  countdownTick(remaining) {
    return {
      type: 'COUNTDOWN_TICK',
      remaining,
    };
  },

  gameStarted(roomId, mapId, mapData, players, yourPlayerId) {
    return {
      type: 'GAME_STARTED',
      roomId,
      mapId,
      mapData,
      players,
      yourPlayerId,
      initialState: {
        bombs: [],
        powerups: [],
        timestamp: Date.now()
      }
    };
  },

  playerMoved(playerId, gridX, gridY, direction, sequenceNumber) {
    return {
      type: 'PLAYER_MOVED',
      playerId,
      x: gridX,
      y: gridY,
      direction,
      sequenceNumber,
    };
  },

  bombPlaced(bombId, playerId, gridX, gridY, range) {
    return {
      type: 'BOMB_PLACED',
      bombId,
      playerId,
      gridX,
      gridY,
      range,
    };
  },

  bombExploded(bombId, explosions, destroyedBlocks, damagedPlayers, spawnedPowerup) {
    return {
      type: 'BOMB_EXPLODED',
      bombId,
      explosions,
      destroyedBlocks,
      damagedPlayers,
      spawnedPowerup,
    };
  },

  powerupCollected(playerId, powerupId, type, newStats) {
    return {
      type: 'POWERUP_COLLECTED',
      playerId,
      powerupId,
      powerupType: type,
      newStats,
    };
  },

  powerupSpawned(powerupId, type, gridX, gridY) {
    return {
      type: 'POWERUP_SPAWNED',
      powerupId,
      powerupType: type,
      gridX,
      gridY,
    };
  },

  playerDamaged(playerId, livesRemaining) {
    return {
      type: 'PLAYER_DAMAGED',
      playerId,
      livesRemaining,
    };
  },

  playerDied(playerId) {
    return {
      type: 'PLAYER_DIED',
      playerId,
    };
  },

  playerDisconnected(playerId) {
    return {
      type: 'PLAYER_DISCONNECTED',
      playerId,
    };
  },

  chatMessage(from, nickname, text) {
    return {
      type: 'CHAT_MESSAGE',
      from,
      nickname,
      text,
    };
  },

  gameOver(winner) {
    return {
      type: 'GAME_OVER',
      winner,
    };
  },

  fullState(grid, players, bombs, powerups) {
    return {
      type: 'FULL_STATE',
      grid,
      players,
      bombs,
      powerups,
    };
  },

  error(code, message) {
    return {
      type: 'ERROR',
      code,
      message,
    };
  }
};