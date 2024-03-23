const { isOnlyStatus, separateHosts } = require("../0-primitive/args.js");
const getDateTimeStringWithOffset = require("../9-utils/getDateTimeStringWithOffset.js");
const { getIntervalStringFromSeconds } = require("../9-utils/intervalStringTranslation.js");

const cachedHostRecord = {};

/**
 * Iterate over a state augmenting the new state by modifying it and adding new variables to it.
 * 
 * @returns 
 */
module.exports = function augmentStateWithPreviousStateRecord(oldState, oldTime, newState, newTime) {
    const elapsedSec = (newTime - oldTime) / 1000;
    const updatedVarNameList = [];
    const interfaceSpeedList = {recv: [], sent: []};
    for (const key in newState) {
        if (key === 'uptime') {
            updatedVarNameList.push('uptimeDate');
            newState['uptimeInterval'] = getIntervalStringFromSeconds(newState[key])
        }
        if (typeof newState[key] !== 'object') {
            continue;
        }
        if (key.includes('IntfSts["')) {
            const interface = key.substring(key.indexOf('[') + 2, key.lastIndexOf(']')-1);
            for (const direction of ['recv', 'sent']) {
                const varName = `interface${direction[0].toUpperCase()}${direction.substring(1)}["${interface}"]`;
                if (newState[varName]) {
                    throw new Error(`State already has "${varName}" variable: ${JSON.stringify(newState[varName])}`);
                }
                const [_newFrameRaw, newBytesRaw] = newState[key][direction];
                const [_oldFramesRaw, oldBytesRaw] = oldState[key] ? oldState[key][direction] : [undefined, undefined];

                const totalKb = Number(BigInt(newBytesRaw) / BigInt(256)) / 4;
                const totalStr = `${totalKb.toFixed(0)} KB`;

                const oldTotalKb = oldBytesRaw ? (Number(BigInt(oldBytesRaw) / BigInt(256)) / 4) : undefined;
                const usageKb = oldTotalKb ? totalKb - oldTotalKb : undefined;
                const usageStr = usageKb ? `${usageKb.toFixed(1)} KB` : undefined;

                const speedKbps = usageKb ? (usageKb / elapsedSec) : undefined;
                const speedKbpsStr = speedKbps ? `${speedKbps.toFixed(1)} KBPS` : undefined;

                updatedVarNameList.push(varName);
                newState[varName] = {total: totalStr}
                if (usageStr && usageStr !== '0.0 KB') {
                    newState[varName].usage = usageStr;
                }
                if (speedKbpsStr && speedKbpsStr !== '0.0 KBPS') {
                    newState[varName].speed = speedKbpsStr;
                }
                if (newState[varName].usage || newState[varName].speed) {
                    newState[varName].seconds = parseFloat(elapsedSec.toFixed(2));
                }

                interfaceSpeedList[direction].push([totalKb, usageKb || 0]);
            }
        }
    }
    for (const direction of ['recv', 'sent']) {
        if (!interfaceSpeedList[direction].length) {
            continue;
        }
        const totalKb = interfaceSpeedList[direction].map(a => a[0]).reduce((a, b) => b + a, 0);
        const usageKb = interfaceSpeedList[direction].map(a => a[1]).reduce((a, b) => b + a, 0);
        if (!isNaN(totalKb) && (totalKb || usageKb)) {
            const varName = `router${direction[0].toUpperCase()}${direction.substring(1)}`;
            const totalStr = `${totalKb.toFixed(0)} KB`;
            const usageStr = usageKb === undefined ? undefined : `${usageKb.toFixed(1)} KB`;
            const speedKbps = usageKb === undefined || elapsedSec === 0 ? undefined : usageKb / elapsedSec;
            const speedKbpsStr = speedKbps === undefined ? undefined : `${speedKbps.toFixed(1)} KBPS`;
            if (newState[varName]) {
                throw new Error(`State already has "${varName}" variable: ${JSON.stringify(newState[varName])}`);
            }
            updatedVarNameList.push(varName);
            newState[varName] = {total: totalStr};
            if (usageStr && usageStr !== '0.0 KB') {
                newState[varName].usage = usageStr;
            }
            if (speedKbpsStr && speedKbpsStr !== '0.0 KBPS') {
                newState[varName].speed = speedKbpsStr;
            }
            if (newState[varName].usage || newState[varName].speed) {
                newState[varName].seconds = parseFloat(elapsedSec.toFixed(2));
            }
        }
    }
    if (!separateHosts) {
        augmentStateWithHostRecord(oldState, oldTime, newState, newTime, updatedVarNameList);
    }
    return updatedVarNameList;
}

