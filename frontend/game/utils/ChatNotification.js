import { dom } from '../../framework/index.js';

export class ChatNotification {
    static #instance = null;

    static getInstance() {
        if (!ChatNotification.#instance) {
            ChatNotification.#instance = new ChatNotification();
        }
        return ChatNotification.#instance;
    }

    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        this.container = dom({
            tag: 'div',
            attributes: {
                id: 'chat-notifications',
                style: 'position: fixed; top: 20px; right: 20px; z-index: 1500; pointer-events: none;'
            },
            children: []
        });
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = dom({
            tag: 'div',
            attributes: {
                class: `chat-notification chat-notification-${type}`,
                style: `
                    background: var(--overlay-bg);
                    backdrop-filter: blur(10px);
                    color: var(--text-primary);
                    padding: var(--spacing-sm) var(--spacing-md);
                    margin-bottom: var(--spacing-xs);
                    border-radius: var(--border-radius-md);
                    border-left: 4px solid var(--accent-color);
                    font-family: var(--font-pixel);
                    font-size: var(--font-size-xs);
                    animation: slideInRight 0.3s ease;
                    max-width: 300px;
                    word-wrap: break-word;
                `
            },
            children: [message]
        });

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Auto-remove after duration
        setTimeout(() => {
            this.remove(notification);
        }, duration);

        return notification;
    }

    remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }

        const index = this.notifications.indexOf(notification);
        if (index > -1) {
            this.notifications.splice(index, 1);
        }
    }

    showChatHelp() {
        this.show('Press T to chat, ESC to cancel', 'info', 5000);
    }

    showPlayerJoined(nickname) {
        this.show(`${nickname} joined the game`, 'success', 3000);
    }

    showPlayerLeft(nickname) {
        this.show(`${nickname} left the game`, 'warning', 3000);
    }
}