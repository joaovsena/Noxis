const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

if (!process.env.ALLOW_LEGACY_JSON_SERVER) {
    console.error('[LEGACY_DISABLED] server/server.js desativado. Use npm start (dist/server/index.js + Postgres).');
    process.exit(1);
}

const app = express();
app.use(express.static(path.join(__dirname, '../public')));

const server = createServer(app);
const wss = new WebSocketServer({ server });

const WORLD = { width: 6400, height: 6400 };
const MAP_IDS = ['E1', 'E2'];
const DEFAULT_MAP_ID = 'E1';
const TICK_MS = 50;
const MOB_COUNTS = { normal: 25, elite: 15, subboss: 5, boss: 1 };
const INVENTORY_SIZE = 36;
const MOB_RESPAWN_MS = 10000;
const BASE_MOVE_SPEED = 140;
const PLAYER_HALF_SIZE = 20;
const LOCAL_CHAT_RADIUS = 650;

const DEFAULT_MOB = {
    size: 40,
    maxHp: 120,
    physicalDefense: 4,
    magicDefense: 4,
    xpReward: 35
};
const MOB_VARIANTS = {
    normal: { mult: 1, size: 40, color: '#d63031' },
    elite: { mult: 2, size: 56, color: '#e67e22' },
    subboss: { mult: 5, size: 72, color: '#8e44ad' },
    boss: { mult: 9, size: 96, color: '#111111' }
};
const ITEM_PICKUP_RANGE = 90;
const COMBAT_LOCK_MS = 10000;
const WEAPON_TEMPLATE = {
    name: 'Arma Teste',
    slot: 'weapon',
    bonuses: {
        physicalAttack: 10,
        magicAttack: 10,
        moveSpeed: 50,
        attackSpeed: 50
    }
};
const STATUS_IDS = {
    physicalAttack: 1,
    magicAttack: 2,
    physicalDefense: 3,
    magicDefense: 4,
    moveSpeed: 5,
    attackSpeed: 6,
    attackRange: 7,
    maxHp: 8
};
const STATUS_BY_ID = Object.fromEntries(Object.entries(STATUS_IDS).map(([k, v]) => [String(v), k]));

const CLASS_TEMPLATES = {
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

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const logsDir = path.join(__dirname, 'logs');
const serverLogFile = path.join(logsDir, 'server.log.txt');

if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logStream = fs.createWriteStream(serverLogFile, { flags: 'a' });

/**
 * Registra eventos de debug/erros em arquivo .txt com timestamp e payload JSON.
 */
function logEvent(level, event, data = {}) {
    const line = `[${new Date().toISOString()}] [${level}] ${event} ${JSON.stringify(data)}\n`;
    logStream.write(line);
}

process.on('uncaughtException', (err) => {
    logEvent('ERROR', 'uncaught_exception', { message: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
    logEvent('ERROR', 'unhandled_rejection', { reason: String(reason) });
});

/**
 * Garante que o diretório/arquivo de contas exista.
 */
function ensureDataStore() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify({ users: {} }, null, 2), 'utf8');
    }
}

/**
 * Carrega as contas do JSON.
 */
function readUsers() {
    ensureDataStore();
    try {
        const parsed = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        if (!parsed.users || typeof parsed.users !== 'object') return { users: {} };
        return parsed;
    } catch {
        return { users: {} };
    }
}

/**
 * Persiste o JSON de contas no disco.
 */
function writeUsers(store) {
    fs.writeFileSync(usersFile, JSON.stringify(store, null, 2), 'utf8');
}

const usersStore = readUsers();
const players = {};
const usernameToPlayerId = new Map();
const mobs = [];
const groundItems = [];
let mobIdCounter = 0;
let lastMovementLogAt = 0;

/**
 * Aplica hash (sha256) de senha + salt.
 */
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

/**
 * Calcula XP necessário para o próximo nível.
 */
function xpRequired(level) {
    return 100 + (level - 1) * 40;
}

/**
 * Recalcula stats por nível (movimento/ataqueSpeed/alcance fixos).
 */
