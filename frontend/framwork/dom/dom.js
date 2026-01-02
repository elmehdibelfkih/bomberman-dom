import { valideHtmlNode } from "../libs/validate_html_node.js";
import { validateDomNode, tagsMapAttributesSet } from "./tags.js";
import { createEffect } from "../state/signal.js";
import { eventManager } from "../event/event.js";

const devMode = false;

export function dom(node) {
    // if (!valideHtmlNode(node)) return;
    // if (devMode && !validateDomNode(node)) return;

    if (typeof node === "string") {
        return document.createTextNode(node ?? "");
    }
    const el = document.createElement(node.tag);
    setAttributes(el, node.attributes);
    appendChildren(el, node.children);

    return el;
}

// Handles attributes, including reactive ones
function setAttributes(el, attributes = {}) {
    for (const [key, value] of Object.entries(attributes)) {
        const trimmedKey = key.trim();
        if (trimmedKey === "") { // Skip empty trimmed keys
            console.warn(`Invalid attribute name: ${key}`);
            continue;
        }

        if (trimmedKey.startsWith("on") && typeof value === "function") {
            const eventName = trimmedKey.toLowerCase().substring(2);
            eventManager.linkNodeToHandlers(el, eventName, value);
        } else if (typeof value === "function") {
            // Reactive attribute
            createEffect(() => {
                const result = value();
                // Handle boolean attributes explicitly
                if (typeof el[trimmedKey] === "boolean") {
                    el[trimmedKey] = !!result;
                } else if (result === null || result === undefined) {
                    el.removeAttribute(trimmedKey);
                } else {
                    el.setAttribute(trimmedKey, result);
                }
            });
        } else {
            // Static attribute
            if (typeof el[trimmedKey] === "boolean") {
                el[trimmedKey] = !!value;
            } else if (value === null || value === undefined) {
                el.removeAttribute(trimmedKey);
            } else {
                el.setAttribute(trimmedKey, value);
            }
        }
    }
}

// Handles children, including reactive text nodes
function appendChildren(el, children = []) {
    if (typeof children === "function") {
        // reactive children array - use reconciliation instead of clearing
        const childElementsMap = new Map(); // Track elements by a stable key

        createEffect(() => {
            const newChildren = children();

            // Convert to array if not already
            const newChildrenArray = Array.isArray(newChildren) ? newChildren : [newChildren];

            // Create a map of new children by their identity
            const newChildrenMap = new Map();
            const newChildElements = [];

            newChildrenArray.forEach((child, index) => {
                // Try to find a stable key
                const key = child?.id || child?.tag + index;
                newChildrenMap.set(key, child);

                // Check if we already have this element
                let childEl = childElementsMap.get(key);

                if (!childEl) {
                    // Create new element
                    childEl = dom(child);
                }

                if (childEl) {
                    newChildElements.push({ key, element: childEl });
                }
            });

            // Remove elements that no longer exist
            childElementsMap.forEach((element, key) => {
                if (!newChildrenMap.has(key)) {
                    if (element.parentNode === el) {
                        el.removeChild(element);
                    }
                    childElementsMap.delete(key);
                }
            });

            // Add/reorder elements
            newChildElements.forEach(({ key, element }, index) => {
                childElementsMap.set(key, element);

                const currentIndex = Array.from(el.children).indexOf(element);

                if (currentIndex === -1) {
                    // Element doesn't exist in DOM, add it
                    if (index >= el.children.length) {
                        el.appendChild(element);
                    } else {
                        el.insertBefore(element, el.children[index]);
                    }
                } else if (currentIndex !== index) {
                    // Element exists but in wrong position, move it
                    if (index >= el.children.length) {
                        el.appendChild(element);
                    } else {
                        el.insertBefore(element, el.children[index]);
                    }
                }
            });

        });
        return;
    }

    for (const child of children) {
        let childEl;

        if (typeof child === "function") {
            // reactive text node
            childEl = document.createTextNode("");
            createEffect(() => {
                childEl.nodeValue = child();
            });
        } else {
            childEl = dom(child);
        }

        if (childEl) el.appendChild(childEl);
    }
}