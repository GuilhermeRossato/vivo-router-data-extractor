const fs = require('fs');
const path = require('path');
const asyncTryCatchNull = require('../9-utils/asyncTryCatchNull.js');
const getDateTimeStringWithOffset = require('../9-utils/getDateTimeStringWithOffset.js');
const sleep = require('../9-utils/sleep.js');
const { targetFileList, isJson, writeAliasList } = require('../0-primitive/args.js');

let initialized = false;

(async function initFileOutputState() {
    if (targetFileList.length <= 0) {
        initialized = true;
        return;
    }
    console.log('Program output is configured to be written to', targetFileList.length === 1 ? `"${targetFileList[0]}"` : 'multiple files');
    for (let i = 0; i < targetFileList.length; i++) {
        let filePath = targetFileList[i];
        const parentFolderPath = path.dirname(filePath);
        const stat = await asyncTryCatchNull(fs.promises.stat(parentFolderPath));
        if (stat === null || stat instanceof Error || (stat && !stat.isDirectory())) {
            throw new Error(`Could not find the parent folder at ${parentFolderPath} to write specified file at ${filePath}`);
        }
        // Create file name if target is a folder
        let fileStat = await asyncTryCatchNull(fs.promises.stat(filePath));
        if (!(fileStat instanceof Error) && fileStat && fileStat.isDirectory()) {
            const fileName = getDateTimeStringWithOffset().replace(/\:/g, '-').substring(0, 19) + (isJson ? '.jsonl' : '.txt');
            filePath = path.resolve(filePath, fileName);
            targetFileList[i] = filePath;
        }
        try {
            if (writeAliasList.includes(filePath)) {
                // Clear target file
                fs.promises.writeFile(filePath, '', 'utf-8');
            } else {
                // Test target file
                fs.promises.appendFile(filePath, '', 'utf-8');
            }
        } catch (err) {
            console.log(`Failed to write on target file at ${filePath}`);
            throw err;
        }
    }
    initialized = true;
})().catch((err) => {
    if (targetFileList.length === 0) {
        return;
    }
    console.log('Failed to initialize output to file:');
    console.log(err);
    process.exit(1);
});

module.exports = async function outputToFile(text) {
    if (targetFileList.length === 0) {
        return;
    }
    if (!initialized) {
        await sleep(500);
    }
    if (!initialized) {
        throw new Error('Could not initialize output to file arguments');
    }
    for (const filePath of targetFileList) {
        fs.promises.appendFile(filePath, text, 'utf-8').catch(err => {
            initialized = false;
            console.log('Failed to write to output file at', filePath);
            console.log(err);
            setTimeout(() => {
                process.exit(1);
            }, 10);
        });
    }
}