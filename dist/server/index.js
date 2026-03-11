"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const ws_1 = require("ws");
const GameController_1 = require("./controllers/GameController");
const PersistenceService_1 = require("./services/PersistenceService");
const MobService_1 = require("./services/MobService");
const WSHandler_1 = require("./controllers/WSHandler");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const prisma_1 = __importDefault(require("./utils/prisma"));
const redis_1 = require("./utils/redis");
const DistributedLockService_1 = require("./services/DistributedLockService");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 3000);
const HOST = String(process.env.HOST || '0.0.0.0');
const parsedWorldStateMs = Number(process.env.WORLD_STATE_MS);
const WORLD_STATE_MS = Number.isFinite(parsedWorldStateMs)
    ? Math.max(40, Math.min(250, Math.floor(parsedWorldStateMs)))
    : 66;
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
    res.type('application/json').send('{}');
});
app.get('/healthz', async (_req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({ ok: true });
    }
    catch (error) {
        console.error('healthcheck_error', error);
        res.status(503).json({ ok: false });
    }
});
app.use(express_1.default.static(path_1.default.resolve(process.cwd(), 'public')));
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
async function initializeServer() {
    try {
        await prisma_1.default.$connect();
        const redis = await (0, redis_1.createRedisClient)();
        const lockService = new DistributedLockService_1.DistributedLockService(redis);
        const persistence = new PersistenceService_1.PersistenceService();
        const mobService = new MobService_1.MobService();
        const gameController = new GameController_1.GameController(persistence, mobService, lockService);
        const wsHandler = new WSHandler_1.WSHandler(gameController);
        try {
            const mobTemplates = await persistence.getMobTemplates();
            mobService.loadTemplateCache(mobTemplates);
        }
        catch (error) {
            console.error('mob_template_bootstrap_error', error);
            (0, logger_1.logEvent)('ERROR', 'mob_template_bootstrap_error', { error: String(error) });
            mobService.loadTemplateCache([]);
        }
        for (const mapKey of config_1.MAP_KEYS) {
            for (const mapId of config_1.MAP_IDS) {
                const mapInstanceId = (0, config_1.composeMapInstanceId)(mapKey, mapId);
                mobService.seedMapInstance(mapInstanceId);
            }
        }
        wss.on('connection', (ws) => {
            const extWs = ws;
            extWs.playerId = null;
            (0, logger_1.logEvent)('INFO', 'ws_connected', {});
            extWs.on('message', (raw) => {
                try {
                    wsHandler.handleMessage(extWs, raw.toString());
                }
                catch (error) {
                    (0, logger_1.logEvent)('ERROR', 'message_handler_error', { error: String(error) });
                }
            });
            extWs.on('error', (err) => {
                (0, logger_1.logEvent)('ERROR', 'websocket_error', { error: String(err) });
            });
            extWs.on('close', async () => {
                if (!extWs.playerId)
                    return;
                const player = gameController.getPlayerByRuntimeId(extWs.playerId);
                if (!player)
                    return;
                (0, logger_1.logEvent)('INFO', 'ws_closed', { playerId: player.id, username: player.username });
                await gameController.handleDisconnect(extWs.playerId);
            });
        });
        let lastTickAt = Date.now();
        let lastWorldBroadcastAt = 0;
        const tickTimer = setInterval(() => {
            const now = Date.now();
            const elapsedMs = Math.max(1, now - lastTickAt);
            lastTickAt = now;
            const dt = Math.max(0.010, Math.min(0.100, elapsedMs / 1000));
            gameController.tick(dt, now);
            if (now - lastWorldBroadcastAt < WORLD_STATE_MS)
                return;
            lastWorldBroadcastAt = now;
            const serializedSnapshotByInstance = new Map();
            for (const client of wss.clients) {
                if (client.readyState !== ws_1.WebSocket.OPEN)
                    continue;
                const extClient = client;
                if (!extClient.playerId)
                    continue;
                const player = gameController.getPlayerByRuntimeId(extClient.playerId);
                if (!player)
                    continue;
                const instanceKey = `${String(player.mapKey)}::${String(player.mapId)}`;
                let serialized = serializedSnapshotByInstance.get(instanceKey);
                if (!serialized) {
                    serialized = JSON.stringify(gameController.buildWorldSnapshot(player.mapId, player.mapKey));
                    serializedSnapshotByInstance.set(instanceKey, serialized);
                }
                client.send(serialized);
            }
        }, config_1.TICK_MS);
        const queueTimer = setInterval(() => {
            void gameController.processPersistenceQueue(25).catch((error) => {
                (0, logger_1.logEvent)('ERROR', 'persistence_queue_error', { error: String(error) });
            });
        }, 1000);
        let shuttingDown = false;
        const shutdown = async (signal) => {
            if (shuttingDown)
                return;
            shuttingDown = true;
            (0, logger_1.logEvent)('INFO', 'server_shutdown_start', { signal });
            clearInterval(tickTimer);
            clearInterval(queueTimer);
            try {
                await gameController.flushAllPlayers(`shutdown:${signal}`);
            }
            catch (error) {
                (0, logger_1.logEvent)('ERROR', 'server_shutdown_flush_error', { signal, error: String(error) });
            }
            try {
                await gameController.processPersistenceQueue(200);
            }
            catch (error) {
                (0, logger_1.logEvent)('ERROR', 'server_shutdown_queue_error', { signal, error: String(error) });
            }
            try {
                await prisma_1.default.$disconnect();
            }
            catch (error) {
                (0, logger_1.logEvent)('ERROR', 'server_shutdown_disconnect_error', { signal, error: String(error) });
            }
            if (redis) {
                try {
                    await redis.quit();
                }
                catch (error) {
                    (0, logger_1.logEvent)('ERROR', 'redis_shutdown_error', { signal, error: String(error) });
                }
            }
            server.close(() => {
                (0, logger_1.logEvent)('INFO', 'server_shutdown_done', { signal });
                process.exit(0);
            });
            setTimeout(() => process.exit(1), 8000).unref();
        };
        process.on('SIGINT', () => { void shutdown('SIGINT'); });
        process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
        server.listen(PORT, HOST, () => {
            (0, logger_1.logEvent)('INFO', 'server_started', { port: PORT, host: HOST });
            console.log(`Server running on http://${HOST}:${PORT}`);
        });
    }
    catch (error) {
        console.error('server_init_error', error);
        (0, logger_1.logEvent)('ERROR', 'server_init_error', { error: String(error) });
        process.exit(1);
    }
}
initializeServer();
//# sourceMappingURL=index.js.map