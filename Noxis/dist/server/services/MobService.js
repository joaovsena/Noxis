"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobService = void 0;
const config_1 = require("../config");
const crypto_1 = require("crypto");
class MobService {
    constructor() {
        this.mobs = [];
        this.mobIdCounter = 0;
    }
    createMob(kind = 'normal', mapId) {
        const variant = config_1.MOB_VARIANTS[kind] || config_1.MOB_VARIANTS.normal;
        const padding = 80;
        return {
            id: `mob-${(0, crypto_1.randomUUID)()}`,
            x: padding + Math.random() * (config_1.WORLD.width - padding * 2),
            y: padding + Math.random() * (config_1.WORLD.height - padding * 2),
            kind,
            color: variant.color,
            size: variant.size,
            hp: Math.floor(config_1.DEFAULT_MOB.maxHp * variant.mult),
            maxHp: Math.floor(config_1.DEFAULT_MOB.maxHp * variant.mult),
            physicalDefense: Math.floor(config_1.DEFAULT_MOB.physicalDefense * variant.mult),
            magicDefense: Math.floor(config_1.DEFAULT_MOB.magicDefense * variant.mult),
            xpReward: Math.floor(config_1.DEFAULT_MOB.xpReward * variant.mult),
            mapId
        };
    }
    spawnMob(kind = 'normal', mapId) {
        const quota = { normal: 25, elite: 15, subboss: 5, boss: 1 }[kind] || 0;
        const current = this.mobs.filter(m => m.kind === kind && m.mapId === mapId).length;
        if (current >= quota)
            return;
        this.mobs.push(this.createMob(kind, mapId));
    }
    removeMob(mobId) {
        const index = this.mobs.findIndex(m => m.id === mobId);
        if (index === -1)
            return;
        const kind = this.mobs[index].kind;
        const mapId = this.mobs[index].mapId;
        this.mobs.splice(index, 1);
        setTimeout(() => this.spawnMob(kind, mapId), 10000);
    }
    getMobs() {
        return this.mobs;
    }
    getMobsByMap(mapId) {
        return this.mobs.filter(m => m.mapId === mapId);
    }
}
exports.MobService = MobService;
//# sourceMappingURL=MobService.js.map