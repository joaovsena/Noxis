import { User, Player, Item, MobTemplate } from '@prisma/client';

export interface PlayerRuntime {
    id: string;
    userId: string;
    username: string;
    name: string;
    class: string;
    gender: string;
    level: number;
    xp: number;
    hp: number;
    maxHp: number;
    baseStats: any;
    stats: any;
    statusOverrides: any;
    role: string;
    inventory: any;
    equippedWeaponId: string | null;
    ws: any;
    mapKey: string;
    mapId: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    autoAttackActive: boolean;
    attackTargetId: string | null;
    lastAttackAt: number;
    lastCombatAt: number;
    lastPortalAt?: number;
}

export interface Mob {
    id: string;
    x: number;
    y: number;
    kind: string;
    color: string;
    size: number;
    hp: number;
    maxHp: number;
    physicalDefense: number;
    magicDefense: number;
    xpReward: number;
    mapId: string;
}

export interface GroundItem {
    id: string;
    type: string;
    name: string;
    slot: string;
    bonuses: any;
    x: number;
    y: number;
    mapId: string;
}

export interface AuthMessage {
    type: 'auth_register' | 'auth_login';
    username: string;
    password: string;
    name?: string;
    class?: string;
}

export interface MoveMessage {
    type: 'move';
    reqId?: string;
    x: number;
    y: number;
}

export interface TargetMobMessage {
    type: 'target_mob';
    mobId: string;
}

export interface ChatMessage {
    type: 'chat_send';
    scope: 'local' | 'map' | 'global';
    text: string;
}

export interface PickupItemMessage {
    type: 'pickup_item';
    itemId: string;
}

export interface EquipItemMessage {
    type: 'equip_item';
    itemId: string | null;
}

export interface InventoryMoveMessage {
    type: 'inventory_move';
    itemId: string;
    toSlot: number;
}

export interface InventoryDeleteMessage {
    type: 'inventory_delete';
    itemId: string;
}

export interface InventoryUnequipToSlotMessage {
    type: 'inventory_unequip_to_slot';
    itemId: string;
    toSlot: number;
}

export interface SwitchInstanceMessage {
    type: 'switch_instance';
    mapId: string;
}

export interface AdminCommandMessage {
    type: 'admin_command';
    command: string;
}

export type WSMessage =
    | AuthMessage
    | MoveMessage
    | TargetMobMessage
    | ChatMessage
    | PickupItemMessage
    | EquipItemMessage
    | InventoryMoveMessage
    | InventoryDeleteMessage
    | InventoryUnequipToSlotMessage
    | SwitchInstanceMessage
    | AdminCommandMessage;
