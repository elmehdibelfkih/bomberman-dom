export const ClientMessageBuilder = {
    joinGame(nickname) {
        return { type: 'JOIN_GAME', nickname }
    },

    move(direction) {
        return { type: 'MOVE', direction }
    },

    placeBomb() {
        return { type: 'PLACE_BOMB' }
    },

    chatMessage(text) {
        return { type: 'CHAT_MESSAGE', text }
    },

    quitGame() {
        return { type: 'QUIT_GAME' }
    }
}
