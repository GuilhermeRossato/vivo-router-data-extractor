const intMultList = [1, 60, 60 * 60, 60 * 60 * 24];

const getSecondsFromIntervalString = (dd_hh_mm_ss) => dd_hh_mm_ss.split('.')[0].split(':').reverse().map((a, i) => parseInt(a) * intMultList[i]).reduce((a, b) => a + b, 0);
exports.getSecondsFromIntervalString = getSecondsFromIntervalString;

const getIntervalStringFromSeconds = (seconds) => intMultList.map((m, i) => (Math.floor(parseInt((seconds).toString()) / m) % ([60, 60, 24, 99][i])).toString().padStart(2, '0')).reverse().join(':');
exports.getIntervalStringFromSeconds = getIntervalStringFromSeconds;