function levelUpStats(baseStats, level) {
    // Somente atributos basicos escalam com nivel (ataques e defesas).
    return {
        physicalAttack: baseStats.physicalAttack + (level - 1) * 2,
        magicAttack: baseStats.magicAttack + (level - 1) * 2,
        physicalDefense: baseStats.physicalDefense + (level - 1),
        magicDefense: baseStats.magicDefense + (level - 1),
        moveSpeed: baseStats.moveSpeed,
        attackSpeed: baseStats.attackSpeed,
        attackRange: baseStats.attackRange,
        damageType: baseStats.damageType,
        maxHp: baseStats.maxHp
    };
}

/**
 * Encontra primeiro slot livre do inventário (0..35).
 */
function firstFreeInventorySlot(items) {
    const used = new Set(items.map((it) => it.slotIndex).filter((n) => Number.isInteger(n)));
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (!used.has(i)) return i;
    }
    return -1;
}

/**
 * Normaliza slots do inventário para garantir valores únicos e válidos.
 */
function normalizeInventorySlots(items) {
    const out = [];
    const used = new Set();
    for (const item of items) {
        const clone = { ...item };
        if (!Number.isInteger(clone.slotIndex) || clone.slotIndex < 0 || clone.slotIndex >= INVENTORY_SIZE || used.has(clone.slotIndex)) {
            clone.slotIndex = firstFreeInventorySlot(out);
        }
        if (clone.slotIndex === -1) continue;
        used.add(clone.slotIndex);
        out.push(clone);
    }
    return out;
}

/**
 * Retorna item equipado (arma) do inventário do player.
 */
function getEquippedWeapon(player) {
    if (!player.equippedWeaponId) return null;
    return player.inventory.find((item) => item.id === player.equippedWeaponId) || null;
}

/**
 * Recalcula stats finais (base + bônus do item equipado).
 */
function recomputePlayerStats(player) {
    const leveled = levelUpStats(player.baseStats, player.level);
    for (const [key, value] of Object.entries(player.statusOverrides || {})) {
        if (typeof leveled[key] === 'number' && Number.isFinite(value)) {
            leveled[key] = value;
        }
    }
    const weapon = getEquippedWeapon(player);
    if (!weapon || !weapon.bonuses) {
        player.stats = leveled;
        player.maxHp = leveled.maxHp;
        player.hp = Math.min(player.hp, player.maxHp);
        return;
    }

    player.stats = {
        ...leveled,
        physicalAttack: leveled.physicalAttack + (weapon.bonuses.physicalAttack || 0),
        magicAttack: leveled.magicAttack + (weapon.bonuses.magicAttack || 0),
        moveSpeed: leveled.moveSpeed + (weapon.bonuses.moveSpeed || 0),
        attackSpeed: leveled.attackSpeed + (weapon.bonuses.attackSpeed || 0)
    };
    player.maxHp = leveled.maxHp;
    player.hp = Math.min(player.hp, player.maxHp);
}

/**
 * Envia uma mensagem para um cliente WebSocket específico.
 */
function send(ws, payload) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

/**
 * Envia uma mensagem para todos os clientes conectados (com filtro opcional).
 */
function broadcast(payload, filterFn = null) {
    const encoded = JSON.stringify(payload);
    for (const client of wss.clients) {
        if (client.readyState !== client.OPEN) continue;
        if (filterFn && !filterFn(client)) continue;
        client.send(encoded);
    }
}

/**
 * Gera posição inicial de spawn.
 */
function randomSpawn() {
    return {
        x: 400 + Math.floor(Math.random() * 600),
        y: 400 + Math.floor(Math.random() * 600)
    };
}

/**
 * Distância euclidiana entre dois pontos.
 */
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Limita um valor entre min e max.
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Cria um mob com stats padrão.
 */
function createMob(kind = 'normal', mapId = DEFAULT_MAP_ID) {
    const variant = MOB_VARIANTS[kind] || MOB_VARIANTS.normal;
    const padding = 80;
    return {
        id: `mob-${++mobIdCounter}`,
        x: padding + Math.random() * (WORLD.width - padding * 2),
        y: padding + Math.random() * (WORLD.height - padding * 2),
        kind,
        color: variant.color,
        size: variant.size,
        hp: Math.floor(DEFAULT_MOB.maxHp * variant.mult),
        maxHp: Math.floor(DEFAULT_MOB.maxHp * variant.mult),
        physicalDefense: Math.floor(DEFAULT_MOB.physicalDefense * variant.mult),
        magicDefense: Math.floor(DEFAULT_MOB.magicDefense * variant.mult),
        xpReward: Math.floor(DEFAULT_MOB.xpReward * variant.mult),
        mapId
    };
}

