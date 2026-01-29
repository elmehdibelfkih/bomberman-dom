export class StateSync {
    constructor(gameState) {
        this.gameState = gameState;
        this.pendingMoves = [];
        this.sequenceNumber = 0;
    }

    addPendingMove(move) {
        this.pendingMoves.push({
            ...move,
            sequenceNumber: ++this.sequenceNumber
        });
        return this.sequenceNumber;
    }

    reconcile(serverSequenceNumber) {
        this.pendingMoves = this.pendingMoves.filter(
            m => m.sequenceNumber > serverSequenceNumber
        );
    }

    syncPlayerState(playerId, serverData) {
        this.gameState.updatePlayer(playerId, serverData);
    }

    clear() {
        this.pendingMoves = [];
        this.sequenceNumber = 0;
    }
}
