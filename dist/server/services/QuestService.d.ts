import { PlayerRuntime } from '../models/types';
import { Wallet } from '../utils/currency';
type SendRawFn = (ws: any, payload: any) => void;
type PersistPlayerFn = (player: PlayerRuntime) => void;
type PersistPlayerCriticalFn = (player: PlayerRuntime, reason?: string) => void;
type GrantXpFn = (player: PlayerRuntime, amount: number, context?: {
    mapKey?: string;
    mapId?: string;
}) => void;
type GrantItemFn = (player: PlayerRuntime, templateId: string, quantity: number) => number;
type GrantCurrencyFn = (player: PlayerRuntime, reward: Partial<Wallet>, sourceLabel: string) => void;
type GetDungeonUiStateFn = (player: PlayerRuntime, npcId: string) => Record<string, any> | null;
export declare class QuestService {
    private readonly sendRaw;
    private readonly persistPlayer;
    private readonly persistPlayerCritical;
    private readonly grantXp;
    private readonly grantRewardItem;
    private readonly grantCurrency;
    private readonly getDungeonUiState?;
    constructor(sendRaw: SendRawFn, persistPlayer: PersistPlayerFn, persistPlayerCritical: PersistPlayerCriticalFn, grantXp: GrantXpFn, grantRewardItem: GrantItemFn, grantCurrency: GrantCurrencyFn, getDungeonUiState?: GetDungeonUiStateFn | undefined);
    getNpcsForMap(mapKey: string, mapId: string): {
        id: string;
        name: string;
        x: number;
        y: number;
        role: "quest_giver" | "shopkeeper" | "chest_keeper" | "civilian";
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
    getNpcById(npcId: string): import("../content/npcs").NpcDef;
    getShopOffers(npcId: string): ({
        offerId: string;
        npcId: string;
        templateId: string;
        name: string;
        type: string;
        slot: string;
        quantity: number;
        requiredClass: string | null;
        price: any;
        bonuses: any;
    } | null)[];
    sendQuestState(player: PlayerRuntime): void;
    handleNpcInteract(player: PlayerRuntime, msg: any): void;
    private getDungeonEntryForNpc;
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