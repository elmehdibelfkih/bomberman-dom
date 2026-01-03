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
                    this.sendError(connection, 'Unknown message type');
            }
        } catch (error) {
            this.sendError(connection, 'Invalid message format');
        }
    }

    handleJoinHome(connection, message) {
        const playerId = connection
    }

    handleJoinGame(connection, message) {
        const nickname = message.nickname
        const validation = validateNickname(nickname)

        if (!validation.valid) {
            connection.sendError('INVALID_NICKNAME', validation.error)
            return
        }

        const mapId = message.mapId
        if (!mapId || mapId < 1 || mapId > 6) {
            connection.sendError('INVALID_MAP', 'Must choose one of the available maps');
            return;
        }

        try {
            const { playerId, lobby } = this.roomManager.joinLobby(connection, nickname, mapId);

            connection.setPlayerInfo(playerId, nickname);

            connection.send(MessageBuilder.playerJoined(playerId, nickname, lobby.players.size))
        } catch (error) {
            connection.sendError('JOIN_FAILED', error.message);
        }
    }


    handleMove(connection, message) {
        // 1. Get player's game room
        // 2. Validate direction
        // 3. Call room.handlePlayerInput()
    }

    handlePlaceBomb(connection, message) {
        // 1. Get player's game room
        // 2. Call room.handlePlayerInput()
    }

    handleChat(connection, message) {
        // 1. Sanitize message
        const sanitizedMessage = sanitizeChatMessage(message.text)
        if (!connection.playerId) {
            connection.sendError('NOT_IN_GAME', 'You must join a game first')
        }

        if (!sanitizedMessage) {
            connection.sendError('EMPTY_MESSAGE', 'Message cannot be empty')
        }

        // 2. Get player's game room
        const room = this.roomManager.getRoomForPlayer(connection.playerId)

        if (!room) {
            connection.sendError('NO_ROOM', 'Not in a game room');
            return;
        }
        // 3. Broadcast to all players
        room.broadcast(MessageBuilder.chatMessage(connection.playerId, connection.nickname, sanitizedMessage))
    }

    handleQuitGame(connection, message) {

    }

    sendError(connection, message) {
        connection.send(JSON.stringify(message))
    }
}