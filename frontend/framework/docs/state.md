# State Management

The state management in this framework is based on signals, effects, and a `Show` component for conditional rendering.

## `createSignal(initialValue)`

Creates a reactive state variable. It returns a tuple with a getter and a setter function.

-   **Getter**: When called in an effect, it subscribes the effect to the signal's changes.
-   **Setter**: Updates the signal's value and notifies all subscribed effects.

**Example:**

```javascript
const [count, setCount] = createSignal(0);

// Read the value
console.log(count()); // 0

// Update the value
setCount(1);
console.log(count()); // 1
```

## `createEffect(fn)`

Creates a computation that re-runs whenever one of its signal dependencies changes.

**Example:**

```javascript
createEffect(() => {
  console.log('The count is:', count());
});
// The console will log "The count is: 1"
// If we call setCount(2), it will log "The count is: 2"
```

## `Show` Component

A component for conditional rendering.

**Props:**

-   `when`: A signal or a function that returns a boolean.
-   `fallback`: (Optional) What to render when `when` is false.
-   `children`: What to render when `when` is true.

**Example:**

```javascript
import * as fm from '../framwork/index.js';

function h(tag, attributes, ...children) {
    if (typeof tag === 'function') {
        return tag({ ...attributes, children: children.flat() });
    }
    return fm.domAbstracting({ tag, attributes, children: children.flat() });
}

const [isLoggedIn, setLoggedIn] = fm.createSignal(false);

const userProfile = h(fm.Show, {
  when: isLoggedIn,
  fallback: h('button', { onclick: () => setLoggedIn(true) }, 'Log In'),
},
  h('div', {},
    h('span', {}, 'Welcome back!'),
    h('button', { onclick: () => setLoggedIn(false) }, 'Log Out')
  )
);

document.body.append(userProfile);
```
