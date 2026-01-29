import { dom } from '../../../framework/index.js';

export const LobbyPage = ({ players = [], countdown = null }) => {
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

    players.forEach(p => {
        const playerDiv = dom({
            tag: 'div',
            children: [p.nickname]
        });
        playersList.appendChild(playerDiv);
    });

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

    return { element: page, countdownElement };
};
