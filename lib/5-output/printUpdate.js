module.exports = function printUpdate({key, created, updated, removed, from, value}) {
    process.stdout.write(`${key}=${JSON.stringify(value)}\n`);
}