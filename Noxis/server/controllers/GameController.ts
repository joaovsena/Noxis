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
    ITEM_PICKUP_RANGE,
    BASE_MOVE_SPEED,
    PLAYER_HALF_SIZE,
    STATUS_IDS,
    COMBAT_LOCK_MS,
    MAP_THEMES,
    PORTALS_BY_MAP_KEY,
    PORTAL_COOLDOWN_MS,
    composeMapInstanceId
} from '../config';
import { logEvent } from '../utils/logger';

export class GameController {
    private persistence: PersistenceService;
    private mobService: MobService;
    players: Map<string, PlayerRuntime> = new Map();
    usernameToPlayerId: Map<string, string> = new Map();
    groundItems: GroundItem[] = [];

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
        const profile = {
            name,
            class: selectedClass,
            gender,
            level: 1,
            xp: 0,
            hp: baseStats.maxHp,
            maxHp: baseStats.maxHp,
            role: 'player',
            statusOverrides: {},
            inventory: [],
            equippedWeaponId: null,
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

            logEvent('INFO', 'user_login', { username, playerId: player.id });
        } catch (error) {
            logEvent('ERROR', 'login_error', { username, error: String(error) });
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Erro ao fazer login.' }));
        }
    }

    private createRuntimePlayer(username: string, profile: any): PlayerRuntime {
        const spawn = { x: 400 + Math.floor(Math.random() * 600), y: 400 + Math.floor(Math.random() * 600) };
        const id = String(profile?.id || randomUUID());
        const maxHp = profile.stats.maxHp || profile.baseStats.maxHp || 100;
        return {
            ...profile,
            id,
            ws: null,
            username,
            mapKey: DEFAULT_MAP_KEY,
            mapId: DEFAULT_MAP_ID,
            x: spawn.x,
            y: spawn.y,
            targetX: spawn.x,
            targetY: spawn.y,
            autoAttackActive: false,
            attackTargetId: null,
            lastAttackAt: 0,
            lastCombatAt: 0,
            lastPortalAt: 0
        };
    }

    handleMove(player: PlayerRuntime, msg: MoveMessage) {
        const incomingX = Number(msg.x);
        const incomingY = Number(msg.y);
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.targetX = clamp(Number.isFinite(incomingX) ? incomingX : player.x, 0, WORLD.width);
        player.targetY = clamp(Number.isFinite(incomingY) ? incomingY : player.y, 0, WORLD.height);
        player.ws.send(JSON.stringify({
            type: 'move_ack',
            reqId: msg.reqId,
            targetX: player.targetX,
            targetY: player.targetY
        }));
    }

    handleTargetMob(player: PlayerRuntime, msg: any) {
        const mobId = String(msg.mobId || '');
        const mob = this.mobService.getMobs().find((m) => m.id === mobId && m.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (!mob) {
            player.autoAttackActive = false;
            player.attackTargetId = null;
            return;
        }
        player.autoAttackActive = true;
        player.attackTargetId = mob.id;
    }

    handleSwitchInstance(player: PlayerRuntime, msg: any) {
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
        player.attackTargetId = null;
        player.autoAttackActive = false;
        player.ws.send(JSON.stringify({ type: 'system_message', text: `Instancia alterada para ${target}.` }));
    }

    handlePickupItem(player: PlayerRuntime, msg: any) {
        const itemId = String(msg.itemId || '');
        const index = this.groundItems.findIndex((it) => it.id === itemId && it.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (index === -1) return;
        const item = this.groundItems[index];
        if (distance(player, item) > ITEM_PICKUP_RANGE) return;
        const freeSlot = this.firstFreeInventorySlot(player.inventory);
        if (freeSlot === -1) return;

        this.groundItems.splice(index, 1);
        player.inventory.push({ ...item, slotIndex: freeSlot });
        player.ws.send(JSON.stringify({
            type: 'inventory_state',
            inventory: player.inventory,
            equippedWeaponId: player.equippedWeaponId
        }));
    }

    tick(deltaSeconds: number, now: number) {
        for (const player of this.players.values()) {
            this.movePlayerTowardTarget(player, deltaSeconds);
            this.processPortalCollision(player, now);
            this.processAutoAttack(player, now);
        }
    }

    buildWorldSnapshot(mapId: string = DEFAULT_MAP_ID, mapKey: string = DEFAULT_MAP_KEY) {
        const mapInstanceId = this.mapInstanceId(mapKey, mapId);
        const publicPlayers: Record<string, any> = {};
        for (const [id, player] of this.players.entries()) {
            if (player.mapId !== mapId || player.mapKey !== mapKey) continue;
            publicPlayers[id] = this.sanitizePublicPlayer(player);
        }
        return {
            type: 'world_state',
            players: publicPlayers,
            mobs: this.mobService.getMobsByMap(mapInstanceId),
            groundItems: this.groundItems.filter((it) => it.mapId === mapInstanceId),
            mapKey,
            mapTheme: MAP_THEMES[mapKey] || 'forest',
            portals: PORTALS_BY_MAP_KEY[mapKey] || [],
            mapId,
            world: WORLD
        };
    }

    getPlayerByRuntimeId(playerId: string) {
        return this.players.get(playerId);
    }

    async handleDisconnect(playerId: string) {
        const player = this.players.get(playerId);
        if (!player) return;
        await this.persistence.savePlayer(player);
        this.usernameToPlayerId.delete(player.username);
        this.players.delete(playerId);
    }

    private firstFreeInventorySlot(items: any[]): number {
        const used = new Set(items.map((it) => it.slotIndex).filter((n) => Number.isInteger(n)));
        for (let i = 0; i < 36; i++) {
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
            role: player.role || 'player',
            level: player.level,
            hp: player.hp,
            maxHp: player.maxHp,
            equippedWeaponName: weapon ? weapon.name : null,
            xp: player.xp,
            xpToNext: xpRequired(player.level),
            stats: player.stats
        };
    }

    private movePlayerTowardTarget(player: PlayerRuntime, deltaSeconds: number) {
        const rawMoveSpeed = Number(player.stats?.moveSpeed);
        const moveSpeedStat = Number.isFinite(rawMoveSpeed) && rawMoveSpeed > 0 ? rawMoveSpeed : 100;
        const speed = BASE_MOVE_SPEED * (moveSpeedStat / 100);
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 0.01) return;

        const step = speed * deltaSeconds;
        if (step >= dist) {
            player.x = player.targetX;
            player.y = player.targetY;
            return;
        }

        player.x += (dx / dist) * step;
        player.y += (dy / dist) * step;
    }

    private processAutoAttack(player: PlayerRuntime, now: number) {
        if (!player.autoAttackActive || !player.attackTargetId) return;

        const mob = this.mobService.getMobs().find((m) => m.id === player.attackTargetId && m.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (!mob) {
            player.autoAttackActive = false;
            player.attackTargetId = null;
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
            player.targetX = clamp(mob.x + (dx / norm) * desiredDistance, 0, WORLD.width);
            player.targetY = clamp(mob.y + (dy / norm) * desiredDistance, 0, WORLD.height);
            return;
        }

        player.targetX = player.x;
        player.targetY = player.y;

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
            this.mobService.removeMob(mob.id);
        }
    }

    private processPortalCollision(player: PlayerRuntime, now: number) {
        if (now - (player.lastPortalAt || 0) < PORTAL_COOLDOWN_MS) return;
        const portals = PORTALS_BY_MAP_KEY[player.mapKey] || [];
        for (const portal of portals) {
            const insideX = player.x >= portal.x && player.x <= portal.x + portal.w;
            const insideY = player.y >= portal.y && player.y <= portal.y + portal.h;
            if (!insideX || !insideY) continue;
            player.mapKey = portal.toMapKey;
            player.x = clamp(portal.toX, 0, WORLD.width);
            player.y = clamp(portal.toY, 0, WORLD.height);
            player.targetX = player.x;
            player.targetY = player.y;
            player.attackTargetId = null;
            player.autoAttackActive = false;
            player.lastPortalAt = now;
            player.ws?.send(JSON.stringify({ type: 'system_message', text: `Portal: ${portal.toMapKey.toUpperCase()}` }));
            return;
        }
    }

    private mapInstanceId(mapKey: string, mapId: string) {
        return composeMapInstanceId(mapKey, mapId);
    }

    private grantXp(player: PlayerRuntime, amount: number) {
        player.xp += amount;
        let next = xpRequired(player.level);
        while (player.xp >= next) {
            player.xp -= next;
            player.level += 1;
            next = xpRequired(player.level);
        }

        player.stats = levelUpStats(player.baseStats, player.level);
        player.maxHp = Number(player.stats.maxHp || player.maxHp);
        player.hp = clamp(player.hp, 1, player.maxHp);
    }
}
