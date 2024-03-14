/** @returns {string | '1 day and 3 s' | '1 hour and 20 minutes' | '2 minutes and 13 s'} '1 day' */
module.exports = function getSimpleIntervalString(pastDate, futureDate, includeMs = false) {
    pastDate = typeof pastDate === 'string' || pastDate === null || pastDate === undefined ? new Date(pastDate === undefined ? null : pastDate).getTime() : pastDate instanceof Date ? pastDate.getTime() : typeof pastDate === 'number' ? pastDate : 0;
    futureDate = typeof futureDate === 'string' || pastDate === null || pastDate === undefined ? new Date(futureDate === undefined ? null : futureDate).getTime() : futureDate instanceof Date ? futureDate.getTime() : typeof futureDate === 'number' ? futureDate : 0;
    const ms = Math.abs(futureDate - pastDate);
    console.log(ms);
    const parts = [
        [(Math.floor(ms / (1000 * 60 * 60 * 24))).toString(), 'day']
        [(Math.floor(ms / (1000 * 60 * 60)) % 24).toString(), 'hour'],
        [(Math.floor(ms / (1000 * 60)) % 60).toString(), 'minute'],
        [(Math.floor(ms / (1000)) % 60).toString(), 'second'],
    ].map(
        ([v, s]) => v === '0' ? '' : `${v} ${s}${v !== '1' ? 's' : ''}`
    );
    console.log(parts);
    while (parts.length > 0 && !parts[0].length) {
        parts.shift();
    }
    if (!parts.length) {
        return `${ms.toFixed(0)} ms`;
    }
    return parts.slice(0, 2).join(' and ');
}