const eventHandlerRegistry = new WeakMap();

class SyntheticEvent {
    constructor(nativeEvent) {
        this.nativeEvent = nativeEvent;
        this._isPropagationStopped = false;

        this.bubbles = nativeEvent.bubbles;
        this.cancelable = nativeEvent.cancelable;
        this.composed = nativeEvent.composed;
        this.currentTarget = nativeEvent.currentTarget;
        this.defaultPrevented = nativeEvent.defaultPrevented;
        this.eventPhase = nativeEvent.eventPhase;
        this.isTrusted = nativeEvent.isTrusted;
        this.target = nativeEvent.target;
        this.timeStamp = nativeEvent.timeStamp;
        this.type = nativeEvent.type;
    }

    preventDefault() {
        this.nativeEvent.preventDefault();
    }

    stopPropagation() {
        this._isPropagationStopped = true;
    }

    stopImmediatePropagation() {
        this._isPropagationStopped = true;
        this.nativeEvent.stopImmediatePropagation();
    }
}


export class GlobalEventManager {

    static #GlobalEventManagerKey = Symbol('GlobalEventManager constructor key');
    static instance = new GlobalEventManager(GlobalEventManager.#GlobalEventManagerKey);

    constructor(key) {
        if (key !== GlobalEventManager.#GlobalEventManagerKey) {
            throw new TypeError('GlobalEventManager is not constructable directly.');
        }
        if (GlobalEventManager.instance) {
            return GlobalEventManager.instance;
        }

        this.root = document;

        this.eventMap = {
            // Mouse Events
            'click': { name: 'click', phase: 'bubble' },
            'dblclick': { name: 'dblclick', phase: 'bubble' },
            'mousedown': { name: 'mousedown', phase: 'bubble' },
            'mouseup': { name: 'mouseup', phase: 'bubble' },
            'mousemove': { name: 'mousemove', phase: 'bubble' },
            'mouseover': { name: 'mouseover', phase: 'bubble' },
            'mouseout': { name: 'mouseout', phase: 'bubble' },
            'mouseenter': { name: 'mouseenter', phase: 'bubble' },
            'mouseleave': { name: 'mouseleave', phase: 'bubble' },

            // Keyboard Events
            'keydown': { name: 'keydown', phase: 'bubble' },
            'keyup': { name: 'keyup', phase: 'bubble' },
            'keypress': { name: 'keypress', phase: 'bubble' },

            // Form Events
            'input': { name: 'input', phase: 'bubble' },
            'change': { name: 'change', phase: 'bubble' },
            'submit': { name: 'submit', phase: 'bubble' },

            // Focus Events (using bubbling equivalents)
            'focus': { name: 'focusin', phase: 'bubble' },
            'blur': { name: 'focusout', phase: 'bubble' }
        };

        this.init();
    }

    init() {
        Object.keys(this.eventMap).forEach(frameworkEventName => {
            const { name: nativeName, phase } = this.eventMap[frameworkEventName];

            this.root.addEventListener(
                nativeName,
                (e) => this.handleEvent(e, frameworkEventName),
                // phase === 'capture'
            );
        });
    }

    handleEvent(nativeEvent, frameworkEventName) {
        
        let target = nativeEvent.target;

        const syntheticEvent = new SyntheticEvent(nativeEvent);

        while (target && target.parentNode) {
            const handlers = eventHandlerRegistry.get(target);

            if (handlers && handlers[frameworkEventName]) {
                handlers[frameworkEventName](syntheticEvent);

                if (syntheticEvent._isPropagationStopped) {
                    break; 
                }
            }

            if (target === this.root) break;
            target = target.parentNode;
        }
    }

    linkNodeToHandlers(node, eventName, handler) {
        let existingHandlers = eventHandlerRegistry.get(node) || {};
        existingHandlers[eventName] = handler;
        eventHandlerRegistry.set(node, existingHandlers);
    }

    unlinkNodeFromHandlers(node, eventName) {
        let existingHandlers = eventHandlerRegistry.get(node);
        if (existingHandlers && existingHandlers[eventName]) {
            delete existingHandlers[eventName];
            if (Object.keys(existingHandlers).length === 0) {
                eventHandlerRegistry.delete(node);
            } else {
                eventHandlerRegistry.set(node, existingHandlers);
            }
        }
    }
}

export const eventManager = GlobalEventManager.instance;