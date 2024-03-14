const fs = require('fs');
const path = require('path');
const loadEnv = require("../0-primitive/loadEnv.js");
const getDateTimeStringWithOffset = require("../9-utils/getDateTimeStringWithOffset.js");
const sleep = require("../9-utils/sleep.js");
const outputToFile = require('./outputToFile.js');

const removeDate = process.argv.includes('--no-date');
const hasTime = process.argv.includes('--time');
const hasType = process.argv.includes('--type');
const hasPrevious = process.argv.includes('--previous');
const isJson = process.argv.includes('--json');
const excludeAliasList = ['--exclude', '--hide', '--remove', '--skip'];
const includeAliasList = ['--include', '--only', '--key', '--select'];
const hasFilter = process.argv.some(a => [...excludeAliasList, ...includeAliasList].includes(a));

const slow = {
    active: process.argv.includes('--slow') || process.argv.includes('--delay'),
    enterQueue: [],
    printQueue: [],
    timeQueue: [],
    periodMs: NaN,
    messageDelay: NaN,
    targetDelay: NaN,
    last: null,
    looping: false,
}

function emitPrintFromQueue() {
    const t = slow.printQueue.shift();
    if (!t) {
        return;
    }
    slow.last = new Date().getTime();
    process.stdout.write(`${t.text}\n`);
    outputToFile(t.text + (isJson ? ',\n' : '\n'));
}

function getTargetDelay(period, currentSize) {
    const highest = 20;
    if (currentSize >= 80) {
        return highest;
    }
    const mid = Math.max(6000, period) / 33;
    if (currentSize >= 20) {
        const t = (currentSize - 20) / (80 - 20);
        return t * highest + (1 - t) * mid;
    }
    const base = Math.max(6000, period) / 20;
    if (currentSize > 5) {
        const t = Math.min(1, (currentSize - 5) / (20 - 5));
        return t * mid + (1 - t) * base;
    }
    const t = 0.2 + 0.8 * currentSize / 5;
    return t * base + (1 - t) * (period / 4);
}


async function executeSlowPrintLoop() {
    slow.timer = setInterval(() => {
        const now = new Date().getTime();
        const timeSinceQueueStart = now - (slow.timeQueue[0] || now);
        const estimationWeight = (slow.timeQueue.length <= 5 ? 0 : Math.max(0, Math.min(1, timeSinceQueueStart / (slow.periodMs * 4)))) * 0.5;
        const estimatedTargetDelay = timeSinceQueueStart / slow.timeQueue.length;
        const calculatedTargetDelay = getTargetDelay(slow.periodMs, slow.printQueue.length);
        const targetTargetDelay = (1 - estimationWeight) * calculatedTargetDelay + estimationWeight * estimatedTargetDelay;
        const newTargetDelay = slow.targetDelay * 0.98 + targetTargetDelay * 0.02;
        const newMessageDelay = slow.messageDelay * 0.96 + slow.targetDelay * 0.04;
        slow.messageDelay = newMessageDelay;
        slow.targetDelay = newTargetDelay;
    }, 250);
    while (slow.printQueue.length !== 0) {
        const now = new Date().getTime();
        let timeSinceLast = slow.last ? now - slow.last : slow.messageDelay * 2;
        await sleep(Math.max(10, slow.messageDelay - timeSinceLast));
        timeSinceLast = slow.last ? now - slow.last : slow.messageDelay * 2;
        if (slow.messageDelay > timeSinceLast) {
            continue;
        }
        emitPrintFromQueue();
        await sleep(slow.printQueue.length === 0 && slow.enterQueue.length > 0 ? 150 : 30);
    }
    clearInterval(slow.timer);
    slow.timer = null;
}

