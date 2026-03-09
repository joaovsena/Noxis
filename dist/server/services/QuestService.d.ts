import { PlayerRuntime } from '../models/types';
type SendRawFn = (ws: any, payload: any) => void;
type PersistPlayerFn = (player: PlayerRuntime) => void;
type GrantXpFn = (player: PlayerRuntime, amount: number, context?: {
    mapKey?: string;
    mapId?: string;
}) => void;
type GrantItemFn = (player: PlayerRuntime, templateId: string, quantity: number) => number;
export declare class QuestService {
    private readonly sendRaw;
    private readonly persistPlayer;
    private readonly grantXp;
    private readonly grantRewardItem;
    constructor(sendRaw: SendRawFn, persistPlayer: PersistPlayerFn, grantXp: GrantXpFn, grantRewardItem: GrantItemFn);
    getNpcsForMap(mapKey: string, mapId: string): {
        id: string;
        name: string;
        x: number;
        y: number;
        role: "quest_giver";
        spriteKey: string | null;
        hitbox: {
            w: number;
            h: number;
            offsetX?: number;
            offsetY?: number;
        };
        anchor: {
            x: number;
            y: number;
        };
        interactRange: number;
    }[];
    sendQuestState(player: PlayerRuntime): void;
    handleNpcInteract(player: PlayerRuntime, msg: any): void;
    handleQuestAccept(player: PlayerRuntime, msg: any): void;
    handleQuestComplete(player: PlayerRuntime, msg: any): void;
    onMobKilled(player: PlayerRuntime, mob: any): void;
    onItemCollected(player: PlayerRuntime, templateId: string, quantity: number): void;
    private buildQuestStatePayload;
    private areAllObjectivesDone;
    private applyTalkProgress;
    private getQuestState;
    private setQuestState;
}
export {};
//# sourceMappingURL=QuestService.d.ts.map