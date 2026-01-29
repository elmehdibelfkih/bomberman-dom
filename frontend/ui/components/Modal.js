import { dom } from '../../../framework/index.js';

export const Modal = ({ title, content, onClose, visible = true }) => {
    if (!visible) return null;

    return dom({
        tag: 'div',
        attributes: {
            class: 'modal-overlay'
        },
        children: [
            dom({
                tag: 'div',
                attributes: { class: 'modal' },
                children: [
                    dom({
                        tag: 'h2',
                        children: [title]
                    }),
                    dom({
                        tag: 'div',
                        attributes: { class: 'modal-content' },
                        children: [content]
                    }),
                    dom({
                        tag: 'button',
                        attributes: {
                            class: 'modal-close',
                            onclick: onClose
                        },
                        children: ['Close']
                    })
                ]
            })
        ]
    });
};
