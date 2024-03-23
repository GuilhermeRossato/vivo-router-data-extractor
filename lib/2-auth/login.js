const sendToRouter = require("../1-interface/sendToRouter.js");
const sleep = require("../9-utils/sleep.js");
const verify = require("./verify.js");

module.exports = async function login(previousSessionId = '') {
    let first = await sendToRouter('/', { sessionId: previousSessionId });
    let s = first.sessionId;

    await sleep(250);

    if (previousSessionId && first.sessionId === previousSessionId && s === previousSessionId) {
        console.log('Previous session id maintained on first request:', s);
    } else if (previousSessionId) {
        console.log('Previous session id replaced on first request:', s);
    } else if (!previousSessionId) {
        console.log('Session id was obtained on first request', s);
    }

    // Check if new response will match the session id
    let resp = await sendToRouter('/webClient/index.html', {
        referer: first.url,
        sessionId: s
    });

    for (let i = 0; i < 3 && s !== resp.sessionId; i++) {
        console.log(`Response ${i}/3 updated session from ${s} to ${resp.sessionId}`);
        resp = await sendToRouter('/webClient/index.html', {
            referer: first.url,
            sessionId: s
        });
        await sleep(400 + 400 * i);
    }
    if (resp.sessionId !== s) {
        throw new Error(`Could not get matching session id: ${JSON.stringify([resp.sessionId, s])}`);
    }
    const u = 'admin';
    const p = 'aacxud59';
    const loginResponse = await sendToRouter(
        '/webClient/login.cgi',
        {
            method: 'POST',
            body: "loginUsername=" + u + "&loginPassword=" + p,
            referer: resp.url,
            sessionId: s
        }
    );
    if (s !== loginResponse.sessionId) {
        console.log(`Login request response changed session from ${s} to ${loginResponse.sessionId}`);
        s = loginResponse.sessionId;
    }
    await sleep(250);
    if (!await verify(s)) {
        throw new Error('Login failed')
    }
    return s;
}