/**
 * Spawna um novo mob respeitando limite máximo.
 */
function spawnMob(kind = 'normal', mapId = DEFAULT_MAP_ID) {
    const quota = MOB_COUNTS[kind] || 0;
    const current = mobs.filter((m) => m.kind === kind && m.mapId === mapId).length;
    if (current >= quota) return;
    mobs.push(createMob(kind, mapId));
}

/**
 * Remove mob morto e limpa alvos de autoataque que apontavam para ele.
 */
function removeMob(mobId) {
    const index = mobs.findIndex((mob) => mob.id === mobId);
    if (index === -1) return;
    const kind = mobs[index].kind || 'normal';
    const mapId = mobs[index].mapId || DEFAULT_MAP_ID;
    mobs.splice(index, 1);

    for (const id of Object.keys(players)) {
        const player = players[id];
        if (player.attackTargetId === mobId) {
            player.autoAttackActive = false;
            player.attackTargetId = null;
        }
    }

    setTimeout(() => spawnMob(kind, mapId), MOB_RESPAWN_MS);
}

/**
 * Converte player runtime para payload seguro do cliente.
 */
function sanitizePublicPlayer(player) {
    const weapon = getEquippedWeapon(player);
    return {
        id: player.id,
        username: player.username,
        name: player.name,
        class: player.class,
        gender: player.gender,
        x: player.x,
        y: player.y,
        mapId: player.mapId,
        role: player.role || 'player',
        inCombat: Date.now() - (player.lastCombatAt || 0) < COMBAT_LOCK_MS,
        level: player.level,
        hp: player.hp,
        maxHp: player.maxHp,
        equippedWeaponName: weapon ? weapon.name : null,
        xp: player.xp,
        xpToNext: xpRequired(player.level),
        stats: player.stats
    };
}

/**
 * Monta snapshot autoritativo do mundo para broadcast.
 */
function buildWorldSnapshot(mapId = DEFAULT_MAP_ID) {
    const publicPlayers = {};
    for (const id of Object.keys(players)) {
        if (players[id].mapId !== mapId) continue;
        publicPlayers[id] = sanitizePublicPlayer(players[id]);
    }
    return {
        type: 'world_state',
        players: publicPlayers,
        mobs: mobs.filter((m) => m.mapId === mapId),
        groundItems: groundItems.filter((it) => it.mapId === mapId),
        mapId,
        world: WORLD
    };
}

/**
 * Persiste progresso do jogador no JSON.
 */
function persistPlayerProgress(player) {
    const account = usersStore.users[player.username];
    if (!account) return;

    account.profile.level = player.level;
    account.profile.xp = player.xp;
    account.profile.stats = player.stats;
    account.profile.hp = player.hp;
    account.profile.role = player.role || 'player';
    account.profile.statusOverrides = player.statusOverrides || {};
    account.profile.inventory = player.inventory;
    account.profile.equippedWeaponId = player.equippedWeaponId || null;
    writeUsers(usersStore);
}

/**
 * Concede XP, processa level up e persiste progresso.
 */
function grantXp(player, amount) {
    player.xp += amount;
    let next = xpRequired(player.level);
    while (player.xp >= next) {
        player.xp -= next;
        player.level += 1;
        next = xpRequired(player.level);
    }
    recomputePlayerStats(player);
    persistPlayerProgress(player);
}

/**
 * Cria objeto runtime do player conectado.
 */
