const fs = require('fs');
const loadEnv = require("../0-primitive/loadEnv.js");
const asyncTryCatchNull = require('../9-utils/asyncTryCatchNull.js');
const path = require('path');

let isFirstExec = true;

async function persistSessionIdUpdate(sessionId) {
    if (!sessionId) {
        return;
    }
    const env = await loadEnv();
    if (!env.ROUTER_SESSION_ID_FILE_PATH) {
        return;
    }
    let sessionFilePath = env.ROUTER_SESSION_ID_FILE_PATH;
    let e = await asyncTryCatchNull(fs.promises.writeFile(sessionFilePath, sessionId, 'utf-8'));
    if (isFirstExec) {
        isFirstExec = false;
        console.log('Persisting session id because "ROUTER_SESSION_ID_FILE_PATH" is defined');
    }
    // @ts-ignore
    if (e instanceof Error && e.code === 'EISDIR') {
        sessionFilePath = path.resolve(sessionFilePath, 'session-id.txt');
        env.ROUTER_SESSION_ID_FILE_PATH = sessionFilePath;
        e = await asyncTryCatchNull(fs.promises.writeFile(sessionFilePath, sessionId, 'utf-8'));
    }
    
    if (e instanceof Error) {
        console.log('Saving to session id file caused an exception');
        throw e;
    }
}

exports.persistSessionIdUpdate = persistSessionIdUpdate;
