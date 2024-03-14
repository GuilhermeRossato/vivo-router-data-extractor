const loadConfig = require('./lib/0-primitive/loadEnv.js');
const login = require('./lib/2-auth/login.js');
const executeStatisticsExtraction = require('./lib/2-extract/executeStatisticsExtraction.js');
const extractVarListFromDataPageHtml = require('./lib/3-parse/extractVarListFromDataPageHtml.js');
const generateStateRecordFromVarList = require('./lib/3-parse/generateStateRecordFromVarList.js');
const executeStatusExtraction = require('./lib/2-extract/executeStatusExtraction.js');
const startExtractionLoop = require('./lib/4-loop/startExtractionLoop.js');
const generatePreviousFetchTime = require('./lib/4-loop/generatePreviousFetchTime.js');
const getUpdateListFromStateRecordPair = require('./lib/5-output/getUpdateListFromStateRecordPair.js');
const outputAndApplyStateUpdateList = require('./lib/5-output/outputAndApplyStateUpdateList.js');
const augmentStateFromPreviousStateRecord = require('./lib/3-parse/augmentStateFromPreviousStateRecord.js');
const sleep = require('./lib/9-utils/sleep.js');

require('./lib/9-utils/attachLogToStderr.js');

const isOnlyStatistics = process.argv.includes('--only-statistics');
const isOnlyStatus = process.argv.includes('--only-status');

(async function init() {
    console.log('Started init function');
    const config = await loadConfig();
    const period = parseInt(config.ROUTER_EXTRACT_PERIOD_MS.toString().replace(/\_/g, ''));
    console.log('Loaded config object and extraction period is', period, 'ms');
    const sessionArgIndex = process.argv.indexOf(process.argv.find((a, i) => process.argv[i-1] === '--session' || process.argv[i-1] === '--id'))
    let sessionId = await login(sessionArgIndex !== -1 ? process.argv[sessionArgIndex] : undefined);
    console.log('Login sucessfull with session:', sessionId);

    let statusState = {};
    let statusStateTime = new Date().getTime();
    if (isOnlyStatistics) {
        console.log('Skipping statistics extraction at startup');
    } else {
        const firstStatus = await executeStatusExtraction(sessionId);
        statusStateTime = firstStatus.time;
        sessionId = firstStatus.sessionId;
        console.log('First status extraction loaded', firstStatus.body.length, 'bytes in', firstStatus.duration, 'ms');
        const statusVarList = extractVarListFromDataPageHtml(firstStatus);
        console.log('Status extraction retrieved', statusVarList.length, 'internal variables');
        statusState = generateStateRecordFromVarList(statusVarList);
        console.log('Parsed status state has', Object.keys(statusState).length, 'variable entries');
        const newArgList = augmentStateFromPreviousStateRecord({}, null, statusState, statusStateTime);
        console.log('Augmentd status state with', newArgList.length, 'to', Object.keys(statusState).length, 'variables');
        const updateList = getUpdateListFromStateRecordPair({}, generatePreviousFetchTime(statusStateTime), statusState, statusStateTime);
        console.log('Status inititialization has', updateList.length, 'updates');
        outputAndApplyStateUpdateList(updateList, statusState, true);
    }

    let statisticsState = {};
    let statisticsStateTime = new Date().getTime();;
    if (isOnlyStatus) {
        console.log('Skipping statistic extraction at startup');
    } else {
        const firstStatistics = await executeStatisticsExtraction(sessionId);
        statisticsStateTime = firstStatistics.time;
        sessionId = firstStatistics.sessionId;
        console.log('First statistics extraction loaded', firstStatistics.body.length, 'bytes in', firstStatistics.duration, 'ms');
        const statisticsVarList = extractVarListFromDataPageHtml(firstStatistics);
        console.log('Statistics extraction retrieved', statisticsVarList.length, 'internal variables');
        statisticsState = generateStateRecordFromVarList(statisticsVarList);
        console.log('Parsed statistics state has', Object.keys(statisticsState).length, 'variable entries');
        const newArgList = augmentStateFromPreviousStateRecord({}, null, statisticsState, statisticsStateTime);
        console.log('Augmentd statistics state with', newArgList.length, 'to', Object.keys(statisticsState).length, 'variables');
        const updateList = getUpdateListFromStateRecordPair({}, generatePreviousFetchTime(statisticsStateTime), statisticsState, statisticsStateTime);
        console.log('Status inititialization has', updateList.length, 'updates');
        outputAndApplyStateUpdateList(updateList, statisticsState, true);
    }

    await sleep(500);

    return await startExtractionLoop(
        period,
        sessionId,
        statusState,
        statusStateTime,
        statisticsState,
        statisticsStateTime
    );
})();
