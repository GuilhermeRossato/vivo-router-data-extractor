
const isOnlyStatistics = process.argv.some(a => ['--only-statistics', '--skip-status'].includes(a));
exports.isOnlyStatistics = isOnlyStatistics;

const isOnlyStatus = process.argv.some(a => ['--only-status', '--skip-statistics'].includes(a));
exports.isOnlyStatus = isOnlyStatus;

const isOnlyStart = process.argv.includes('--only-start');
exports.isOnlyStart = isOnlyStart;

const extractionPeriod = Math.max(2000, parseInt(
    (process.argv.find((_, i) => ['--period', '--interval', '--every'].includes(process.argv[i - 1] || '')) || '20_000').toString().replace(/\_/g, '')
));
exports.extractionPeriod = Math.ceil(extractionPeriod);

const sessionIdAliases = ['--session', '--session-id', '--id'];
const sessionArgIndex = process.argv.indexOf(process.argv.find((_a, i) => sessionIdAliases.includes(process.argv[i-1])));
exports.sessionArgIndex = sessionArgIndex === -1 ? undefined : sessionArgIndex;const isDebugMode = process.argv.includes('--debug');

exports.isDebugMode = isDebugMode;

const isSkipStart = process.argv.includes('--skip-start');
exports.isSkipStart = isSkipStart;

const writeAliasList = ['--write', '--output', '--stdout', '--out', '--target', '--save'];
exports.writeAliasList = writeAliasList;

const writeTargetList = process.argv.filter((_, i) => writeAliasList.includes(process.argv[i - 1] || ''));
const appendAliasList = ['--append', '--add', '--join', '--append-to'];
const appendTargetList = process.argv.filter((_, i) => appendAliasList.includes(process.argv[i - 1] || ''));
const targetFileList = [...writeTargetList, ...appendTargetList];
exports.targetFileList = targetFileList;

const removeDate = process.argv.includes('--no-date');
exports.removeDate = removeDate;

const hasTime = process.argv.includes('--time');
exports.hasTime = hasTime;

const hasType = process.argv.includes('--type');
exports.hasType = hasType;

const hasPrevious = process.argv.includes('--previous');
exports.hasPrevious = hasPrevious;

const isJson = !process.argv.includes('--text');
exports.isJson = isJson;

const isSlowMode = process.argv.some(a => ['--slow', '--slow-print', '--delay'].includes(a));
exports.isSlowMode = isSlowMode;

const filterIncludes = [];
const filterExcludes = [];

const excludeAliasList = ['--exclude', '--hide', '--remove', '--skip'];
const includeAliasList = ['--include', '--only', '--key', '--select'];
process.argv.forEach((a, i) => {
    let list;
    if (excludeAliasList.includes(process.argv[i - 1] || '')) {
        list = filterExcludes;
    } else if (includeAliasList.includes(process.argv[i - 1] || '')) {
        list = filterIncludes;
    }
    if (list) {
        list.push(...a.split(',').map(a => a.replace(/\'/g, '').replace(/\"/g, '').trim().toLowerCase()).filter(Boolean));
    }
});

exports.filterIncludes = filterIncludes;
exports.filterExcludes = filterExcludes;
