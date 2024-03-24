//@ts-check
const debug_amount_of_html_files_to_keep = 500;

const fs = require('fs');
const getDateTimeStringWithOffset = require('../9-utils/getDateTimeStringWithOffset.js');
const loadEnv = require('../0-primitive/loadEnv.js');
const { isDebugMode } = require('../0-primitive/args.js');

let lastRequestStartTime;
let lastRequestEndTime;
let requestCount = 0;

async function updateDebugFileIfNecessary(startDate, duration, method, url, sessionId, requestHeaders, responseStatus, responseHeaders, responseBody) {
    if (!isDebugMode || !debug_amount_of_html_files_to_keep || requestCount >= debug_amount_of_html_files_to_keep) {
        return;
    }
    const obj = { date: getDateTimeStringWithOffset(startDate).substring(0, 19), duration, method, url, sessionId, status: responseStatus, requestHeaders, headers: responseHeaders, responseSize: responseBody ? responseBody.length : undefined };
    const header = `<!-- ${JSON.stringify(obj, null, '  ')} -->`;
    let text = responseBody ? responseBody : '';
    if (text.includes('<script') && text.includes('</script')) {
        text = text.split('</script>').map(
            p => p.includes('<script') ? `${p.substring(p.indexOf('<script'))}</script>`.trim() : ''
        ).filter(
            p => p.length
        ).join('\n')
    }
    const filePath = `./data/exchange/${url.split('/').filter(a => a.length).pop()[0]}-${(requestCount)}.html`;
    await fs.promises.writeFile(filePath, `${header}\n${text}`, 'utf-8');
}

/**
 *
 * @param {string} url
 * @param {Record<string, string | undefined>} config
 * @returns
 */
module.exports = async function sendToRouter(url, {
    sessionId,
    body,
    referer
}) {
    if (url.startsWith('/')) {
        const env = await loadEnv();
        const host = env.ROUTER_HOST;
        if (host.endsWith('/')) {
            url = `${host.substring(0, host.length - 1)}${url}`
        } else {
            url = `${host}${url}`;
        }
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`;
    }
    const requestHeaders = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding": 'gzip, deflate',
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Host": "192.168.15.1",
        "Origin": "http://192.168.15.1",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "sec-fetch-mode": ""
    };
    if (referer) {
        requestHeaders['Referer'] = referer;
    }
    if (sessionId) {
        requestHeaders['Cookie'] = `sessionID=${sessionId}`
    }
    let method = 'GET';
    if (body) {
        method = 'POST';
        requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        requestHeaders["Content-Length"] = (body ? body.length : 0).toString();
    }

    let responseHeaders = undefined;
    let responseStatus = undefined;
    let responseBody = undefined;
    let duration = null;

    const startDate = new Date();
    try {
        requestCount++;
        if (debug_amount_of_html_files_to_keep && requestCount < debug_amount_of_html_files_to_keep) {
            console.log(`Saving router exchange data to a file (${debug_amount_of_html_files_to_keep - requestCount - 1} remaining)`);
        }
        await updateDebugFileIfNecessary(startDate, duration, method, url, sessionId, requestHeaders, responseStatus, responseHeaders);
        lastRequestStartTime = new Date().getTime();
        console.log('Request', requestCount,'to:', method, url);
        const response = await fetch(url, {
            method: method.toUpperCase(),
            body,
            headers: requestHeaders,
        });
        responseStatus = response.status;

        responseHeaders = {};
        // @ts-ignore
        const keys = (typeof response.headers['key'] === 'function') ? response.headers.keys() : Object.keys(response.headers);
        [...keys].forEach(key => responseHeaders[key] = response.headers.get(key));
        
        duration = new Date().getTime() - startDate.getTime();
        
        await updateDebugFileIfNecessary(startDate, duration, method, url, sessionId, requestHeaders, responseStatus, responseHeaders);

        let newSessionId;
        const setCookie = response.headers.get('set-cookie');
        if (setCookie && setCookie.startsWith('session') && setCookie.includes('=') && setCookie.includes(';')) {
            const newId = setCookie.split('=')[1].split(';')[0].trim();
            newSessionId = newId;
        }

        responseBody = await response.text();

        duration = new Date().getTime() - startDate.getTime();
        if (requestCount <= 15) {
            console.log('Response took', Math.floor(duration), 'ms', lastRequestEndTime ? 'and last request finished' : 'and it is the first request to finish', lastRequestEndTime ? new Date().getTime() - lastRequestEndTime : '', lastRequestEndTime ? 'ms ago' : '');
        }
        
        lastRequestEndTime = new Date().getTime();
        
        await updateDebugFileIfNecessary(startDate, duration, method, url, sessionId, requestHeaders, responseStatus, responseHeaders, responseBody);

        const lines = (responseBody || '').split('\n');

        const nLines = lines.length >= 30 ? lines : lines.map(
            l => l.toLowerCase().replace(/\s/g, '').replace(/\'/g, '').replace(/\"/g, '').replace(/\;/g, '')
        );
        const hasRedirectToRoot = lines.length <= 30 && nLines.find((line, i) => line.startsWith("<script") && nLines[i+1] === 'window.top.location=/');
        const hasSmallBody = lines.length < 16;
        const hasUnauthenticatedError = lines.find(l => l.includes('<th colspan="2">Você não está Autenticado</th>') || l.includes('<th colspan="2">You are not logged in</th>'));
        
        const obj = {
            success: response.status === 200 && !hasRedirectToRoot && !hasSmallBody && !hasUnauthenticatedError,
            time: startDate.getTime(),
            duration: new Date().getTime() - startDate.getTime(),
            url,
            status: response.status,
            sessionId: !newSessionId ? sessionId : newSessionId,
            headers: responseHeaders,
            body: responseBody,
            requestHeaders,
            problems: {
                hasRedirectToRoot,
                hasSmallBody,
                hasUnauthenticatedError,
            }
        };
        return obj;
    } catch (err) {    
        await updateDebugFileIfNecessary(startDate, duration, method, url, sessionId, requestHeaders, responseStatus, responseHeaders, `<!-- Failed with ${err.stack} -->\n`);
        err.request = {
            url,
            method,
            headers: requestHeaders
        }
        if (responseStatus || responseHeaders || responseBody) {
            err.response = {
                url,
                method,
            }
            if (responseStatus) { err.response.status = responseStatus; }
            if (responseHeaders) { err.response.headers = responseHeaders; }
            if (responseBody) { err.response.body = responseBody; }
        }
        throw err;
    }
}
