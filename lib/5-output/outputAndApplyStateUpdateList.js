const printUpdate = require("./printUpdate.js")

module.exports = function outputAndApplyStateUpdateList(updateList, state, isFirstTime) {
    for (const update of updateList) {
        if (typeof update.key !== 'string') {
            throw new Error(`Update object is invalid: ${JSON.stringify(update)}`);
        }
        
        if (!update.key.includes('IntfSts[') && (!process.argv.includes('--skip-start') || !isFirstTime)) {
            printUpdate(update);
        }

        if (update.removed) {
            if (state[update.key] !== undefined) {
                delete state[update.key];
            }
            continue;
        }

        if (update.updated || update.created) {
            state[update.key] = update.value;
            continue;
        }

        throw new Error(`Invalid update: ${JSON.stringify(update)}`);
    }
}