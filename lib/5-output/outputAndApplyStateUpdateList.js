const { isSkipStart } = require("../0-primitive/args.js");
const printUpdate = require("./printUpdate.js")

module.exports = function outputAndApplyStateUpdateList(updateList, state, isFirstTime) {
    for (const update of updateList) {
        if (!update.key.includes('IntfSts[') && (!isSkipStart || !isFirstTime)) {
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