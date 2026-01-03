//** on(event, listener) => Register a listener (callback) for the given event.
//** once(event, listener) => Register a listener that runs only once, then auto-removes itself.
//** off(event, listener) / removeListener(event, listener) => Remove a specific listener for an event.
//** removeAllListeners(event?) => Remove all listeners for a specific event (or for all events if none given).
//** emit(event, ...args) => Trigger the event, calling all registered listeners with the provided arguments.
//** listeners(event) => Get an array of the current listeners for an event.
//** listenerCount(event) => Return how many listeners are registered for the event.
//** eventNames() => Return an array of event names that currently have listeners.
//** prependListener(event, listener) => Add a listener to the front of the list (runs before others).
//** prependOnceListener(event, listener) => Like once, but added at the front.
//** setMaxListeners(n) => Set the maximum number of listeners before a warning is shown (default = 10).
//** getMaxListeners() => Get the current max listener limit.

class EventEmitter {
    static #EventEmitterKey = Symbol('EventEmitter constructor key');
    static instance = new EventEmitter(EventEmitter.#EventEmitterKey);

    #REGISTRY = new Map()
    #ONCE_REGISTRY = new Map()
    #MAX_LISTENERS = 10
    #STRICT_MODE = false

    constructor(key) {
        if (key !== EventEmitter.#EventEmitterKey) throw new TypeError('EventEmitter is not constructable directly.');
    }

    on(event, listener) {
        if (!listener) throw new Error(`${event}: No listener`)
        if (this.hasOnceListener(event, listener)) throw new Error(`${event, listener}: exist in once`);
        if (this.#REGISTRY.has(event)) {
            const setTmp = this.#REGISTRY.get(event)
            if (setTmp.size >= this.#MAX_LISTENERS) throw new Error(`${event}: the listner set is full.`)
            return this.#REGISTRY.get(event).add(listener)
        }

        this.#REGISTRY.set(event, new Set([listener]))
    }

    once(event, listener) {
        if (!listener) throw new Error(`No listener`)
        if (this.hasOnceListener(event, listener)) throw new Error(`${event, listener}: exist in registry`);
        if (this.#ONCE_REGISTRY.has(event)) {
            const setTmp = this.#ONCE_REGISTRY.get(event)
            if (setTmp.size >= this.#MAX_LISTENERS) throw new Error(`${event}: the listner set is full.`)
            return this.#ONCE_REGISTRY.get(event).add(listener)
        }
        this.#ONCE_REGISTRY.set(event, new Set([listener]))
    }

    off(event, listener) {
        if (!listener) this.#ONCE_REGISTRY.delete(event)
        if (!listener) this.#REGISTRY.delete(event)
        if (this.hasListener(event, listener)) this.#REGISTRY.get(event).delete(listener)
        if (this.hasOnceListener(event, listener)) this.#ONCE_REGISTRY.get(event).delete(listener)
    }

    hasListener(event, listener) {
        if (!this.#REGISTRY.has(event)) return false;
        const tmp = this.#REGISTRY.get(event);
        return listener ? tmp.has(listener) : tmp.size > 0;
    }

    hasOnceListener(event, listener) {
        if (!this.#ONCE_REGISTRY.has(event)) return false;
        const tmp = this.#ONCE_REGISTRY.get(event);
        return listener ? tmp.has(listener) : tmp.size > 0;
    }


    removeAllListeners(event) {
        if (!event) {
            this.#REGISTRY.clear()
            this.#ONCE_REGISTRY.clear()
            return
        }
        if (this.#REGISTRY.has(event)) this.#REGISTRY.delete(event)
        if (this.#ONCE_REGISTRY.has(event)) this.#ONCE_REGISTRY.delete(event)
    }

    emit(event, ...args) {
        const regularSet = this.#REGISTRY.get(event);
        const onceSet = this.#ONCE_REGISTRY.get(event);
        if (!regularSet && !onceSet) throw new Error(`${event}: no events `);

        if (regularSet && regularSet.size) {
            const regularListeners = [...regularSet];
            for (const fn of regularListeners) {
                if (this.#STRICT_MODE) try { fn(...args); } catch (error) { throw error }
                else try { fn(...args); } catch (error) { }
            }
        }

        if (onceSet && onceSet.size) {
            const onceListeners = [...onceSet];
            this.#ONCE_REGISTRY.delete(event);

            for (const fn of onceListeners) {
                if (this.#STRICT_MODE) try { fn(...args); } catch (error) { throw error; }
                else try { fn(...args); } catch (error) { }
            }
        }
    }


    listeners = (event) => event ? this.#REGISTRY.get(event) : undefined
    onceListeners = (event) => event ? this.#ONCE_REGISTRY.get(event) : undefined

    listenerCount = (event) => event ? this.#REGISTRY.get(event).size : 0
    onceListenerCount = (event) => event ? this.#ONCE_REGISTRY.get(event).size : 0

    eventNames = () => [...this.#REGISTRY.keys(), ...this.#ONCE_REGISTRY.keys()]

    onStrictMode = () => this.#STRICT_MODE = true
    offStrictMode = () => this.#STRICT_MODE = false

    setMaxListeners = (n) => this.#MAX_LISTENERS = n
    getMaxListeners = () => this.#MAX_LISTENERS
}

export const eventEmitter = EventEmitter.instance;