import { logEvent } from './logger';

export async function createRedisClient(): Promise<any | null> {
    let createClient: ((options: { url: string }) => any) | null = null;
    try {
        const redisModule = require('redis') as { createClient?: (options: { url: string }) => any };
        createClient = typeof redisModule?.createClient === 'function' ? redisModule.createClient : null;
    } catch {
        createClient = null;
    }
    if (!createClient) {
        logEvent('WARN', 'redis_unavailable', { reason: 'redis_module_not_installed' });
        return null;
    }
    const url = String(process.env.REDIS_URL || '').trim();
    if (!url) return null;
    const client = createClient({ url });
    client.on('error', (error: unknown) => {
        logEvent('ERROR', 'redis_error', { error: String(error) });
    });
    await client.connect();
    logEvent('INFO', 'redis_connected', { url });
    return client;
}
