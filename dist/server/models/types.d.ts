export interface PlayerRuntime {
    id: number;
    userId: string | number;
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
    allocatedStats: any;
    unspentPoints: number;
    statusOverrides: any;
    pvpMode: 'peace' | 'group' | 'evil';
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
    pvpAutoAttackActive?: boolean;
    attackTargetPlayerId?: number | null;
    dead?: boolean;
    deathX?: number;
    deathY?: number;
    partyId?: string | null;
    skillCooldowns?: Record<string, number>;
    skillLevels?: Record<string, number>;
    activeSkillEffects?: Array<any>;
    movePath?: Array<{
        x: number;
        y: number;
    }>;
    rawMovePath?: Array<{
        x: number;
        y: number;
    }>;
    nextPathfindAt?: number;
    pathDestinationX?: number;
    pathDestinationY?: number;
    lastMoveCheckX?: number;
    lastMoveCheckY?: number;
    lastMoveProgressAt?: number;
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
    level?: number;
    state?: 'idle' | 'wander' | 'aggro' | 'attack_windup' | 'leash_return';
    homeX?: number;
    homeY?: number;
    spawnX?: number;
    spawnY?: number;
    wanderTargetX?: number | null;
    wanderTargetY?: number | null;
    nextThinkAt?: number;
    nextAttackAt?: number;
    nextRepathAt?: number;
    ignoreDamage?: boolean;
    hateTable?: Record<string, number>;
    invulnerableUntil?: number;
    targetPlayerId?: number | null;
    lastAttackAt?: number;
}
export interface GroundItem {
    id: string;
    templateId?: string;
    type: string;
    name: string;
    slot: string;
    bonuses: any;
    quantity?: number;
    stackable?: boolean;
    maxStack?: number;
    healPercent?: number;
    x: number;
    y: number;
    mapId: string;
    expiresAt?: number;
}
export interface AuthMessage {
    type: 'auth_register' | 'auth_login';
    username: string;
    password: string;
    name?: string;
    class?: string;
}
export interface CharacterCreateMessage {
    type: 'character_create';
    name: string;
    class: string;
    gender?: string;
}
export interface CharacterEnterMessage {
    type: 'character_enter';
    slot?: number;
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
export interface EquipRequestMessage {
    type: 'equip_req';
    itemId: string | null;
}
export interface InventoryMoveMessage {
    type: 'inventory_move';
    itemId: string;
    toSlot: number;
}
export interface InventorySortMessage {
    type: 'inventory_sort';
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
export interface ItemUseMessage {
    type: 'item.use';
    itemId: string;
}
export interface SwitchInstanceMessage {
    type: 'switch_instance';
    mapId: string;
}
export interface AdminCommandMessage {
    type: 'admin_command';
    command: string;
}
export interface AdminSetMobPeacefulMessage {
    type: 'admin.setMobPeaceful';
    enabled: boolean;
}
export interface PartyCreateMessage {
    type: 'party.create';
}
export interface PartyInviteMessage {
    type: 'party.invite';
    targetName: string;
}
export interface PartyAcceptInviteMessage {
    type: 'party.acceptInvite';
    partyId: string;
    inviteId?: string;
}
export interface PartyDeclineInviteMessage {
    type: 'party.declineInvite';
    partyId: string;
    inviteId?: string;
}
export interface PartyLeaveMessage {
    type: 'party.leave';
}
export interface PartyKickMessage {
    type: 'party.kick';
    targetPlayerId: number;
}
export interface PartyPromoteMessage {
    type: 'party.promote';
    targetPlayerId: number;
}
export interface PartyRequestAreaPartiesMessage {
    type: 'party.requestAreaParties';
}
export interface PartyRequestJoinMessage {
    type: 'party.requestJoin';
    partyId: string;
}
export interface PartyApproveJoinMessage {
    type: 'party.approveJoin';
    requestId: string;
    accept: boolean;
}
export interface PartyWaypointPingMessage {
    type: 'party.waypointPing';
    x: number;
    y: number;
}
export interface FriendRequestMessage {
    type: 'friend.request';
    targetPlayerId?: number;
    targetName?: string;
}
export interface FriendAcceptMessage {
    type: 'friend.accept';
    requestId: string;
}
export interface FriendDeclineMessage {
    type: 'friend.decline';
    requestId: string;
}
export interface FriendRemoveMessage {
    type: 'friend.remove';
    friendPlayerId: number;
}
export interface FriendListMessage {
    type: 'friend.list';
}
export interface StatsAllocateMessage {
    type: 'stats.allocate';
    allocation: {
        str?: number;
        int?: number;
        dex?: number;
        vit?: number;
        physicalAttack?: number;
        magicAttack?: number;
        physicalDefense?: number;
        magicDefense?: number;
    };
}
export interface PlayerSetPvpModeMessage {
    type: 'player.setPvpMode';
    mode: 'peace' | 'group' | 'evil';
}
export interface CombatAttackMessage {
    type: 'combat.attack';
    targetPlayerId: number;
}
export interface CombatTargetPlayerMessage {
    type: 'combat.targetPlayer';
    targetPlayerId: number;
}
export interface CombatClearTargetMessage {
    type: 'combat.clearTarget';
}
export interface PlayerReviveMessage {
    type: 'player.revive';
}
export interface SkillCastMessage {
    type: 'skill.cast';
    skillId: string;
    targetMobId?: string | null;
    targetPlayerId?: number | null;
}
export interface SkillLearnMessage {
    type: 'skill.learn';
    skillId: string;
}
export interface HotbarSetMessage {
    type: 'hotbar.set';
    bindings: Record<string, any>;
}
export interface PingMessage {
    type: 'ping';
    nonce?: number;
}
export type WSMessage = AuthMessage | CharacterCreateMessage | CharacterEnterMessage | MoveMessage | TargetMobMessage | ChatMessage | PickupItemMessage | EquipItemMessage | EquipRequestMessage | InventoryMoveMessage | InventorySortMessage | InventoryDeleteMessage | InventoryUnequipToSlotMessage | ItemUseMessage | SwitchInstanceMessage | AdminCommandMessage | AdminSetMobPeacefulMessage | PartyCreateMessage | PartyInviteMessage | PartyAcceptInviteMessage | PartyDeclineInviteMessage | PartyLeaveMessage | PartyKickMessage | PartyPromoteMessage | PartyRequestAreaPartiesMessage | PartyRequestJoinMessage | PartyApproveJoinMessage | PartyWaypointPingMessage | FriendRequestMessage | FriendAcceptMessage | FriendDeclineMessage | FriendRemoveMessage | FriendListMessage | StatsAllocateMessage | PlayerSetPvpModeMessage | CombatAttackMessage | CombatTargetPlayerMessage | CombatClearTargetMessage | PlayerReviveMessage | SkillCastMessage | SkillLearnMessage | HotbarSetMessage | PingMessage;
//# sourceMappingURL=types.d.ts.map