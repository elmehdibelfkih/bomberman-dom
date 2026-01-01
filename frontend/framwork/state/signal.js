const effectQueue = new Set(); // effects scheduled to run

let currentObserver = null; // the effect currently being executed

let isFlushing = false; // whether effects are being flushed

let batchDepth = 0; // depth of nested batches

let currentCleanupOwner = null; // the effect currently owning cleanups


// create a signal wich contains a [getter,setter] to some sort of data aka state
export function createSignal(initialValue, name = "signal", debug = false) {
    let value = initialValue;
    const observers = new Set();

    function get() {
        if (currentObserver) {
            observers.add(currentObserver);
            currentObserver.sources.add(observers);
            if (debug) console.log(`[getter] => ${name} tracked current value: ${value}`);
        }
        if (debug) console.log(`[getter] => signal: ${name} has ${observers.size} observers.`)
        return value;
    };

    function set(newValue) {
        if (value === newValue) return;
        value = newValue;
        if (debug) console.log(`[setter] => ${name} updated new value: ${value}`);
        if (debug) console.log(`[setter] => signal: ${name} has ${observers.size} observers.`);
        // very important to use [...observers] a static copy of the set to avoid mutate the set during effect re-runs
        [...observers].forEach(effect => {
            if (effect.notify) {
                effect.notify();
            } else {
                if (debug) console.log(`[setter] => scheduling effect for signal: ${name}`);
                scheduleEffect(effect);
            }
        });
    };

    return [get, set]
}

//create a effect that watches a signal aka observer
export function createEffect(fn) {
    function effect() {
        if (effect.running) return
        effect.running = true;

        for (const cleanup of effect.cleanups) cleanup()
        effect.cleanups.length = 0;

        cleanUp(effect);

        currentObserver = effect;
        currentCleanupOwner = effect;

        fn();

        currentObserver = null;
        effect.running = false;
    };

    effect.sources = new Set();
    effect.cleanups = [];
    effect.running = false;

    effect();
}

//detach a signal from un effect for a bref moment
export function untrack(fn) {
    const prev = currentObserver;
    currentObserver = null;
    const untracked = fn();
    currentObserver = prev;
    return untracked;
}

//clean up dependencies before each rerun of an effect
export function cleanUp(effect) {
    for (const obeserver of effect.sources) {
        obeserver.delete(effect);
    }
    effect.sources.clear();
}

//schscheduleEffect / batching

// wait for the JS stack to finish excution than excute the effect int the Microtask level
export function scheduleEffect(effect) {
    effectQueue.add(effect);

    if (batchDepth > 0) return

    if (!isFlushing) {
        isFlushing = true;
        queueMicrotask(flushEffects);
    }
}

export function flushEffects() {
    try {
        for (const effect of effectQueue) {
            effect();
        }
    } finally {
        effectQueue.clear();
        isFlushing = false;
    }
}

// batch
export function batch(fn) {
    batchDepth++;
    try {
        fn();
    } finally {
        batchDepth--;
        if (batchDepth === 0 && effectQueue.size > 0 && !isFlushing) {
            isFlushing = true;
            queueMicrotask(flushEffects);
        }
    }
}

// memo or cashing
export function createMemo(fn, initialValue, name = "memo", debug = false) {
    let cached = initialValue;
    let outdated = true;

    const obeservers = new Set();
    const sources = new Set();

    function memoObserver() {
        for (const src of sources) src.delete(memoObserver);
        sources.clear();

        const prev = currentObserver;
        currentObserver = memoObserver;


        cached = fn();

        currentObserver = prev;
        outdated = false;

        if (debug) console.log(`[memo] => ${name} recomputed cached: ${cached}`);
    }

    memoObserver.sources = sources;

    memoObserver.notify = function () {
        if (!outdated) {
            outdated = true;
            if (debug) console.log(`[memo] => ${name} marked as outdated.`);
            for (const observer of obeservers) scheduleEffect(observer);
        }
    }

    //initial computation
    return function getMemo() {
        if (currentObserver) {
            obeservers.add(currentObserver);
            currentObserver.sources.add(obeservers);
            if (debug) console.log(`[getter] => ${name} tracked current value: ${cached}`);
        }
        if (outdated) memoObserver();
        return cached;
    };

}


export function onCleanup(fn) {
    if (currentCleanupOwner) {
        currentCleanupOwner.cleanups.push(fn);
    }
}