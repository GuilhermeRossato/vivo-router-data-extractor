
/**
 * 
 * @param {Record<string, any>} oldState 
 * @param {number | null} oldTime 
 * @param {Record<string, any>} newState 
 * @param {number} newTime 
 * @returns 
 */
module.exports = function getUpdateListFromStateRecordPair(oldState, oldTime, newState, newTime) {
    console.log('Processing old state with', Object.keys(oldState).length, 'keys and new state with', Object.keys(newState).length, 'keys');
    if (!newState || typeof newState !== 'object') {
        throw new Error('Invalid new status');
    }
    const elapsedSec = (newTime - oldTime) / 1000;
    if (elapsedSec < 0 || elapsedSec > 1_000 || isNaN(elapsedSec)) {
        throw new Error(`Something is wrong with with the state dates: ${JSON.stringify({newTime, oldTime, elapsedSec})}`);
    }
    
    const ignoreVarList = ['interfaceRecv', 'interfaceSent', 'routerRecv', 'routerSent'];
    const missingKeys = Object.keys(oldState).filter(
        key => oldState[key] !== undefined && oldState[key] !== null && ignoreVarList.every(a => !key.startsWith(a))
    ).filter(
        key => newState[key] === undefined || newState[key] === null
    );
    const updates = [];
    for (const key of missingKeys) {
        updates.push({key, removed: newTime, previous: oldState[key]});
    }
    for (const key in newState) {
        if (missingKeys.includes(key)) {
            continue;
        }
        const newStateHasKey = newState[key] !== undefined && newState[key] !== null;
        if (newStateHasKey && typeof oldState[key] !== typeof newState[key]) {
            updates.push({key, created: newTime, previous: undefined, value: newState[key], reason: 36});
            continue;
        }
        if (typeof newState[key] !== typeof oldState[key]) {
            updates.push({key, updated: newTime, previous: oldState[key], value: newState[key], reason: 40});
            continue;
        }
        if (typeof newState[key] === 'string' || typeof newState[key] === 'number') {
            if (typeof oldState[key] !== typeof newState[key]) {
                updates.push({key, created: newTime, value: newState[key]});
            } else if (newState[key] !== oldState[key]) {
                updates.push({key, updated: newTime, previous: oldState[key], value: newState[key], reason: 47});
            }
            continue;
        }
        if (typeof oldState[key] !== 'object' || typeof newState[key] !== 'object') {
            throw new Error(`Unexpected state type: ${typeof oldState[key]} when new value is ${JSON.stringify(newState[key])}`);
        }
        if (typeof newState[key] === "object" && typeof oldState[key] === "object" && Object.keys(oldState[key]).length !== Object.keys(newState[key]).length) {
            updates.push({key, updated: newTime, previous: oldState[key], value: newState[key]});
            continue;
        }
        const newValue = typeof newState[key] === 'object' ? {
            ...newState[key],
            seconds: newState[key].seconds !== undefined,
            interval: newState[key].interval !== undefined,
        } : newState[key];

        const oldValue = typeof oldState[key] === 'object' ? {
            ...oldState[key],
            seconds: oldState[key].seconds !== undefined,
            interval: oldState[key].interval !== undefined
        } : oldState[key];

        // Create update for different variables
        if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
            updates.push({key, updated: newTime, previous: oldState[key], value: newState[key]});
            continue;
        }
    }
    return updates;
}