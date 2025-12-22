
export function throttle(cbf, wait) {
  let block = false
  return function (...args) {
    if (block) return
    block = true;
    cbf(...args)
    setTimeout(() => {
      block = false;
    }, wait)
  }
}

export function getCoordinates(map, target) {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      if (map[i][j] === target) {
        return [i, j];
      }
    }
  }

  return [null, null];
}