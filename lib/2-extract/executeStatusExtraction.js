const sendToRouter = require("../1-interface/sendToRouter.js");
const { persistSessionIdUpdate } = require("../2-auth/persistSessionIdUpdate.js");

module.exports = async function executeStatusExtraction(sessionId) {
    const status = await sendToRouter("http://192.168.15.1/webClient/index.html", { sessionId });
    if (sessionId !== status.sessionId) {
        sessionId = status.sessionId;
        console.log('Fetch from status updated session id to', /\D/g.test(sessionId) ? sessionId : parseInt(sessionId));
        await persistSessionIdUpdate(sessionId);
    }
    return status;
}