import { dom } from '../../../framework/index.js';

export const MainLayout = ({ children }) => {
    return dom({
        tag: 'div',
        attributes: { class: 'main-layout' },
        children: [
            dom({
                tag: 'header',
                attributes: { class: 'header' },
                children: [
                    dom({
                        tag: 'h1',
                        children: ['Bomberman DOM']
                    })
                ]
            }),
            dom({
                tag: 'main',
                attributes: { class: 'main-content' },
                children: [children]
            })
        ]
    });
};
