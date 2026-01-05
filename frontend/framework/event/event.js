// global-event-manager.js

const eventHandlerRegistry = new WeakMap();

class SyntheticEvent {
    constructor(nativeEvent, syntheticType) {
        this.nativeEvent = nativeEvent;
        this.type = syntheticType || nativeEvent.type;

        this.timeStamp = nativeEvent.timeStamp;
        this.isTrusted = nativeEvent.isTrusted;

        this._propagationStopped = false
        this._immediatePropagationStopped = false

        this.currentTarget = null;
        this.target = nativeEvent.target;
    }

    preventDefault() {
        if (this.nativeEvent.preventDefault && this.nativeEvent.cancelable) {
            this.nativeEvent.preventDefault();
        }
    }

    get defaultPrevented() {
        return !!(this.nativeEvent.defaultPrevented);
    }

    stopPropagation() {
        this._propagationStopped = true;
        if (this.nativeEvent.stopPropagation) {
            try { this.nativeEvent.stopPropagation(); } catch (e) {}
        }
    }

    stopImmediatePropagation() {
        this._immediatePropagationStopped = true;
        this._propagationStopped = true;
        if (this.nativeEvent.stopImmediatePropagation) {
            try { this.nativeEvent.stopImmediatePropagation(); } catch (e) {}
        } else if (this.nativeEvent.stopPropagation) {
            try { this.nativeEvent.stopPropagation(); } catch (e) {}
        }
    }

    get isPropagationStopped() {
        return this._propagationStopped;
    }

    get isImmediatePropagationStopped() {
        return this._immediatePropagationStopped;
    }
}

export class GlobalEventManager {
    static #key = Symbol('GlobalEventManager key');
    static instance = new GlobalEventManager(GlobalEventManager.#key);

    constructor(key) {
        if (key !== GlobalEventManager.#key) {
            throw new TypeError('GlobalEventManager is not constructable directly.');
        }
        if (GlobalEventManager.instance) return GlobalEventManager.instance;

        this.root = document;

        this.eventMap = {
            click:  { native: 'click'  },
            dblclick: { native: 'dblclick' },
            mousedown: { native: 'mousedown' },
            mouseup: { native: 'mouseup' },
            mousemove: { native: 'mousemove' },
            mouseover: { native: 'mouseover' },
            mouseout: { native: 'mouseout' },

            keydown: { native: 'keydown' },
            keyup: { native: 'keyup' },
            keypress: { native: 'keypress' },

            input: { native: 'input' },
            change: { native: 'change' },
            submit: { native: 'submit' },

            // focus/blur do not bubble; listen to focusin/focusout which do bubble
            focus: { native: 'focusin', synthetic: 'focus' },
            blur:  { native: 'focusout', synthetic: 'blur' }
        };

        this._init();
    }

    _init() {
        Object.keys(this.eventMap).forEach(syntheticName => {
            const { native: nativeName } = this.eventMap[syntheticName];
            this.root.addEventListener(nativeName, (e) => this._topLevelDispatch(e, syntheticName), true /* capture */);
        });
    }

    addEventListener(node, eventName, handler, options = {}) {
        if (!node || typeof handler !== 'function') return;

        let nodeEntry = eventHandlerRegistry.get(node);
        if (!nodeEntry) {
            nodeEntry = Object.create(null);
            eventHandlerRegistry.set(node, nodeEntry);
        }

        const phaseKey = options.capture ? 'capture' : 'bubble';
        if (!nodeEntry[eventName]) {
            nodeEntry[eventName] = { capture: [], bubble: [] };
        }

        nodeEntry[eventName][phaseKey].push({ fn: handler, once: !!options.once });
    }


    removeEventListener(node, eventName, handler, options = {}) {
        const nodeEntry = eventHandlerRegistry.get(node);
        if (!nodeEntry || !nodeEntry[eventName]) return;
        const phaseKey = options.capture ? 'capture' : 'bubble';
        nodeEntry[eventName][phaseKey] = nodeEntry[eventName][phaseKey].filter(h => h.fn !== handler);
        if (nodeEntry[eventName].capture.length === 0 && nodeEntry[eventName].bubble.length === 0) {
            delete nodeEntry[eventName];
        }
    }

    linkNodeToHandlers(node, eventName, handler, options = {}) {
        this.addEventListener(node, eventName, handler, options);
    }

    _getPath(nativeEvent) {
        if (typeof nativeEvent.composedPath === 'function') {
            const path = nativeEvent.composedPath();
            const trimmed = [];
            for (const n of path) {
                if (!n) break;
                trimmed.push(n);
                if (n === this.root) break;
            }
            return trimmed;
        } else {
            const path = [];
            let node = nativeEvent.target;
            while (node) {
                path.push(node);
                if (node === this.root) break;
                node = node.parentNode;
            }
            if (path[path.length - 1] !== this.root) path.push(this.root);
            return path;
        }
    }

    _topLevelDispatch(nativeEvent, syntheticEventName) {
        const syntheticName = (this.eventMap[syntheticEventName] && this.eventMap[syntheticEventName].synthetic) || syntheticEventName;

        const path = this._getPath(nativeEvent);
        if (!path || path.length === 0) return;

        const syntheticEvent = new SyntheticEvent(nativeEvent, syntheticName);

        const invokeHandlers = (node, phase) => {
            if (syntheticEvent.isPropagationStopped) return true; // true -> stop outer traversal
            const entry = eventHandlerRegistry.get(node);
            if (!entry) return false;

            const record = entry[syntheticName];
            if (!record) return false;

            const list = record[phase];
            if (!list || list.length === 0) return false;

            for (let i = 0; i < list.length; i++) {
                const handlerRecord = list[i];
                if (!handlerRecord || typeof handlerRecord.fn !== 'function') continue;

                console.log()
                syntheticEvent.currentTarget = node;

                try {
                    handlerRecord.fn.call(node, syntheticEvent);
                } catch (err) {
                    console.error(err);
                }

                if (handlerRecord.once) {
                    list[i] = null;
                }

                if (syntheticEvent.isImmediatePropagationStopped) {
                    break;
                }
            }

            let compacted = [];
            for (const r of list) if (r) compacted.push(r);
            record[phase] = compacted;

            return syntheticEvent.isPropagationStopped;
        };

        const topDown = [...path].reverse();
        for (let i = 0; i < topDown.length; i++) {
            const node = topDown[i];
            const stop = invokeHandlers(node, 'capture');
            if (stop) {
                break;
            }
        }

        if (!syntheticEvent.isPropagationStopped) {
            const targetNode = path[0];
            const stopAtTarget = invokeHandlers(targetNode, 'bubble');
            if (stopAtTarget) {
            } else {
                for (let i = 1; i < path.length; i++) {
                    const node = path[i];
                    const stop = invokeHandlers(node, 'bubble');
                    if (stop) break;
                }
            }
        }
    }
}

export const eventManager = GlobalEventManager.instance;
