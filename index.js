
require('./lib/9-utils/attachLogToStderr.js');

const login = require('./lib/2-auth/login.js');
const executeStatisticsExtraction = require('./lib/2-extract/executeStatisticsExtraction.js');
const extractVarListFromDataPageHtml = require('./lib/3-parse/extractVarListFromDataPageHtml.js');
const generateStateRecordFromVarList = require('./lib/3-parse/generateStateRecordFromVarList.js');
const executeStatusExtraction = require('./lib/2-extract/executeStatusExtraction.js');
const generatePreviousFetchTime = require('./lib/4-loop/generatePreviousFetchTime.js');
const getUpdateListFromStateRecordPair = require('./lib/5-output/getUpdateListFromStateRecordPair.js');
const outputAndApplyStateUpdateList = require('./lib/5-output/outputAndApplyStateUpdateList.js');
const augmentStateWithPreviousStateRecord = require('./lib/3-parse/augmentStateWithPreviousStateRecord.js');
const sleep = require('./lib/9-utils/sleep.js');
const startExtractionLoop = require('./lib/4-loop/startExtractionLoop.js');
const { isOnlyStatistics, isOnlyStatus, isOnlyStart } = require('./lib/0-primitive/args.js');
const logProcessSpawn = require('./lib/9-utils/logProcessSpawn.js');
const { getStartingSessionId } = require('./lib/2-auth/getStartingSessionId.js');
const { persistSessionIdUpdate } = require('./lib/2-auth/persistSessionIdUpdate.js');

(async function init() {
    console.log('Started init function');
    await logProcessSpawn();
    let sessionId = await getStartingSessionId();
    if (!sessionId) {
        sessionId = await login();
        console.log('Starting session id after login:', sessionId);
        await persistSessionIdUpdate(sessionId);
    }
    const previousFetchTime = generatePreviousFetchTime(new Date().getTime() + 50);
    const processes = {
        'status': {
            state: {},
            time: previousFetchTime,
            extractor: executeStatusExtraction,
        },
        'statistics': {
            state: {},
            time: previousFetchTime,
            extractor: executeStatisticsExtraction,
        },
    }
    if (isOnlyStatus) {
        console.log('Skipping statistics extraction at startup');
        delete processes['statistics'];
    } else if (isOnlyStatistics) {
        console.log('Skipping status extraction at startup');
        delete processes['status'];
    }
    for (const type in processes) {
        console.log('Starting first', type, 'extraction');
        /** @type {Awaited<ReturnType<executeStatusExtraction>>} */
        let response = await processes[type].extractor(sessionId);
        if (response.success == false && response.problems && (response.problems.hasRedirectToRoot || response.problems.hasUnauthenticatedError)) {
            console.log('Extraction failed with', response.problems.hasRedirectToRoot ? 'redirect to root' : 'unauthenticated', 'page');
            sessionId = await login(response.sessionId || sessionId);
            await persistSessionIdUpdate(sessionId);
            await sleep(250);
            console.log('Retrying', type, 'extraction after login with session id', /\D/g.test(sessionId) ? sessionId : parseInt(sessionId));
            response = await processes[type].extractor(sessionId);
        }
        if (response.success && response.sessionId && sessionId !== response.sessionId) {
            sessionId = response.sessionId;
        }
        console.log('Loaded', response.body.length, 'bytes in', response.duration, 'ms', response.success ? 'sucessfully' : `unsuccessfully (${JSON.stringify(response.problems)})`);
        const varList = extractVarListFromDataPageHtml(response);
        console.log('Extraction retrieved', varList.length, 'internal variables');
        const state = generateStateRecordFromVarList(varList);
        console.log('Number of variable entries on new state:', Object.keys(state).length);
        const newArgList = augmentStateWithPreviousStateRecord(processes[type].state, processes[type].time, state, response.time);
        if (newArgList.length) {
            console.log('Augmented state with', newArgList.length, 'variables');
        } else {
            console.log('Augment process did not add any variables to state');
        }
        const updateList = getUpdateListFromStateRecordPair(processes[type].state, processes[type].time, state, response.time);
        console.log('First extraction of', type, 'has', updateList.length, 'updates');
        outputAndApplyStateUpdateList(updateList, processes[type].state, true);
        processes[type].time  = response.time;
        await sleep(500);
    }
    if (isOnlyStart) {
        return;
    }
    return await startExtractionLoop(
        sessionId,
        processes.status.state,
        processes.status.time,
        processes.statistics.state,
        processes.statistics.time,
    );
})();

