const getDateTimeStringWithOffset = require("../9-utils/getDateTimeStringWithOffset.js");

/**
 * 
 * @param {Date | number | string} [time] 
 * @param {number} [interval] 
 * @returns 
 */
module.exports = function generatePreviousFetchTime(time, interval = 20_000) {
    const ref = !time ? new Date() : time instanceof Date ? time : new Date(time);
    const date = new Date(ref.getTime() - ref.getUTCMilliseconds() + (interval % 1000));
    if (date.getTime() > ref.getTime()) {
        date.setTime(date.getTime() - 1000);
    }
    const options = [];
    for (let i = 0; i < Math.ceil(interval / 1000); i++) {
        const t = date.getTime() - 1000 * i;
        const dateStr = getDateTimeStringWithOffset(t).substring(11, 23).replace(/\D/g, '');
        let count = 0;
        for (let k = dateStr.length-1; k >= 0; k--) {
            if (dateStr[k] !== '0') {
                break;
            }
            count++;
        }
        options.push([t, count])
    }
    const prevFetchTime = options.length ? options.sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]).pop()[0] : ref.getTime();
    if (prevFetchTime + interval < ref.getTime()) {
        return prevFetchTime + interval;
    }
    return prevFetchTime;
}