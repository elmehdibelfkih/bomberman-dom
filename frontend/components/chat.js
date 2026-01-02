import { dom, eventEmitter } from '../framwork/index.js';

export class Chat {
    constructor() {
        this.ws = null;
        this.nickname = '';
        this.isOpen = false;
        this.messages = [];
    }

    connect() {
        this.nickname = localStorage.getItem('playerNickname') || 'Anonymous';
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({ type: 'join', nickname: this.nickname }));
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
                this.addMessage(data.nickname, data.message);
            }
        };
    }

    addMessage(nickname, message) {
        this.messages.push({ nickname, message, time: new Date().toLocaleTimeString() });
        this.updateMessages();
    }

    sendMessage(message) {
        if (this.ws && message.trim()) {
            this.ws.send(JSON.stringify({ type: 'message', nickname: this.nickname, message }));
        }
    }

    createChatWindow() {
        const chatWindow = dom({
            tag: 'div',
            attributes: {
                id: 'chat-window',
                style: 'position: fixed; bottom: 20px; right: 20px; width: 300px; height: 400px; background: rgba(0,0,0,0.9); border: 2px solid #ff4757; border-radius: 10px; display: flex; flex-direction: column; z-index: 2000;'
            },
            children: [
                {
                    tag: 'div',
                    attributes: { style: 'padding: 10px; border-bottom: 1px solid #ff4757; color: white; font-family: "Press Start 2P"; font-size: 10px;' },
                    children: ['Chat Room']
                },
                {
                    tag: 'div',
                    attributes: { 
                        id: 'chat-messages',
                        style: 'flex: 1; overflow-y: auto; padding: 10px; color: white; font-size: 10px;'
                    }
                },
                {
                    tag: 'div',
                    attributes: { style: 'display: flex; padding: 10px;' },
                    children: [
                        {
                            tag: 'input',
                            attributes: {
                                id: 'chat-input',
                                type: 'text',
                                placeholder: 'Type message...',
                                style: 'flex: 1; padding: 5px; border: 1px solid #ff4757; background: rgba(0,0,0,0.8); color: white; font-size: 10px;',
                                onkeypress: (e) => {
                                    if (e.key === 'Enter') {
                                        this.sendMessage(e.target.value);
                                        e.target.value = '';
                                    }
                                }
                            }
                        },
                        {
                            tag: 'button',
                            attributes: {
                                style: 'margin-left: 5px; padding: 5px 10px; background: #ff4757; color: white; border: none; font-size: 10px;',
                                onclick: () => {
                                    const input = document.getElementById('chat-input');
                                    this.sendMessage(input.value);
                                    input.value = '';
                                }
                            },
                            children: ['Send']
                        }
                    ]
                },
                {
                    tag: 'button',
                    attributes: {
                        style: 'position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; width: 20px; height: 20px; font-size: 12px;',
                        onclick: () => this.closeChat()
                    },
                    children: ['×']
                }
            ]
        });

        document.body.appendChild(chatWindow);
        this.isOpen = true;
    }

    updateMessages() {
        const messagesDiv = document.getElementById('chat-messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';
            this.messages.forEach(msg => {
                const messageEl = dom({
                    tag: 'div',
                    attributes: { style: 'margin-bottom: 5px; word-wrap: break-word;' },
                    children: [`[${msg.time}] ${msg.nickname}: ${msg.message}`]
                });
                messagesDiv.appendChild(messageEl);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    openChat() {
        if (!this.isOpen) {
            this.connect();
            this.createChatWindow();
        }
    }

    closeChat() {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            chatWindow.remove();
            this.isOpen = false;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}