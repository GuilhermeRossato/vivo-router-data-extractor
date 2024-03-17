const { isDebugMode } = require("../0-primitive/args.js");
const getDateTimeStringWithOffset = require("./getDateTimeStringWithOffset.js");

const log = console.log.bind(console);
let inside = false;

const handleLog = (...args) => {
    if (!isDebugMode) {
        return;
    }
    if (inside) {
        return log(...args);
    }
    inside = true;
    try {
        const stackFileList = new Error('a').stack.split('\n').map(
            a => a.substring(Math.max(a.lastIndexOf('\\'), a.lastIndexOf('/')) + 1, a.lastIndexOf(':')).replace(')', '').trim()
        ).filter(
            a => a.includes('.js:') && !a.includes('attachLogToStderr')
        );
        let src = stackFileList.slice(0, 2).reverse().join(' -> ');
        if (!src) {
            src = '?';
        }
        args.unshift(`- ${src} -`);
        args.unshift(getDateTimeStringWithOffset().substring(0, 23));

        console.error(...args);
        inside = false;
    } catch (err) {
        inside = false;
    }
};

console.log = handleLog;

module.exports = log;