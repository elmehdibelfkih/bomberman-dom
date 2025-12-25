/**
 * Validate nickname
 * @param {string} nickname
 * @returns {{valid: boolean, error?: string}}
 */
export function validateNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
        return { valid: false, error: 'Nickname is required' };
    }

    if (nickname.length < 2) {
        return { valid: false, error: 'Nickname must be at least 2 characters' };
    }

    if (nickname.length > 20) {
        return { valid: false, error: 'Nickname must be at most 20 characters' };
    }

    const validPattern = /^[a-zA-Z0-9_\- ]+$/;
    if (!validPattern.test(nickname)) {
        return { valid: false, error: 'Nickname contains invalid characters' };
    }

    return { valid: true };
}

/**
 * Validate direction input
 * @param {string} direction
 * @returns {boolean}
 */
export function validateDirection(direction) {
    return ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(direction);
}

/**
 * Validate grid coordinates
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
export function validateCoordinates(x, y, width, height) {
    return Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 0 &&
        x < width &&
        y >= 0 &&
        y < height;
}

/**
 * Sanitize chat message
 * @param {string} message
 * @returns {string}
 */
export function sanitizeChatMessage(message) {
    if (!message || typeof message !== 'string') {
        return '';
    }

    let sanitized = message.trim().slice(0, 100);

    sanitized = sanitized
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

    return sanitized;
}