function createRuntimePlayer(username, profile, ws) {
    const spawn = randomSpawn();
    const id = crypto.randomUUID();
    const maxHp = profile.stats.maxHp || profile.baseStats.maxHp || 100;
    const instancePositions = {
        [DEFAULT_MAP_ID]: { x: spawn.x, y: spawn.y }
    };
    const player = {
        id,
        ws,
        username,
        mapId: DEFAULT_MAP_ID,
        name: profile.name,
        role: profile.role || 'player',
        class: profile.class,
        gender: profile.gender,
        level: profile.level,
        xp: profile.xp,
        baseStats: profile.baseStats,
        statusOverrides: profile.statusOverrides || {},
        stats: profile.stats,
        inventory: normalizeInventorySlots(Array.isArray(profile.inventory) ? profile.inventory : []),
        equippedWeaponId: profile.equippedWeaponId || null,
        hp: typeof profile.hp === 'number' ? clamp(profile.hp, 1, maxHp) : maxHp,
        maxHp,
        x: spawn.x,
        y: spawn.y,
        targetX: spawn.x,
        targetY: spawn.y,
        instancePositions,
        autoAttackActive: false,
        attackTargetId: null,
        lastAttackAt: 0,
        lastCombatAt: 0
    };
    recomputePlayerStats(player);
    return player;
}

/**
 * Processa registro de conta.
 */
