
const isOnlyStatistics = process.argv.some(a => ['--only-statistics', '--skip-status'].includes(a));
exports.isOnlyStatistics = isOnlyStatistics;

const isOnlyStatus = process.argv.some(a => ['--only-status', '--skip-statistics'].includes(a));
exports.isOnlyStatus = isOnlyStatus;

const extractionPeriod = Math.max(2000, parseInt(
    (process.argv.find((_, i) => ['--period', '--interval', '--every'].includes(process.argv[i - 1] || '')) || '20_000').toString().replace(/\_/g, '')
));
exports.extractionPeriod = extractionPeriod;

