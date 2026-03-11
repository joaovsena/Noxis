import { DungeonTemplate } from '../content/dungeons';
import { MapFeature } from '../config';
type DungeonLayout = {
    mapKey: string;
    entrySpawn: {
        x: number;
        y: number;
    };
    features: MapFeature[];
    mobSpawns: Array<{
        id: string;
        kind: 'normal' | 'elite' | 'subboss' | 'boss';
        x: number;
        y: number;
        hpMultiplier?: number;
        level?: number;
    }>;
    doorFeature: MapFeature | null;
    bossAggroRange: number;
};
export declare function generateDungeonLayout(instanceId: string, template: DungeonTemplate): DungeonLayout;
export {};
//# sourceMappingURL=ProceduralDungeonGenerator.d.ts.map