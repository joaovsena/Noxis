import { Mob } from '../models/types';
interface MobTemplateRuntime {
    kind: string;
    maxHp: number;
    size: number;
    color: string;
    xpReward: number;
    physicalDefense: number;
    magicDefense: number;
    aggroRange: number;
    leashRange: number;
    attackRange: number;
    attackCadenceMs: number;
    moveSpeed: number;
    wanderRadius: number;
    repathMs: number;
    idleMinMs: number;
    idleMaxMs: number;
    luckyStrikeChance: number;
    accuracy: number;
    evasion: number;
}
export declare class MobService {
    private mobs;
    private templateCache;
    constructor();
    loadTemplateCache(rawTemplates: Array<any>): void;
    private pickNumber;
    private getTemplate;
    createMob(kind: string | undefined, mapId: string): Mob;
    private randomIdleDelay;
    private findValidSpawnPoint;
    spawnMob(kind: string | undefined, mapId: string): void;
    seedMapInstance(mapId: string): void;
    removeMob(mobId: string): void;
    getMobs(): Mob[];
    getMobById(mobId: string): Mob | null;
    getMobsByMap(mapId: string): Mob[];
    getTemplateByMob(mob: Mob): MobTemplateRuntime;
    addHate(mob: Mob, playerId: number, amount: number): void;
    getTopHateTarget(mob: Mob): number | null;
    clearTarget(mob: Mob): void;
}
export {};
//# sourceMappingURL=MobService.d.ts.map