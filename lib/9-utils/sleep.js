/**
 * Returns a promise that resolves in a specified amount of milliseconds
 * @param {number} ms 
 */
module.exports = function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }