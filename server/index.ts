import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { GameController } from './controllers/GameController';
import { PersistenceService } from './services/PersistenceService';
import { MobService } from './services/MobService';
import { WSHandler } from './controllers/WSHandler';
import { logEvent } from './utils/logger';
import { TICK_MS, MAP_IDS, MAP_KEYS, composeMapInstanceId } from './config';
import prisma from './utils/prisma';

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
    res.type('application/json').send('{}');
});
app.use(express.static(path.resolve(process.cwd(), 'public')));

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface ExtendedWebSocket extends WebSocket {
    playerId?: number | null;
}

async function initializeServer() {
    try {
        await prisma.$connect();

        const persistence = new PersistenceService();
        const mobService = new MobService();
        const gameController = new GameController(persistence, mobService);
        const wsHandler = new WSHandler(gameController);
        const mobTemplates = await persistence.getMobTemplates();
        mobService.loadTemplateCache(mobTemplates);

        for (const mapKey of MAP_KEYS) {
            for (const mapId of MAP_IDS) {
                const mapInstanceId = composeMapInstanceId(mapKey, mapId);
                mobService.seedMapInstance(mapInstanceId);
            }
        }

        wss.on('connection', (ws: WebSocket) => {
            const extWs = ws as ExtendedWebSocket;
            extWs.playerId = null;
            logEvent('INFO', 'ws_connected', {});

            extWs.on('message', (raw: Buffer) => {
                try {
                    wsHandler.handleMessage(extWs as any, raw.toString());
                } catch (error) {
                    logEvent('ERROR', 'message_handler_error', { error: String(error) });
                }
            });

            extWs.on('error', (err: any) => {
                logEvent('ERROR', 'websocket_error', { error: String(err) });
            });

            extWs.on('close', async () => {
                if (!extWs.playerId) return;
                const player = gameController.getPlayerByRuntimeId(extWs.playerId);
                if (!player) return;
                logEvent('INFO', 'ws_closed', { playerId: player.id, username: player.username });
                await gameController.handleDisconnect(extWs.playerId);
            });
        });

        let lastTickAt = Date.now();
        setInterval(() => {
            const now = Date.now();
            const elapsedMs = Math.max(1, now - lastTickAt);
            lastTickAt = now;
            const dt = Math.max(0.010, Math.min(0.100, elapsedMs / 1000));
            gameController.tick(dt, now);

            for (const client of wss.clients) {
                if (client.readyState !== WebSocket.OPEN) continue;
                const extClient = client as ExtendedWebSocket;
                if (!extClient.playerId) continue;
                const player = gameController.getPlayerByRuntimeId(extClient.playerId);
                if (!player) continue;
                client.send(JSON.stringify(gameController.buildWorldSnapshot(player.mapId, player.mapKey)));
            }
        }, TICK_MS);

        server.listen(PORT, () => {
            logEvent('INFO', 'server_started', { port: PORT });
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        logEvent('ERROR', 'server_init_error', { error: String(error) });
        process.exit(1);
    }
}

initializeServer();
