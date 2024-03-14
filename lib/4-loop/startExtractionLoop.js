const extractVarListFromDataPageHtml = require('../3-parse/extractVarListFromDataPageHtml.js');
const createInstantStateFromVarList = require('../3-parse/generateStateRecordFromVarList.js');
const getDateTimeStringWithOffset = require('../9-utils/getDateTimeStringWithOffset.js');
const sleep = require('../9-utils/sleep.js');
const executeStatusExtraction = require('../2-extract/executeStatusExtraction.js');
const generatePreviousFetchTime = require('./generatePreviousFetchTime.js');
const executeStatisticsExtraction = require('../2-extract/executeStatisticsExtraction.js');
const getUpdateListFromStateRecordPair = require('../5-output/getUpdateListFromStateRecordPair.js');
const augmentStateWithPreviousStateRecord = require('../3-parse/augmentStateWithPreviousStateRecord.js');
const outputAndApplyStateUpdateList = require('../5-output/outputAndApplyStateUpdateList.js');
const { isOnlyStatistics, isOnlyStatus, extractionPeriod } = require('../0-primitive/args.js');

module.exports = async function startExtractionLoop(
    sessionId,
    statusState,
    statusStateTime,
    statisticsState,
    statisticsStateTime
) {
    const requestPeriod = Math.floor(Math.max(1000, extractionPeriod / 2));
    console.log('Extraction loop starting to retrieve data every', requestPeriod, 'ms (extraction period is', extractionPeriod, 'ms)');
    const startFetchDate = new Date(generatePreviousFetchTime(new Date().getTime() + 50, requestPeriod));
    let nextFetchDate = new Date(startFetchDate.getTime() + requestPeriod);
    if (nextFetchDate.getTime() < new Date().getTime()) {
        throw new Error('Assertation failed: generatePreviousFetchTime failed');
    }
    console.log('Start date is', getDateTimeStringWithOffset(nextFetchDate).substring(0, 23), 'to anchor from', getDateTimeStringWithOffset(startFetchDate).substring(11, 23), `(${new Date().getTime() - startFetchDate.getTime()} ms ago)`);
    let nextExecFunc = isOnlyStatistics ? executeStatisticsExtraction : executeStatusExtraction;

    while (true) {
        let waitTime;
        for (let i = 0; i < 10; i++) {
            waitTime = nextFetchDate.getTime() - new Date().getTime();
            if (waitTime <= 0) {
                break;
            }
            if (i === 0) {
                console.log('Waiting', waitTime, 'ms until next extraction time');
            }
            await sleep(Math.max(2, waitTime));
        }
        if (waitTime > 0) {
            continue;
        }
        waitTime = nextFetchDate.getTime() - new Date().getTime();
        console.log('Starting extraction drifted by', waitTime, 'ms');
        const response = await nextExecFunc(sessionId);
        console.log('Fetch', response.success ? 'successfull' : 'not successful', 'after', response.duration, 'ms', response.success ? '' : response.problems);
        const varList = extractVarListFromDataPageHtml(response);
        console.log('Extraction successfull of', varList.length, 'variables');
        const newState = createInstantStateFromVarList(varList);
        console.log('Var list generation successfull with', Object.keys(newState).length, 'variables');
        const oldState = nextExecFunc === executeStatusExtraction ? statusState : statisticsState;
        const oldTime = nextExecFunc === executeStatusExtraction ? statusStateTime : statisticsStateTime;
        const newVarList = augmentStateWithPreviousStateRecord(oldState, oldTime, newState, response.time);
        console.log('State augmented with', newVarList.length === 0 ? 'no new keys and' : `${newVarList.length} keys`, 'it has', Object.keys(newState).length, 'variables');
        const updateList = getUpdateListFromStateRecordPair(oldState, oldTime, newState, response.time);
        if (updateList.length) {
            console.log('There are', updateList.length, 'updates to apply');
            outputAndApplyStateUpdateList(updateList, oldState, false);
        } else {
            console.log('There are no updates to apply to state');
        }
        if (nextExecFunc === executeStatusExtraction) {
            statusStateTime = response.time;
        } else {
            statisticsStateTime = response.time;
        }
        const finishTime = new Date().getTime();
        if (finishTime > nextFetchDate.getTime() + requestPeriod) {
            console.log('Previous extraction executed longer than request period by', finishTime - (nextFetchDate.getTime() + requestPeriod), 'ms and delayed next execution');
        }
        nextExecFunc = isOnlyStatistics || (nextExecFunc === executeStatusExtraction && !isOnlyStatus) ? executeStatisticsExtraction : executeStatusExtraction;
        const prevFetchDate = new Date(generatePreviousFetchTime(finishTime + 50, requestPeriod));
        nextFetchDate = new Date(prevFetchDate.getTime() + requestPeriod);
        if (nextFetchDate.getTime() < new Date().getTime()) {
            console.log('Assertation failed: generatePreviousFetchTime failed');
            nextFetchDate.setTime(nextFetchDate.getTime() + requestPeriod);
        }
        if (nextFetchDate.getTime() < new Date().getTime()) {
            throw new Error('Assertation failed: generatePreviousFetchTime failed');
        }
    }
}
