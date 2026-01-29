export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

export const lerp = (start, end, t) => {
    return start + (end - start) * t;
};

export const distance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
