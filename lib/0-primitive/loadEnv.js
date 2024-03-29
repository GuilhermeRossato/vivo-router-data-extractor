const path = require('path');
const fs = require('fs');
const asyncTryCatchNull = require('../9-utils/asyncTryCatchNull.js');

/**
 * @returns {{ROUTER_USERNAME: string, ROUTER_PASSWORD: string, ROUTER_HOST: string}}
 */
function applyDefaultEnv(env) {
    if (!env.ROUTER_USERNAME) { env.ROUTER_USERNAME = 'admin'; }
    if (!env.ROUTER_PASSWORD) { console.log('Missing required variable "ROUTER_PASSWORD"') };
    if (!env.ROUTER_HOST) { env.ROUTER_HOST = '192.168.15.1'; }
    return env;
}

let cachedEnv = null;

module.exports = async function loadEnv() {
    if (!cachedEnv) {
        console.log('Initializing environment cache');
        const envFileName = '.env';
        const envFilePath = path.resolve(process.cwd(), envFileName);
        const envFileContent = await asyncTryCatchNull(fs.promises.readFile(envFilePath, 'utf-8'));
        const envFileLines = typeof envFileContent === 'string' ? envFileContent.split('\n').filter(a => a.includes('=')) : [];
        const env = {};
        for (const key in process.env) {
            if (key.startsWith('ROUTER_')) {
                env[key] = process.env[key];
            }
        }
        for (const line of envFileLines) {
            if (!line.startsWith('ROUTER')) {
                console.log('Ignoring unexpected line prefix at env file: "' + line.substring(0, 6) + '..."');
                continue;
            }
            const equal = line.indexOf('=');
            const key = line.substring(0, equal).trim();
            env[key] = line.substring(equal + 1).trim();
        }
        console.log('There are', Object.keys(env).length, 'environment variables');
        cachedEnv = applyDefaultEnv(env);
    }
    return cachedEnv;
};