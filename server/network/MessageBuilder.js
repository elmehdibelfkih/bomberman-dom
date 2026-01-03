export const MessageBuilder = {
  connected(clientId) {
    return {
      type: 'CONNECTED',
      clientId,
    };
  },

  lobbyJoined(lobbyId, playerId, players) {
    return {
      type: 'LOBBY_JOINED',
      lobbyId,
      playerId,
      players,
      playerCount: players.length,
    };
  },

  playerJoined(playerId, nickname, playerCount) {
    return {
      type: 'PLAYER_JOINED',
      playerId,
      nickname,
      playerCount,
    };
  },

  playerLeft(playerId, playerCount) {
    return {
      type: 'PLAYER_LEFT',
      playerId,
      playerCount,
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

  gameStarted(roomId, mapId, mapData, players) {
    return {
      type: 'GAME_STARTED',
      roomId,
      mapId,
      mapData,
      players,
    };
  },

  playerMoved(playerId, gridX, gridY, direction) {
    return {
      type: 'PLAYER_MOVED',
      playerId,
      gridX,
      gridY,
      direction,
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

  gameOver(winner, scores, duration) {
    return {
      type: 'GAME_OVER',
      winner,
      scores,
      duration,
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