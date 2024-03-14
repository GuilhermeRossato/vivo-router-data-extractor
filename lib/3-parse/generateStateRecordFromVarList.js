const getDateTimeStringWithOffset = require("../9-utils/getDateTimeStringWithOffset.js");
const { getIntervalStringFromSeconds, getSecondsFromIntervalString } = require("../9-utils/intervalStringTranslation.js");

function parseIntfSts(varName, state, content) {
    const entries = content.replace(/\'/g, "").split("/").map(e => e.split(","));
    for (const list of entries) {
        if (list[1] === '0' && list[2] === '0' && list[3] === '0') {
            continue;
        }
        const name = list[0];
        state[`${varName}["${name}"]`] = { recv: list.slice(1, 5), sent: list.slice(5, 9) };
    }
}

function parseWlanAssociatedList(varName, state, content) {
    const entries = content.replace(/\'/g, "").split("/").map((v) => v.split(","));
    for (const list of entries) {
        if (entries.length === 1 && (list.length === 0 || list[0] === '')) {
            continue;
        }
        const mac = list[0].toUpperCase();
        const seconds = parseInt(list[1]);
        const interval = getIntervalStringFromSeconds(seconds)
        const extra = list.slice(2);
        state[`${varName}["${mac}"]`] = { seconds, interval, extra };
    }
}

function parseWlanSimpleAssociatedList(varName, state, content) {
    const entries = content.replace(/\'/g, "").split("/").map((v) => v.split(","));
    for (const list of entries) {
        if (entries.length === 1 && (list.length === 0 || list[0] === '')) {
            continue;
        }
        const mac = list[0].toUpperCase();
        const interval = list[1];
        const seconds = getSecondsFromIntervalString(interval);
        const extra = list.slice(2);
        state[`${varName}["${mac}"]`] = { seconds, interval, extra };
    }
}
function parseOrgLanHostList(varName, state, content) {
    const entries = JSON.parse(content.substring(1, content.length - 1).replace(/\'/g, '"'));
    for (const list of entries) {
        const name = list[1];
        const ip = list[3];
        const src = list[4];
        const mac = list[6].toUpperCase();
        const extra = list.filter((_, i) => ![1, 3, 4, 6].includes(i));
        state[`${varName}["${mac}"]`] = { name, ip, src, extra };
    }
}

function parseLanHostList(varName, state, content) {
    const text = content.replace(/\'/g, "");
    const entries = text.length <= 4 ? [] : text.split('|').map(entry => entry.split('/'));
    for (const list of entries) {
        const name = list[1];
        const mac = list[2].toUpperCase();
        const ip = list[3];
        const seconds = parseInt(list[4] || '0');
        const interval = getIntervalStringFromSeconds(seconds);
        const extra = list.filter((_, i) => ![1, 2, 3, 4].includes(i));
        state[`${varName}["${mac}"]`] = { name, ip, seconds, interval, extra };
    }
}

function defaultParser(varName, state, content) {
    if (content.startsWith("'") && content.endsWith("'")) {
        content = content.substring(1, content.length-1);
    }
    state[varName] = content;
}
  
const processStaList = (varName, state, content) => {
    const entries = content.replace(/\'/g, "").replace(/\"/g, "").split('/').filter(
        a => a.trim().length
    ).map(
        e => e.split(',')
    );
    for (const list of entries) {
        if (list.length !== 2) {
            throw new Error(`Unexpected length ${list.length}`);
        }
        const mac = list[0].toUpperCase();
        const time = list[1].toUpperCase();
        const isTimeSeconds = time.length && !time.includes(':');

        const seconds = isTimeSeconds ? parseInt(time) : getSecondsFromIntervalString(time);
        const interval = getIntervalStringFromSeconds(seconds);
        state[`${varName}["${mac}"]`] = { seconds, interval };
    }
};
const specialVariableParserRecord = {
    "orgLanHostList": parseOrgLanHostList,
    "lanHostList": parseLanHostList,
    "ethIntfSts": parseIntfSts,
    "wlanIntfSts": parseIntfSts,
    "wlan5GAssociatedList": parseWlanAssociatedList,
    "wlan2dot4GAssociatedList": parseWlanSimpleAssociatedList,
    "opticalPower": (varName, state, content) => {
        const p = content.replace(/\'/g, "").replace(/\"/g, "").split(';');
        if (p.length === 2 && p[0].startsWith('TX:') && p[1].startsWith('RX:')) {
            p.forEach(
                k => state[`opticalPower${k[0]}x`] = parseFloat(parseFloat(k.substring(3)).toFixed(1))
            );
        } else {
            state[varName] = content;
        }
    },
    "staList": processStaList,
    "staList5": processStaList,
    "portMacList": processMacList,
    "ipv6MacList": processMacList,
    "pppUptime": (varName, state, content) => {
        const uptime = parseInt(content);
        state['uptime'] = uptime;
    },
    "enetStatus": (varName, state, content) => {
        const entries = content.split('.')[0].replace(/\'/g, "").replace(/\"/g, "").split('|').filter(a => a.trim().length).map(a => a.trim().split(','));
        for (const list of entries) {
            state[`${varName}["${list[0]}"]`] = list.slice(1).join(' ');
        }
    }
};

function processMacList(varName, state, content) {
    const entries = content.replace(/\'/g, "").replace(/\"/g, "").split('|').filter(
        a=>a.trim().length
    ).map(e => e.split(','));
    for (const list of entries) {
        const mac = list[1].toUpperCase();
        state[`${varName}["${mac}"]`] = list[0];
    }
}

module.exports = function generateStateRecordFromVarList(varList) {
    /** @type {Record<string, any>} */
    const state = {};
    for (const {name, content} of varList) {
        const parser = specialVariableParserRecord[name] || defaultParser;
        parser(name, state, content);
    }
    return state;
}