function handleRegister(ws, msg) {
    const username = String(msg.username || '').trim().toLowerCase();
    const password = String(msg.password || '');
    const name = String(msg.name || '').trim();
    const selectedClass = CLASS_TEMPLATES[msg.class] ? msg.class : 'knight';
    const gender = 'male';

    if (username.length < 3 || password.length < 3 || name.length < 3) {
        send(ws, { type: 'auth_error', message: 'Preencha usuario, senha e nome com ao menos 3 caracteres.' });
        return;
    }

    if (usersStore.users[username]) {
        send(ws, { type: 'auth_error', message: 'Usuario ja existe.' });
        return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const baseStats = { ...CLASS_TEMPLATES[selectedClass] };
    const profile = {
        name,
        class: selectedClass,
        gender,
        level: 1,
        xp: 0,
        hp: baseStats.maxHp,
        role: 'player',
        statusOverrides: {},
        inventory: [],
        equippedWeaponId: null,
        baseStats,
        stats: levelUpStats(baseStats, 1)
    };

    usersStore.users[username] = { passwordHash, salt, profile };
    writeUsers(usersStore);
    send(ws, { type: 'auth_ok', message: 'Registro concluido. Agora faca login.' });
}

/**
 * Normaliza perfil antigo/incompleto para template atual da classe.
 */
function normalizeProfile(account) {
    if (!account.profile || !account.profile.class) return null;
    const chosenClass = CLASS_TEMPLATES[account.profile.class] ? account.profile.class : 'knight';
    account.profile.baseStats = { ...CLASS_TEMPLATES[chosenClass] };
    if (!account.profile.level || account.profile.level < 1) account.profile.level = 1;
    if (typeof account.profile.xp !== 'number' || account.profile.xp < 0) account.profile.xp = 0;
    if (account.profile.role !== 'adm') account.profile.role = 'player';
    if (!account.profile.statusOverrides || typeof account.profile.statusOverrides !== 'object') {
        account.profile.statusOverrides = {};
    }
    if (!Array.isArray(account.profile.inventory)) account.profile.inventory = [];
    account.profile.inventory = normalizeInventorySlots(account.profile.inventory);
    if (account.profile.equippedWeaponId && !account.profile.inventory.some((it) => it.id === account.profile.equippedWeaponId)) {
        account.profile.equippedWeaponId = null;
    }
    account.profile.stats = levelUpStats(account.profile.baseStats, account.profile.level);
    if (typeof account.profile.hp !== 'number' || account.profile.hp <= 0) {
        account.profile.hp = account.profile.stats.maxHp;
    }
    account.profile.hp = clamp(account.profile.hp, 1, account.profile.stats.maxHp);
    return account.profile;
}

/**
 * Processa login e cria sessão runtime do jogador.
 */
function handleLogin(ws, msg) {
    const username = String(msg.username || '').trim().toLowerCase();
    const password = String(msg.password || '');
    const account = usersStore.users[username];

    if (!account) {
        send(ws, { type: 'auth_error', message: 'Usuario ou senha invalidos.' });
        return;
    }

    const incomingHash = hashPassword(password, account.salt);
    if (incomingHash !== account.passwordHash) {
        send(ws, { type: 'auth_error', message: 'Usuario ou senha invalidos.' });
        return;
    }

    const profile = normalizeProfile(account);
    if (!profile) {
        send(ws, { type: 'auth_error', message: 'Perfil da conta invalido.' });
        return;
    }
    writeUsers(usersStore);

    if (usernameToPlayerId.has(username)) {
        send(ws, { type: 'auth_error', message: 'Esse usuario ja esta online.' });
        return;
    }

    const player = createRuntimePlayer(username, profile, ws);
    players[player.id] = player;
    usernameToPlayerId.set(username, player.id);
    ws.playerId = player.id;
    writeUsers(usersStore);

    send(ws, {
        type: 'auth_success',
        playerId: player.id,
        world: WORLD,
        role: player.role || 'player',
        statusIds: STATUS_IDS
    });
    send(ws, {
        type: 'inventory_state',
        inventory: player.inventory,
        equippedWeaponId: player.equippedWeaponId
    });
}

/**
 * Envia estado de inventário/equipamento para o cliente dono.
 */
function sendInventoryState(player) {
    send(player.ws, {
        type: 'inventory_state',
        inventory: [...player.inventory].sort((a, b) => a.slotIndex - b.slotIndex),
        equippedWeaponId: player.equippedWeaponId
    });
}

/**
 * Processa comando de movimento e envia ACK para rastreio.
 */
function handleMove(player, msg) {
    const incomingX = Number(msg.x);
    const incomingY = Number(msg.y);
    const reqId = msg.reqId ? String(msg.reqId) : null;
    const before = { x: player.x, y: player.y, targetX: player.targetX, targetY: player.targetY };
    player.autoAttackActive = false;
    player.attackTargetId = null;
    player.targetX = clamp(Number.isFinite(incomingX) ? incomingX : player.x, 0, WORLD.width);
    player.targetY = clamp(Number.isFinite(incomingY) ? incomingY : player.y, 0, WORLD.height);
    logEvent('INFO', 'move_received', {
        playerId: player.id,
        username: player.username,
        reqId,
        incomingX: msg.x,
        incomingY: msg.y,
        parsedX: incomingX,
        parsedY: incomingY,
        before,
        after: { x: player.x, y: player.y, targetX: player.targetX, targetY: player.targetY }
    });
    send(player.ws, {
        type: 'move_ack',
        reqId,
        targetX: player.targetX,
        targetY: player.targetY
    });
}

/**
 * Processa seleção de alvo para autoataque.
 */
function handleTargetMob(player, msg) {
    const mobId = String(msg.mobId || '');
    const mob = mobs.find((m) => m.id === mobId && m.mapId === player.mapId);
    if (!mob) {
        player.autoAttackActive = false;
        player.attackTargetId = null;
        return;
    }
    player.autoAttackActive = true;
    player.attackTargetId = mob.id;
}

/**
 * Processa envio de chat nos escopos local/mapa/global.
 */
function handleChat(player, msg) {
    const scope = msg.scope === 'global' || msg.scope === 'map' ? msg.scope : 'local';
    const text = String(msg.text || '').trim();
    if (!text) return;

    const payload = {
        type: 'chat_message',
        id: crypto.randomUUID(),
        fromId: player.id,
        scope,
        from: player.name,
        mapId: player.mapId,
        text: text.slice(0, 180),
        at: Date.now()
    };

    if (scope === 'global') {
        broadcast(payload);
        return;
    }

    if (scope === 'map') {
        send(player.ws, payload);
        broadcast(payload, (client) => {
            if (client === player.ws) return false;
            if (!client.playerId || !players[client.playerId]) return false;
            return players[client.playerId].mapId === player.mapId;
        });
        return;
    }

    send(player.ws, payload);
    broadcast(payload, (client) => {
        if (client === player.ws) return false;
        if (!client.playerId || !players[client.playerId]) return false;
        const receiver = players[client.playerId];
        if (receiver.mapId !== player.mapId) return false;
        return distance(receiver, player) <= LOCAL_CHAT_RADIUS;
    });
}

/**
 * Cria item no chão com base no template de arma.
 */
function dropWeaponAt(x, y) {
    groundItems.push({
        id: crypto.randomUUID(),
        type: 'weapon',
        name: WEAPON_TEMPLATE.name,
        slot: WEAPON_TEMPLATE.slot,
        bonuses: { ...WEAPON_TEMPLATE.bonuses },
        x,
        y,
        mapId: player.mapId
    });
}

/**
 * Processa coleta de item no chão.
 */
function handlePickupItem(player, msg) {
    const itemId = String(msg.itemId || '');
    const index = groundItems.findIndex((it) => it.id === itemId && it.mapId === player.mapId);
    if (index === -1) return;
    const item = groundItems[index];
    if (distance(player, item) > ITEM_PICKUP_RANGE) return;
    const freeSlot = firstFreeInventorySlot(player.inventory);
    if (freeSlot === -1) return;

    groundItems.splice(index, 1);
    player.inventory.push({ ...item, slotIndex: freeSlot });
    persistPlayerProgress(player);
    sendInventoryState(player);
    logEvent('INFO', 'item_picked', { playerId: player.id, itemId: item.id, itemName: item.name });
}

/**
 * Equipa/unequipa arma do inventário.
 */
function handleEquipItem(player, msg) {
    const itemId = msg.itemId ? String(msg.itemId) : null;
    if (!itemId) {
        player.equippedWeaponId = null;
        recomputePlayerStats(player);
        persistPlayerProgress(player);
        sendInventoryState(player);
        return;
    }

    const found = player.inventory.find((it) => it.id === itemId && it.type === 'weapon');
    if (!found) return;

    player.equippedWeaponId = found.id;
    recomputePlayerStats(player);
    persistPlayerProgress(player);
    sendInventoryState(player);
    logEvent('INFO', 'item_equipped', { playerId: player.id, itemId: found.id, itemName: found.name });
}

/**
 * Move item para outro slot (ou troca com item do slot destino).
 */
function handleInventoryMove(player, msg) {
    const itemId = String(msg.itemId || '');
    const toSlot = Number(msg.toSlot);
    if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= INVENTORY_SIZE) return;

    const item = player.inventory.find((it) => it.id === itemId);
    if (!item) return;

    const occupant = player.inventory.find((it) => it.slotIndex === toSlot);
    const fromSlot = item.slotIndex;
    item.slotIndex = toSlot;
    if (occupant && occupant.id !== item.id) {
        occupant.slotIndex = fromSlot;
    }

    player.inventory = normalizeInventorySlots(player.inventory);
    persistPlayerProgress(player);
    sendInventoryState(player);
}

