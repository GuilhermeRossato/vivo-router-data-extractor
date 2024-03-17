
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
const { isOnlyStatistics, isOnlyStatus, sessionArgIndex, isOnlyStart } = require('./lib/0-primitive/args.js');

(async function init() {
    console.log('Started init function');
    let sessionId = await login(sessionArgIndex ? process.argv[sessionArgIndex] : undefined);
    console.log('Login sucessfull with session:', sessionId);
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
    if (isOnlyStatistics) {
        console.log('Skipping statistics extraction at startup');
        delete processes['statistics'];
    } else if (isOnlyStatus) {
        console.log('Skipping status extraction at startup');
        delete processes['status'];
    }
    for (const type in processes) {
        console.log('Starting', type, 'extraction');
        const response = await processes[type].extractor(sessionId);
        sessionId = response.sessionId;
        console.log('Loaded', response.body.length, 'bytes in', response.duration, 'ms');
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
