import { dom } from '../../../framework/index.js';

export const Input = ({ type = 'text', placeholder = '', value = '', onInput, className = '' }) => {
    return dom({
        tag: 'input',
        attributes: {
            type,
            placeholder,
            value,
            class: `input ${className}`,
            oninput: onInput
        }
    });
};
