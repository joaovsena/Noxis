import { Mob } from '../models/types';
export declare class MobService {
    private mobs;
    private mobIdCounter;
    createMob(kind: string | undefined, mapId: string): Mob;
    spawnMob(kind: string | undefined, mapId: string): void;
    removeMob(mobId: string): void;
    getMobs(): Mob[];
    getMobsByMap(mapId: string): Mob[];
}
//# sourceMappingURL=MobService.d.ts.map