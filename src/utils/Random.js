export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const randFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