/**
 * Ordena inventário por nome e depois por id.
 */
function handleInventorySort(player) {
    const sorted = [...player.inventory].sort((a, b) => {
        const byName = (a.name || '').localeCompare(b.name || '');
        if (byName !== 0) return byName;
        return String(a.id).localeCompare(String(b.id));
    });
    for (let i = 0; i < sorted.length && i < INVENTORY_SIZE; i++) {
        sorted[i].slotIndex = i;
    }
    player.inventory = normalizeInventorySlots(sorted);
    persistPlayerProgress(player);
    sendInventoryState(player);
}

/**
 * Exclui item do inventário.
 */
function handleInventoryDelete(player, msg) {
    const itemId = String(msg.itemId || '');
    const index = player.inventory.findIndex((it) => it.id === itemId);
    if (index === -1) return;

    if (player.equippedWeaponId === itemId) {
        player.equippedWeaponId = null;
        recomputePlayerStats(player);
    }
    player.inventory.splice(index, 1);
    player.inventory = normalizeInventorySlots(player.inventory);
    persistPlayerProgress(player);
    sendInventoryState(player);
}

/**
 * Unequipa item e força retorno para um slot específico.
 */
function handleInventoryUnequipToSlot(player, msg) {
    const itemId = String(msg.itemId || '');
    const toSlot = Number(msg.toSlot);
    if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= INVENTORY_SIZE) return;
    if (player.equippedWeaponId !== itemId) return;

    const item = player.inventory.find((it) => it.id === itemId);
    if (!item) return;
    const occupant = player.inventory.find((it) => it.slotIndex === toSlot && it.id !== itemId);
    const fromSlot = item.slotIndex;
    item.slotIndex = toSlot;
    if (occupant) occupant.slotIndex = fromSlot;
    player.equippedWeaponId = null;

    recomputePlayerStats(player);
    player.inventory = normalizeInventorySlots(player.inventory);
    persistPlayerProgress(player);
    sendInventoryState(player);
}

/**
 * Troca instância de mapa (E1/E2) se jogador estiver fora de combate.
 */
