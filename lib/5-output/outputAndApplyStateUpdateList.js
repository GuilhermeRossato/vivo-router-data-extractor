const printUpdate = require("./printUpdate.js")

module.exports = function outputAndApplyStateUpdateList(updateList, state, isFirstTime) {
    for (const update of updateList) {
        // console.log(`Processing update: ${JSON.stringify({...update, from: undefined, value: undefined})}`);
        if (!process.argv.includes('--skip-start') || !isFirstTime) {
            process.stdout.write(' ');
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