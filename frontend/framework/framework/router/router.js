import { createSignal } from '../state/signal.js'
export class Router {
    static #RouterKey = Symbol('Router constructor key');
    static instance = new Router(Router.#RouterKey);

    #pathname
    #setPathname
    #searchParams
    #setSearchParams
    #hash
    #setHash

    constructor(key) {
        if (key !== Router.#RouterKey) {
            throw new TypeError('Router is not constructable directly.');
        }

        [this.#pathname, this.#setPathname] = createSignal(window.location.pathname);
        [this.#searchParams, this.#setSearchParams] = createSignal(new URLSearchParams(window.location.search));
        [this.#hash, this.#setHash] = createSignal(window.location.hash);
    }

    initRouter() {
        document.body.addEventListener('click', this.#handleClick.bind(this));

        if (document.readyState === 'loading') {
            window.addEventListener("DOMContentLoaded", () => {
                this.#updateReactiveState();
            });
        } else {
            this.#updateReactiveState();
        }

        window.addEventListener('popstate', () => {
            this.#updateReactiveState();
        });

        window.addEventListener('hashchange', () => {
            console.log('Hash changed to:', window.location.hash);
            this.#setHash(window.location.hash);
        });
    }

    #canPreventDefault(event) {
        return (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        );
    }


    #handleClick(event) {
        const link = event.target.closest('a');
        if (!link) return;
        if (this.#canPreventDefault(event)) return;

        const hrefAttr = link.getARouterttribute('href');
        if (!hrefAttr) return;
        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download')) return;

        let url;
        try {
            url = new URL(hrefAttr, document.baseURI)
        } catch (err) {
            return;
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        if (url.origin !== location.origin) return;

        if (url.href === location.href) {
            event.preventDefault();
            return;
        }
    
        event.preventDefault();
        this.navigate(url.pathname + url.search + url.hash);
    }

 
    navigate(path, replace = false) {
        const url = new URL(path, document.baseURI);

        if (replace) {
            history.replaceState({}, '', url.href);
        } else {
            history.pushState({}, '', url.href);
        }

        this.#updateReactiveState();
    }

    #updateReactiveState() {
        this.#setPathname(window.location.pathname);
        this.#setSearchParams(new URLSearchParams(window.location.search));
        this.#setHash(window.location.hash);
    }

    getPathname = () => this.#pathname()
    getSearchParams = () => this.#searchParams()
    getHash = () => this.#hash()

    getSearchParam = (key) => {
        const params = this.#searchParams();
        return params.get(key);
    }
}
