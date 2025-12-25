/**
 * Random integer between min and max (inclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random element from array
 * @param {Array} array
 * @returns {*}
 */
export function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Random boolean with probability
 * @param {number} probability - Between 0 and 1
 * @returns {boolean}
 */
export function randomChance(probability) {
    return Math.random() < probability;
}