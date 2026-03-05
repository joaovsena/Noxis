import { PersistenceService } from '../services/PersistenceService';
import { MobService } from '../services/MobService';
import { PlayerRuntime, GroundItem, AuthMessage, MoveMessage } from '../models/types';
export declare class GameController {
    private persistence;
    private mobService;
    players: Map<string, PlayerRuntime>;
    usernameToPlayerId: Map<string, string>;
    groundItems: GroundItem[];
    constructor(persistence: PersistenceService, mobService: MobService);
    handleAuth(ws: any, msg: AuthMessage): Promise<void>;
    private handleRegister;
    private handleLogin;
    private createRuntimePlayer;
    handleMove(player: PlayerRuntime, msg: MoveMessage): void;
    handleTargetMob(player: PlayerRuntime, msg: any): void;
    handleSwitchInstance(player: PlayerRuntime, msg: any): void;
    handlePickupItem(player: PlayerRuntime, msg: any): void;
    tick(deltaSeconds: number, now: number): void;
    buildWorldSnapshot(mapId?: string, mapKey?: string): {
        type: string;
        players: Record<string, any>;
        mobs: import("../models/types").Mob[];
        groundItems: GroundItem[];
        mapKey: string;
        mapTheme: "forest" | "lava";
        portals: {
            id: string;
            x: number;
            y: number;
            w: number;
            h: number;
            toMapKey: string;
            toX: number;
            toY: number;
        }[];
        mapId: string;
        world: {
            width: number;
            height: number;
        };
    };
    getPlayerByRuntimeId(playerId: string): PlayerRuntime | undefined;
    handleDisconnect(playerId: string): Promise<void>;
    private firstFreeInventorySlot;
    private sanitizePublicPlayer;
    private movePlayerTowardTarget;
    private processAutoAttack;
    private processPortalCollision;
    private mapInstanceId;
    private grantXp;
}
//# sourceMappingURL=GameController.d.ts.map