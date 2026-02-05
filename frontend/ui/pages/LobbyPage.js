import { dom } from '../../../framework/index.js';

export const LobbyPage = ({ players = [], countdown = null, onSendChat = () => {} }) => {
    const page = dom({
        tag: 'div',
        attributes: { 
            class: 'lobby-page',
            style: `
                background: linear-gradient(45deg, #000 0%, #330000 50%, #000 100%);
                border: 4px solid #ff0000;
                border-radius: 0;
                box-shadow: 0 0 30px #ff0000, inset 0 0 20px rgba(255,0,0,0.2);
                color: #ff0000;
                font-family: 'Courier New', monospace;
                text-transform: uppercase;
                letter-spacing: 2px;
                position: relative;
                overflow: hidden;
            `
        }
    });

    // Add scanlines effect
    const scanlines = dom({
        tag: 'div',
        attributes: {
            style: `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(255,0,0,0.1) 2px,
                    rgba(255,0,0,0.1) 4px
                );
                pointer-events: none;
                z-index: 1;
            `
        }
    });
    page.appendChild(scanlines);

    const content = dom({
        tag: 'div',
        attributes: {
            style: 'position: relative; z-index: 2;'
        }
    });

    const title = dom({
        tag: 'h1',
        attributes: {
            style: `
                text-align: center;
                font-size: clamp(32px, 6vw, 48px);
                color: #ff0000;
                margin-bottom: 30px;
                text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
                animation: glow 2s ease-in-out infinite alternate;
                font-weight: bold;
            `
        },
        children: ['◄ LOBBY ►']
    });

    const playersList = dom({
        tag: 'div',
        attributes: { 
            class: 'players-list',
            style: `
                background: rgba(0,0,0,0.8);
                border: 2px solid #ff0000;
                padding: 20px;
                margin-bottom: 30px;
                min-height: 200px;
                box-shadow: inset 0 0 20px rgba(255,0,0,0.3);
            `
        }
    });

    function renderPlayers(list) {
        playersList.innerHTML = '';
        
        const header = dom({
            tag: 'div',
            attributes: {
                style: `
                    color: #ff0000;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    text-align: center;
                    text-shadow: 0 0 5px #ff0000;
                `
            },
            children: [`PLAYERS: ${list.length}/4`]
        });
        playersList.appendChild(header);

        list.forEach((p, index) => {
            const playerDiv = dom({ 
                tag: 'div',
                attributes: {
                    style: `
                        background: linear-gradient(90deg, #ff0000 0%, #cc0000 100%);
                        color: #000;
                        padding: 12px 20px;
                        margin-bottom: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        border: 1px solid #fff;
                        box-shadow: 0 0 10px rgba(255,0,0,0.5);
                        animation: playerPulse 3s ease-in-out infinite;
                        animation-delay: ${index * 0.5}s;
                    `
                },
                children: [`► PLAYER ${index + 1}: ${p.nickname}`]
            });
            playersList.appendChild(playerDiv);
        });

        // Add empty slots
        for (let i = list.length; i < 4; i++) {
            const emptySlot = dom({
                tag: 'div',
                attributes: {
                    style: `
                        background: rgba(255,0,0,0.1);
                        color: #666;
                        padding: 12px 20px;
                        margin-bottom: 8px;
                        font-size: 16px;
                        border: 1px dashed #ff0000;
                    `
                },
                children: [`► WAITING FOR PLAYER ${i + 1}...`]
            });
            playersList.appendChild(emptySlot);
        }
    }

    renderPlayers(players);

    content.appendChild(title);
    content.appendChild(playersList);

    // Countdown with 90s style
    const countdownElement = dom({
        tag: 'div',
        attributes: { 
            class: 'countdown',
            style: `
                ${countdown !== null ? '' : 'display: none;'}
                text-align: center;
                font-size: 28px;
                font-weight: bold;
                color: #ff0000;
                padding: 20px;
                background: rgba(0,0,0,0.9);
                border: 3px solid #ff0000;
                margin: 20px 0;
                text-shadow: 0 0 15px #ff0000;
                animation: countdownBlink 1s ease-in-out infinite;
            `
        },
        children: [countdown !== null ? `◄ GAME STARTING IN ${countdown} ►` : '']
    });
    content.appendChild(countdownElement);

    // Chat area with 90s terminal style
    const chatContainer = dom({ 
        tag: 'div', 
        attributes: { 
            class: 'chat-container',
            style: `
                background: rgba(0,0,0,0.9);
                border: 2px solid #ff0000;
                padding: 15px;
                box-shadow: inset 0 0 15px rgba(255,0,0,0.3);
            `
        } 
    });
    
    const chatTitle = dom({
        tag: 'div',
        attributes: {
            style: `
                color: #ff0000;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                text-align: center;
                text-shadow: 0 0 5px #ff0000;
            `
        },
        children: ['◄ TERMINAL CHAT ►']
    });
    chatContainer.appendChild(chatTitle);

    const chatMessages = dom({ 
        tag: 'div', 
        attributes: { 
            class: 'chat-messages', 
            style: `
                max-height: 150px; 
                overflow-y: auto; 
                margin-bottom: 10px; 
                background: #000; 
                padding: 10px; 
                color: #00ff00;
                font-family: 'Courier New', monospace;
                border: 1px solid #ff0000;
                font-size: 14px;
            `
        } 
    });
    
    const chatForm = dom({ 
        tag: 'form', 
        attributes: { 
            class: 'chat-form', 
            style: 'display:flex; gap:8px; margin-top:10px;' 
        } 
    });
    
    const chatInput = dom({ 
        tag: 'input', 
        attributes: { 
            type: 'text', 
            placeholder: 'ENTER MESSAGE...', 
            class: 'chat-input', 
            style: `
                flex:1; 
                padding:8px; 
                background: #000;
                color: #ff0000;
                border: 2px solid #ff0000;
                font-family: 'Courier New', monospace;
                text-transform: uppercase;
            `
        } 
    });
    
    const sendBtn = dom({ 
        tag: 'button', 
        attributes: { 
            type: 'submit', 
            class: 'btn',
            style: `
                padding: 8px 16px;
                background: linear-gradient(45deg, #ff0000, #cc0000);
                color: #000;
                border: 2px solid #fff;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                text-transform: uppercase;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(255,0,0,0.5);
            `
        }, 
        children: ['SEND'] 
    });

    chatForm.appendChild(chatInput);
    chatForm.appendChild(sendBtn);
    chatContainer.appendChild(chatMessages);
    chatContainer.appendChild(chatForm);
    content.appendChild(chatContainer);
    page.appendChild(content);

    function addChatMessage({ from, nickname, text }) {
        const msgEl = dom({ 
            tag: 'div', 
            attributes: { 
                class: 'chat-message', 
                style: 'margin-bottom:6px; color: #00ff00;' 
            } 
        });
        const nameEl = dom({ 
            tag: 'span', 
            attributes: { 
                style: 'font-weight:700; color:#ff0000;' 
            }, 
            children: [`[${nickname || from}]`] 
        });
        const textEl = dom({ 
            tag: 'span', 
            attributes: { 
                style: 'margin-left:6px; color:#00ff00;' 
            }, 
            children: [` ${text}`] 
        });
        msgEl.appendChild(nameEl);
        msgEl.appendChild(textEl);
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value && chatInput.value.trim();
        if (!text) return;
        onSendChat(text);
        chatInput.value = '';
    });

    function updatePlayers(list) {
        renderPlayers(list || []);
    }

    function updateCountdown(value) {
        countdownElement.style.display = value !== null ? '' : 'none';
        countdownElement.textContent = value !== null ? `◄ GAME STARTING IN ${value} ►` : '';
    }

    return { element: page, countdownElement, addChatMessage, updatePlayers, updateCountdown, chatInput };
};