function handleSwitchInstance(player, msg) {
    const target = MAP_IDS.includes(msg.mapId) ? msg.mapId : null;
    if (!target || target === player.mapId) return;
    const inCombat = Date.now() - (player.lastCombatAt || 0) < COMBAT_LOCK_MS;
    if (inCombat) {
        send(player.ws, { type: 'system_message', text: 'Voce esta em combate. Aguarde 10s sem atacar.' });
        return;
    }

    if (!player.instancePositions) player.instancePositions = {};
    player.instancePositions[player.mapId] = { x: player.x, y: player.y };
    const remembered = player.instancePositions[target] || randomSpawn();
    player.mapId = target;
    player.x = remembered.x;
    player.y = remembered.y;
    player.targetX = remembered.x;
    player.targetY = remembered.y;
    player.attackTargetId = null;
    player.autoAttackActive = false;
    send(player.ws, { type: 'system_message', text: `Instancia alterada para ${target}.` });
}

/**
 * Executa comando admin: setstatus {id} {quantia} {jogador}
 */
function handleAdminCommand(player, msg) {
    if (player.role !== 'adm') return;
    const raw = String(msg.command || '').trim();
    const parts = raw.split(/\s+/);
    if (parts.length < 4 || parts[0].toLowerCase() !== 'setstatus') {
        send(player.ws, { type: 'admin_result', ok: false, message: 'Uso: setstatus {id} {quantia} {jogador}' });
        return;
    }

    const statusId = String(parts[1]);
    const key = STATUS_BY_ID[statusId];
    const value = Number(parts[2]);
    const username = String(parts[3]).toLowerCase();
    const target = Object.values(players).find((p) => p.username === username);

    if (!key || !Number.isFinite(value) || !target) {
        send(player.ws, { type: 'admin_result', ok: false, message: 'Comando invalido.' });
        return;
    }

    target.statusOverrides[key] = value;
    recomputePlayerStats(target);
    persistPlayerProgress(target);
    sendInventoryState(target);
    send(player.ws, { type: 'admin_result', ok: true, message: `Status ${key} de ${username} = ${value}` });
}

/**
 * Move o player em direção ao target conforme velocidade.
 */
function movePlayerTowardTarget(player, dtSeconds) {
    const rawMoveSpeed = Number(player.stats?.moveSpeed);
    const moveSpeedStat = Number.isFinite(rawMoveSpeed) && rawMoveSpeed > 0 ? rawMoveSpeed : 100;
    const speed = BASE_MOVE_SPEED * (moveSpeedStat / 100);
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= 0.01) return;

    const step = speed * dtSeconds;
    if (step >= dist) {
        player.x = player.targetX;
        player.y = player.targetY;
        return;
    }

    player.x += (dx / dist) * step;
    player.y += (dy / dist) * step;
}

/**
 * Processa autoataque do player contra mob selecionado.
 */
