"use strict";
// @ts-check
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASS_TEMPLATES = exports.STATUS_BY_ID = exports.STATUS_IDS = exports.WEAPON_TEMPLATE = exports.COMBAT_LOCK_MS = exports.ITEM_PICKUP_RANGE = exports.MOB_VARIANTS = exports.DEFAULT_MOB = exports.PORTALS_BY_MAP_KEY = exports.MAP_THEMES = exports.PORTAL_COOLDOWN_MS = exports.LOCAL_CHAT_RADIUS = exports.PLAYER_HALF_SIZE = exports.BASE_MOVE_SPEED = exports.MOB_RESPAWN_MS = exports.INVENTORY_SIZE = exports.MOB_COUNTS = exports.TICK_MS = exports.DEFAULT_MAP_KEY = exports.DEFAULT_MAP_ID = exports.MAP_IDS = exports.MAP_KEYS = exports.INSTANCE_IDS = exports.WORLD = void 0;
exports.composeMapInstanceId = composeMapInstanceId;
exports.WORLD = { width: 3200, height: 3200 };
exports.INSTANCE_IDS = ['E1', 'E2'];
exports.MAP_KEYS = ['forest', 'lava'];
exports.MAP_IDS = [...exports.INSTANCE_IDS];
exports.DEFAULT_MAP_ID = 'E1';
exports.DEFAULT_MAP_KEY = 'forest';
exports.TICK_MS = 50;
exports.MOB_COUNTS = { normal: 25, elite: 15, subboss: 5, boss: 1 };
exports.INVENTORY_SIZE = 36;
exports.MOB_RESPAWN_MS = 10000;
exports.BASE_MOVE_SPEED = 140;
exports.PLAYER_HALF_SIZE = 20;
exports.LOCAL_CHAT_RADIUS = 650;
exports.PORTAL_COOLDOWN_MS = 1200;
exports.MAP_THEMES = {
    forest: 'forest',
    lava: 'lava'
};
exports.PORTALS_BY_MAP_KEY = {
    forest: [
        // Portal da borda direita para o mapa de lava (zona rosa do layout).
        { id: 'forest_to_lava_01', x: 3040, y: 1340, w: 120, h: 380, toMapKey: 'lava', toX: 260, toY: 1560 }
    ],
    lava: [
        // Retorno para floresta para evitar lock no mapa de teste.
        { id: 'lava_to_forest_01', x: 40, y: 1340, w: 120, h: 380, toMapKey: 'forest', toX: 2940, toY: 1560 }
    ]
};
function composeMapInstanceId(mapKey, instanceId) {
    return `${mapKey}::${instanceId}`;
}
exports.DEFAULT_MOB = {
    size: 40,
    maxHp: 120,
    physicalDefense: 4,
    magicDefense: 4,
    xpReward: 35
};
exports.MOB_VARIANTS = {
    normal: { mult: 1, size: 40, color: '#d63031' },
    elite: { mult: 2, size: 56, color: '#e67e22' },
    subboss: { mult: 5, size: 72, color: '#8e44ad' },
    boss: { mult: 9, size: 96, color: '#111111' }
};
exports.ITEM_PICKUP_RANGE = 90;
exports.COMBAT_LOCK_MS = 10000;
exports.WEAPON_TEMPLATE = {
    name: 'Arma Teste',
    slot: 'weapon',
    bonuses: {
        physicalAttack: 10,
        magicAttack: 10,
        moveSpeed: 50,
        attackSpeed: 50
    }
};
exports.STATUS_IDS = {
    physicalAttack: 1,
    magicAttack: 2,
    physicalDefense: 3,
    magicDefense: 4,
    moveSpeed: 5,
    attackSpeed: 6,
    attackRange: 7,
    maxHp: 8
};
exports.STATUS_BY_ID = Object.fromEntries(Object.entries(exports.STATUS_IDS).map(([k, v]) => [String(v), k]));
exports.CLASS_TEMPLATES = {
    shifter: {
        physicalAttack: 5,
        magicAttack: 15,
        physicalDefense: 5,
        magicDefense: 5,
        moveSpeed: 100,
        attackSpeed: 100,
        attackRange: 220,
        damageType: 'magic',
        maxHp: 110
    },
    knight: {
        physicalAttack: 10,
        magicAttack: 5,
        physicalDefense: 10,
        magicDefense: 10,
        moveSpeed: 100,
        attackSpeed: 100,
        attackRange: 58,
        damageType: 'physical',
        maxHp: 140
    },
    bandit: {
        physicalAttack: 10,
        magicAttack: 5,
        physicalDefense: 5,
        magicDefense: 5,
        moveSpeed: 150,
        attackSpeed: 200,
        attackRange: 58,
        damageType: 'physical',
        maxHp: 100
    }
};
//# sourceMappingURL=index.js.map