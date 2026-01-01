import { ClientMessages, ServerMessages } from "../../shared/message-types.js"
import { RoomManager } from "../core/RoomManagerNew.js";
import { sanitizeChatMessage, validateNickname } from "../utils/validation.js";
import { MessageBuilder } from "./MessageBuilder.js"
import { Logger } from "../utils/Logger.js"

export class MessageHandler {
    constructor() {
        this.roomManager = RoomManager.getInstance()
    }

    handle(connection, message) {
        try {
            Logger.info(`Handling message: ${message.type} from ${connection.clientId}`)
            
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
                    break
                    
                case ClientMessages.QUIT_GAME:
                    this.handleQuitGame(connection, message)
                    break

                default:
                    this.sendError(connection, 'UNKNOWN_MESSAGE_TYPE', 'Unknown message type');
            }
        } catch (error) {
            Logger.error('Error handling message:', error)
            this.sendError(connection, 'MESSAGE_ERROR', 'Error processing message');
        }
    }

    handleJoinGame(connection, message) {
        const nickname = message.nickname
        const validation = validateNickname(nickname)

        if (!validation.valid) {
            connection.sendError('INVALID_NICKNAME', validation.error)
            return
        }

        const mapId = message.mapId || 1
        if (mapId < 1 || mapId > 6) {
            connection.sendError('INVALID_MAP', 'Must choose one of the available maps');
            return;
        }

        try {
            const { playerId, lobby } = this.roomManager.joinLobby(connection, nickname, mapId);

            connection.setPlayerInfo(playerId, nickname);

            connection.send(MessageBuilder.lobbyJoined({
                playerId: playerId,
                nickname: nickname,
                lobbyId: lobby.id,
                playerCount: lobby.players.size,
                maxPlayers: 4
            }))
        } catch (error) {
            Logger.error('Join game error:', error)
            connection.sendError('JOIN_FAILED', error.message);
        }
    }

    handleMove(connection, message) {
        const room = this.roomManager.getRoomForPlayer(connection.clientId)
        if (!room) {
            connection.sendError('NO_ROOM', 'Not in a game room')
            return
        }
        
        if (!message.direction || !['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(message.direction)) {
            connection.sendError('INVALID_DIRECTION', 'Invalid movement direction')
            return
        }
        
        room.handlePlayerInput(connection.clientId, {
            type: 'MOVE',
            direction: message.direction
        })
    }

    handlePlaceBomb(connection, message) {
        const room = this.roomManager.getRoomForPlayer(connection.clientId)
        if (!room) {
            connection.sendError('NO_ROOM', 'Not in a game room')
            return
        }
        
        room.handlePlayerInput(connection.clientId, {
            type: 'PLACE_BOMB'
        })
    }

    handleChat(connection, message) {
        const sanitizedMessage = sanitizeChatMessage(message.text)
        if (!connection.clientId) {
            connection.sendError('NOT_IN_GAME', 'You must join a game first')
            return
        }

        if (!sanitizedMessage) {
            connection.sendError('EMPTY_MESSAGE', 'Message cannot be empty')
            return
        }

        const room = this.roomManager.getRoomForPlayer(connection.clientId)
        if (!room) {
            connection.sendError('NO_ROOM', 'Not in a game room');
            return;
        }
        
        room.broadcast(MessageBuilder.chatMessage({
            playerId: connection.clientId,
            nickname: connection.nickname,
            message: sanitizedMessage,
            timestamp: Date.now()
        }))
    }

    handleQuitGame(connection, message) {
        this.roomManager.handleDisconnect(connection.clientId)
        connection.send(MessageBuilder.gameLeft())
    }

    sendError(connection, errorCode, message) {
        connection.send({
            type: ServerMessages.ERROR,
            errorCode: errorCode,
            message: message,
            timestamp: Date.now()
        })
    }
}