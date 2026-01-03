import { ClientMessages, ServerMessages } from "../../shared/message-types.js"
import { RoomManager } from "../core/RoomManager.js";
import { sanitizeChatMessage, validateNickname } from "../utils/validation.js";
import { MessageBuilder } from "./MessageBuilder.js"
export class MessageHandler {
    constructor() {
        this.roomManager = new RoomManager()
    }

    handle(connection, rawMessage) {
        try {
            const message = JSON.parse(rawMessage)

            switch (message.type) {
                case ClientMessages.JOIN_GAME:
                    this.handleJoinGame(connection, message);
                    break

                case ClientMessages.MOVE:
                    this.handleMove(connection, message);
                    break

                case ClientMessages.PLACE_BOMB:
                    this.handlePlaceBomb(connection, message);
                    break

                case ClientMessages.CHAT_MESSAGE:
                    this.handleChat(connection, message);
                    break;
                case ClientMessages.QUIT_GAME:
                    this.handleQuitGame(connection, message)
                    break

                default:
                    console.log('Unknown message type:', message.type);
                    this.sendError(connection, 'Unknown message type');
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.sendError(connection, 'Invalid message format');
        }
    }

    handleJoinGame(connection, message) {
        const nickname = message.nickname
        const validation = validateNickname(nickname)

        if (!validation.valid) {
            connection.sendError('INVALID_NICKNAME', validation.error)
            return
        }

        try {
            const { playerId, lobby, playerPosition } = this.roomManager.joinLobby(connection, nickname);

            connection.setPlayerInfo(playerId, nickname);

            const players = [];
            lobby.players.forEach((playerData) => {
                players.push({
                    playerId: playerData.playerId,
                    nickname: playerData.nickname
                });
            });

            connection.send(MessageBuilder.lobbyJoined(lobby.id, playerId, players, playerPosition))
        } catch (error) {
            connection.sendError('JOIN_FAILED', error.message);
        }
    }


    handleMove(connection, message) {
        const room = this.roomManager.getRoomForPlayer(connection.playerId);
        if (!room) {
            connection.sendError('NO_ROOM', 'Not in a game room');
            return;
        }

        room.handlePlayerInput(connection.playerId, {
            type: 'MOVE',
            direction: message.direction
        });
    }

    handlePlaceBomb(connection, message) {
        const room = this.roomManager.getRoomForPlayer(connection.playerId);
        if (!room) {
            connection.sendError('NO_ROOM', 'Not in a game room');
            return;
        }

        room.handlePlayerInput(connection.playerId, {
            type: 'PLACE_BOMB'
        });
    }

    handleChat(connection, message) {
        const sanitizedMessage = sanitizeChatMessage(message.text);

        if (!connection.playerId) {
            connection.sendError('NOT_IN_GAME', 'You must join a game first');
            return;
        }

        if (!sanitizedMessage) {
            connection.sendError('EMPTY_MESSAGE', 'Message cannot be empty');
            return;
        }

        // Check if player is in lobby
        if (this.roomManager.lobby && this.roomManager.lobby.players.has(connection.playerId)) {
            // Broadcast to lobby
            this.roomManager.broadcastToLobby(
                this.roomManager.lobby,
                MessageBuilder.chatMessage(connection.playerId, connection.nickname, sanitizedMessage)
            );
            return;
        }

        // Check if player is in active game
        const room = this.roomManager.getRoomForPlayer(connection.playerId);
        if (room) {
            // Broadcast to game room
            room.broadcast(MessageBuilder.chatMessage(connection.playerId, connection.nickname, sanitizedMessage));
            return;
        }

        connection.sendError('NO_ROOM', 'Not in a lobby or game room');
    }

    handleQuitGame(connection, message) {

    }

    sendError(connection, message) {
        connection.send(JSON.stringify(message))
    }
}