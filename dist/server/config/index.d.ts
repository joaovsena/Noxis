export declare const WORLD: {
    width: number;
    height: number;
};
export declare const INSTANCE_IDS: readonly ["Z1", "Z2"];
export declare const MAP_KEYS: readonly ["forest", "lava", "undead"];
export declare const MAP_IDS: ("Z1" | "Z2")[];
export declare const DEFAULT_MAP_ID = "Z1";
export declare const DEFAULT_MAP_KEY = "forest";
export declare const TICK_MS: number;
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
export declare const MOB_AGGRO_RANGE = 260;
export declare const MOB_LEASH_RANGE = 420;
export declare const MOB_ATTACK_RANGE = 64;
export declare const MOB_ATTACK_INTERVAL_MS = 1200;
export declare const MAP_THEMES: Record<string, 'forest' | 'lava' | 'undead'>;
export type MapFeature = {
    id: string;
    kind: 'water' | 'lava' | 'mountain' | 'building' | 'trees' | 'ruins';
    shape: 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    collision?: boolean;
} | {
    id: string;
    kind: 'water' | 'lava' | 'mountain' | 'building' | 'trees' | 'ruins';
    shape: 'circle';
    x: number;
    y: number;
    r: number;
    collision?: boolean;
};
export declare const MAP_FEATURES_BY_KEY: Record<string, MapFeature[]>;
export declare const MAP_CODE_BY_KEY: Record<string, string>;
export declare const MAP_KEY_BY_CODE: Record<string, string>;
export declare function mapCodeFromKey(mapKey: string): string;
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
export declare const ITEM_PICKUP_RANGE = 110;
export declare const GROUND_ITEM_TTL_MS = 60000;
export declare const COMBAT_LOCK_MS = 10000;
export declare const PARTY_MAX_MEMBERS = 5;
export declare const PARTY_INVITE_TTL_MS = 30000;
export declare const PARTY_JOIN_REQUEST_TTL_MS = 30000;
export declare const WEAPON_TEMPLATE: {
    id: string;
    type: string;
    name: string;
    slot: string;
    bonuses: {
        physicalAttack: number;
        magicAttack: number;
        moveSpeed: number;
        attackSpeed: number;
    };
};
export declare const WEAPON_TEMPLATE_RUBI: {
    id: string;
    type: string;
    name: string;
    slot: string;
    bonuses: {
        physicalAttack: number;
        magicAttack: number;
        moveSpeed: number;
        attackSpeed: number;
    };
};
export declare const WEAPON_TEMPLATES: {
    id: string;
    type: string;
    name: string;
    slot: string;
    bonuses: {
        physicalAttack: number;
        magicAttack: number;
        moveSpeed: number;
        attackSpeed: number;
    };
}[];
export declare const HP_POTION_TEMPLATE: {
    id: string;
    type: string;
    name: string;
    slot: string;
    healPercent: number;
    stackable: boolean;
    maxStack: number;
};
export declare const SKILL_RESET_HOURGLASS_TEMPLATE: {
    id: string;
    type: string;
    name: string;
    slot: string;
    stackable: boolean;
    maxStack: number;
};
export declare const BUILTIN_ITEM_TEMPLATES: ({
    id: string;
    type: string;
    name: string;
    slot: string;
    bonuses: {
        physicalAttack: number;
        magicAttack: number;
        moveSpeed: number;
        attackSpeed: number;
    };
} | {
    id: string;
    type: string;
    name: string;
    slot: string;
    stackable: boolean;
    maxStack: number;
})[];
export declare const BUILTIN_ITEM_TEMPLATE_BY_ID: Record<string, any>;
export declare const SKILL_RESET_HOURGLASS_DROP_CHANCE = 0.5;
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
        str: number;
        int: number;
        dex: number;
        vit: number;
        initialHp: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
    };
    knight: {
        str: number;
        int: number;
        dex: number;
        vit: number;
        initialHp: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
    };
    archer: {
        str: number;
        int: number;
        dex: number;
        vit: number;
        initialHp: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
    };
    druid: {
        str: number;
        int: number;
        dex: number;
        vit: number;
        initialHp: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
    };
    bandit: {
        str: number;
        int: number;
        dex: number;
        vit: number;
        initialHp: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
    };
    assassin: {
        str: number;
        int: number;
        dex: number;
        vit: number;
        initialHp: number;
        moveSpeed: number;
        attackSpeed: number;
        attackRange: number;
        damageType: string;
    };
};
//# sourceMappingURL=index.d.ts.map