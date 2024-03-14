const extractVarListFromDataPageHtml = require('../3-parse/extractVarListFromDataPageHtml.js');
const createInstantStateFromVarList = require('../3-parse/generateStateRecordFromVarList.js');
const getDateTimeStringWithOffset = require('../9-utils/getDateTimeStringWithOffset.js');
const sleep = require('../9-utils/sleep.js');
const executeStatusExtraction = require('../2-extract/executeStatusExtraction.js');
const generatePreviousFetchTime = require('./generatePreviousFetchTime.js');
const executeStatisticsExtraction = require('../2-extract/executeStatisticsExtraction.js');
const getUpdateListFromStateRecordPair = require('../5-output/getUpdateListFromStateRecordPair.js');
const augmentStateFromPreviousStateRecord = require('../3-parse/augmentStateFromPreviousStateRecord.js');
const outputAndApplyStateUpdateList = require('../5-output/outputAndApplyStateUpdateList.js');

module.exports = async function startExtractionLoop(
    period,
    sessionId,
    statusState,
    statusStateTime,
    statisticsState,
    statisticsStateTime
) {
    const requestPeriod = Math.max(1000, period / 2);
    console.log('Extraction loop will execute every', period, 'ms (fetching every', requestPeriod, 'ms)');
    const startFetchDate = new Date(generatePreviousFetchTime(new Date().getTime() + 50, requestPeriod));
    let nextFetchDate = new Date(startFetchDate.getTime() + requestPeriod);
    for (let i = 0; i < 5 && nextFetchDate.getTime() < new Date().getTime(); i++) {
        nextFetchDate.setTime(nextFetchDate.getTime() + requestPeriod);
    }
    console.log('Begining at', getDateTimeStringWithOffset(nextFetchDate).substring(0, 23), 'to anchor from time', getDateTimeStringWithOffset(startFetchDate).substring(11, 23), `(${new Date().getTime() - startFetchDate.getTime()} ms ago)`);
    const isOnlyStatistics = process.argv.includes('--only-statistics');
    const isOnlyStatus = process.argv.includes('--only-status');
    let nextExecFunc = isOnlyStatistics ? executeStatisticsExtraction : executeStatusExtraction;

    while (true) {
        let waitTime = nextFetchDate.getTime() - new Date().getTime();
        console.log('Waiting for', waitTime, 'ms for next extraction time');
        await sleep(Math.max(0, waitTime - 50));
        waitTime = nextFetchDate.getTime() - new Date().getTime();
        if (waitTime >= 10) {
            await new Promise((resolve) => {
                const timer = setInterval(() => {
                    waitTime = nextFetchDate.getTime() - new Date().getTime();
                    if (waitTime < 10) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 1);
            });
        }
        waitTime = nextFetchDate.getTime() - new Date().getTime();
        console.log('Starting extraction at', getDateTimeStringWithOffset(), Math.abs(waitTime) > 1 ? `(drifted by ${waitTime} ms)` : '');
        const response = await nextExecFunc(sessionId);
        console.log('Fetch successfull');
        const varList = extractVarListFromDataPageHtml(response);
        console.log('Extraction successfull');
        let newState = createInstantStateFromVarList(varList);
        console.log('Parsed state successfull with', Object.keys(newState).length, 'variables');
        let updateList;
        if (nextExecFunc === executeStatusExtraction) {
            const newVarList = augmentStateFromPreviousStateRecord(statusState, statusStateTime, newState, response.time);
            console.log('Status state augmented with', newVarList.length === 0 ? 'no new keys and' : `${newVarList.length} keys`, 'it now has', Object.keys(newState).length, 'variables');
            updateList = getUpdateListFromStateRecordPair(
                statusState,
                statusStateTime,
                newState,
                response.time
            );
            statusStateTime = response.time;
        } else {
            const newVarList = augmentStateFromPreviousStateRecord(statisticsState, statisticsStateTime, newState, response.time);
            console.log('Statistics state augmented with', newVarList.length === 0 ? 'no new keys and' : `${newVarList.length} keys`, 'it now has', Object.keys(newState).length, 'variables');
            
            updateList = getUpdateListFromStateRecordPair(
                statisticsState,
                statisticsStateTime,
                newState,
                response.time
            );
            statisticsStateTime = response.time;
        }
        if (updateList.length) {
            console.log('There are', updateList.length, 'updates to parse');
            outputAndApplyStateUpdateList(updateList, newState, false);
        }
        if (new Date().getTime() > nextFetchDate.getTime() + requestPeriod) {
            console.log('Previous extraction took longer than the next extraction date and overlaped it');
        }
        nextExecFunc = isOnlyStatistics || (nextExecFunc === executeStatusExtraction && !isOnlyStatus) ? executeStatisticsExtraction : executeStatusExtraction;
        await sleep(25);
        const prevFetchDate = new Date(generatePreviousFetchTime(new Date(nextFetchDate.getTime()), requestPeriod));
        nextFetchDate = new Date(prevFetchDate.getTime() + requestPeriod);
        while (new Date().getTime() + 5 > nextFetchDate.getTime()) {
            nextFetchDate.setTime(nextFetchDate.getTime() + requestPeriod);
            console.log('Next extraction was updated to', getDateTimeStringWithOffset(nextFetchDate));
        }
    }
}
