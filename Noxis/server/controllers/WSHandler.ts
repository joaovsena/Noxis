import { WebSocket } from 'ws';

interface ExtendedWebSocket extends WebSocket {
    playerId?: string;
}
import { GameController } from './GameController';
import { WSMessage } from '../models/types';

export class WSHandler {
    private controller: GameController;

    constructor(controller: GameController) {
        this.controller = controller;
    }

    handleMessage(ws: ExtendedWebSocket, raw: string) {
        let msg: WSMessage;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        if (!ws.playerId || !this.controller.players.has(ws.playerId)) {
            if (msg.type.startsWith('auth_')) {
                this.controller.handleAuth(ws, msg as any);
            }
            return;
        }

        const player = this.controller.players.get(ws.playerId)!;

        switch (msg.type) {
            case 'move':
                this.controller.handleMove(player, msg as any);
                break;
            case 'target_mob':
                this.controller.handleTargetMob(player, msg as any);
                break;
            case 'pickup_item':
                this.controller.handlePickupItem(player, msg as any);
                break;
            case 'switch_instance':
                this.controller.handleSwitchInstance(player, msg as any);
                break;
            // Adicionar outros cases...
        }
    }
}
