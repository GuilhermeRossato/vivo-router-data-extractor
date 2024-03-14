
module.exports = function augmentStateFromPreviousStateRecord(oldState, oldTime, newState, newTime) {
    const elapsedSec = (newTime - oldTime) / 1000;
    const newVarList = [];
    const interfaceSpeedList = {recv: [], sent: []};
    for (const key in newState) {
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

                newVarList.push(varName);
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
            newVarList.push(varName);
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
    return newVarList;
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

