// @ts-check

export const WORLD = { width: 3200, height: 3200 };
export const INSTANCE_IDS = ['E1', 'E2'] as const;
export const MAP_KEYS = ['forest', 'lava'] as const;
export const MAP_IDS = [...INSTANCE_IDS];
export const DEFAULT_MAP_ID = 'E1';
export const DEFAULT_MAP_KEY = 'forest';
export const TICK_MS = 50;
export const MOB_COUNTS = { normal: 25, elite: 15, subboss: 5, boss: 1 };
export const INVENTORY_SIZE = 36;
export const MOB_RESPAWN_MS = 10000;
export const BASE_MOVE_SPEED = 140;
export const PLAYER_HALF_SIZE = 20;
export const LOCAL_CHAT_RADIUS = 650;
export const PORTAL_COOLDOWN_MS = 1200;

export const MAP_THEMES: Record<string, 'forest' | 'lava'> = {
    forest: 'forest',
    lava: 'lava'
};

export const PORTALS_BY_MAP_KEY: Record<string, Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    toMapKey: string;
    toX: number;
    toY: number;
}>> = {
    forest: [
        // Portal da borda direita para o mapa de lava (zona rosa do layout).
        { id: 'forest_to_lava_01', x: 3040, y: 1340, w: 120, h: 380, toMapKey: 'lava', toX: 260, toY: 1560 }
    ],
    lava: [
        // Retorno para floresta para evitar lock no mapa de teste.
        { id: 'lava_to_forest_01', x: 40, y: 1340, w: 120, h: 380, toMapKey: 'forest', toX: 2940, toY: 1560 }
    ]
};

export function composeMapInstanceId(mapKey: string, instanceId: string) {
    return `${mapKey}::${instanceId}`;
}

export const DEFAULT_MOB = {
    size: 40,
    maxHp: 120,
    physicalDefense: 4,
    magicDefense: 4,
    xpReward: 35
};
export const MOB_VARIANTS = {
    normal: { mult: 1, size: 40, color: '#d63031' },
    elite: { mult: 2, size: 56, color: '#e67e22' },
    subboss: { mult: 5, size: 72, color: '#8e44ad' },
    boss: { mult: 9, size: 96, color: '#111111' }
};
export const ITEM_PICKUP_RANGE = 90;
export const COMBAT_LOCK_MS = 10000;
export const WEAPON_TEMPLATE = {
    name: 'Arma Teste',
    slot: 'weapon',
    bonuses: {
        physicalAttack: 10,
        magicAttack: 10,
        moveSpeed: 50,
        attackSpeed: 50
    }
};
export const STATUS_IDS = {
    physicalAttack: 1,
    magicAttack: 2,
    physicalDefense: 3,
    magicDefense: 4,
    moveSpeed: 5,
    attackSpeed: 6,
    attackRange: 7,
    maxHp: 8
};
export const STATUS_BY_ID = Object.fromEntries(Object.entries(STATUS_IDS).map(([k, v]) => [String(v), k]));

export const CLASS_TEMPLATES = {
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
