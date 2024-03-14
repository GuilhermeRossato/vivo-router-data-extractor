const debug = false;

const sendToRouter = require('../1-interface/sendToRouter.js');
const sleep = require('../9-utils/sleep.js');

module.exports = async function verify(sessionId) {
    const response = await sendToRouter("http://192.168.15.1/webClient/index.html", {sessionId});
    if (response.success) {
        return true;
    }
    return false;
}

