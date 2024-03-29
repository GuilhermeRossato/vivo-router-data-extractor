const sendToRouter = require("../1-interface/sendToRouter.js");
const { persistSessionIdUpdate } = require("../2-auth/persistSessionIdUpdate.js");

module.exports = async function executeStatisticsExtraction(sessionId) {
  const statistics = await sendToRouter("http://192.168.15.1/webClient/device-management-statistics.html", {sessionId});
  if (sessionId !== statistics.sessionId) {
    sessionId = statistics.sessionId;
    console.log('Fetch from statistics updated session id to', /\D/g.test(sessionId) ? sessionId : parseInt(sessionId));
    await persistSessionIdUpdate(sessionId);
  }
  return statistics;
}


