const fs = require('fs');
const { sessionArgIndex } = require('../0-primitive/args.js');
const loadEnv = require("../0-primitive/loadEnv.js");
const asyncTryCatchNull = require('../9-utils/asyncTryCatchNull.js');
const path = require('path');

async function getStartingSessionId() {
    const env = await loadEnv();
    if (sessionArgIndex) {
        return process.argv[sessionArgIndex];
    }
    if (!env.ROUTER_SESSION_ID_FILE_PATH) {
        return '';
    }
    let sessionFilePath = env.ROUTER_SESSION_ID_FILE_PATH;
    let sessionId = await asyncTryCatchNull(fs.promises.readFile(sessionFilePath, 'utf-8'));
    if (sessionId === null) {
        console.log('Previous session id file path was not found at', path.basename(sessionFilePath));
        return '';
    }
    // @ts-ignore
    if (sessionId instanceof Error && sessionId.code === 'EISDIR') {
        sessionFilePath = path.resolve(sessionFilePath, 'session-id.txt');
        env.ROUTER_SESSION_ID_FILE_PATH = sessionFilePath;
        sessionId = await asyncTryCatchNull(fs.promises.readFile(sessionFilePath, 'utf-8'));
    }
    if (sessionId instanceof Error) {
        console.log('Loading of previous session id file caused an exception');
        throw sessionId;
    }
    if (typeof sessionId === 'string' && sessionId.trim() === '') {
        console.log('Previous session id file is empty');
        return '';
    }
    if (!sessionId) {
        console.log(`No previous session id file found at ".../${path.basename(path.dirname(sessionFilePath))}/${path.basename(sessionFilePath)}"`);
        return '';
    }
    console.log(`Loaded session id from "${path.basename(sessionFilePath)}":`, /\D/g.test(sessionId) ? sessionId : parseInt(sessionId));
    return sessionId;
}

exports.getStartingSessionId = getStartingSessionId;
