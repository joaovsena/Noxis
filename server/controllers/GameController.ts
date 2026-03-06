import { randomUUID } from 'crypto';
import { PersistenceService } from '../services/PersistenceService';
import { MobService } from '../services/MobService';
import { PlayerRuntime, GroundItem, AuthMessage, MoveMessage } from '../models/types';
import { hashPassword } from '../utils/hash';
import { clamp, distance, levelUpStats, xpRequired } from '../utils/math';
import {
    CLASS_TEMPLATES,
    WORLD,
    DEFAULT_MAP_ID,
    DEFAULT_MAP_KEY,
    MAP_IDS,
    MAP_KEYS,
    ITEM_PICKUP_RANGE,
    BASE_MOVE_SPEED,
    PLAYER_HALF_SIZE,
    STATUS_IDS,
    COMBAT_LOCK_MS,
    MAP_THEMES,
    MAP_KEY_BY_CODE,
    PORTALS_BY_MAP_KEY,
    PORTAL_COOLDOWN_MS,
    composeMapInstanceId,
    INVENTORY_SIZE,
    LOCAL_CHAT_RADIUS,
    WEAPON_TEMPLATE,
    STATUS_BY_ID,
    GROUND_ITEM_TTL_MS,
    PARTY_MAX_MEMBERS,
    PARTY_INVITE_TTL_MS,
    PARTY_JOIN_REQUEST_TTL_MS,
    mapCodeFromKey,
    MAP_FEATURES_BY_KEY,
    MOB_AGGRO_RANGE,
    MOB_LEASH_RANGE,
    MOB_ATTACK_RANGE,
    MOB_ATTACK_INTERVAL_MS,
    HP_POTION_TEMPLATE
} from '../config';
import { logEvent } from '../utils/logger';

interface Party {
    id: string;
    leaderId: number;
    memberIds: number[];
    createdAt: number;
    areaId: string;
    maxMembers: number;
}

interface PartyInvite {
    id: string;
    partyId: string;
    fromPlayerId: number;
    toPlayerId: number;
    expiresAt: number;
}

interface PartyJoinRequest {
    id: string;
    partyId: string;
    fromPlayerId: number;
    toLeaderId: number;
    expiresAt: number;
}

interface FriendRequestItem {
    id: string;
    fromPlayerId: number;
    toPlayerId: number;
    createdAt: number;
    expiresAt: number;
}

const ALLOCATABLE_STATS = ['physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense'] as const;
type AllocatableStat = typeof ALLOCATABLE_STATS[number];
const PARTY_WAYPOINT_TTL_MS = 10000;
const PATHFIND_CELL_SIZE = 12;
const PATHFIND_MAX_ITERS = 220000;
const PATH_RECALC_MS = 280;
const PATH_PROBE_RADIUS = Math.max(8, PLAYER_HALF_SIZE - 6);
const PATH_PLAN_RADIUS = PATH_PROBE_RADIUS + 1;
const MOVE_COLLISION_PADDING = 4;

export class GameController {
    private persistence: PersistenceService;
    private mobService: MobService;
    players: Map<number, PlayerRuntime> = new Map();
    usernameToPlayerId: Map<string, number> = new Map();
    groundItems: GroundItem[] = [];
    private parties: Map<string, Party> = new Map();
    private partyInvites: Map<string, PartyInvite> = new Map();
    private partyJoinRequests: Map<string, PartyJoinRequest> = new Map();
    private friendLinks: Map<number, Set<number>> = new Map();
    private friendRequests: Map<string, FriendRequestItem> = new Map();
    private friendRequestWindow: Map<number, number[]> = new Map();
    private lastPartySyncAt = 0;
    private lastFriendDbPruneAt = 0;
    private mobsPeacefulMode = false;

    constructor(persistence: PersistenceService, mobService: MobService) {
        this.persistence = persistence;
        this.mobService = mobService;
    }

    async handleAuth(ws: any, msg: AuthMessage) {
        if (msg.type === 'auth_register') {
            await this.handleRegister(ws, msg);
            return;
        }
        if (msg.type === 'auth_login') {
            await this.handleLogin(ws, msg);
        }
    }

    private async handleRegister(ws: any, msg: AuthMessage) {
        const username = String(msg.username || '').trim().toLowerCase();
        const password = String(msg.password || '');
        const name = String(msg.name || '').trim();
        const selectedClass = CLASS_TEMPLATES[msg.class as keyof typeof CLASS_TEMPLATES] ? msg.class : 'knight';
        const gender = 'male';

        if (username.length < 3 || password.length < 3 || name.length < 3) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Preencha usuario, senha e nome com ao menos 3 caracteres.' }));
            return;
        }

