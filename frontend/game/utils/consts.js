export const FLOOR = 0
export const WALL = 1
export const BLOCK = 2
export const SOFT_BLOCK = 2 // Alias for soft/destructible blocks used in maps
export const PLAYER = 3
export const ENEMY = 4
export const BOMB = 5
export const SPEED = 6
export const TIME = 7

export const ClientMessages = {
  JOIN_LOBBY: 'JOIN_LOBBY',
  LEAVE_LOBBY: 'LEAVE_LOBBY',
  MOVE: 'MOVE',
  PLACE_BOMB: 'PLACE_BOMB',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  PING: 'PING'
};