function handleEnterQueue() {
    while (slow.enterQueue.length) {
        slow.printQueue.push(slow.enterQueue.shift());
    }
    if (slow.printQueue.length === 0) {
        return;
    }
    if (isNaN(slow.messageDelay) || isNaN(slow.targetDelay)) {
        slow.targetDelay = slow.messageDelay = getTargetDelay(slow.periodMs, slow.printQueue.length * 1.25);
    }
    if (!slow.looping) {
        slow.looping = true;
        executeSlowPrintLoop().then(() => {
            slow.looping = false;
        }, (err) => {
            if (slow.timer) {
                clearInterval(slow.timer);
                slow.timer = null;
            }
            console.log(err);
            slow.active = false;
            slow.looping = false;
        })
    }
}

async function schedulePrint(text) {
    if (isNaN(slow.periodMs)) {
        const config = await loadEnv();
        const period = parseInt(config.ROUTER_EXTRACT_PERIOD_MS.toString().replace(/\_/g, ''));
        slow.periodMs = period;
    }
    const now = new Date().getTime();
    slow.timeQueue.push(now);
    if (now - slow.timeQueue[0] > slow.periodMs * 5) {
        slow.timeQueue.shift();
    }
    slow.enterQueue.push({time: now, text});
    if (!slow.timer) {
        slow.timer = setTimeout(() => {
            handleEnterQueue();
            slow.timer = null;
        }, 150);
    }
}

let filterIncludes = null;
let filterExcludes = null;
const filterRecord = {};

(function initializePrintUpdate() {
    if (!hasFilter) {
        return;
    }
    filterIncludes = [];
    filterExcludes = [];
    process.argv.forEach((a, i) => {
        let list;
        if (excludeAliasList.includes(process.argv[i-1]||'')) {
            list = filterExcludes;
        } else if (includeAliasList.includes(process.argv[i-1]||'')) {
            list = filterIncludes;
        }
        if (list) {
            list.push(...a.split(',').map(a => a.replace(/\'/g, '').replace(/\"/g, '').trim().toLowerCase()).filter(Boolean));
        }
    });
    console.log('Initialized variable filtering with', filterIncludes.length, 'inclusions and', filterExcludes.length, 'exclusions');
})();

module.exports = function printUpdate({key, created, updated, removed, previous, value}) {
    if (filterRecord[key]) {
        return;
    }
    if (filterIncludes || filterExcludes) {
        const simple = key.toLowerCase().replace(/\'/g, '').replace(/\"/g, '');
        if (filterIncludes?.length && filterIncludes.every(f => !simple.startsWith(f))) {
            console.log('Filtering', key, 'variable because it does not match any inclusion argument');
            filterRecord[key] = true;
            return;
        }
        if (filterExcludes?.length && filterExcludes.some(f => simple.startsWith(f))) {
            console.log('Filtering', key, 'variable because matches a exclusion argument');
            filterRecord[key] = true;
            return;
        }
    }
    /** @type {any} */
    const parts = isJson ? {} : [];
    const time = created || updated || removed;
    const date = getDateTimeStringWithOffset(time).substring(0, 23);
    if (isJson) {
        !removeDate && (parts.date = date);
        hasTime && (parts.time = time);
        hasType && (parts.type = created ? 'created' : updated ? 'updated' : removed ? 'removed' : 'unknown');
        parts.key = key;
        hasPrevious && (parts.previous = previous);
        parts.value = value;
    } else {
        !removeDate && (parts.push(`${date} `));
        hasTime && (parts.push(`${time} `));
        hasType && (parts.push(`${created ? 'created' : updated ? 'updated' : removed ? 'removed' : 'unknown'} `));
        hasPrevious && previous && (parts.push(`${previous} `));
        parts.push(`${key}=${JSON.stringify(value)}`);
    }
    const text = `${isJson ? JSON.stringify(parts) : parts.join('')}`;
    if (!slow.active) {
        process.stdout.write(`${text}\n`);
        outputToFile(text + (isJson ? ',\n' : '\n'));
        return;
    }
    schedulePrint(text);
}