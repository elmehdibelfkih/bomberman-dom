import { dom } from '../../../framework/index.js';

export const HomePage = ({ onJoinLobby }) => {
    let nickname = '';

    const input = dom({
        tag: 'input',
        attributes: {
            type: 'text',
            placeholder: 'ENTER PLAYER NAME',
            class: 'input',
            oninput: (e) => { nickname = e.target.value; }
        }
    });

    const button = dom({
        tag: 'button',
        attributes: {
            class: 'btn',
            onclick: () => {
                if (nickname.trim()) {
                    onJoinLobby(nickname.trim());
                }
            }
        },
        children: ['◄ START GAME ►']
    });

    const form = dom({
        tag: 'div',
        attributes: { class: 'nickname-form' }
    });
    form.appendChild(input);
    form.appendChild(button);

    const page = dom({
        tag: 'div',
        attributes: { class: 'home-page' }
    });
    page.appendChild(dom({ tag: 'h1', children: ['◄ BOMBERMAN ►'] }));
    page.appendChild(form);

    return page;
};
