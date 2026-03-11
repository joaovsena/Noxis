import { Wallet } from '../utils/currency';
export type DungeonMobSpawn = {
    id: string;
    kind: 'normal' | 'elite' | 'subboss' | 'boss';
    x: number;
    y: number;
    hpMultiplier?: number;
    level?: number;
};
export type DungeonBossMechanics = {
    shockwaveIntervalMs: number;
    shockwaveDamagePctMaxHp: number;
    addSummonHpThresholdPct: number;
    addSpawns: DungeonMobSpawn[];
};
export type DungeonTemplate = {
    id: string;
    name: string;
    description: string;
    mapKey: string;
    mapAssetKey?: string;
    maxPlayers: number;
    entryNpcId?: string;
    entryPortalId?: string;
    entrySpawn: {
        x: number;
        y: number;
    };
    exitSpawn: {
        mapKey: string;
        mapId: string;
        x: number;
        y: number;
    };
    mobs: DungeonMobSpawn[];
    rewards: {
        currency?: Partial<Wallet>;
        items?: Array<{
            templateId: string;
            quantity: number;
        }>;
    };
    bossMechanics: DungeonBossMechanics;
};
export declare const DUNGEON_TEMPLATES: DungeonTemplate[];
export declare const DUNGEON_BY_ID: Record<string, DungeonTemplate>;
export declare const DUNGEON_BY_ENTRY_NPC: Record<string, DungeonTemplate>;
export declare const DUNGEON_BY_ENTRY_PORTAL: Record<string, DungeonTemplate>;
//# sourceMappingURL=dungeons.d.ts.map