export declare const WORLD: {
    width: number;
    height: number;
};
export declare const INSTANCE_IDS: readonly ["E1", "E2"];
export declare const MAP_KEYS: readonly ["forest", "lava"];
export declare const MAP_IDS: ("E1" | "E2")[];
export declare const DEFAULT_MAP_ID = "E1";
export declare const DEFAULT_MAP_KEY = "forest";
export declare const TICK_MS = 50;
export declare const MOB_COUNTS: {
    normal: number;
    elite: number;
    subboss: number;
    boss: number;
};
export declare const INVENTORY_SIZE = 36;
export declare const MOB_RESPAWN_MS = 10000;
export declare const BASE_MOVE_SPEED = 140;
export declare const PLAYER_HALF_SIZE = 20;
export declare const LOCAL_CHAT_RADIUS = 650;
export declare const PORTAL_COOLDOWN_MS = 1200;
export declare const MAP_THEMES: Record<string, 'forest' | 'lava'>;
export declare const PORTALS_BY_MAP_KEY: Record<string, Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    toMapKey: string;
    toX: number;
    toY: number;
}>>;
export declare function composeMapInstanceId(mapKey: string, instanceId: string): string;
export declare const DEFAULT_MOB: {
    size: number;
    maxHp: number;
    physicalDefense: number;
    magicDefense: number;
    xpReward: number;
};
export declare const MOB_VARIANTS: {
    normal: {
        mult: number;
        size: number;
        color: string;
    };
    elite: {
        mult: number;
        size: number;
        color: string;
    };
    subboss: {
        mult: number;
        size: number;
        color: string;
    };
    boss: {
        mult: number;
        size: number;
        color: string;
    };
};
export declare const ITEM_PICKUP_RANGE = 90;
export declare const COMBAT_LOCK_MS = 10000;
export declare const WEAPON_TEMPLATE: {
    name: string;
    slot: string;
    bonuses: {
        physicalAttack: number;
        magicAttack: number;
        moveSpeed: number;
        attackSpeed: number;
    };
};
export declare const STATUS_IDS: {
    physicalAttack: number;
    magicAttack: number;
    physicalDefense: number;
    magicDefense: number;
    moveSpeed: number;
    attackSpeed: number;
    attackRange: number;
    maxHp: number;
};
export declare const STATUS_BY_ID: {
    [k: string]: string;
};
export declare const CLASS_TEMPLATES: {
    shifter: {
        physicalAttack: number;
        magicAttack: number;
        physicalDefense: number;
        magicDefense: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
        maxHp: number;
    };
    knight: {
        physicalAttack: number;
        magicAttack: number;
        physicalDefense: number;
        magicDefense: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
        maxHp: number;
    };
    bandit: {
        physicalAttack: number;
        magicAttack: number;
        physicalDefense: number;
        magicDefense: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
        maxHp: number;
    };
};
//# sourceMappingURL=index.d.ts.map