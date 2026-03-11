"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = createRedisClient;
const logger_1 = require("./logger");
async function createRedisClient() {
    let createClient = null;
    try {
        const redisModule = require('redis');
        createClient = typeof redisModule?.createClient === 'function' ? redisModule.createClient : null;
    }
    catch {
        createClient = null;
    }
    if (!createClient) {
        (0, logger_1.logEvent)('WARN', 'redis_unavailable', { reason: 'redis_module_not_installed' });
        return null;
    }
    const url = String(process.env.REDIS_URL || '').trim();
    if (!url)
        return null;
    const client = createClient({ url });
    client.on('error', (error) => {
        (0, logger_1.logEvent)('ERROR', 'redis_error', { error: String(error) });
    });
    await client.connect();
    (0, logger_1.logEvent)('INFO', 'redis_connected', { url });
    return client;
}
//# sourceMappingURL=redis.js.map