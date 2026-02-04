export class NetworkManager {
    static instance = null;

    constructor() {
        this.ws = null;
        this.connected = false;
        this.messageHandler = null;
    }

    static getInstance() {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    connect(url) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                this.connected = true;
                resolve();
            };

            this.ws.onerror = (error) => reject(error);
            
            this.ws.onmessage = (event) => {
                // Avoid spamming console which can hurt FPS
                // console.log(event)
                const message = JSON.parse(event.data);
                this.messageHandler?.handle(message);
            };

            this.ws.onclose = () => {
                this.connected = false;
            };
        });
    }

    setMessageHandler(handler) {
        this.messageHandler = handler;
    }

    send(message) {
        if (this.connected && this.ws) {
            this.ws.send(JSON.stringify(message));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }
}
