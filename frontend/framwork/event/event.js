// global-event-manager.js

const eventHandlerRegistry = new WeakMap();

/**
 * SyntheticEvent: a thin wrapper that proxies live properties
 * to the nativeEvent but allows mutating currentTarget while dispatching.
 */
class SyntheticEvent {
    constructor(nativeEvent, syntheticType) {
        this.nativeEvent = nativeEvent;
        // use the framework-visible type (e.g., "focus" mapped from "focusin")
        this.type = syntheticType || nativeEvent.type;

        // copy a few immutable snapshots (useful for debug/read)
        this.timeStamp = nativeEvent.timeStamp;
        this.isTrusted = nativeEvent.isTrusted;

        // internal control flags
        this._propagationStopped = false;         // stopPropagation() called
        this._immediatePropagationStopped = false; // stopImmediatePropagation() called

        // currentTarget will be updated by dispatcher before each handler call
        this.currentTarget = null;
        // target is the original event target
        this.target = nativeEvent.target;
    }

    // delegate default prevention to native event
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
            // ensure native won't continue bubbling to other native handlers
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
        /**
         * eventMap maps framework-visible event names (e.g., "focus") to the native event we listen for.
         * The "native" name is what we attach on document; syntheticName is what is exposed to handlers.
         */
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

        // initialize WeakMap entries for nodes lazily
        // attach one capture listener per distinct native event
        this._init();
    }

    _init() {
        Object.keys(this.eventMap).forEach(syntheticName => {
            const { native: nativeName } = this.eventMap[syntheticName];
            // top-level capture listener: we intercept during capture, then run full synthetic dispatch
            this.root.addEventListener(nativeName, (e) => this._topLevelDispatch(e, syntheticName), true /* capture */);
        });
    }

    /**
     * Register a handler on a node.
     * options: { capture: boolean (default false), once: boolean (default false) }
     */
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

    /**
     * Remove a handler (optional helper)
     */
    removeEventListener(node, eventName, handler, options = {}) {
        const nodeEntry = eventHandlerRegistry.get(node);
        if (!nodeEntry || !nodeEntry[eventName]) return;
        const phaseKey = options.capture ? 'capture' : 'bubble';
        nodeEntry[eventName][phaseKey] = nodeEntry[eventName][phaseKey].filter(h => h.fn !== handler);
        // if both empty, delete
        if (nodeEntry[eventName].capture.length === 0 && nodeEntry[eventName].bubble.length === 0) {
            delete nodeEntry[eventName];
        }
    }

    /**
     * Helper method to link a node to handlers (alias for addEventListener)
     * Used by the dom() function for convenience
     */
    linkNodeToHandlers(node, eventName, handler, options = {}) {
        this.addEventListener(node, eventName, handler, options);
    }

    /**
     * Build the event path honoring shadow DOM if possible.
     * Use composedPath() when available, otherwise build via parentNode.
     */
    _getPath(nativeEvent) {
        if (typeof nativeEvent.composedPath === 'function') {
            // composedPath returns nodes from target up to Window; we will trim at document
            const path = nativeEvent.composedPath();
            // keep only nodes up to document (some environments include Window)
            const trimmed = [];
            for (const n of path) {
                if (!n) break;
                trimmed.push(n);
                if (n === this.root) break;
            }
            return trimmed;
        } else {
            // fallback: walk parentNode
            const path = [];
            let node = nativeEvent.target;
            while (node) {
                path.push(node);
                if (node === this.root) break;
                node = node.parentNode;
            }
            // ensure document is present
            if (path[path.length - 1] !== this.root) path.push(this.root);
            // path is target -> ... -> document
            return path;
        }
    }

    /**
     * Top-level dispatcher: intercept native event (capture phase), build synthetic event
     * and replay capture -> target -> bubble phases in synthetic world.
     */
    _topLevelDispatch(nativeEvent, syntheticEventName) {
        // Resolve the synthetic-exposed event name
        const syntheticName = (this.eventMap[syntheticEventName] && this.eventMap[syntheticEventName].synthetic) || syntheticEventName;

        // Build path: target -> ... -> document
        const path = this._getPath(nativeEvent);
        if (!path || path.length === 0) return;

        const syntheticEvent = new SyntheticEvent(nativeEvent, syntheticName);

        // Helper to invoke handlers on a node for a phase (capture or bubble)
        const invokeHandlers = (node, phase) => {
            if (syntheticEvent.isPropagationStopped) return true; // true -> stop outer traversal
            const entry = eventHandlerRegistry.get(node);
            if (!entry) return false;

            const record = entry[syntheticName];
            if (!record) return false;

            const list = record[phase];
            if (!list || list.length === 0) return false;

            // iterate over handlers in registration order
            // support once: remove after invocation
            for (let i = 0; i < list.length; i++) {
                const handlerRecord = list[i];
                if (!handlerRecord || typeof handlerRecord.fn !== 'function') continue;

                // set dynamic currentTarget
                syntheticEvent.currentTarget = node;

                try {
                    handlerRecord.fn.call(node, syntheticEvent);
                } catch (err) {
                    // swallow to avoid breaking global dispatch; in real frameworks we may log/report.
                    // but do not rethrow here.
                    console.error(err);
                }

                if (handlerRecord.once) {
                    // mark for removal: we can't mutate while iterating safely; mark as null
                    list[i] = null;
                }

                if (syntheticEvent.isImmediatePropagationStopped) {
                    // stop executing remaining handlers on this node and stop propagation upward
                    break;
                }
            }

            // compact out nulls if any
            let compacted = [];
            for (const r of list) if (r) compacted.push(r);
            record[phase] = compacted;

            return syntheticEvent.isPropagationStopped;
        };

        // 1) Capture phase: top-down from document -> target (but composedPath gives target-> ... -> document).
        // We want document -> ... -> target: reverse path
        const topDown = [...path].reverse(); // document -> ... -> target
        for (let i = 0; i < topDown.length; i++) {
            const node = topDown[i];
            const stop = invokeHandlers(node, 'capture');
            if (stop) {
                // If synthetic stopPropagation called, ensure native propagation is stopped (already done in SyntheticEvent)
                break;
            }
        }

        if (!syntheticEvent.isPropagationStopped) {
            // 2) Target phase: capture handlers on target (already invoked as last step of capture),
            // then bubble handlers on target.
            const targetNode = path[0];
            // Ensure we invoke bubble handlers on target (capture already called)
            const stopAtTarget = invokeHandlers(targetNode, 'bubble');
            if (stopAtTarget) {
                // propagation stopped at target bubble phase
                // nothing further
            } else {
                // 3) Bubble phase: bottom-up from target.parent -> document
                for (let i = 1; i < path.length; i++) {
                    const node = path[i];
                    const stop = invokeHandlers(node, 'bubble');
                    if (stop) break;
                }
            }
        }

        // After synthetic dispatch, if synthetic handlers called stopPropagation/stopImmediatePropagation,
        // nativeEvent propagation was already stopped by SyntheticEvent methods above.
        // No additional action required here.
    }
}

// export singleton
export const eventManager = GlobalEventManager.instance;
