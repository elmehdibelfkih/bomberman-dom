export class MessageHandler {
    constructor() {
        this.handlers = new Map();
    }

    register(messageType, callback) {
        this.handlers.set(messageType, callback);
    }

    handle(message) {
        const handler = this.handlers.get(message.type);
        if (handler) {
            handler(message);
        }
    }

    unregister(messageType) {
        this.handlers.delete(messageType);
    }

    clear() {
        this.handlers.clear();
    }
}