function augmentStateWithHostRecord(oldState, oldTime, newState, newTime, augmentedKeyList) {
    let latestNewHost = oldState['latestNewHost'];
    if (latestNewHost) {
        newState['latestNewHost'] = oldState['latestNewHost'];
        augmentedKeyList.push('latestNewHost');
    }
    const applyStateKey = isOnlyStatus || Object.keys(newState).some(e => e.startsWith('orgLanHostList'));
    
    for (const key in newState) {
        if (!key.includes(':') || !key.includes('[') || !newState[key]) {
            continue;
        }
        const name = key.substring(0, key.indexOf('['))
        const mac = key.substring(key.indexOf('[')).split(':').map(a => a.replace(/\W/g, '').trim()).filter(a => a.length === 2).join(':');
        if (mac.length !== 'FF:FF:FF:FF:FF:FF'.length) {
            continue;
        }
        if (applyStateKey) {
            augmentedKeyList.push(`host["${mac}"]`);
            newState[`host["${mac}"]`] = cachedHostRecord[mac];
        }
        if (!cachedHostRecord[mac]) {
            cachedHostRecord[mac] = {
                created: getDateTimeStringWithOffset(new Date(newTime)).substring(0, 19),
            }
            latestNewHost = mac;
        }
        if (typeof newState[key] === 'object') {
            for (const prop in newState[key]) {
                if (['extra', 'src'].includes(prop)) {
                    continue;
                }
                if (['seconds', 'interval'].includes(prop) && !['wlan2dot4GAssociatedList', 'wlan2dot4GAssociatedList'].includes(prop)) {
                    continue;
                }
                const v = newState[key][prop];
                if (typeof v !== 'string' && typeof v !== 'number') {
                    continue;
                }
                if (!cachedHostRecord[mac][prop]) {
                    cachedHostRecord[mac][prop] = v;
                    continue;
                }
                if (cachedHostRecord[mac][prop] instanceof Array && !cachedHostRecord[mac][prop].includes(v)) {
                    cachedHostRecord[mac][prop].push(v);
                    continue;
                }
                if (typeof cachedHostRecord[mac][prop] === 'string' && cachedHostRecord[mac][prop] === v) {
                    continue;
                }
                if (typeof cachedHostRecord[mac][prop] === 'string' && cachedHostRecord[mac][prop] !== v) {
                    cachedHostRecord[mac][prop] = [cachedHostRecord[mac][prop]];
                    continue;
                }
                throw new Error(`Unhandled branch ${JSON.stringify([prop, key, newState[key], cachedHostRecord[mac]])}`);
            }
        } else {
            cachedHostRecord[mac][name] = newState[key];
        }
        delete newState[key];
        augmentedKeyList.push(key);
    }
}

function getNumberWithSignificance(v) {
    if (v === 0 || v === Math.floor(v)) {
        return v.toString();
    }
    if (Math.abs(v) > 1) {
        return v.toFixed(Math.abs(v) > 10 ? 0 : 1).replace('.0', '');
    }
    if (Math.abs(v) < 0.0001) {
        return '0';
    }
    if (Math.abs(v) < 0.001) {
        return v.toFixed(4);
    }
    if (Math.abs(v) < 0.01) {
        return v.toFixed(3);
    }
    if (Math.abs(v) < 0.1) {
        return v.toFixed(2);
    }
    return v.toFixed(1);
}

