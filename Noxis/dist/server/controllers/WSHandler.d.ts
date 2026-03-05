import { WebSocket } from 'ws';
interface ExtendedWebSocket extends WebSocket {
    playerId?: string;
}
import { GameController } from './GameController';
export declare class WSHandler {
    private controller;
    constructor(controller: GameController);
    handleMessage(ws: ExtendedWebSocket, raw: string): void;
}
export {};
//# sourceMappingURL=WSHandler.d.ts.map