const fs = require('fs');
const getDateTimeStringWithOffset = require('./getDateTimeStringWithOffset.js');
const asyncTryCatchNull = require('./asyncTryCatchNull.js');
const path = require('path');
const loadEnv = require('../0-primitive/loadEnv.js');

module.exports = async function logProcessSpawn() {
    const env = await loadEnv();
    const historyFilePathRaw = env.ROUTER_HISTORY_FILE_PATH;
    if (!historyFilePathRaw) {
        return;
    }
    const historyFilePath = historyFilePathRaw.replace(/\"/g, "").replace(/\'/g, "").trim();
    const historyFileName = path.basename(historyFilePath);
    const historyFolderPath = path.dirname(historyFilePath);
    let files = await asyncTryCatchNull(fs.promises.readdir(historyFolderPath));
    if (files === null || files === undefined || files instanceof Error) {
        files = [];
    }
    if (!(files instanceof Array)) {
        files = [];
    }
    const csvExists = files.includes(historyFileName);
    if (!csvExists) {
        await fs.promises.writeFile(historyFilePath, 'date,pid,ppid,cwd,args\n', 'utf-8');
    }
    const line = `${getDateTimeStringWithOffset()},${process.pid},${process.ppid},${process.cwd()},${process.argv.join(' ').split(',').join('_').split('"').join("''")}`;
    await fs.promises.appendFile(historyFilePath, `${line}\n`, 'utf-8');
}