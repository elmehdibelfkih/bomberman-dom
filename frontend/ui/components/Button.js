import { dom } from '../../../framework/index.js';

export const Button = ({ text, onClick, className = '' }) => {
    return dom({
        tag: 'button',
        attributes: {
            class: `btn ${className}`,
            onclick: onClick
        },
        children: [text]
    });
};