        const existing = await this.persistence.getUser(username);
        if (existing) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Usuario ja existe.' }));
            return;
        }

        const existingPlayer = await this.persistence.getPlayerByName(name);
        if (existingPlayer) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Ja existe um personagem com esse nome.' }));
            return;
        }

        const baseStats = { ...CLASS_TEMPLATES[selectedClass as keyof typeof CLASS_TEMPLATES] };
        const isSena = username === 'sena' || name.toLowerCase() === 'sena';
        const profile = {
            name,
            class: selectedClass,
            gender,
            level: 1,
            xp: 0,
            hp: baseStats.maxHp,
            maxHp: baseStats.maxHp,
            role: isSena ? 'adm' : 'player',
            statusOverrides: {},
            pvpMode: 'peace',
            allocatedStats: {
                physicalAttack: 0,
                magicAttack: 0,
                physicalDefense: 0,
                magicDefense: 0
            },
            unspentPoints: 0,
            inventory: [],
            equippedWeaponId: null,
            mapKey: DEFAULT_MAP_KEY,
            mapId: DEFAULT_MAP_ID,
            posX: 500,
            posY: 500,
            baseStats,
            stats: levelUpStats(baseStats, 1)
        };

        await this.persistence.createUser(username, password, profile);
        ws.send(JSON.stringify({ type: 'auth_ok', message: 'Registro concluido. Agora faca login.' }));
    }

    private async handleLogin(ws: any, msg: AuthMessage) {
        const username = String(msg.username || '').trim().toLowerCase();
        const password = String(msg.password || '');

        try {
            const account = await this.persistence.getUser(username);

            if (!account || !account.player) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Usuario ou senha invalidos.' }));
                return;
            }

            const incomingHash = hashPassword(password, account.salt);
            if (incomingHash !== account.passwordHash) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Usuario ou senha invalidos.' }));
                return;
            }

            if (this.usernameToPlayerId.has(username)) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Esse usuario ja esta online.' }));
                return;
            }

            const player = this.createRuntimePlayer(username, account.player);
            player.ws = ws;
            this.players.set(player.id, player);
            this.usernameToPlayerId.set(username, player.id);
            ws.playerId = player.id;

            ws.send(JSON.stringify({
                type: 'auth_success',
                playerId: player.id,
                world: WORLD,
                role: player.role,
                statusIds: STATUS_IDS
            }));
            ws.send(JSON.stringify({
                type: 'inventory_state',
                inventory: player.inventory,
                equippedWeaponId: player.equippedWeaponId
            }));
            ws.send(JSON.stringify(this.buildWorldSnapshot(player.mapId, player.mapKey)));
            this.sendPartyStateToPlayer(player, null);
            this.sendPartyAreaList(player);
            if (player.role === 'adm') {
                this.sendRaw(player.ws, {
                    type: 'admin.mobPeacefulState',
                    enabled: this.mobsPeacefulMode
                });
            }
            await this.hydrateFriendStateForPlayer(player);
            this.sendFriendState(player);

            logEvent('INFO', 'user_login', { username, playerId: player.id });
        } catch (error) {
            logEvent('ERROR', 'login_error', { username, error: String(error) });
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Erro ao fazer login.' }));
        }
    }

    private createRuntimePlayer(username: string, profile: any): PlayerRuntime {
        const mapKey = MAP_KEYS.includes(profile?.mapKey) ? profile.mapKey : DEFAULT_MAP_KEY;
        const mapId = MAP_IDS.includes(profile?.mapId) ? profile.mapId : DEFAULT_MAP_ID;
        const spawn = this.projectToWalkable(
            mapKey,
            clamp(Number.isFinite(Number(profile?.posX)) ? Number(profile.posX) : 500, 0, WORLD.width),
            clamp(Number.isFinite(Number(profile?.posY)) ? Number(profile.posY) : 500, 0, WORLD.height)
        );
        const parsedId = Number(profile?.id);
        const id = Number.isInteger(parsedId) ? parsedId : Math.floor(Date.now() % 2147483647);
        const maxHp = profile.stats?.maxHp || profile.baseStats?.maxHp || 100;
        const allocatedStats = this.normalizeAllocatedStats(profile.allocatedStats);
        const unspentRaw = Number(profile.unspentPoints);
        const unspentPoints = Number.isInteger(unspentRaw) && unspentRaw > 0 ? unspentRaw : 0;
        const isSena = String(username || '').toLowerCase() === 'sena' || String(profile?.name || '').toLowerCase() === 'sena';
        const runtime: PlayerRuntime = {
            ...profile,
            id,
            ws: null,
            username,
            role: isSena ? 'adm' : profile?.role === 'adm' ? 'adm' : 'player',
            pvpMode: profile?.pvpMode === 'evil' ? 'evil' : 'peace',
            allocatedStats,
            unspentPoints,
            inventory: this.normalizeInventorySlots(
                Array.isArray(profile.inventory) ? profile.inventory : [],
                profile?.equippedWeaponId ? String(profile.equippedWeaponId) : null
            ),
            mapKey,
            mapId,
            x: spawn.x,
            y: spawn.y,
            targetX: spawn.x,
            targetY: spawn.y,
            autoAttackActive: false,
            attackTargetId: null,
            lastAttackAt: 0,
            lastCombatAt: 0,
            lastPortalAt: 0,
            pvpAutoAttackActive: false,
            attackTargetPlayerId: null,
            dead: false,
            deathX: spawn.x,
            deathY: spawn.y,
            partyId: null,
            skillCooldowns: {},
            movePath: [],
            nextPathfindAt: 0,
            pathDestinationX: spawn.x,
            pathDestinationY: spawn.y
        };
        this.recomputePlayerStats(runtime);
        return runtime;
    }

    handleMove(player: PlayerRuntime, msg: MoveMessage) {
        if (player.dead || player.hp <= 0) return;
        const incomingX = Number(msg.x);
        const incomingY = Number(msg.y);
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        const projected = this.projectToWalkable(
            player.mapKey,
            clamp(Number.isFinite(incomingX) ? incomingX : player.x, 0, WORLD.width),
            clamp(Number.isFinite(incomingY) ? incomingY : player.y, 0, WORLD.height)
        );
        this.assignPathTo(player, projected.x, projected.y);
        player.ws.send(JSON.stringify({
            type: 'move_ack',
            reqId: msg.reqId,
            targetX: player.targetX,
            targetY: player.targetY,
            pathNodes: Array.isArray(player.movePath) ? player.movePath : []
        }));
    }

    handleTargetMob(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const mobId = String(msg.mobId || '');
        const mob = this.mobService.getMobs().find((m) => m.id === mobId && m.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (!mob) {
            player.autoAttackActive = false;
            player.attackTargetId = null;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            return;
        }
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        player.autoAttackActive = true;
        player.attackTargetId = mob.id;
    }

    handleChat(player: PlayerRuntime, msg: any) {
        const scope = msg.scope === 'global' || msg.scope === 'map' ? msg.scope : 'local';
        const text = String(msg.text || '').trim();
        if (!text) return;

        const payload = {
            type: 'chat_message',
            id: randomUUID(),
            fromId: player.id,
            scope,
            from: player.name,
            mapId: player.mapId,
            mapKey: player.mapKey,
            text: text.slice(0, 180),
            at: Date.now()
        };

        if (scope === 'global') {
            this.broadcastRaw(payload);
            return;
        }

        this.sendRaw(player.ws, payload);
        for (const receiver of this.players.values()) {
            if (receiver.id === player.id) continue;
            if (scope === 'map') {
                if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey) continue;
                this.sendRaw(receiver.ws, payload);
                continue;
            }
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey) continue;
            if (distance(receiver, player) > LOCAL_CHAT_RADIUS) continue;
            this.sendRaw(receiver.ws, payload);
        }
    }

    handleSwitchInstance(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const target = MAP_IDS.includes(msg.mapId) ? msg.mapId : null;
        if (!target || target === player.mapId) return;
        const inCombat = Date.now() - (player.lastCombatAt || 0) < COMBAT_LOCK_MS;
        if (inCombat) {
            player.ws.send(JSON.stringify({ type: 'system_message', text: 'Voce esta em combate. Aguarde 10s sem atacar.' }));
            return;
        }

        // Regra pedida: ao trocar E1 <-> E2, mantem a mesma coordenada X,Y.
        player.mapId = target;
        player.targetX = player.x;
        player.targetY = player.y;
        player.movePath = [];
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        player.attackTargetId = null;
        player.autoAttackActive = false;
        player.ws.send(JSON.stringify({ type: 'system_message', text: `Instancia alterada para ${target}.` }));
        this.sendPartyAreaList(player);
    }

    handlePickupItem(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const index = this.groundItems.findIndex((it) => it.id === itemId && it.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (index === -1) return;
        const item = this.groundItems[index];
        if (typeof item.expiresAt === 'number' && item.expiresAt <= Date.now()) {
            this.groundItems.splice(index, 1);
            return;
        }
        if (distance(player, item) > ITEM_PICKUP_RANGE) return;
        let remaining = Math.max(1, Math.floor(Number(item.quantity || 1)));
        remaining = this.addItemToInventory(player, item, remaining);
        if (remaining <= 0) {
            this.groundItems.splice(index, 1);
        } else {
            this.groundItems[index] = { ...item, quantity: remaining };
        }
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleEquipItem(player: PlayerRuntime, msg: any) {
        const itemId = msg.itemId ? String(msg.itemId) : null;
        if (!itemId) {
            const equipped = player.equippedWeaponId
                ? player.inventory.find((it: any) => it.id === player.equippedWeaponId && it.type === 'weapon')
                : null;
            if (equipped && (!Number.isInteger(equipped.slotIndex) || equipped.slotIndex < 0)) {
                equipped.slotIndex = this.firstFreeInventorySlot(player.inventory, new Set([equipped.id]));
            }
            player.equippedWeaponId = null;
            player.inventory = this.normalizeInventorySlots(player.inventory, null);
            this.recomputePlayerStats(player);
            this.persistPlayer(player);
            this.sendInventoryState(player);
            return;
        }

        const found = player.inventory.find((it: any) => it.id === itemId && it.type === 'weapon');
        if (!found) return;
        const previousEquippedId = player.equippedWeaponId && player.equippedWeaponId !== found.id ? player.equippedWeaponId : null;
        if (previousEquippedId) {
            const oldEquipped = player.inventory.find((it: any) => it.id === previousEquippedId && it.type === 'weapon');
            if (oldEquipped) {
                oldEquipped.slotIndex = Number.isInteger(found.slotIndex) && found.slotIndex >= 0
                    ? found.slotIndex
                    : this.firstFreeInventorySlot(player.inventory, new Set([oldEquipped.id, found.id]));
            }
        }
        found.slotIndex = -1;

        player.equippedWeaponId = found.id;
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventoryMove(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const toSlot = Number(msg.toSlot);
        if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= INVENTORY_SIZE) return;
        if (player.equippedWeaponId && player.equippedWeaponId === itemId) return;

        const item = player.inventory.find((it: any) => it.id === itemId);
        if (!item) return;

        const occupant = player.inventory.find((it: any) => it.slotIndex === toSlot);
        const fromSlot = item.slotIndex;
        item.slotIndex = toSlot;
        if (occupant && occupant.id !== item.id) occupant.slotIndex = fromSlot;

        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventorySort(player: PlayerRuntime) {
        const equippedId = player.equippedWeaponId || null;
        const sorted = [...player.inventory]
            .filter((it: any) => it.id !== equippedId)
            .sort((a: any, b: any) => {
            const byName = String(a.name || '').localeCompare(String(b.name || ''));
            if (byName !== 0) return byName;
            return String(a.id).localeCompare(String(b.id));
        });
        for (let i = 0; i < sorted.length && i < INVENTORY_SIZE; i++) {
            sorted[i].slotIndex = i;
        }
        if (equippedId) {
            const equipped = player.inventory.find((it: any) => it.id === equippedId);
            if (equipped) sorted.push({ ...equipped, slotIndex: -1 });
        }
        player.inventory = this.normalizeInventorySlots(sorted, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventoryDelete(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const index = player.inventory.findIndex((it: any) => it.id === itemId);
        if (index === -1) return;
        if (player.equippedWeaponId === itemId) {
            player.equippedWeaponId = null;
            this.recomputePlayerStats(player);
        }
        player.inventory.splice(index, 1);
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleInventoryUnequipToSlot(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const toSlot = Number(msg.toSlot);
        if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= INVENTORY_SIZE) return;
        if (player.equippedWeaponId !== itemId) return;

        const item = player.inventory.find((it: any) => it.id === itemId);
        if (!item) return;
        const occupant = player.inventory.find((it: any) => it.slotIndex === toSlot && it.id !== itemId);
        const fromSlot = item.slotIndex;
        item.slotIndex = toSlot;
        if (occupant) occupant.slotIndex = fromSlot;
        player.equippedWeaponId = null;

        this.recomputePlayerStats(player);
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    handleItemUse(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const itemId = String(msg?.itemId || '');
        if (!itemId) return;
        const index = player.inventory.findIndex((it: any) => String(it?.id || '') === itemId);
        if (index === -1) return;
        const item = player.inventory[index];
        if (String(item?.type || '') !== 'potion_hp') return;

        const healPercent = Number.isFinite(Number(item?.healPercent)) ? Number(item.healPercent) : Number(HP_POTION_TEMPLATE.healPercent || 0.5);
        const amount = Math.max(1, Math.floor(Number(player.maxHp || 1) * Math.max(0, healPercent)));
        player.hp = clamp(Number(player.hp || 0) + amount, 1, Number(player.maxHp || 1));
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        if (quantity > 1) {
            item.quantity = quantity - 1;
        } else {
            player.inventory.splice(index, 1);
        }
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);

        this.persistPlayer(player);
        this.sendInventoryState(player);
        this.sendStatsUpdated(player);
    }

    async handleAdminCommand(player: PlayerRuntime, msg: any) {
        if (player.role !== 'adm') return;
        const raw = String(msg.command || '').trim();
        const parts = raw.split(/\s+/);
        const command = String(parts[0] || '').toLowerCase();
        if (!command) {
            this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Comando vazio.' });
            return;
        }

        if (command === 'setstatus') {
            if (parts.length < 4) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: setstatus {id} {quantia} {jogador}' });
                return;
            }
            const statusId = String(parts[1]);
            const key = STATUS_BY_ID[statusId];
            const value = Number(parts[2]);
            const target = this.findOnlinePlayerByName(parts[3]);
            if (!key || !Number.isFinite(value) || !target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Comando invalido.' });
                return;
            }

            target.statusOverrides = target.statusOverrides || {};
            const leveled = levelUpStats(target.baseStats, target.level);
            const hasOverride = Object.prototype.hasOwnProperty.call(target.statusOverrides, key);
            const currentOverride = hasOverride
                ? Number(target.statusOverrides[key])
                : Number((leveled as any)[key]);
            const safeCurrentOverride = Number.isFinite(currentOverride) ? currentOverride : 0;
            target.statusOverrides[key] = safeCurrentOverride + value;
            this.recomputePlayerStats(target);
            this.persistPlayer(target);
            this.sendStatsUpdated(target);
            const total = Number(target.stats?.[key]);
            const safeTotal = Number.isFinite(total) ? total : target.statusOverrides[key];
            this.sendRaw(player.ws, {
                type: 'admin_result',
                ok: true,
                message: `Status ${key} de ${target.name}: ${value >= 0 ? '+' : ''}${value} aplicado. Total: ${safeTotal}`
            });
            return;
        }

        if (command === 'setrolelevel') {
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: setrolelevel {nivel} {jogador}' });
                return;
            }
            const level = Number(parts[1]);
            const target = this.findOnlinePlayerByName(parts[2]);
            if (!target || !Number.isInteger(level) || level < 1) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Nivel/jogador invalido.' });
                return;
            }
            target.level = level;
            target.xp = 0;
            this.recomputePlayerStats(target);
            this.persistPlayer(target);
            this.sendStatsUpdated(target);
            this.sendRaw(player.ws, { type: 'admin_result', ok: true, message: `${target.name} agora esta no nivel ${level}.` });
            return;
        }

        if (command === 'gotomap') {
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: gotomap {codigodomapa} {jogador}' });
                return;
            }
            const targetMapCode = String(parts[1] || '').toUpperCase();
            const mapKey = MAP_KEY_BY_CODE[targetMapCode] || null;
            const target = this.findOnlinePlayerByName(parts[2]);
            if (!target || !mapKey) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Mapa/jogador invalido. Use A1, A2 ou A3.' });
                return;
            }
            target.mapKey = mapKey;
            const projected = this.projectToWalkable(
                target.mapKey,
                clamp(target.x, 0, WORLD.width),
                clamp(target.y, 0, WORLD.height)
            );
            target.x = projected.x;
            target.y = projected.y;
            target.targetX = target.x;
            target.targetY = target.y;
            target.movePath = [];
            target.pathDestinationX = target.x;
            target.pathDestinationY = target.y;
            target.attackTargetId = null;
            target.autoAttackActive = false;
            target.attackTargetPlayerId = null;
            target.pvpAutoAttackActive = false;
            this.persistPlayer(target);
            this.sendPartyAreaList(target);
            this.sendRaw(target.ws, { type: 'system_message', text: `ADM: voce foi para o mapa ${targetMapCode} (instancia ${target.mapId}).` });
            this.sendRaw(player.ws, { type: 'admin_result', ok: true, message: `${target.name} enviado para ${targetMapCode} mantendo instancia ${target.mapId}.` });
            return;
        }

        if (command === 'teleport') {
            if (parts.length < 2) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: teleport {jogador}' });
                return;
            }
            const target = this.findOnlinePlayerByName(parts[1]);
            if (!target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Jogador nao encontrado.' });
                return;
            }
            player.mapKey = target.mapKey;
            player.mapId = target.mapId;
            const projected = this.projectToWalkable(
                player.mapKey,
                clamp(target.x, 0, WORLD.width),
                clamp(target.y, 0, WORLD.height)
            );
            player.x = projected.x;
            player.y = projected.y;
            player.targetX = player.x;
            player.targetY = player.y;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            player.attackTargetId = null;
            player.autoAttackActive = false;
            player.attackTargetPlayerId = null;
            player.pvpAutoAttackActive = false;
            this.persistPlayer(player);
            this.sendPartyAreaList(player);
            this.sendRaw(player.ws, { type: 'admin_result', ok: true, message: `Teleportado para ${target.name}.` });
            return;
        }

        if (command === 'summonplayer') {
            if (parts.length < 2) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: summonplayer {jogador}' });
                return;
            }
            const target = this.findOnlinePlayerByName(parts[1]);
            if (!target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Jogador nao encontrado.' });
                return;
            }
            target.mapKey = player.mapKey;
            target.mapId = player.mapId;
            const projected = this.projectToWalkable(
                target.mapKey,
                clamp(player.x, 0, WORLD.width),
                clamp(player.y, 0, WORLD.height)
            );
            target.x = projected.x;
            target.y = projected.y;
            target.targetX = target.x;
            target.targetY = target.y;
            target.movePath = [];
            target.pathDestinationX = target.x;
            target.pathDestinationY = target.y;
            target.attackTargetId = null;
            target.autoAttackActive = false;
            target.attackTargetPlayerId = null;
            target.pvpAutoAttackActive = false;
            this.persistPlayer(target);
            this.sendPartyAreaList(target);
            this.sendRaw(target.ws, { type: 'system_message', text: `ADM: voce foi invocado por ${player.name}.` });
            this.sendRaw(player.ws, { type: 'admin_result', ok: true, message: `${target.name} invocado ate voce.` });
            return;
        }

        if (command === 'additem') {
            if (parts.length < 4) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: additem {iddoitem} {quantia} {jogador}' });
                return;
            }
            const itemId = String(parts[1]);
            const quantity = Number(parts[2]);
            const target = this.findOnlinePlayerByName(parts[3]);
            if (!target || !Number.isInteger(quantity) || quantity <= 0) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Item/quantia/jogador invalido.' });
                return;
            }
            const template = await this.persistence.getItemById(itemId);
            if (!template) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: `Item ${itemId} nao encontrado.` });
                return;
            }

            let added = 0;
            for (let i = 0; i < quantity; i++) {
                const slot = this.firstFreeInventorySlot(target.inventory);
                if (slot === -1) break;
                target.inventory.push({
                    id: randomUUID(),
                    templateId: template.id,
                    type: template.type,
                    name: template.name,
                    slot: template.slot,
                    bonuses: template.bonuses,
                    slotIndex: slot
                });
                added += 1;
            }
            target.inventory = this.normalizeInventorySlots(target.inventory, target.equippedWeaponId || null);
            this.persistPlayer(target);
            this.sendInventoryState(target);
            this.sendRaw(player.ws, {
                type: 'admin_result',
                ok: true,
                message: `${added}/${quantity}x ${template.name} adicionado(s) para ${target.name}.`
            });
            return;
        }

        if (command === 'settag') {
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: settag {player|adm} {jogador}' });
                return;
            }
            const rawTag = String(parts[1] || '').toLowerCase();
            const tag = rawTag === 'players' ? 'player' : rawTag;
            const target = this.findOnlinePlayerByName(parts[2]);
            if (!target || (tag !== 'player' && tag !== 'adm')) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Tag/jogador invalido. Use player ou adm.' });
                return;
            }
            target.role = tag;
            this.persistPlayer(target);
            this.sendRaw(target.ws, { type: 'system_message', text: `Sua tag foi alterada para ${tag}.` });
            this.sendRaw(player.ws, { type: 'admin_result', ok: true, message: `${target.name} agora possui tag ${tag}.` });
            return;
        }

        this.sendRaw(player.ws, {
            type: 'admin_result',
            ok: false,
            message: 'Comando invalido. Use: setstatus, setrolelevel, gotomap, teleport, summonplayer, additem, settag.'
        });
    }

    handlePartyCreate(player: PlayerRuntime) {
        if (player.partyId && this.parties.has(player.partyId)) {
            this.sendPartyError(player, 'Voce ja esta em um grupo.');
            return;
        }

        const partyId = randomUUID();
        const party: Party = {
            id: partyId,
            leaderId: player.id,
            memberIds: [player.id],
            createdAt: Date.now(),
            areaId: this.getAreaIdForPlayer(player),
            maxMembers: PARTY_MAX_MEMBERS
        };
        this.parties.set(partyId, party);
        player.partyId = partyId;
        this.syncPartyStateForMembers(party, true);
        this.sendPartyAreaList(player);
    }

    handlePartyInvite(player: PlayerRuntime, msg: any) {
        const targetName = String(msg.targetName || '').trim().toLowerCase();
        if (!targetName) return;
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        if (!party) {
            this.sendPartyError(player, 'Crie um grupo antes de convidar.');
            return;
        }
        if (party.leaderId !== player.id) {
            this.sendPartyError(player, 'Somente o lider pode convidar.');
            return;
        }
        if (party.memberIds.length >= party.maxMembers) {
            this.sendPartyError(player, 'Grupo cheio.');
            return;
        }

        const target = [...this.players.values()].find((candidate) => {
            const byName = String(candidate.name || '').toLowerCase() === targetName;
            const byUsername = String(candidate.username || '').toLowerCase() === targetName;
            return byName || byUsername;
        });
        if (!target) {
            this.sendPartyError(player, 'Jogador alvo nao encontrado pelo nome.');
            return;
        }
        if (target.id === player.id) {
            this.sendPartyError(player, 'Voce nao pode convidar a si mesmo.');
            return;
        }
        if (target.partyId && this.parties.has(target.partyId)) {
            this.sendPartyError(player, 'Jogador alvo ja esta em grupo.');
            return;
        }
        if (this.getAreaIdForPlayer(target) !== this.getAreaIdForPlayer(player)) {
            this.sendPartyError(player, 'Jogador alvo esta em outra area.');
            return;
        }
        const now = Date.now();
        this.pruneExpiredPartyInvites(now);
        for (const invite of this.partyInvites.values()) {
            if (invite.fromPlayerId === player.id && invite.toPlayerId === target.id) {
                this.sendPartyError(player, 'Convite para esse jogador ja esta pendente.');
                return;
            }
        }

        const invite: PartyInvite = {
            id: randomUUID(),
            partyId: party.id,
            fromPlayerId: player.id,
            toPlayerId: target.id,
            expiresAt: now + PARTY_INVITE_TTL_MS
        };
        this.partyInvites.set(invite.id, invite);
        this.sendRaw(target.ws, {
            type: 'party.inviteReceived',
            inviteId: invite.id,
            fromPlayerId: player.id,
            fromName: player.name,
            partyId: party.id,
            expiresIn: PARTY_INVITE_TTL_MS
        });
        this.sendRaw(player.ws, { type: 'system_message', text: `Convite enviado para ${target.name}.` });
    }

    handlePartyAcceptInvite(player: PlayerRuntime, msg: any) {
        const partyId = String(msg.partyId || '');
        const inviteId = String(msg.inviteId || '');
        const now = Date.now();
        this.pruneExpiredPartyInvites(now);
        const invite = inviteId
            ? this.partyInvites.get(inviteId) || null
            : [...this.partyInvites.values()].find((it) => it.partyId === partyId && it.toPlayerId === player.id) || null;
        if (!invite) {
            this.sendPartyError(player, 'Convite invalido ou expirado.');
            return;
        }
        if (invite.toPlayerId !== player.id) {
            this.sendPartyError(player, 'Convite invalido para este jogador.');
            return;
        }
        const party = this.parties.get(partyId);
        if (!party) {
            this.partyInvites.delete(invite.id);
            this.sendPartyError(player, 'Grupo nao existe mais.');
            return;
        }
        if (party.memberIds.length >= party.maxMembers) {
            this.partyInvites.delete(invite.id);
            this.sendPartyError(player, 'Grupo cheio.');
            return;
        }
        if (player.partyId && this.parties.has(player.partyId)) {
            this.partyInvites.delete(invite.id);
            this.sendPartyError(player, 'Voce ja esta em outro grupo.');
            return;
        }

        party.memberIds.push(player.id);
        player.partyId = party.id;
        this.partyInvites.delete(invite.id);
        this.syncPartyStateForMembers(party, true);
        this.sendPartyAreaList(player);
        const inviter = this.players.get(invite.fromPlayerId);
        if (inviter) {
            this.sendRaw(inviter.ws, { type: 'system_message', text: `${player.name} aceitou seu convite de grupo.` });
        }
    }

    handlePartyDeclineInvite(player: PlayerRuntime, msg: any) {
        const partyId = String(msg.partyId || '');
        const inviteId = String(msg.inviteId || '');
        if (inviteId) {
            const invite = this.partyInvites.get(inviteId);
            if (!invite || invite.toPlayerId !== player.id) return;
            this.partyInvites.delete(inviteId);
            const inviter = this.players.get(invite.fromPlayerId);
            if (inviter) {
                this.sendRaw(inviter.ws, { type: 'system_message', text: `${player.name} recusou seu convite de grupo.` });
            }
            return;
        }
        for (const [storedInviteId, invite] of this.partyInvites.entries()) {
            if (invite.partyId === partyId && invite.toPlayerId === player.id) {
                this.partyInvites.delete(storedInviteId);
                const inviter = this.players.get(invite.fromPlayerId);
                if (inviter) {
                    this.sendRaw(inviter.ws, { type: 'system_message', text: `${player.name} recusou seu convite de grupo.` });
                }
                return;
            }
        }
    }

    handlePartyLeave(player: PlayerRuntime) {
        this.removePlayerFromParty(player);
    }

    handlePartyKick(player: PlayerRuntime, msg: any) {
        const targetPlayerId = Number(msg.targetPlayerId);
        if (!Number.isInteger(targetPlayerId)) return;
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        if (!party) return;
        if (party.leaderId !== player.id) {
            this.sendPartyError(player, 'Somente o lider pode expulsar.');
            return;
        }
        if (targetPlayerId === player.id) {
            this.sendPartyError(player, 'Use sair para deixar o grupo.');
            return;
        }
        if (!party.memberIds.includes(targetPlayerId)) return;
        const target = this.players.get(targetPlayerId);
        if (target) {
            target.partyId = null;
            if (target.pvpMode === 'group') {
                target.pvpMode = 'peace';
                this.broadcastRaw({
                    type: 'player.pvpModeUpdated',
                    playerId: target.id,
                    mode: 'peace'
                });
                this.persistPlayer(target);
            }
            this.sendPartyStateToPlayer(target, null);
        }
        party.memberIds = party.memberIds.filter((id) => id !== targetPlayerId);
        if (party.memberIds.length === 0) {
            this.clearJoinRequestsForParty(party.id);
            this.parties.delete(party.id);
            return;
        }
        this.syncPartyStateForMembers(party, true);
    }

    handlePartyPromote(player: PlayerRuntime, msg: any) {
        const targetPlayerId = Number(msg.targetPlayerId);
        if (!Number.isInteger(targetPlayerId)) return;
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        if (!party) return;
        if (party.leaderId !== player.id) {
            this.sendPartyError(player, 'Somente o lider pode promover.');
            return;
        }
        if (!party.memberIds.includes(targetPlayerId)) return;
        party.leaderId = targetPlayerId;
        this.clearJoinRequestsForParty(party.id);
        this.syncPartyStateForMembers(party, true);
    }

    handlePartyRequestAreaParties(player: PlayerRuntime) {
        this.sendPartyAreaList(player);
    }

    handlePartyRequestJoin(player: PlayerRuntime, msg: any) {
        const partyId = String(msg.partyId || '');
        const party = this.parties.get(partyId);
        if (!party) {
            this.sendPartyError(player, 'Grupo nao encontrado.');
            return;
        }
        if (player.partyId && this.parties.has(player.partyId)) {
            this.sendPartyError(player, 'Voce ja esta em um grupo.');
            return;
        }
        if (party.memberIds.length >= party.maxMembers) {
            this.sendPartyError(player, 'Grupo cheio.');
            return;
        }
        if (this.getAreaIdForPlayer(player) !== party.areaId) {
            this.sendPartyError(player, 'Voce precisa estar na mesma area do grupo.');
            return;
        }

        const now = Date.now();
        this.pruneExpiredPartyJoinRequests(now);
        for (const req of this.partyJoinRequests.values()) {
            if (req.partyId === party.id && req.fromPlayerId === player.id) {
                this.sendPartyError(player, 'Solicitacao de entrada ja enviada.');
                return;
            }
        }

        const request: PartyJoinRequest = {
            id: randomUUID(),
            partyId: party.id,
            fromPlayerId: player.id,
            toLeaderId: party.leaderId,
            expiresAt: now + PARTY_JOIN_REQUEST_TTL_MS
        };
        this.partyJoinRequests.set(request.id, request);
        const leader = this.players.get(party.leaderId);
        if (leader) {
            this.sendRaw(leader.ws, {
                type: 'party.joinRequestReceived',
                requestId: request.id,
                partyId: party.id,
                fromPlayerId: player.id,
                fromName: player.name,
                expiresIn: PARTY_JOIN_REQUEST_TTL_MS
            });
        }
        this.sendRaw(player.ws, { type: 'system_message', text: 'Solicitacao enviada ao lider do grupo.' });
    }

    handlePartyApproveJoin(player: PlayerRuntime, msg: any) {
        const requestId = String(msg.requestId || '');
        const accept = Boolean(msg.accept);
        const now = Date.now();
        this.pruneExpiredPartyJoinRequests(now);

        const request = this.partyJoinRequests.get(requestId);
        if (!request) {
            this.sendPartyError(player, 'Solicitacao invalida ou expirada.');
            return;
        }

        const party = this.parties.get(request.partyId);
        if (!party) {
            this.partyJoinRequests.delete(requestId);
            this.sendPartyError(player, 'Grupo nao existe mais.');
            return;
        }
        if (party.leaderId !== player.id || request.toLeaderId !== player.id) {
            this.sendPartyError(player, 'Somente o lider pode aprovar.');
            return;
        }

        const requester = this.players.get(request.fromPlayerId);
        this.partyJoinRequests.delete(requestId);

        if (!accept) {
            if (requester) {
                this.sendRaw(requester.ws, { type: 'party.joinRequestResult', ok: false, message: 'Solicitacao recusada.' });
            }
            this.sendRaw(player.ws, { type: 'system_message', text: 'Solicitacao de entrada recusada.' });
            return;
        }

        if (!requester) {
            this.sendPartyError(player, 'Jogador solicitante nao esta online.');
            return;
        }
        if (requester.partyId && this.parties.has(requester.partyId)) {
            this.sendPartyError(player, 'Jogador solicitante ja entrou em outro grupo.');
            return;
        }
        if (party.memberIds.length >= party.maxMembers) {
            this.sendPartyError(player, 'Grupo cheio.');
            return;
        }

        party.memberIds.push(requester.id);
        requester.partyId = party.id;
        this.clearJoinRequestsForPlayer(requester.id);
        this.syncPartyStateForMembers(party, true);
        this.sendRaw(requester.ws, { type: 'party.joinRequestResult', ok: true, message: 'Entrada no grupo aprovada.' });
        this.sendRaw(player.ws, { type: 'system_message', text: `${requester.name} entrou no grupo.` });
    }

    handlePartyWaypointPing(player: PlayerRuntime, msg: any) {
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        if (!party) {
            this.sendPartyError(player, 'Voce precisa estar em grupo para marcar waypoint.');
            return;
        }
        if (!party.memberIds.includes(player.id)) {
            return;
        }
        const x = Number(msg?.x);
        const y = Number(msg?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }
        const waypointX = clamp(x, 0, WORLD.width);
        const waypointY = clamp(y, 0, WORLD.height);
        const createdAt = Date.now();
        const payload = {
            type: 'party.waypointPing',
            waypointId: randomUUID(),
            partyId: party.id,
            fromPlayerId: player.id,
            fromName: player.name,
            mapKey: player.mapKey,
            mapId: player.mapId,
            x: waypointX,
            y: waypointY,
            createdAt,
            expiresIn: PARTY_WAYPOINT_TTL_MS
        };
        for (const memberId of party.memberIds) {
            const member = this.players.get(memberId);
            if (!member) continue;
            this.sendRaw(member.ws, payload);
        }
    }

    async handleFriendRequest(player: PlayerRuntime, msg: any) {
        const byId = Number(msg?.targetPlayerId);
        const byName = String(msg?.targetName || '').trim().toLowerCase();
        let target: PlayerRuntime | undefined;

        if (Number.isInteger(byId)) {
            target = this.players.get(byId);
        } else if (byName) {
            target = [...this.players.values()].find((candidate) => {
                const name = String(candidate.name || '').toLowerCase();
                const username = String(candidate.username || '').toLowerCase();
                return name === byName || username === byName;
            });
        } else {
            return;
        }

        if (!target) {
            this.sendFriendError(player, 'Jogador alvo nao esta online.');
            return;
        }
        if (target.id === player.id) {
            this.sendFriendError(player, 'Voce nao pode adicionar a si mesmo.');
            return;
        }
        if (this.areFriends(player.id, target.id)) {
            this.sendFriendError(player, 'Esse jogador ja esta na sua lista de amigos.');
            return;
        }
        if (!this.consumeFriendRequestRate(player.id)) {
            this.sendFriendError(player, 'Muitas solicitacoes de amizade. Aguarde um pouco.');
            return;
        }
        const alreadyPending = [...this.friendRequests.values()].some((req) => {
            const pairA = req.fromPlayerId === player.id && req.toPlayerId === target.id;
            const pairB = req.fromPlayerId === target.id && req.toPlayerId === player.id;
            return pairA || pairB;
        });
        const dbPending = await this.persistence.findPendingFriendRequestBetween(player.id, target.id);
        if (alreadyPending || dbPending) {
            this.sendFriendError(player, 'Ja existe solicitacao pendente entre voces.');
            return;
        }

        const now = Date.now();
        const request: FriendRequestItem = {
            id: '',
            fromPlayerId: player.id,
            toPlayerId: target.id,
            createdAt: now,
            expiresAt: now + 30000
        };
        const created = await this.persistence.createFriendRequest(player.id, target.id, new Date(request.expiresAt));
        request.id = String(created.id);
        this.friendRequests.set(request.id, request);
        this.sendRaw(target.ws, {
            type: 'friend.requestReceived',
            requestId: request.id,
            fromPlayerId: player.id,
            fromName: player.name,
            expiresIn: 30000
        });
        this.sendRaw(player.ws, { type: 'system_message', text: `Solicitacao de amizade enviada para ${target.name}.` });
        this.sendFriendState(player);
        this.sendFriendState(target);
    }

    async handleFriendAccept(player: PlayerRuntime, msg: any) {
        const requestId = String(msg.requestId || '');
        if (!requestId) return;
        await this.pruneExpiredFriendRequests(Date.now());
        const request = this.friendRequests.get(requestId);
        let safeRequest = request || null;
        if (!safeRequest) {
            const dbReq = await this.persistence.getPendingFriendRequestById(Number(requestId));
            if (dbReq) {
                safeRequest = {
                    id: String(dbReq.id),
                    fromPlayerId: dbReq.fromPlayerId,
                    toPlayerId: dbReq.toPlayerId,
                    createdAt: dbReq.createdAt.getTime(),
                    expiresAt: dbReq.expiresAt.getTime()
                };
                this.friendRequests.set(safeRequest.id, safeRequest);
            }
        }
        if (!safeRequest || safeRequest.toPlayerId !== player.id) {
            this.sendFriendError(player, 'Solicitacao de amizade invalida.');
            return;
        }
        const from = this.players.get(safeRequest.fromPlayerId);
        this.linkFriends(safeRequest.fromPlayerId, safeRequest.toPlayerId);
        await this.persistence.createFriendship(safeRequest.fromPlayerId, safeRequest.toPlayerId);
        await this.persistence.completeFriendRequest(Number(safeRequest.id), 'accepted');
        this.friendRequests.delete(safeRequest.id);
        if (from) {
            this.sendRaw(from.ws, { type: 'system_message', text: `${player.name} aceitou seu pedido de amizade.` });
            this.sendFriendState(from);
        }
        this.sendFriendState(player);
    }

    async handleFriendDecline(player: PlayerRuntime, msg: any) {
        const requestId = String(msg.requestId || '');
        if (!requestId) return;
        let request = this.friendRequests.get(requestId) || null;
        if (!request) {
            const dbReq = await this.persistence.getPendingFriendRequestById(Number(requestId));
            if (dbReq) {
                request = {
                    id: String(dbReq.id),
                    fromPlayerId: dbReq.fromPlayerId,
                    toPlayerId: dbReq.toPlayerId,
                    createdAt: dbReq.createdAt.getTime(),
                    expiresAt: dbReq.expiresAt.getTime()
                };
                this.friendRequests.set(request.id, request);
            }
        }
        if (!request || request.toPlayerId !== player.id) {
            this.sendFriendError(player, 'Solicitacao de amizade invalida.');
            return;
        }
        const from = this.players.get(request.fromPlayerId);
        await this.persistence.completeFriendRequest(Number(request.id), 'declined');
        this.friendRequests.delete(request.id);
        if (from) {
            this.sendRaw(from.ws, { type: 'system_message', text: `${player.name} recusou seu pedido de amizade.` });
            this.sendFriendState(from);
        }
        this.sendFriendState(player);
    }

    async handleFriendRemove(player: PlayerRuntime, msg: any) {
        const friendPlayerId = Number(msg.friendPlayerId);
        if (!Number.isInteger(friendPlayerId)) return;
        this.unlinkFriends(player.id, friendPlayerId);
        await this.persistence.deleteFriendship(player.id, friendPlayerId);
        this.sendFriendState(player);
        const other = this.players.get(friendPlayerId);
        if (other) this.sendFriendState(other);
    }

    handleFriendList(player: PlayerRuntime) {
        this.sendFriendState(player);
    }

    handleAdminSetMobPeaceful(player: PlayerRuntime, msg: any) {
        if (player.role !== 'adm') return;
        this.mobsPeacefulMode = Boolean(msg?.enabled);
        for (const mob of this.mobService.getMobs()) {
            mob.targetPlayerId = null;
            mob.lastAttackAt = 0;
        }
        for (const receiver of this.players.values()) {
            if (receiver.role !== 'adm') continue;
            this.sendRaw(receiver.ws, {
                type: 'admin.mobPeacefulState',
                enabled: this.mobsPeacefulMode
            });
        }
        this.sendRaw(player.ws, {
            type: 'system_message',
            text: this.mobsPeacefulMode ? 'Modo pacifico de mobs ativado.' : 'Modo pacifico de mobs desativado.'
        });
    }

    handleSetPvpMode(player: PlayerRuntime, msg: any) {
        const rawMode = String(msg?.mode || 'peace');
        const mode = rawMode === 'evil' ? 'evil' : rawMode === 'group' ? 'group' : 'peace';
        if (mode === 'group' && (!player.partyId || !this.parties.has(player.partyId))) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Modo Grupo exige estar em grupo.' });
            return;
        }
        if (player.pvpMode === mode) return;
        player.pvpMode = mode;
        if (mode === 'peace') {
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
        }
        this.persistPlayer(player);
        this.broadcastRaw({
            type: 'player.pvpModeUpdated',
            playerId: player.id,
            mode
        });
    }

    handleCombatTargetPlayer(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const targetPlayerId = Number(msg?.targetPlayerId);
        if (!Number.isInteger(targetPlayerId) || targetPlayerId <= 0 || targetPlayerId === player.id) return;
        const target = this.players.get(targetPlayerId);
        if (!target || target.dead || target.hp <= 0) return;
        if (player.mapId !== target.mapId || player.mapKey !== target.mapKey) return;
        const permission = this.getPvpAttackPermission(player, target);
        if (!permission.ok) {
            this.sendRaw(player.ws, { type: 'system_message', text: permission.reason || 'Nao pode atacar esse alvo.' });
            return;
        }
        player.pvpAutoAttackActive = true;
        player.attackTargetPlayerId = targetPlayerId;
        player.autoAttackActive = false;
        player.attackTargetId = null;
    }

    handleCombatClearTarget(player: PlayerRuntime) {
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        player.movePath = [];
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
    }

    handleCombatAttack(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const targetPlayerId = Number(msg?.targetPlayerId);
        if (!Number.isInteger(targetPlayerId) || targetPlayerId <= 0) return;
        if (targetPlayerId === player.id) return;
        this.tryPlayerAttack(player, targetPlayerId, Date.now(), false);
    }

    handlePlayerRevive(player: PlayerRuntime) {
        if (!player.dead && player.hp > 0) return;
        player.dead = false;
        player.hp = player.maxHp;
        const reviveX = Number.isFinite(Number(player.deathX)) ? Number(player.deathX) : player.x;
        const reviveY = Number.isFinite(Number(player.deathY)) ? Number(player.deathY) : player.y;
        const projected = this.projectToWalkable(
            player.mapKey,
            clamp(reviveX, 0, WORLD.width),
            clamp(reviveY, 0, WORLD.height)
        );
        player.x = projected.x;
        player.y = projected.y;
        player.targetX = player.x;
        player.targetY = player.y;
        player.movePath = [];
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        this.persistPlayer(player);
        this.sendRaw(player.ws, { type: 'system_message', text: 'Voce reviveu no local da morte.' });
    }

    handleSkillCast(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        const skillId = String(msg?.skillId || '');
        if (skillId !== 'class_primary') return;

        const now = Date.now();
        player.skillCooldowns = player.skillCooldowns || {};
        const cooldownByClass: Record<string, number> = { knight: 2800, shifter: 2200, bandit: 1800 };
        const cooldownMs = cooldownByClass[player.class] || 2200;
        const nextAt = Number(player.skillCooldowns[skillId] || 0);
        if (now < nextAt) {
            this.sendRaw(player.ws, { type: 'system_message', text: `Habilidade em recarga (${Math.ceil((nextAt - now) / 1000)}s).` });
            return;
        }

        const targetMobId = String(msg?.targetMobId || player.attackTargetId || '');
        const mapInstanceId = this.mapInstanceId(player.mapKey, player.mapId);
        const targetMob = this.mobService.getMobs().find((m) => m.id === targetMobId && m.mapId === mapInstanceId);
        if (!targetMob) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Selecione um alvo para usar a habilidade.' });
            return;
        }

        const currentDistance = distance(player, targetMob);
        const edgeDistance = currentDistance - (targetMob.size / 2 + PLAYER_HALF_SIZE);

        if (player.class === 'knight') {
            const range = 90;
            if (edgeDistance > range) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Muito longe para Golpe Circular.' });
                return;
            }
            player.skillCooldowns[skillId] = now + cooldownMs;
            const mobsInRange = this.mobService.getMobsByMap(mapInstanceId).filter((m) => {
                const d = distance({ x: targetMob.x, y: targetMob.y } as any, m);
                return d <= 145;
            });
            for (const mob of mobsInRange) {
                const dmg = this.computeMobDamage(player, mob, 1.45);
                mob.hp = Math.max(0, mob.hp - dmg);
                if (mob.hp === 0) {
                    this.grantXp(player, mob.xpReward);
                    if (Math.random() < 0.5) this.dropWeaponAt(mob.x, mob.y, mapInstanceId);
                    this.dropHpPotionAt(mob.x, mob.y, mapInstanceId);
                    this.mobService.removeMob(mob.id);
                }
                this.broadcastMobHit(player, mob);
            }
            player.lastCombatAt = now;
            return;
        }

        if (player.class === 'shifter') {
            const range = 420;
            if (edgeDistance > range) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Muito longe para Martelo Arcano.' });
                return;
            }
            player.skillCooldowns[skillId] = now + cooldownMs;
            const dmg = this.computeMobDamage(player, targetMob, 1.7, true);
            targetMob.hp = Math.max(0, targetMob.hp - dmg);
            this.broadcastMobHit(player, targetMob);
            if (targetMob.hp === 0) {
                this.grantXp(player, targetMob.xpReward);
                if (Math.random() < 0.5) this.dropWeaponAt(targetMob.x, targetMob.y, mapInstanceId);
                this.dropHpPotionAt(targetMob.x, targetMob.y, mapInstanceId);
                this.mobService.removeMob(targetMob.id);
            }
            player.lastCombatAt = now;
            return;
        }

        // bandit
        const range = 100;
        if (edgeDistance > range) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Muito longe para Corte Duplo.' });
            return;
        }
        player.skillCooldowns[skillId] = now + cooldownMs;
        const first = this.computeMobDamage(player, targetMob, 1.2);
        const second = this.computeMobDamage(player, targetMob, 1.05);
        targetMob.hp = Math.max(0, targetMob.hp - first - second);
        this.broadcastMobHit(player, targetMob);
        if (targetMob.hp === 0) {
            this.grantXp(player, targetMob.xpReward);
            if (Math.random() < 0.5) this.dropWeaponAt(targetMob.x, targetMob.y, mapInstanceId);
            this.dropHpPotionAt(targetMob.x, targetMob.y, mapInstanceId);
            this.mobService.removeMob(targetMob.id);
        }
        player.lastCombatAt = now;
    }

    handleStatsAllocate(player: PlayerRuntime, msg: any) {
        const allocation = msg && typeof msg.allocation === 'object' ? msg.allocation : {};
        const sanitized: Record<AllocatableStat, number> = {
            physicalAttack: 0,
            magicAttack: 0,
            physicalDefense: 0,
            magicDefense: 0
        };

        let requestedTotal = 0;
        for (const key of ALLOCATABLE_STATS) {
            const value = Number(allocation[key]);
            if (!Number.isInteger(value) || value < 0) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Distribuicao invalida de atributos.' });
                return;
            }
            sanitized[key] = value;
            requestedTotal += value;
        }

        if (requestedTotal <= 0) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Nenhum ponto foi alocado.' });
            return;
        }

        player.unspentPoints = Number.isInteger(player.unspentPoints) && player.unspentPoints > 0 ? player.unspentPoints : 0;
        if (requestedTotal > player.unspentPoints) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Pontos insuficientes para essa distribuicao.' });
            return;
        }

        const current = this.normalizeAllocatedStats(player.allocatedStats);
        const next: Record<AllocatableStat, number> = { ...current };
        for (const key of ALLOCATABLE_STATS) {
            next[key] = Number(current[key] || 0) + Number(sanitized[key] || 0);
        }

        player.allocatedStats = next;
        player.unspentPoints -= requestedTotal;
        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        this.sendRaw(player.ws, {
            type: 'system_message',
            text: `${requestedTotal} ponto(s) aplicado(s). Restantes: ${player.unspentPoints}.`
        });
        this.sendStatsUpdated(player);
    }

    tick(deltaSeconds: number, now: number) {
        this.pruneExpiredGroundItems(now);
        this.pruneExpiredPartyInvites(now);
        this.pruneExpiredPartyJoinRequests(now);
        this.pruneExpiredFriendRequests(now);
        this.processMobAggroAndCombat(deltaSeconds, now);
        for (const player of this.players.values()) {
            if (player.dead || player.hp <= 0) continue;
            this.movePlayerTowardTarget(player, deltaSeconds, now);
            this.processPortalCollision(player, now);
            this.processAutoAttack(player, now);
            this.processAutoAttackPlayer(player, now);
        }
        if (now - this.lastPartySyncAt >= 200) {
            this.lastPartySyncAt = now;
            this.syncAllPartyStates();
        }
    }

    buildWorldSnapshot(mapId: string = DEFAULT_MAP_ID, mapKey: string = DEFAULT_MAP_KEY) {
        const mapInstanceId = this.mapInstanceId(mapKey, mapId);
        const publicPlayers: Record<string, any> = {};
        for (const [id, player] of this.players.entries()) {
            if (player.mapId !== mapId || player.mapKey !== mapKey) continue;
            publicPlayers[String(id)] = this.sanitizePublicPlayer(player);
        }
        return {
            type: 'world_state',
            players: publicPlayers,
            mobs: this.mobService.getMobsByMap(mapInstanceId),
            groundItems: this.groundItems.filter((it) => it.mapId === mapInstanceId),
            mapCode: mapCodeFromKey(mapKey),
            mapKey,
            mapTheme: MAP_THEMES[mapKey] || 'forest',
            mapFeatures: MAP_FEATURES_BY_KEY[mapKey] || [],
            portals: PORTALS_BY_MAP_KEY[mapKey] || [],
            mapId,
            world: WORLD
        };
    }

    getPlayerByRuntimeId(playerId: number) {
        return this.players.get(playerId);
    }

    async handleDisconnect(playerId: number) {
        const player = this.players.get(playerId);
        if (!player) return;
        this.removePlayerFromParty(player);
        await this.persistence.savePlayer(player);
        this.usernameToPlayerId.delete(player.username);
        this.players.delete(playerId);
        this.clearPendingInvitesForPlayer(player.id);
        this.clearJoinRequestsForPlayer(player.id);
        this.clearFriendRequestsForPlayer(player.id);
    }

    private firstFreeInventorySlot(items: any[], ignoreItemIds: Set<string> = new Set()): number {
        const used = new Set(
            items
                .filter((it) => !ignoreItemIds.has(String(it?.id || '')))
                .map((it) => it.slotIndex)
                .filter((n) => Number.isInteger(n) && n >= 0)
        );
        for (let i = 0; i < INVENTORY_SIZE; i++) {
            if (!used.has(i)) return i;
        }
        return -1;
    }

    private sanitizePublicPlayer(player: PlayerRuntime) {
        const weapon = Array.isArray(player.inventory) ? player.inventory.find((it: any) => it.id === player.equippedWeaponId) : null;
        return {
            id: player.id,
            username: player.username,
            name: player.name,
            class: player.class,
            gender: player.gender,
            x: player.x,
            y: player.y,
            mapKey: player.mapKey,
            mapId: player.mapId,
            pvpMode: player.pvpMode === 'evil' ? 'evil' : player.pvpMode === 'group' ? 'group' : 'peace',
            dead: Boolean(player.dead || player.hp <= 0),
            role: player.role || 'player',
            level: player.level,
            hp: player.hp,
            maxHp: player.maxHp,
            equippedWeaponName: weapon ? weapon.name : null,
            pathNodes: Array.isArray(player.movePath) ? player.movePath.slice(0, 40).map((pt: any) => ({ x: Number(pt.x), y: Number(pt.y) })) : [],
            xp: player.xp,
            xpToNext: xpRequired(player.level),
            stats: player.stats,
            allocatedStats: this.normalizeAllocatedStats(player.allocatedStats),
            unspentPoints: Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0
        };
    }

    private movePlayerTowardTarget(player: PlayerRuntime, deltaSeconds: number, now: number) {
        if (Array.isArray(player.movePath) && player.movePath.length > 0) {
            const next = player.movePath[0];
            if (next) {
                player.targetX = next.x;
                player.targetY = next.y;
            }
        }
        const rawMoveSpeed = Number(player.stats?.moveSpeed);
        const moveSpeedStat = Number.isFinite(rawMoveSpeed) && rawMoveSpeed > 0 ? rawMoveSpeed : 100;
        const speed = BASE_MOVE_SPEED * (moveSpeedStat / 100);
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 2) {
            if (Array.isArray(player.movePath) && player.movePath.length > 0) {
                player.movePath.shift();
                const next = player.movePath[0];
                if (next) {
                    player.targetX = next.x;
                    player.targetY = next.y;
                } else {
                    player.targetX = player.x;
                    player.targetY = player.y;
                    player.pathDestinationX = player.x;
                    player.pathDestinationY = player.y;
                }
            }
            return;
        }

        const step = speed * deltaSeconds;
        if (step >= dist) {
            if (!this.isBlockedAt(player.mapKey, player.targetX, player.targetY)) {
                player.x = player.targetX;
                player.y = player.targetY;
            }
            if (Array.isArray(player.movePath) && player.movePath.length > 0) {
                player.movePath.shift();
                const next = player.movePath[0];
                if (next) {
                    player.targetX = next.x;
                    player.targetY = next.y;
                } else {
                    player.targetX = player.x;
                    player.targetY = player.y;
                    player.pathDestinationX = player.x;
                    player.pathDestinationY = player.y;
                }
            }
            return;
        }

        const nextX = player.x + (dx / dist) * step;
        const nextY = player.y + (dy / dist) * step;
        if (!this.isBlockedAt(player.mapKey, nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
            return;
        }
        // Fallback de deslizamento por eixo para evitar travar em quinas de colisao.
        const axisX = player.x + (dx / dist) * step;
        if (!this.isBlockedAt(player.mapKey, axisX, player.y)) {
            player.x = axisX;
            return;
        }
        const axisY = player.y + (dy / dist) * step;
        if (!this.isBlockedAt(player.mapKey, player.x, axisY)) {
            player.y = axisY;
            return;
        }
        if (Array.isArray(player.movePath) && player.movePath.length > 0) {
            player.movePath.shift();
            const next = player.movePath[0];
            if (next) {
                player.targetX = next.x;
                player.targetY = next.y;
                return;
            }
        }
        const destinationX = Number.isFinite(Number(player.pathDestinationX)) ? Number(player.pathDestinationX) : player.targetX;
        const destinationY = Number.isFinite(Number(player.pathDestinationY)) ? Number(player.pathDestinationY) : player.targetY;
        this.recalculatePathToward(player, destinationX, destinationY, now);
        if (!Array.isArray(player.movePath) || player.movePath.length === 0) {
            player.targetX = player.x;
            player.targetY = player.y;
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
        }
    }

    private processAutoAttack(player: PlayerRuntime, now: number) {
        if (!player.autoAttackActive || !player.attackTargetId) return;

        const mob = this.mobService.getMobs().find((m) => m.id === player.attackTargetId && m.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (!mob) {
            player.autoAttackActive = false;
            player.attackTargetId = null;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            return;
        }

        const currentDistance = distance(player, mob);
        const edgeDistance = currentDistance - (mob.size / 2 + PLAYER_HALF_SIZE);
        const attackRange = Number(player.stats?.attackRange || 60);
        const inRange = edgeDistance <= attackRange;

        if (!inRange) {
            const desiredDistance = mob.size / 2 + PLAYER_HALF_SIZE + Math.max(2, attackRange - 4);
            const dx = player.x - mob.x;
            const dy = player.y - mob.y;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            const projected = this.projectToWalkable(
                player.mapKey,
                clamp(mob.x + (dx / norm) * desiredDistance, 0, WORLD.width),
                clamp(mob.y + (dy / norm) * desiredDistance, 0, WORLD.height)
            );
            this.recalculatePathToward(player, projected.x, projected.y, now);
            return;
        }

        player.movePath = [];
        player.targetX = player.x;
        player.targetY = player.y;
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;

        const rawAttackSpeed = Number(player.stats?.attackSpeed);
        const attackSpeedStat = Number.isFinite(rawAttackSpeed) && rawAttackSpeed > 0 ? rawAttackSpeed : 100;
        const attackIntervalMs = 1000 * (100 / attackSpeedStat);
        if (now - player.lastAttackAt < attackIntervalMs) return;
        player.lastAttackAt = now;

        let rawAttack = Number(player.stats?.physicalAttack || 1);
        let mobDefense = mob.physicalDefense;
        if (player.stats?.damageType === 'magic') {
            rawAttack = Number(player.stats?.magicAttack || 1);
            mobDefense = mob.magicDefense;
        }

        const damage = Math.max(1, Math.floor(rawAttack - mobDefense * 0.5));
        mob.hp = Math.max(0, mob.hp - damage);
        player.lastCombatAt = now;

        for (const receiver of this.players.values()) {
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey) continue;
            try {
                receiver.ws?.send(JSON.stringify({
                    type: 'combat_hit',
                    attackerId: player.id,
                    mobId: mob.id,
                    attackerX: player.x,
                    attackerY: player.y,
                    mobX: mob.x,
                    mobY: mob.y
                }));
            } catch {
                // Ignore socket send failures; cleanup happens on disconnect.
            }
        }

        if (mob.hp === 0) {
            this.grantXp(player, mob.xpReward);
            if (Math.random() < 0.5) {
                this.dropWeaponAt(mob.x, mob.y, this.mapInstanceId(player.mapKey, player.mapId));
            }
            this.dropHpPotionAt(mob.x, mob.y, this.mapInstanceId(player.mapKey, player.mapId));
            this.mobService.removeMob(mob.id);
        }
    }

    private computeMobDamage(player: PlayerRuntime, mob: any, multiplier: number, forceMagic: boolean = false) {
        let rawAttack = Number(player.stats?.physicalAttack || 1);
        let mobDefense = mob.physicalDefense;
        if (forceMagic || player.stats?.damageType === 'magic') {
            rawAttack = Number(player.stats?.magicAttack || 1);
            mobDefense = mob.magicDefense;
        }
        return Math.max(1, Math.floor((rawAttack - mobDefense * 0.5) * multiplier));
    }

    private broadcastMobHit(player: PlayerRuntime, mob: any) {
        for (const receiver of this.players.values()) {
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey) continue;
            try {
                receiver.ws?.send(JSON.stringify({
                    type: 'combat_hit',
                    attackerId: player.id,
                    mobId: mob.id,
                    attackerX: player.x,
                    attackerY: player.y,
                    mobX: mob.x,
                    mobY: mob.y
                }));
            } catch {
                // Ignore socket send failures; cleanup happens on disconnect.
            }
        }
    }

    private processAutoAttackPlayer(player: PlayerRuntime, now: number) {
        if (!player.pvpAutoAttackActive || !player.attackTargetPlayerId) return;
        const target = this.players.get(player.attackTargetPlayerId);
        if (!target || target.dead || target.hp <= 0) {
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            return;
        }
        if (player.mapId !== target.mapId || player.mapKey !== target.mapKey) {
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            return;
        }
        const permission = this.getPvpAttackPermission(player, target);
        if (!permission.ok) {
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            return;
        }

        const currentDistance = distance(player, target);
        const edgeDistance = Math.max(0, currentDistance - PLAYER_HALF_SIZE * 2);
        const attackRange = Number(player.stats?.attackRange || 60);
        if (edgeDistance > attackRange) {
            const desiredDistance = PLAYER_HALF_SIZE * 2 + Math.max(2, attackRange - 4);
            const dx = player.x - target.x;
            const dy = player.y - target.y;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            const projected = this.projectToWalkable(
                player.mapKey,
                clamp(target.x + (dx / norm) * desiredDistance, 0, WORLD.width),
                clamp(target.y + (dy / norm) * desiredDistance, 0, WORLD.height)
            );
            this.recalculatePathToward(player, projected.x, projected.y, now);
            return;
        }
        player.movePath = [];
        player.targetX = player.x;
        player.targetY = player.y;
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        this.tryPlayerAttack(player, target.id, now, true);
    }

    private processMobAggroAndCombat(deltaSeconds: number, now: number) {
        const mobs = this.mobService.getMobs();
        if (this.mobsPeacefulMode) {
            for (const mob of mobs) {
                mob.targetPlayerId = null;
                mob.lastAttackAt = 0;
            }
            return;
        }
        for (const mob of mobs) {
            const [mapKey, mapId] = String(mob.mapId || '').split('::');
            if (!mapKey || !mapId) continue;

            let target = mob.targetPlayerId ? this.players.get(Number(mob.targetPlayerId)) : null;
            if (!target || target.dead || target.hp <= 0 || target.mapKey !== mapKey || target.mapId !== mapId) {
                target = null;
                mob.targetPlayerId = null;
            }

            if (!target) {
                let nearest: PlayerRuntime | null = null;
                let nearestDist = Number.POSITIVE_INFINITY;
                for (const player of this.players.values()) {
                    if (player.dead || player.hp <= 0) continue;
                    if (player.mapKey !== mapKey || player.mapId !== mapId) continue;
                    const d = distance(mob, player);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = player;
                    }
                }
                if (nearest && nearestDist <= MOB_AGGRO_RANGE) {
                    target = nearest;
                    mob.targetPlayerId = nearest.id;
                }
            }

            if (!target) continue;

            const centerDistance = distance(mob, target);
            if (centerDistance > MOB_LEASH_RANGE) {
                mob.targetPlayerId = null;
                continue;
            }

            const edgeDistance = Math.max(0, centerDistance - (mob.size / 2 + PLAYER_HALF_SIZE));
            const mobSpeed = mob.kind === 'boss' ? 72 : mob.kind === 'subboss' ? 82 : mob.kind === 'elite' ? 95 : 108;

            if (edgeDistance > MOB_ATTACK_RANGE) {
                const step = mobSpeed * deltaSeconds;
                const dx = target.x - mob.x;
                const dy = target.y - mob.y;
                const norm = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = clamp(mob.x + (dx / norm) * Math.min(step, edgeDistance), 0, WORLD.width);
                const ny = clamp(mob.y + (dy / norm) * Math.min(step, edgeDistance), 0, WORLD.height);

                if (!this.isBlockedAt(mapKey, nx, ny)) {
                    mob.x = nx;
                    mob.y = ny;
                } else {
                    const axisX = clamp(mob.x + (dx / norm) * Math.min(step, edgeDistance), 0, WORLD.width);
                    const axisY = clamp(mob.y + (dy / norm) * Math.min(step, edgeDistance), 0, WORLD.height);
                    if (!this.isBlockedAt(mapKey, axisX, mob.y)) mob.x = axisX;
                    else if (!this.isBlockedAt(mapKey, mob.x, axisY)) mob.y = axisY;
                }
                continue;
            }

            const lastAttackAt = Number(mob.lastAttackAt || 0);
            if (now - lastAttackAt < MOB_ATTACK_INTERVAL_MS) continue;
            mob.lastAttackAt = now;

            const baseDamage = mob.kind === 'boss' ? 34 : mob.kind === 'subboss' ? 21 : mob.kind === 'elite' ? 14 : 8;
            const defense = Number(target.stats?.physicalDefense || 0);
            const damage = Math.max(1, Math.floor(baseDamage - defense * 0.35));
            target.hp = Math.max(0, target.hp - damage);
            target.lastCombatAt = now;
            if (target.hp <= 0) {
                target.dead = true;
                target.deathX = target.x;
                target.deathY = target.y;
                target.autoAttackActive = false;
                target.attackTargetId = null;
                target.pvpAutoAttackActive = false;
                target.attackTargetPlayerId = null;
                this.sendRaw(target.ws, { type: 'player.dead' });
            }
            this.persistPlayer(target);
            this.syncAllPartyStates();

            for (const receiver of this.players.values()) {
                if (receiver.mapKey !== mapKey || receiver.mapId !== mapId) continue;
                this.sendRaw(receiver.ws, {
                    type: 'combat.mobHitPlayer',
                    mobId: mob.id,
                    mobX: mob.x,
                    mobY: mob.y,
                    targetPlayerId: target.id,
                    targetX: target.x,
                    targetY: target.y,
                    damage,
                    targetHp: target.hp,
                    targetMaxHp: target.maxHp
                });
            }
        }
    }

    private tryPlayerAttack(player: PlayerRuntime, targetPlayerId: number, now: number, silent: boolean) {
        const target = this.players.get(targetPlayerId);
        if (!target) {
            if (!silent) this.sendRaw(player.ws, { type: 'system_message', text: 'Alvo de PVP nao encontrado.' });
            return;
        }
        if (target.dead || target.hp <= 0) return;
        const permission = this.getPvpAttackPermission(player, target);
        if (!permission.ok) {
            if (!silent) this.sendRaw(player.ws, { type: 'system_message', text: permission.reason || 'Nao pode atacar esse alvo.' });
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
            return;
        }
        if (player.mapId !== target.mapId || player.mapKey !== target.mapKey) return;

        const currentDistance = distance(player, target);
        const edgeDistance = Math.max(0, currentDistance - PLAYER_HALF_SIZE * 2);
        const attackRange = Number(player.stats?.attackRange || 60);
        if (edgeDistance > attackRange) {
            if (!silent) this.sendRaw(player.ws, { type: 'system_message', text: 'Jogador fora de alcance.' });
            return;
        }

        const rawAttackSpeed = Number(player.stats?.attackSpeed);
        const attackSpeedStat = Number.isFinite(rawAttackSpeed) && rawAttackSpeed > 0 ? rawAttackSpeed : 100;
        const attackIntervalMs = 1000 * (100 / attackSpeedStat);
        if (now - player.lastAttackAt < attackIntervalMs) return;
        player.lastAttackAt = now;

        let rawAttack = Number(player.stats?.physicalAttack || 1);
        let targetDefense = Number(target.stats?.physicalDefense || 0);
        if (player.stats?.damageType === 'magic') {
            rawAttack = Number(player.stats?.magicAttack || 1);
            targetDefense = Number(target.stats?.magicDefense || 0);
        }
        const damage = Math.max(1, Math.floor(rawAttack - targetDefense * 0.5));

        target.hp = Math.max(0, target.hp - damage);
        if (target.hp <= 0) {
            target.dead = true;
            target.deathX = target.x;
            target.deathY = target.y;
            target.autoAttackActive = false;
            target.attackTargetId = null;
            target.pvpAutoAttackActive = false;
            target.attackTargetPlayerId = null;
            this.sendRaw(target.ws, { type: 'player.dead' });
        }
        player.lastCombatAt = now;
        target.lastCombatAt = now;

        this.persistPlayer(target);
        this.syncAllPartyStates();

        for (const receiver of this.players.values()) {
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey) continue;
            this.sendRaw(receiver.ws, {
                type: 'combat.playerHit',
                attackerId: player.id,
                targetPlayerId: target.id,
                attackerX: player.x,
                attackerY: player.y,
                targetX: target.x,
                targetY: target.y,
                damage,
                targetHp: target.hp,
                targetMaxHp: target.maxHp
            });
        }
    }

    private getPvpAttackPermission(player: PlayerRuntime, target: PlayerRuntime): { ok: boolean; reason?: string } {
        if (this.arePlayersInSameParty(player, target)) {
            return { ok: false, reason: 'Voce nao pode atacar membros do seu grupo.' };
        }
        const mode = player.pvpMode === 'evil' ? 'evil' : player.pvpMode === 'group' ? 'group' : 'peace';
        const targetMode = target.pvpMode === 'evil' ? 'evil' : target.pvpMode === 'group' ? 'group' : 'peace';
        if (mode === 'peace') {
            return { ok: false, reason: 'Modo Paz ativo: voce nao pode atacar jogadores.' };
        }
        if (mode === 'group') {
            if (!player.partyId || !this.parties.has(player.partyId)) {
                return { ok: false, reason: 'Modo Grupo exige estar em grupo.' };
            }
            if (targetMode !== 'group') {
                return { ok: false, reason: 'Modo Grupo so pode atacar jogadores em modo Grupo.' };
            }
            return { ok: true };
        }
        if (mode === 'evil') {
            if (targetMode !== 'peace' && targetMode !== 'group') {
                return { ok: false, reason: 'Modo Mal ataca apenas alvos em Paz ou Grupo.' };
            }
            return { ok: true };
        }
        return { ok: false, reason: 'Modo PVP invalido.' };
    }

    private arePlayersInSameParty(a: PlayerRuntime, b: PlayerRuntime) {
        if (!a.partyId || !b.partyId) return false;
        if (a.partyId !== b.partyId) return false;
        return this.parties.has(a.partyId);
    }

    private assignPathTo(player: PlayerRuntime, destinationX: number, destinationY: number) {
        const projected = this.projectToWalkable(player.mapKey, destinationX, destinationY);
        player.pathDestinationX = projected.x;
        player.pathDestinationY = projected.y;
        const path = this.findPathWithNearbyGoals(player.mapKey, player.x, player.y, projected.x, projected.y);
        player.movePath = path;
        if (path.length > 0) {
            player.targetX = path[0].x;
            player.targetY = path[0].y;
            return;
        }
        if (!this.isPathSegmentBlocked(player.mapKey, player.x, player.y, projected.x, projected.y)) {
            player.targetX = projected.x;
            player.targetY = projected.y;
            return;
        }
        player.targetX = player.x;
        player.targetY = player.y;
    }

    private findPathWithNearbyGoals(mapKey: string, fromX: number, fromY: number, toX: number, toY: number) {
        const direct = this.findPath(mapKey, fromX, fromY, toX, toY);
        if (direct.length > 0) return direct;

        const goal = this.worldToPathCell(toX, toY);
        let candidatesChecked = 0;
        const maxCandidates = 220;
        const maxRadius = 120;
        for (let r = 1; r <= maxRadius && candidatesChecked < maxCandidates; r++) {
            for (let dx = -r; dx <= r && candidatesChecked < maxCandidates; dx++) {
                const checks = [
                    { cx: goal.cx + dx, cy: goal.cy - r },
                    { cx: goal.cx + dx, cy: goal.cy + r }
                ];
                for (const cell of checks) {
                    candidatesChecked += 1;
                    if (!this.isPathCellWalkable(mapKey, cell.cx, cell.cy)) continue;
                    const world = this.pathCellToWorld(cell.cx, cell.cy);
                    const candidate = this.findPath(mapKey, fromX, fromY, world.x, world.y);
                    if (candidate.length > 0) return candidate;
                    if (candidatesChecked >= maxCandidates) break;
                }
            }
            for (let dy = -r + 1; dy <= r - 1 && candidatesChecked < maxCandidates; dy++) {
                const checks = [
                    { cx: goal.cx - r, cy: goal.cy + dy },
                    { cx: goal.cx + r, cy: goal.cy + dy }
                ];
                for (const cell of checks) {
                    candidatesChecked += 1;
                    if (!this.isPathCellWalkable(mapKey, cell.cx, cell.cy)) continue;
                    const world = this.pathCellToWorld(cell.cx, cell.cy);
                    const candidate = this.findPath(mapKey, fromX, fromY, world.x, world.y);
                    if (candidate.length > 0) return candidate;
                    if (candidatesChecked >= maxCandidates) break;
                }
            }
        }
        return [];
    }

    private recalculatePathToward(player: PlayerRuntime, destinationX: number, destinationY: number, now: number) {
        if (now < Number(player.nextPathfindAt || 0)) return;
        player.nextPathfindAt = now + PATH_RECALC_MS;
        this.assignPathTo(player, destinationX, destinationY);
    }

    private worldToPathCell(x: number, y: number) {
        const maxCellX = Math.floor(WORLD.width / PATHFIND_CELL_SIZE);
        const maxCellY = Math.floor(WORLD.height / PATHFIND_CELL_SIZE);
        return {
            cx: clamp(Math.floor(clamp(x, 0, WORLD.width) / PATHFIND_CELL_SIZE), 0, maxCellX),
            cy: clamp(Math.floor(clamp(y, 0, WORLD.height) / PATHFIND_CELL_SIZE), 0, maxCellY)
        };
    }

    private pathCellToWorld(cx: number, cy: number) {
        return {
            x: clamp(cx * PATHFIND_CELL_SIZE + PATHFIND_CELL_SIZE / 2, 0, WORLD.width),
            y: clamp(cy * PATHFIND_CELL_SIZE + PATHFIND_CELL_SIZE / 2, 0, WORLD.height)
        };
    }

    private isPathCellWalkable(mapKey: string, cx: number, cy: number) {
        const maxCellX = Math.floor(WORLD.width / PATHFIND_CELL_SIZE);
        const maxCellY = Math.floor(WORLD.height / PATHFIND_CELL_SIZE);
        if (cx < 0 || cy < 0 || cx > maxCellX || cy > maxCellY) return false;
        const world = this.pathCellToWorld(cx, cy);
        const offset = Math.max(2, PATH_PLAN_RADIUS * 0.55);
        const probes = [
            { x: world.x, y: world.y },
            { x: world.x + offset, y: world.y },
            { x: world.x - offset, y: world.y },
            { x: world.x, y: world.y + offset },
            { x: world.x, y: world.y - offset },
            { x: world.x + offset, y: world.y + offset },
            { x: world.x - offset, y: world.y + offset },
            { x: world.x + offset, y: world.y - offset },
            { x: world.x - offset, y: world.y - offset }
        ];
        for (const probe of probes) {
            if (this.isPathBlockedAt(mapKey, probe.x, probe.y, PATH_PLAN_RADIUS)) return false;
        }
        return true;
    }

    private findPath(mapKey: string, fromX: number, fromY: number, toX: number, toY: number) {
        const startRaw = this.worldToPathCell(fromX, fromY);
        const goalRaw = this.worldToPathCell(toX, toY);
        const start = this.findNearestWalkableCell(mapKey, startRaw.cx, startRaw.cy, 20) || startRaw;
        const goal = this.findNearestWalkableCell(mapKey, goalRaw.cx, goalRaw.cy, 72) || goalRaw;
        const sameCell = start.cx === goal.cx && start.cy === goal.cy;
        if (sameCell) return [{ x: clamp(toX, 0, WORLD.width), y: clamp(toY, 0, WORLD.height) }];

        const startKey = `${start.cx},${start.cy}`;
        const goalKey = `${goal.cx},${goal.cy}`;
        const open = new Set<string>([startKey]);
        const closed = new Set<string>();
        const g = new Map<string, number>([[startKey, 0]]);
        const f = new Map<string, number>();
        const cameFrom = new Map<string, string>();
        f.set(startKey, this.pathHeuristic(start.cx, start.cy, goal.cx, goal.cy));

        const dirs = [
            { x: 1, y: 0, c: 1 },
            { x: -1, y: 0, c: 1 },
            { x: 0, y: 1, c: 1 },
            { x: 0, y: -1, c: 1 },
            { x: 1, y: 1, c: 1.4142 },
            { x: 1, y: -1, c: 1.4142 },
            { x: -1, y: 1, c: 1.4142 },
            { x: -1, y: -1, c: 1.4142 }
        ];

        let iter = 0;
        while (open.size > 0 && iter < PATHFIND_MAX_ITERS) {
            iter += 1;
            let current = '';
            let bestF = Number.POSITIVE_INFINITY;
            for (const node of open) {
                const score = Number(f.get(node) ?? Number.POSITIVE_INFINITY);
                if (score < bestF) {
                    bestF = score;
                    current = node;
                }
            }
            if (!current) break;
            if (current === goalKey) {
                return this.rebuildPath(cameFrom, current, toX, toY);
            }
            open.delete(current);
            closed.add(current);
            const [cxRaw, cyRaw] = current.split(',');
            const cx = Number(cxRaw);
            const cy = Number(cyRaw);
            for (const dir of dirs) {
                const nx = cx + dir.x;
                const ny = cy + dir.y;
                const nkey = `${nx},${ny}`;
                if (closed.has(nkey)) continue;
                if (!this.isPathCellWalkable(mapKey, nx, ny)) continue;
                if (dir.x !== 0 && dir.y !== 0) {
                    if (!this.isPathCellWalkable(mapKey, cx + dir.x, cy) || !this.isPathCellWalkable(mapKey, cx, cy + dir.y)) {
                        continue;
                    }
                }
                const tentative = Number(g.get(current) ?? Number.POSITIVE_INFINITY) + dir.c;
                if (!open.has(nkey)) open.add(nkey);
                else if (tentative >= Number(g.get(nkey) ?? Number.POSITIVE_INFINITY)) continue;
                cameFrom.set(nkey, current);
                g.set(nkey, tentative);
                f.set(nkey, tentative + this.pathHeuristic(nx, ny, goal.cx, goal.cy));
            }
        }
        return [];
    }

    private isPathBlockedAt(mapKey: string, x: number, y: number, radiusOverride?: number) {
        const features = MAP_FEATURES_BY_KEY[mapKey] || [];
        const px = clamp(x, 0, WORLD.width);
        const py = clamp(y, 0, WORLD.height);
        const radius = Number.isFinite(Number(radiusOverride)) ? Number(radiusOverride) : PATH_PROBE_RADIUS;
        for (const feature of features) {
            if (!feature.collision) continue;
            if (feature.shape === 'rect') {
                const insideX = px >= (feature.x - radius) && px <= (feature.x + feature.w + radius);
                const insideY = py >= (feature.y - radius) && py <= (feature.y + feature.h + radius);
                if (insideX && insideY) return true;
                continue;
            }
            const dx = px - feature.x;
            const dy = py - feature.y;
            if (dx * dx + dy * dy <= (feature.r + radius) * (feature.r + radius)) return true;
        }
        return false;
    }

    private isPathSegmentBlocked(mapKey: string, x1: number, y1: number, x2: number, y2: number) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len <= 0.01) return false;
        const step = Math.max(6, PATHFIND_CELL_SIZE * 0.5);
        const steps = Math.max(1, Math.ceil(len / step));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            if (this.isPathBlockedAt(mapKey, x, y)) return true;
        }
        return false;
    }

    private findNearestWalkableCell(mapKey: string, cx: number, cy: number, maxRadius: number) {
        if (this.isPathCellWalkable(mapKey, cx, cy)) return { cx, cy };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                const top = { cx: cx + dx, cy: cy - r };
                const bottom = { cx: cx + dx, cy: cy + r };
                if (this.isPathCellWalkable(mapKey, top.cx, top.cy)) return top;
                if (this.isPathCellWalkable(mapKey, bottom.cx, bottom.cy)) return bottom;
            }
            for (let dy = -r + 1; dy <= r - 1; dy++) {
                const left = { cx: cx - r, cy: cy + dy };
                const right = { cx: cx + r, cy: cy + dy };
                if (this.isPathCellWalkable(mapKey, left.cx, left.cy)) return left;
                if (this.isPathCellWalkable(mapKey, right.cx, right.cy)) return right;
            }
        }
        return null;
    }

    private pathHeuristic(ax: number, ay: number, bx: number, by: number) {
        const dx = Math.abs(ax - bx);
        const dy = Math.abs(ay - by);
        const diag = Math.min(dx, dy);
        const straight = dx + dy - diag * 2;
        return diag * 1.4142 + straight;
    }

    private rebuildPath(cameFrom: Map<string, string>, current: string, toX: number, toY: number) {
        const reversed: string[] = [current];
        while (cameFrom.has(current)) {
            current = String(cameFrom.get(current));
            reversed.push(current);
        }
        reversed.reverse();
        const path = reversed
            .slice(1)
            .map((key) => {
                const [cxRaw, cyRaw] = key.split(',');
                const cx = Number(cxRaw);
                const cy = Number(cyRaw);
                return this.pathCellToWorld(cx, cy);
            });
        path.push({ x: clamp(toX, 0, WORLD.width), y: clamp(toY, 0, WORLD.height) });
        return path;
    }

    private processPortalCollision(player: PlayerRuntime, now: number) {
        if (now - (player.lastPortalAt || 0) < PORTAL_COOLDOWN_MS) return;
        const portals = PORTALS_BY_MAP_KEY[player.mapKey] || [];
        for (const portal of portals) {
            const insideX = player.x >= portal.x && player.x <= portal.x + portal.w;
            const insideY = player.y >= portal.y && player.y <= portal.y + portal.h;
            if (!insideX || !insideY) continue;
            player.mapKey = portal.toMapKey;
            const projected = this.projectToWalkable(
                portal.toMapKey,
                clamp(portal.toX, 0, WORLD.width),
                clamp(portal.toY, 0, WORLD.height)
            );
            player.x = projected.x;
            player.y = projected.y;
            player.targetX = player.x;
            player.targetY = player.y;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            player.attackTargetId = null;
            player.autoAttackActive = false;
            player.lastPortalAt = now;
            player.ws?.send(JSON.stringify({ type: 'system_message', text: `Portal: ${portal.toMapKey.toUpperCase()}` }));
            this.sendPartyAreaList(player);
            return;
        }
    }

    private mapInstanceId(mapKey: string, mapId: string) {
        return composeMapInstanceId(mapKey, mapId);
    }

    private isBlockedAt(mapKey: string, x: number, y: number) {
        const features = MAP_FEATURES_BY_KEY[mapKey] || [];
        const px = clamp(x, 0, WORLD.width);
        const py = clamp(y, 0, WORLD.height);
        const radius = Math.max(8, PLAYER_HALF_SIZE - 6) + MOVE_COLLISION_PADDING;
        for (const feature of features) {
            if (!feature.collision) continue;
            if (feature.shape === 'rect') {
                const insideX = px >= (feature.x - radius) && px <= (feature.x + feature.w + radius);
                const insideY = py >= (feature.y - radius) && py <= (feature.y + feature.h + radius);
                if (insideX && insideY) return true;
                continue;
            }
            const dx = px - feature.x;
            const dy = py - feature.y;
            if (dx * dx + dy * dy <= (feature.r + radius) * (feature.r + radius)) return true;
        }
        return false;
    }

    private projectToWalkable(mapKey: string, x: number, y: number) {
        const px = clamp(x, 0, WORLD.width);
        const py = clamp(y, 0, WORLD.height);
        if (!this.isBlockedAt(mapKey, px, py)) return { x: px, y: py };
        const maxRadius = Math.max(WORLD.width, WORLD.height);
        for (let radius = 16; radius <= maxRadius; radius += 16) {
            for (let i = 0; i < 64; i++) {
                const angle = (Math.PI * 2 * i) / 64;
                const nx = clamp(px + Math.cos(angle) * radius, 0, WORLD.width);
                const ny = clamp(py + Math.sin(angle) * radius, 0, WORLD.height);
                if (!this.isBlockedAt(mapKey, nx, ny)) return { x: nx, y: ny };
            }
        }
        return { x: px, y: py };
    }

    private grantXp(player: PlayerRuntime, amount: number) {
        player.xp += amount;
        let next = xpRequired(player.level);
        let levelsGained = 0;
        while (player.xp >= next) {
            player.xp -= next;
            player.level += 1;
            levelsGained += 1;
            next = xpRequired(player.level);
        }
        if (levelsGained > 0) {
            player.unspentPoints = Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0;
            player.unspentPoints += levelsGained * 5;
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `Voce ganhou ${levelsGained * 5} ponto(s) de atributo.`
            });
        }

        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        if (levelsGained > 0) this.sendStatsUpdated(player);
    }

    private normalizeInventorySlots(items: any[], equippedWeaponId: string | null = null) {
        const out = [];
        const used = new Set();
        for (const item of items) {
            const clone = { ...item };
            if (this.isStackableItem(clone)) {
                const max = this.getItemMaxStack(clone);
                const rawQty = Number(clone.quantity);
                clone.quantity = Number.isFinite(rawQty) ? clamp(Math.floor(rawQty), 1, max) : 1;
                clone.maxStack = max;
                clone.stackable = true;
            } else {
                clone.quantity = 1;
            }
            if (equippedWeaponId && clone.id === equippedWeaponId) {
                clone.slotIndex = -1;
                out.push(clone);
                continue;
            }
            if (!Number.isInteger(clone.slotIndex) || clone.slotIndex < 0 || clone.slotIndex >= INVENTORY_SIZE || used.has(clone.slotIndex)) {
                clone.slotIndex = this.firstFreeInventorySlot(out);
            }
            if (clone.slotIndex === -1) continue;
            used.add(clone.slotIndex);
            out.push(clone);
        }
        return out;
    }

    private getEquippedWeapon(player: PlayerRuntime) {
        if (!player.equippedWeaponId) return null;
        return Array.isArray(player.inventory) ? player.inventory.find((item: any) => item.id === player.equippedWeaponId) || null : null;
    }

    private recomputePlayerStats(player: PlayerRuntime) {
        const leveled = levelUpStats(player.baseStats, player.level);
        const overrides = player.statusOverrides && typeof player.statusOverrides === 'object' ? player.statusOverrides : {};
        for (const [key, value] of Object.entries(overrides)) {
            if (typeof (leveled as any)[key] === 'number' && Number.isFinite(value as number)) {
                (leveled as any)[key] = value;
            }
        }
        const allocated = this.normalizeAllocatedStats(player.allocatedStats);
        for (const key of ALLOCATABLE_STATS) {
            (leveled as any)[key] = Number((leveled as any)[key] || 0) + Number(allocated[key] || 0);
        }
        const weapon = this.getEquippedWeapon(player);
        if (weapon && weapon.bonuses) {
            player.stats = {
                ...leveled,
                physicalAttack: Number(leveled.physicalAttack || 0) + Number(weapon.bonuses.physicalAttack || 0),
                magicAttack: Number(leveled.magicAttack || 0) + Number(weapon.bonuses.magicAttack || 0),
                moveSpeed: Number(leveled.moveSpeed || 0) + Number(weapon.bonuses.moveSpeed || 0),
                attackSpeed: Number(leveled.attackSpeed || 0) + Number(weapon.bonuses.attackSpeed || 0)
            };
        } else {
            player.stats = leveled;
        }
        player.maxHp = Number((leveled as any).maxHp || player.maxHp || 100);
        player.hp = clamp(Number(player.hp || player.maxHp), 1, player.maxHp);
    }

    private sendInventoryState(player: PlayerRuntime) {
        this.sendRaw(player.ws, {
            type: 'inventory_state',
            inventory: [...player.inventory].sort((a: any, b: any) => Number(a.slotIndex) - Number(b.slotIndex)),
            equippedWeaponId: player.equippedWeaponId
        });
    }

    private dropWeaponAt(x: number, y: number, mapId: string) {
        this.groundItems.push({
            id: randomUUID(),
            type: 'weapon',
            name: WEAPON_TEMPLATE.name,
            slot: WEAPON_TEMPLATE.slot,
            bonuses: { ...WEAPON_TEMPLATE.bonuses },
            x,
            y,
            mapId,
            expiresAt: Date.now() + GROUND_ITEM_TTL_MS
        });
    }

    private dropHpPotionAt(x: number, y: number, mapId: string) {
        this.groundItems.push({
            id: randomUUID(),
            type: 'potion_hp',
            name: HP_POTION_TEMPLATE.name,
            slot: HP_POTION_TEMPLATE.slot,
            bonuses: {},
            quantity: 1,
            stackable: true,
            maxStack: 64,
            healPercent: Number(HP_POTION_TEMPLATE.healPercent || 0.5),
            x,
            y,
            mapId,
            expiresAt: Date.now() + GROUND_ITEM_TTL_MS
        } as any);
    }

    private isStackableItem(item: any) {
        if (!item || typeof item !== 'object') return false;
        if (item.stackable === true) return true;
        return String(item.type || '') === 'potion_hp';
    }

    private getItemMaxStack(item: any) {
        const parsed = Number(item?.maxStack);
        if (Number.isFinite(parsed) && parsed > 1) return Math.floor(parsed);
        return 64;
    }

    private canItemsStack(a: any, b: any) {
        if (!this.isStackableItem(a) || !this.isStackableItem(b)) return false;
        return String(a.type || '') === String(b.type || '')
            && String(a.name || '') === String(b.name || '')
            && String(a.slot || '') === String(b.slot || '');
    }

    private addItemToInventory(player: PlayerRuntime, item: any, quantity: number) {
        let remaining = Math.max(0, Math.floor(Number(quantity || 0)));
        if (remaining <= 0) return 0;

        if (!this.isStackableItem(item)) {
            while (remaining > 0) {
                const freeSlot = this.firstFreeInventorySlot(player.inventory);
                if (freeSlot === -1) break;
                player.inventory.push({ ...item, id: randomUUID(), quantity: 1, slotIndex: freeSlot });
                remaining -= 1;
            }
            return remaining;
        }

        const max = this.getItemMaxStack(item);
        for (const existing of player.inventory) {
            if (remaining <= 0) break;
            if (!this.canItemsStack(existing, item)) continue;
            const current = Math.max(1, Math.floor(Number(existing.quantity || 1)));
            if (current >= max) continue;
            const add = Math.min(max - current, remaining);
            existing.quantity = current + add;
            existing.maxStack = max;
            existing.stackable = true;
            remaining -= add;
        }

        while (remaining > 0) {
            const freeSlot = this.firstFreeInventorySlot(player.inventory);
            if (freeSlot === -1) break;
            const add = Math.min(max, remaining);
            player.inventory.push({
                ...item,
                id: randomUUID(),
                quantity: add,
                stackable: true,
                maxStack: max,
                slotIndex: freeSlot
            });
            remaining -= add;
        }

        return remaining;
    }

    private pruneExpiredGroundItems(now: number) {
        this.groundItems = this.groundItems.filter((item) => {
            if (typeof item.expiresAt !== 'number') return true;
            return item.expiresAt > now;
        });
    }

    private getAreaIdForPlayer(player: PlayerRuntime) {
        return this.mapInstanceId(player.mapKey, player.mapId);
    }

    private sendPartyError(player: PlayerRuntime, message: string) {
        this.sendRaw(player.ws, { type: 'party.error', message });
    }

    private buildPartySnapshot(party: Party) {
        const members = party.memberIds
            .map((id) => this.players.get(id))
            .filter((p): p is PlayerRuntime => Boolean(p))
            .map((member) => ({
                playerId: member.id,
                name: member.name,
                class: member.class,
                level: member.level,
                hp: member.hp,
                maxHp: member.maxHp,
                role: member.id === party.leaderId ? 'leader' : 'member',
                online: true
            }));

        return {
            id: party.id,
            leaderId: party.leaderId,
            areaId: party.areaId,
            maxMembers: party.maxMembers,
            members
        };
    }

    private sendPartyStateToPlayer(player: PlayerRuntime, party: Party | null) {
        this.sendRaw(player.ws, {
            type: 'party.state',
            party: party ? this.buildPartySnapshot(party) : null
        });
    }

    private syncPartyStateForMembers(party: Party, includeAreaList: boolean = false) {
        party.areaId = this.players.get(party.leaderId) ? this.getAreaIdForPlayer(this.players.get(party.leaderId)!) : party.areaId;
        for (const memberId of party.memberIds) {
            const member = this.players.get(memberId);
            if (!member) continue;
            member.partyId = party.id;
            this.sendPartyStateToPlayer(member, party);
            if (includeAreaList) this.sendPartyAreaList(member);
        }
    }

    private syncAllPartyStates() {
        for (const party of this.parties.values()) {
            this.syncPartyStateForMembers(party);
        }
    }

    private sendPartyAreaList(player: PlayerRuntime) {
        const areaId = this.getAreaIdForPlayer(player);
        const parties = [...this.parties.values()]
            .filter((party) => party.areaId === areaId)
            .map((party) => {
                const leader = this.players.get(party.leaderId);
                const levels = party.memberIds
                    .map((id) => this.players.get(id))
                    .filter((p): p is PlayerRuntime => Boolean(p))
                    .map((p) => p.level);
                const avgLevel = levels.length > 0 ? Math.round(levels.reduce((sum, lv) => sum + lv, 0) / levels.length) : 1;
                return {
                    partyId: party.id,
                    leaderId: party.leaderId,
                    leaderName: leader?.name || `#${party.leaderId}`,
                    members: party.memberIds.length,
                    maxMembers: party.maxMembers,
                    avgLevel
                };
            });

        this.sendRaw(player.ws, { type: 'party.areaList', parties });
    }

    private pruneExpiredPartyInvites(now: number) {
        for (const [inviteId, invite] of this.partyInvites.entries()) {
            if (invite.expiresAt > now) continue;
            this.partyInvites.delete(inviteId);
        }
    }

    private pruneExpiredPartyJoinRequests(now: number) {
        for (const [requestId, request] of this.partyJoinRequests.entries()) {
            if (request.expiresAt > now) continue;
            this.partyJoinRequests.delete(requestId);
        }
    }

    private clearPendingInvitesForPlayer(playerId: number) {
        for (const [inviteId, invite] of this.partyInvites.entries()) {
            if (invite.fromPlayerId === playerId || invite.toPlayerId === playerId) {
                this.partyInvites.delete(inviteId);
            }
        }
    }

    private clearJoinRequestsForPlayer(playerId: number) {
        for (const [requestId, request] of this.partyJoinRequests.entries()) {
            if (request.fromPlayerId === playerId || request.toLeaderId === playerId) {
                this.partyJoinRequests.delete(requestId);
            }
        }
    }

    private clearJoinRequestsForParty(partyId: string) {
        for (const [requestId, request] of this.partyJoinRequests.entries()) {
            if (request.partyId === partyId) this.partyJoinRequests.delete(requestId);
        }
    }

    private sendFriendError(player: PlayerRuntime, message: string) {
        this.sendRaw(player.ws, { type: 'friend.error', message });
    }

    private getFriendSet(playerId: number) {
        if (!this.friendLinks.has(playerId)) this.friendLinks.set(playerId, new Set());
        return this.friendLinks.get(playerId)!;
    }

    private areFriends(a: number, b: number) {
        return this.getFriendSet(a).has(b) && this.getFriendSet(b).has(a);
    }

    private linkFriends(a: number, b: number) {
        this.getFriendSet(a).add(b);
        this.getFriendSet(b).add(a);
    }

    private unlinkFriends(a: number, b: number) {
        this.getFriendSet(a).delete(b);
        this.getFriendSet(b).delete(a);
    }

    private consumeFriendRequestRate(playerId: number) {
        const now = Date.now();
        const windowMs = 60000;
        const maxPerWindow = 10;
        const timestamps = (this.friendRequestWindow.get(playerId) || []).filter((ts) => now - ts <= windowMs);
        if (timestamps.length >= maxPerWindow) {
            this.friendRequestWindow.set(playerId, timestamps);
            return false;
        }
        timestamps.push(now);
        this.friendRequestWindow.set(playerId, timestamps);
        return true;
    }

    private pruneExpiredFriendRequests(now: number) {
        for (const [requestId, request] of this.friendRequests.entries()) {
            if (request.expiresAt > now) continue;
            this.friendRequests.delete(requestId);
            const from = this.players.get(request.fromPlayerId);
            const to = this.players.get(request.toPlayerId);
            if (from) this.sendFriendState(from);
            if (to) this.sendFriendState(to);
        }
        if (now - this.lastFriendDbPruneAt >= 10000) {
            this.lastFriendDbPruneAt = now;
            void this.persistence.pruneExpiredFriendRequests(new Date(now));
        }
    }

    private clearFriendRequestsForPlayer(playerId: number) {
        for (const [requestId, request] of this.friendRequests.entries()) {
            if (request.fromPlayerId === playerId || request.toPlayerId === playerId) {
                this.friendRequests.delete(requestId);
            }
        }
        this.friendRequestWindow.delete(playerId);
        void this.persistence.clearFriendRequestsForPlayer(playerId);
    }

    private findOnlinePlayerByName(rawName: string) {
        const needle = String(rawName || '').trim().toLowerCase();
        if (!needle) return null;
        return [...this.players.values()].find((candidate) => {
            const byName = String(candidate.name || '').toLowerCase() === needle;
            const byUsername = String(candidate.username || '').toLowerCase() === needle;
            return byName || byUsername;
        }) || null;
    }

    private sendFriendState(player: PlayerRuntime) {
        const friends = [...this.getFriendSet(player.id)].map((friendId) => {
            const friend = this.players.get(friendId);
            return {
                playerId: friendId,
                name: friend?.name || `#${friendId}`,
                online: Boolean(friend)
            };
        });
        const incoming = [...this.friendRequests.values()]
            .filter((req) => req.toPlayerId === player.id)
            .map((req) => {
                const from = this.players.get(req.fromPlayerId);
                return {
                    requestId: req.id,
                    fromPlayerId: req.fromPlayerId,
                    fromName: from?.name || `#${req.fromPlayerId}`,
                    expiresAt: req.expiresAt
                };
            });
        const outgoing = [...this.friendRequests.values()]
            .filter((req) => req.fromPlayerId === player.id)
            .map((req) => {
                const to = this.players.get(req.toPlayerId);
                return {
                    requestId: req.id,
                    toPlayerId: req.toPlayerId,
                    toName: to?.name || `#${req.toPlayerId}`,
                    expiresAt: req.expiresAt
                };
            });

        this.sendRaw(player.ws, { type: 'friend.state', friends, incoming, outgoing });
    }

    private async hydrateFriendStateForPlayer(player: PlayerRuntime) {
        const friendships = await this.persistence.getFriendshipsForPlayer(player.id);
        for (const fs of friendships) {
            const a = Number(fs.playerAId);
            const b = Number(fs.playerBId);
            this.linkFriends(a, b);
        }

        const pending = await this.persistence.getPendingFriendRequestsForPlayer(player.id);
        for (const req of [...pending.incoming, ...pending.outgoing]) {
            this.friendRequests.set(String(req.id), {
                id: String(req.id),
                fromPlayerId: Number(req.fromPlayerId),
                toPlayerId: Number(req.toPlayerId),
                createdAt: req.createdAt.getTime(),
                expiresAt: req.expiresAt.getTime()
            });
        }
    }

    private removePlayerFromParty(player: PlayerRuntime) {
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        player.partyId = null;
        if (player.pvpMode === 'group') {
            player.pvpMode = 'peace';
            this.broadcastRaw({
                type: 'player.pvpModeUpdated',
                playerId: player.id,
                mode: 'peace'
            });
            this.persistPlayer(player);
        }
        if (!party) {
            this.sendPartyStateToPlayer(player, null);
            return;
        }

        party.memberIds = party.memberIds.filter((id) => id !== player.id);
        this.sendPartyStateToPlayer(player, null);
        this.clearPendingInvitesForPlayer(player.id);

        if (party.memberIds.length === 0) {
            this.clearJoinRequestsForParty(party.id);
            this.parties.delete(party.id);
            return;
        }

        if (party.leaderId === player.id) {
            party.leaderId = party.memberIds[0];
            this.clearJoinRequestsForParty(party.id);
        }
        this.syncPartyStateForMembers(party, true);
    }

    private persistPlayer(player: PlayerRuntime) {
        void this.persistence.savePlayer(player).catch((error) => {
            logEvent('ERROR', 'save_player_error', { playerId: player.id, error: String(error) });
        });
    }

    private normalizeAllocatedStats(input: any): Record<AllocatableStat, number> {
        const source = input && typeof input === 'object' ? input : {};
        return {
            physicalAttack: Number.isFinite(Number(source.physicalAttack)) ? Math.max(0, Math.floor(Number(source.physicalAttack))) : 0,
            magicAttack: Number.isFinite(Number(source.magicAttack)) ? Math.max(0, Math.floor(Number(source.magicAttack))) : 0,
            physicalDefense: Number.isFinite(Number(source.physicalDefense)) ? Math.max(0, Math.floor(Number(source.physicalDefense))) : 0,
            magicDefense: Number.isFinite(Number(source.magicDefense)) ? Math.max(0, Math.floor(Number(source.magicDefense))) : 0
        };
    }

    private sendStatsUpdated(player: PlayerRuntime) {
        this.sendRaw(player.ws, {
            type: 'player.statsUpdated',
            stats: player.stats,
            allocatedStats: this.normalizeAllocatedStats(player.allocatedStats),
            unspentPoints: Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0,
            level: player.level,
            xp: player.xp,
            xpToNext: xpRequired(player.level),
            hp: player.hp,
            maxHp: player.maxHp
        });
    }

    private sendRaw(ws: any, payload: any) {
        try {
            ws?.send(JSON.stringify(payload));
        } catch {
            // Ignore socket send failures; cleanup happens on disconnect.
        }
    }

    private broadcastRaw(payload: any) {
        for (const player of this.players.values()) {
            this.sendRaw(player.ws, payload);
        }
    }
}
