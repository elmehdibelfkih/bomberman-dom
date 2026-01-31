import { dom } from '../../../framework/index.js';

export const LobbyPage = ({ players = [], countdown = null, onSendChat = () => {} }) => {
    const page = dom({
        tag: 'div',
        attributes: { class: 'lobby-page' }
    });

    const title = dom({
        tag: 'h1',
        children: ['Lobby']
    });

    const playersList = dom({
        tag: 'div',
        attributes: { class: 'players-list' }
    });

    function renderPlayers(list) {
        playersList.innerHTML = '';
        list.forEach(p => {
            const playerDiv = dom({ tag: 'div', children: [p.nickname] });
            playersList.appendChild(playerDiv);
        });
    }

    renderPlayers(players);

    page.appendChild(title);
    page.appendChild(playersList);

    // Always create countdown element, but hide it if no countdown
    const countdownElement = dom({
        tag: 'div',
        attributes: { 
            class: 'countdown',
            style: countdown !== null ? '' : 'display: none;'
        },
        children: [countdown !== null ? `Game starting in ${countdown}...` : '']
    });
    page.appendChild(countdownElement);

    // Chat area
    const chatContainer = dom({ tag: 'div', attributes: { class: 'chat-container' } });
    const chatMessages = dom({ tag: 'div', attributes: { class: 'chat-messages', style: 'max-height: 200px; overflow-y: auto; margin-top: 8px; background: #111; padding: 8px; color: #fff;' } });
    const chatForm = dom({ tag: 'form', attributes: { class: 'chat-form', style: 'display:flex; gap:8px; margin-top:8px;' } });
    const chatInput = dom({ tag: 'input', attributes: { type: 'text', placeholder: 'Type a message...', class: 'chat-input', style: 'flex:1; padding:6px;' } });
    const sendBtn = dom({ tag: 'button', attributes: { type: 'submit', class: 'btn' }, children: ['Send'] });

    chatForm.appendChild(chatInput);
    chatForm.appendChild(sendBtn);
    chatContainer.appendChild(chatMessages);
    chatContainer.appendChild(chatForm);
    page.appendChild(chatContainer);

    function addChatMessage({ from, nickname, text }) {
        const msgEl = dom({ tag: 'div', attributes: { class: 'chat-message', style: 'margin-bottom:6px;' } });
        const nameEl = dom({ tag: 'span', attributes: { style: 'font-weight:700; color:#9ad;' }, children: [nickname || from] });
        const textEl = dom({ tag: 'span', attributes: { style: 'margin-left:6px; color:#fff;' }, children: [text] });
        msgEl.appendChild(nameEl);
        msgEl.appendChild(textEl);
        chatMessages.appendChild(msgEl);
        // scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value && chatInput.value.trim();
        if (!text) return;
        // send to server; server will broadcast back to all clients (including sender)
        onSendChat(text);
        chatInput.value = '';
    });

    function updatePlayers(list) {
        renderPlayers(list || []);
    }

    function updateCountdown(value) {
        countdownElement.style.display = value !== null ? '' : 'none';
        countdownElement.textContent = value !== null ? `Game starting in ${value}...` : '';
    }

    return { element: page, countdownElement, addChatMessage, updatePlayers, updateCountdown };
};