function processAutoAttack(player, now) {
    if (!player.autoAttackActive || !player.attackTargetId) return;

    const mob = mobs.find((m) => m.id === player.attackTargetId && m.mapId === player.mapId);
    if (!mob) {
        player.autoAttackActive = false;
        player.attackTargetId = null;
        return;
    }

    const currentDistance = distance(player, mob);
    const edgeDistance = currentDistance - (mob.size / 2 + PLAYER_HALF_SIZE);
    const inRange = edgeDistance <= player.stats.attackRange;
    if (!inRange) {
        const desiredDistance = mob.size / 2 + PLAYER_HALF_SIZE + Math.max(2, player.stats.attackRange - 4);
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

    let rawAttack = player.stats.physicalAttack;
    let mobDefense = mob.physicalDefense;
    if (player.stats.damageType === 'magic') {
        rawAttack = player.stats.magicAttack;
        mobDefense = mob.magicDefense;
    }

    const damage = Math.max(1, Math.floor(rawAttack - mobDefense * 0.5));
    mob.hp = Math.max(0, mob.hp - damage);
    player.lastCombatAt = now;
    broadcast({
        type: 'combat_hit',
        attackerId: player.id,
        mobId: mob.id,
        attackerX: player.x,
        attackerY: player.y,
        mobX: mob.x,
        mobY: mob.y
    }, (client) => {
        if (!client.playerId || !players[client.playerId]) return false;
        return players[client.playerId].mapId === player.mapId;
    });

    if (mob.hp === 0) {
        grantXp(player, mob.xpReward);
        if (Math.random() < 0.5) {
            dropWeaponAt(mob.x, mob.y);
        }
        removeMob(mob.id);
    }
}

/**
 * Envia world_state filtrado por instância para cada jogador.
 */
function broadcastWorldByInstance() {
    for (const client of wss.clients) {
        if (client.readyState !== client.OPEN) continue;
        if (!client.playerId || !players[client.playerId]) continue;
        const p = players[client.playerId];
        send(client, buildWorldSnapshot(p.mapId));
    }
}

/**
 * Tick principal do mundo: movimento, combate e broadcast de estado.
 */
function tickWorld() {
    const now = Date.now();
    const dt = TICK_MS / 1000;

    for (const id of Object.keys(players)) {
        const player = players[id];
        movePlayerTowardTarget(player, dt);
        processAutoAttack(player, now);
    }

    if (now - lastMovementLogAt >= 1000) {
        lastMovementLogAt = now;
        for (const id of Object.keys(players)) {
            const p = players[id];
            const distToTarget = distance(p, { x: p.targetX, y: p.targetY });
            logEvent('INFO', 'movement_tick', {
                playerId: p.id,
                username: p.username,
                x: Number(p.x.toFixed(2)),
                y: Number(p.y.toFixed(2)),
                targetX: Number(p.targetX.toFixed(2)),
                targetY: Number(p.targetY.toFixed(2)),
                distToTarget: Number(distToTarget.toFixed(2)),
                autoAttackActive: p.autoAttackActive,
                attackTargetId: p.attackTargetId
            });
        }
    }

    broadcastWorldByInstance();
}

for (const mapId of MAP_IDS) {
    for (let i = 0; i < MOB_COUNTS.normal; i++) spawnMob('normal', mapId);
    for (let i = 0; i < MOB_COUNTS.elite; i++) spawnMob('elite', mapId);
    for (let i = 0; i < MOB_COUNTS.subboss; i++) spawnMob('subboss', mapId);
    for (let i = 0; i < MOB_COUNTS.boss; i++) spawnMob('boss', mapId);
}

wss.on('connection', (ws) => {
    ws.playerId = null;
    logEvent('INFO', 'ws_connected', {});

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            logEvent('WARN', 'ws_invalid_json', { raw: raw.toString().slice(0, 120) });
            return;
        }
        logEvent('INFO', 'ws_message', { type: msg.type, playerId: ws.playerId || null });

        if (msg.type === 'auth_register') return handleRegister(ws, msg);
        if (msg.type === 'auth_login') return handleLogin(ws, msg);

        if (!ws.playerId || !players[ws.playerId]) return;
        const player = players[ws.playerId];

        if (msg.type === 'move') return handleMove(player, msg);
        if (msg.type === 'target_mob') return handleTargetMob(player, msg);
        if (msg.type === 'chat_send') return handleChat(player, msg);
        if (msg.type === 'pickup_item') return handlePickupItem(player, msg);
        if (msg.type === 'equip_item') return handleEquipItem(player, msg);
        if (msg.type === 'inventory_move') return handleInventoryMove(player, msg);
        if (msg.type === 'inventory_sort') return handleInventorySort(player);
        if (msg.type === 'inventory_delete') return handleInventoryDelete(player, msg);
        if (msg.type === 'inventory_unequip_to_slot') return handleInventoryUnequipToSlot(player, msg);
        if (msg.type === 'switch_instance') return handleSwitchInstance(player, msg);
        if (msg.type === 'admin_command') return handleAdminCommand(player, msg);
    });

    ws.on('close', () => {
        if (!ws.playerId || !players[ws.playerId]) return;
        const player = players[ws.playerId];
        logEvent('INFO', 'ws_closed', { playerId: player.id, username: player.username });
        persistPlayerProgress(player);
        usernameToPlayerId.delete(player.username);
        delete players[ws.playerId];
    });
});

setInterval(tickWorld, TICK_MS);

server.listen(3000, () => {
    logEvent('INFO', 'server_started', { port: 3000 });
    console.log('Servidor HTTP+WS rodando em http://localhost:3000');
});
