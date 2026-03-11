import { PlayerRuntime } from '../models/types';
type SendRawFn = (ws: any, payload: any) => void;
type SendStatsUpdatedFn = (player: PlayerRuntime) => void;
type PersistPlayerFn = (player: PlayerRuntime) => void;
type PersistPlayerCriticalFn = (player: PlayerRuntime, reason?: string) => void;
type GrantCurrencyFn = (player: PlayerRuntime, reward: any, sourceLabel: string) => void;
type ProjectToWalkableFn = (mapKey: string, x: number, y: number) => {
    x: number;
    y: number;
};
type RemoveGroundItemsByMapInstanceFn = (mapInstanceId: string) => void;
type DropTemplateAtFn = (x: number, y: number, mapId: string, templateId: string, ownerId?: number | null, ownerPartyId?: string | null, reservedMs?: number) => void;
export declare class DungeonService {
    private readonly players;
    private readonly mobService;
    private readonly sendRaw;
    private readonly sendStatsUpdated;
    private readonly persistPlayer;
    private readonly persistPlayerCritical;
    private readonly grantCurrency;
    private readonly projectToWalkable;
    private readonly removeGroundItemsByMapInstance;
    private readonly dropTemplateAt;
    private readonly instances;
    private readonly playerToInstanceId;
    private readonly partyToOpenInstanceId;
    private readonly emptySince;
    private readonly readyCheckToInstanceId;
    private readonly pendingTeleportByRequestId;
    constructor(players: Map<number, PlayerRuntime>, mobService: any, sendRaw: SendRawFn, sendStatsUpdated: SendStatsUpdatedFn, persistPlayer: PersistPlayerFn, persistPlayerCritical: PersistPlayerCriticalFn, grantCurrency: GrantCurrencyFn, projectToWalkable: ProjectToWalkableFn, removeGroundItemsByMapInstance: RemoveGroundItemsByMapInstanceFn, dropTemplateAt: DropTemplateAtFn);
    getDungeonEntryForNpc(npcId: string): {
        templateId: string;
        name: string;
        description: string;
        maxPlayers: number;
    } | null;
    getNpcUiStateForPlayer(player: PlayerRuntime, npcId: string): {
        opened: boolean;
    } | null;
    getDebugSnapshot(): {
        id: string;
        templateId: string;
        mapKey: string;
        mapId: string;
        state: "open" | "active" | "completed" | "ready_check";
        locked: boolean;
        doorLocked: boolean;
        readyCheckId: string | null;
        readyDeadlineAt: number | null;
        cleanupAt: number | null;
        mobCount: number;
        boss: {
            runtimeId: string;
            hp: number;
            maxHp: number;
        } | null;
        members: {
            playerId: number;
            name: string;
            connected: boolean;
            ready: boolean;
            onlineInside: boolean;
            dead: boolean;
            hp: number;
        }[];
    }[];
    tryEnterByNpc(player: PlayerRuntime, npc: any, modeRaw?: string): {
        ok: boolean;
        message: string;
        requestId: string;
    } | {
        ok: boolean;
        message: string;
    };
    handleReadyResponse(player: PlayerRuntime, requestId: string, accept: boolean): void;
    leaveDungeon(player: PlayerRuntime, reason?: string): boolean;
    onMobKilled(_killer: PlayerRuntime, mob: any): void;
    onPlayerDisconnected(playerId: number): void;
    tick(now: number): void;
    private startReadyCheck;
    private createInstance;
    private resolveEntryGroup;
    private resolvePartyOnlineMembers;
    private startTeleportReadyCheck;
    private canUseGroupTeleport;
    private getOpenInstanceForParty;
    private areReadyMembersResolved;
    private tickReadyCheck;
    private finalizeReadyCheck;
    private broadcastReadyState;
    private tickPendingTeleports;
    private ensureInstanceActive;
    private teleportPlayerIntoInstance;
    private movePlayerToInstance;
    private spawnTemplateMobs;
    private tickBossAndWipe;
    private resetBossEncounter;
    private applyShockwave;
    private completeInstance;
    private checkEmptyInstance;
    private cleanupInstance;
    private clearPendingTeleportsForInstance;
    private teleportPlayerToOrigin;
    private onPlayerExitedInstance;
    private getOnlineInstanceMembers;
    private sendToInstance;
    private destroyReadyCheck;
    private setBossDoorLocked;
}
export {};
//# sourceMappingURL=DungeonService.d.ts.map