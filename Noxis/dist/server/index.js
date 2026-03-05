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
const app = (0, express_1.default)();
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
    res.type('application/json').send('{}');
});
app.use(express_1.default.static(path_1.default.resolve(process.cwd(), 'public')));
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
async function initializeServer() {
    try {
        await prisma_1.default.$connect();
        const persistence = new PersistenceService_1.PersistenceService();
        const mobService = new MobService_1.MobService();
        const gameController = new GameController_1.GameController(persistence, mobService);
        const wsHandler = new WSHandler_1.WSHandler(gameController);
        for (const mapKey of config_1.MAP_KEYS) {
            for (const mapId of config_1.MAP_IDS) {
                const mapInstanceId = (0, config_1.composeMapInstanceId)(mapKey, mapId);
                for (let i = 0; i < 25; i++)
                    mobService.spawnMob('normal', mapInstanceId);
                for (let i = 0; i < 15; i++)
                    mobService.spawnMob('elite', mapInstanceId);
                for (let i = 0; i < 5; i++)
                    mobService.spawnMob('subboss', mapInstanceId);
                for (let i = 0; i < 1; i++)
                    mobService.spawnMob('boss', mapInstanceId);
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
        setInterval(() => {
            const now = Date.now();
            const dt = config_1.TICK_MS / 1000;
            gameController.tick(dt, now);
            for (const client of wss.clients) {
                if (client.readyState !== ws_1.WebSocket.OPEN)
                    continue;
                const extClient = client;
                if (!extClient.playerId)
                    continue;
                const player = gameController.getPlayerByRuntimeId(extClient.playerId);
                if (!player)
                    continue;
                client.send(JSON.stringify(gameController.buildWorldSnapshot(player.mapId, player.mapKey)));
            }
        }, config_1.TICK_MS);
        server.listen(3000, () => {
            (0, logger_1.logEvent)('INFO', 'server_started', { port: 3000 });
            console.log('Server running on http://localhost:3000');
        });
    }
    catch (error) {
        (0, logger_1.logEvent)('ERROR', 'server_init_error', { error: String(error) });
        process.exit(1);
    }
}
initializeServer();
//# sourceMappingURL=index.js.map