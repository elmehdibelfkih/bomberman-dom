export function validateNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
        return { valid: false, error: 'Nickname is required' }
    }
    
    if (nickname.length < 2) {
        return { valid: false, error: 'Nickname must be at least 2 characters' }
    }
    
    if (nickname.length > 20) {
        return { valid: false, error: 'Nickname must be less than 20 characters' }
    }
    
    // Only allow alphanumeric characters, spaces, and basic symbols
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/
    if (!validPattern.test(nickname)) {
        return { valid: false, error: 'Nickname contains invalid characters' }
    }
    
    return { valid: true }
}

export function sanitizeChatMessage(message) {
    if (!message || typeof message !== 'string') {
        return null
    }
    
    // Remove excessive whitespace
    message = message.trim()
    
    if (message.length === 0) {
        return null
    }
    
    if (message.length > 200) {
        message = message.substring(0, 200)
    }
    
    // Basic HTML escape
    message = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    
    return message
}

export function validateMapId(mapId) {
    if (typeof mapId !== 'number') {
        return { valid: false, error: 'Map ID must be a number' }
    }
    
    if (mapId < 1 || mapId > 10) {
        return { valid: false, error: 'Map ID must be between 1 and 10' }
    }
    
    return { valid: true }
}

export function validateDirection(direction) {
    const validDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT']
    
    if (!direction || typeof direction !== 'string') {
        return { valid: false, error: 'Direction is required' }
    }
    
    if (!validDirections.includes(direction.toUpperCase())) {
        return { valid: false, error: 'Invalid direction' }
    }
    
    return { valid: true, direction: direction.toUpperCase() }
}

export function validatePosition(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
        return { valid: false, error: 'Position coordinates must be numbers' }
    }
    
    if (x < 0 || y < 0) {
        return { valid: false, error: 'Position coordinates must be non-negative' }
    }
    
    if (x > 14 || y > 12) { // Grid is 15x13
        return { valid: false, error: 'Position coordinates out of bounds' }
    }
    
    return { valid: true }
}