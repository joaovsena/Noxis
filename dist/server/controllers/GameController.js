"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const crypto_1 = require("crypto");
const hash_1 = require("../utils/hash");
const math_1 = require("../utils/math");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const tiledForestCollision_1 = require("../maps/tiledForestCollision");
const PRIMARY_STATS = ['str', 'int', 'dex', 'vit'];
const LEGACY_ALLOC_MAP = {
    physicalAttack: 'str',
    magicAttack: 'int',
    physicalDefense: 'vit',
    magicDefense: 'dex'
};
const SOFT_CAP_THRESHOLD = 150;
const SOFT_CAP_COST = 2;
const BASE_POINT_COST = 1;
const LUCKY_STRIKE_CHANCE = 0.15;
const MOB_AI_CELL_SIZE = 512;
const MOB_DECISION_MS = 500;
const MOB_ATTACK_WINDUP_MS = 220;
const MOB_LEASH_REGEN_PER_SEC = 0.10;
const PARTY_WAYPOINT_TTL_MS = 10000;
const PATHFIND_CELL_SIZE = 12;
const PATHFIND_MAX_ITERS = 220000;
const PATH_RECALC_MS = 280;
const PATH_PROBE_RADIUS = Math.max(8, config_1.PLAYER_HALF_SIZE - 6);
const ATTRIBUTE_DRIVEN_OVERRIDE_KEYS = [
    'physicalAttack',
    'magicAttack',
    'physicalDefense',
    'magicDefense',
    'accuracy',
    'evasion',
    'criticalChance',
    'luck',
    'maxHp'
];
const PATH_PLAN_RADIUS = PATH_PROBE_RADIUS + 1;
const MOVE_COLLISION_PADDING = 4;
const SKILL_DEFS = {
    war_bastion_escudo_fe: { id: 'war_bastion_escudo_fe', classId: 'knight', name: 'Escudo da Fe', cooldownMs: 12000, target: 'self', buff: { id: 'escudo_fe', durationMs: 12000, defenseMul: 1.35, magicDefenseMul: 1.35 }, effectKey: 'war_shield' },
    war_bastion_muralha: { id: 'war_bastion_muralha', classId: 'knight', name: 'Muralha', cooldownMs: 14000, target: 'self', buff: { id: 'muralha', durationMs: 8000, reflect: 0.18, damageReduction: 0.15 }, effectKey: 'war_wall' },
    war_bastion_renovacao: { id: 'war_bastion_renovacao', classId: 'knight', name: 'Renovacao', cooldownMs: 10000, target: 'self', healVitScale: 1.6, effectKey: 'war_heal' },
    war_bastion_inabalavel: { id: 'war_bastion_inabalavel', classId: 'knight', name: 'Inabalavel', cooldownMs: 26000, target: 'self', buff: { id: 'inabalavel', durationMs: 10000, damageReduction: 0.9 }, effectKey: 'war_steel' },
    war_bastion_impacto_sismico: { id: 'war_bastion_impacto_sismico', classId: 'knight', name: 'Impacto Sismico', cooldownMs: 9000, target: 'mob', range: 105, power: 1.55, aoeRadius: 150, effectKey: 'war_quake' },
    war_carrasco_frenesi: { id: 'war_carrasco_frenesi', classId: 'knight', name: 'Frenesi', cooldownMs: 14000, target: 'self', buff: { id: 'frenesi', durationMs: 12000, lifesteal: 0.2 }, effectKey: 'war_frenzy' },
    war_carrasco_lacerar: { id: 'war_carrasco_lacerar', classId: 'knight', name: 'Lacerar', cooldownMs: 6500, target: 'mob', range: 95, power: 1.35, effectKey: 'war_bleed' },
    war_carrasco_ira: { id: 'war_carrasco_ira', classId: 'knight', name: 'Ira', cooldownMs: 12000, target: 'self', buff: { id: 'ira', durationMs: 10000, attackMul: 1.35, attackSpeedMul: 1.25, defenseMul: 0.75, magicDefenseMul: 0.75 }, effectKey: 'war_rage' },
    war_carrasco_golpe_sacrificio: { id: 'war_carrasco_golpe_sacrificio', classId: 'knight', name: 'Golpe de Sacrificio', cooldownMs: 9500, target: 'mob', range: 100, power: 2.1, hpCostPct: 0.12, effectKey: 'war_sacrifice' },
    war_carrasco_aniquilacao: { id: 'war_carrasco_aniquilacao', classId: 'knight', name: 'Aniquilacao', cooldownMs: 12000, target: 'mob', range: 115, power: 1.4, lostHpScale: 1.4, effectKey: 'war_execute' },
    arc_patrulheiro_tiro_ofuscante: { id: 'arc_patrulheiro_tiro_ofuscante', classId: 'archer', name: 'Tiro Ofuscante', cooldownMs: 6500, target: 'mob', range: 420, power: 1.35, effectKey: 'arc_flash' },
    arc_patrulheiro_foco_distante: { id: 'arc_patrulheiro_foco_distante', classId: 'archer', name: 'Foco Distante', cooldownMs: 12000, target: 'self', buff: { id: 'foco_distante', durationMs: 12000, attackMul: 1.12 }, effectKey: 'arc_focus' },
    arc_patrulheiro_abrolhos: { id: 'arc_patrulheiro_abrolhos', classId: 'archer', name: 'Abrolhos', cooldownMs: 8500, target: 'mob', range: 360, power: 1.1, effectKey: 'arc_root' },
    arc_patrulheiro_salva_flechas: { id: 'arc_patrulheiro_salva_flechas', classId: 'archer', name: 'Salva de Flechas', cooldownMs: 11000, target: 'mob', range: 420, power: 1.05, aoeRadius: 180, effectKey: 'arc_volley' },
    arc_patrulheiro_passo_vento: { id: 'arc_patrulheiro_passo_vento', classId: 'archer', name: 'Passo de Vento', cooldownMs: 13000, target: 'self', buff: { id: 'passo_vento', durationMs: 10000, moveMul: 1.22 }, effectKey: 'arc_wind' },
    arc_franco_flecha_debilitante: { id: 'arc_franco_flecha_debilitante', classId: 'archer', name: 'Flecha Debilitante', cooldownMs: 7000, target: 'mob', range: 430, power: 1.45, effectKey: 'arc_weaken' },
    arc_franco_ponteira_envenenada: { id: 'arc_franco_ponteira_envenenada', classId: 'archer', name: 'Ponteira Envenenada', cooldownMs: 7500, target: 'mob', range: 430, power: 1.35, effectKey: 'arc_poison' },
    arc_franco_olho_aguia: { id: 'arc_franco_olho_aguia', classId: 'archer', name: 'Olho de Aguia', cooldownMs: 13000, target: 'self', buff: { id: 'olho_aguia', durationMs: 15000, critAdd: 0.2 }, effectKey: 'arc_crit' },
    arc_franco_disparo_perfurante: { id: 'arc_franco_disparo_perfurante', classId: 'archer', name: 'Disparo Perfurante', cooldownMs: 9000, target: 'mob', range: 450, power: 1.7, effectKey: 'arc_pierce' },
    arc_franco_tiro_misericordia: { id: 'arc_franco_tiro_misericordia', classId: 'archer', name: 'Tiro de Misericordia', cooldownMs: 12000, target: 'mob', range: 450, power: 1.2, lostHpScale: 1.4, effectKey: 'arc_finisher' },
    dru_preservador_florescer: { id: 'dru_preservador_florescer', classId: 'druid', name: 'Florescer', cooldownMs: 9000, target: 'self', healVitScale: 1.2, effectKey: 'dru_bloom' },
    dru_preservador_casca_ferro: { id: 'dru_preservador_casca_ferro', classId: 'druid', name: 'Casca de Ferro', cooldownMs: 12000, target: 'self', buff: { id: 'casca_ferro', durationMs: 11000, defenseMul: 1.28 }, effectKey: 'dru_bark' },
    dru_preservador_emaranhado: { id: 'dru_preservador_emaranhado', classId: 'druid', name: 'Emaranhado', cooldownMs: 8500, target: 'mob', range: 360, power: 1.2, aoeRadius: 140, magic: true, effectKey: 'dru_root' },
    dru_preservador_prece_natureza: { id: 'dru_preservador_prece_natureza', classId: 'druid', name: 'Prece da Natureza', cooldownMs: 14500, target: 'self', healVitScale: 2.2, effectKey: 'dru_prayer' },
    dru_preservador_avatar_espiritual: { id: 'dru_preservador_avatar_espiritual', classId: 'druid', name: 'Avatar Espiritual', cooldownMs: 18000, target: 'self', buff: { id: 'avatar_espiritual', durationMs: 10000, attackMul: 1.2, moveMul: 1.08, attackSpeedMul: 1.12 }, effectKey: 'dru_avatar' },
    dru_primal_espinhos: { id: 'dru_primal_espinhos', classId: 'druid', name: 'Espinhos', cooldownMs: 12000, target: 'self', buff: { id: 'espinhos', durationMs: 12000, reflect: 0.15 }, effectKey: 'dru_thorns' },
    dru_primal_enxame: { id: 'dru_primal_enxame', classId: 'druid', name: 'Enxame', cooldownMs: 8500, target: 'mob', range: 370, power: 1.35, magic: true, effectKey: 'dru_swarm' },
    dru_primal_patada_sombria: { id: 'dru_primal_patada_sombria', classId: 'druid', name: 'Patada Sombria', cooldownMs: 7500, target: 'mob', range: 320, power: 1.5, magic: true, effectKey: 'dru_shadow_claw' },
    dru_primal_nevoa_obscura: { id: 'dru_primal_nevoa_obscura', classId: 'druid', name: 'Nevoa Obscura', cooldownMs: 11000, target: 'mob', range: 360, power: 1.25, aoeRadius: 160, magic: true, effectKey: 'dru_mist' },
    dru_primal_invocacao_primal: { id: 'dru_primal_invocacao_primal', classId: 'druid', name: 'Invocacao Primal', cooldownMs: 16000, target: 'mob', range: 360, power: 2.0, magic: true, effectKey: 'dru_primal' },
    ass_agil_reflexos: { id: 'ass_agil_reflexos', classId: 'assassin', name: 'Reflexos', cooldownMs: 11000, target: 'self', buff: { id: 'reflexos', durationMs: 12000, moveMul: 1.2, evasionAdd: 18 }, effectKey: 'ass_reflex' },
    ass_agil_contra_ataque: { id: 'ass_agil_contra_ataque', classId: 'assassin', name: 'Contra-Ataque', cooldownMs: 9000, target: 'mob', range: 115, power: 1.55, effectKey: 'ass_counter' },
    ass_agil_passo_fantasma: { id: 'ass_agil_passo_fantasma', classId: 'assassin', name: 'Passo Fantasma', cooldownMs: 8000, target: 'mob', range: 220, power: 1.45, effectKey: 'ass_dash' },
    ass_agil_golpe_nervos: { id: 'ass_agil_golpe_nervos', classId: 'assassin', name: 'Golpe de Nervos', cooldownMs: 9000, target: 'mob', range: 120, power: 1.35, effectKey: 'ass_nerve' },
    ass_agil_miragem: { id: 'ass_agil_miragem', classId: 'assassin', name: 'Miragem', cooldownMs: 14000, target: 'mob', range: 130, power: 1.9, effectKey: 'ass_mirage' },
    ass_letal_expor_fraqueza: { id: 'ass_letal_expor_fraqueza', classId: 'assassin', name: 'Expor Fraqueza', cooldownMs: 12000, target: 'self', buff: { id: 'fraqueza', durationMs: 5000, critAdd: 0.25 }, effectKey: 'ass_expose' },
    ass_letal_ocultar: { id: 'ass_letal_ocultar', classId: 'assassin', name: 'Ocultar', cooldownMs: 18000, target: 'self', buff: { id: 'ocultar', durationMs: 30000, stealth: true, moveMul: 1.08 }, effectKey: 'ass_stealth' },
    ass_letal_emboscada: { id: 'ass_letal_emboscada', classId: 'assassin', name: 'Emboscada', cooldownMs: 10000, target: 'mob', range: 150, power: 2.6, effectKey: 'ass_ambush' },
    ass_letal_bomba_fumaca: { id: 'ass_letal_bomba_fumaca', classId: 'assassin', name: 'Bomba de Fumaca', cooldownMs: 13000, target: 'mob', range: 250, power: 1.15, aoeRadius: 140, effectKey: 'ass_smoke' },
    ass_letal_sentenca: { id: 'ass_letal_sentenca', classId: 'assassin', name: 'Sentenca', cooldownMs: 15000, target: 'mob', range: 320, power: 2.2, effectKey: 'ass_sentence' },
    mod_fire_wing: { id: 'mod_fire_wing', classId: 'druid', name: 'Asa de Fogo', cooldownMs: 8000, target: 'mob', range: 360, power: 1.8, magic: true, aoeRadius: 110, effectKey: 'mod_fire_wing' },
    class_primary: { id: 'class_primary', classId: 'knight', name: 'Ataque Primario', cooldownMs: 2200, target: 'mob', range: 100, power: 1.2, effectKey: 'class_primary' }
};
const SKILL_CHAINS = {
    war_bastion: ['war_bastion_escudo_fe', 'war_bastion_muralha', 'war_bastion_renovacao', 'war_bastion_inabalavel', 'war_bastion_impacto_sismico'],
    war_carrasco: ['war_carrasco_frenesi', 'war_carrasco_lacerar', 'war_carrasco_ira', 'war_carrasco_golpe_sacrificio', 'war_carrasco_aniquilacao'],
    arc_patrulheiro: ['arc_patrulheiro_tiro_ofuscante', 'arc_patrulheiro_foco_distante', 'arc_patrulheiro_abrolhos', 'arc_patrulheiro_salva_flechas', 'arc_patrulheiro_passo_vento'],
    arc_franco: ['arc_franco_flecha_debilitante', 'arc_franco_ponteira_envenenada', 'arc_franco_olho_aguia', 'arc_franco_disparo_perfurante', 'arc_franco_tiro_misericordia'],
    dru_preservador: ['dru_preservador_florescer', 'dru_preservador_casca_ferro', 'dru_preservador_emaranhado', 'dru_preservador_prece_natureza', 'dru_preservador_avatar_espiritual'],
    dru_primal: ['dru_primal_espinhos', 'dru_primal_enxame', 'dru_primal_patada_sombria', 'dru_primal_nevoa_obscura', 'dru_primal_invocacao_primal'],
    ass_agil: ['ass_agil_reflexos', 'ass_agil_contra_ataque', 'ass_agil_passo_fantasma', 'ass_agil_golpe_nervos', 'ass_agil_miragem'],
    ass_letal: ['ass_letal_expor_fraqueza', 'ass_letal_ocultar', 'ass_letal_emboscada', 'ass_letal_bomba_fumaca', 'ass_letal_sentenca']
};
class GameController {
    constructor(persistence, mobService) {
        this.players = new Map();
        this.usernameToPlayerId = new Map();
        this.groundItems = [];
        this.parties = new Map();
        this.partyInvites = new Map();
        this.partyJoinRequests = new Map();
        this.friendLinks = new Map();
        this.friendRequests = new Map();
        this.friendRequestWindow = new Map();
        this.lastPartySyncAt = 0;
        this.lastFriendDbPruneAt = 0;
        this.mobsPeacefulMode = false;
        this.persistence = persistence;
        this.mobService = mobService;
    }
    async handleAuth(ws, msg) {
        if (msg.type === 'auth_register') {
            await this.handleRegister(ws, msg);
            return;
        }
        if (msg.type === 'auth_login') {
            await this.handleLogin(ws, msg);
        }
    }
    async handleRegister(ws, msg) {
        const username = String(msg.username || '').trim().toLowerCase();
        const password = String(msg.password || '');
        if (username.length < 3 || password.length < 3) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Preencha usuario e senha com ao menos 3 caracteres.' }));
            return;
        }
        const existing = await this.persistence.getUser(username);
        if (existing) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Usuario ja existe.' }));
            return;
        }
        await this.persistence.createUser(username, password);
        ws.send(JSON.stringify({ type: 'auth_ok', message: 'Registro concluido. Agora faca login.' }));
    }
    async handleLogin(ws, msg) {
        const username = String(msg.username || '').trim().toLowerCase();
        const password = String(msg.password || '');
        try {
            const account = await this.persistence.getUser(username);
            if (!account) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Usuario ou senha invalidos.' }));
                return;
            }
            const incomingHash = (0, hash_1.hashPassword)(password, account.salt);
            if (incomingHash !== account.passwordHash) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Usuario ou senha invalidos.' }));
                return;
            }
            if (this.usernameToPlayerId.has(username)) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Esse usuario ja esta online.' }));
                return;
            }
            ws.authUserId = String(account.id);
            ws.authUsername = username;
            const characters = Array.isArray(account.players) ? account.players : [];
            ws.authRole = characters.some((ch) => ch?.role === 'adm') ? 'adm' : 'player';
            ws.pendingPlayerProfiles = characters;
            if (!characters.length) {
                ws.send(JSON.stringify({
                    type: 'auth_character_required',
                    message: 'Conta criada. Crie seu personagem para continuar.'
                }));
                (0, logger_1.logEvent)('INFO', 'user_login_waiting_character', { username });
                return;
            }
            this.sendCharacterSelection(ws, characters);
            (0, logger_1.logEvent)('INFO', 'user_login_character_select', { username, characters: characters.length });
        }
        catch (error) {
            (0, logger_1.logEvent)('ERROR', 'login_error', { username, error: String(error) });
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Erro ao fazer login.' }));
        }
    }
    sendCharacterSelection(ws, profiles) {
        const slots = [null, null, null];
        const maxSlots = 3;
        for (const profile of Array.isArray(profiles) ? profiles : []) {
            const slot = Number(profile?.slot);
            if (!Number.isInteger(slot) || slot < 0 || slot >= maxSlots)
                continue;
            slots[slot] = {
                slot,
                id: Number(profile.id),
                name: String(profile.name || ''),
                class: this.normalizeClassId(profile.class),
                gender: String(profile.gender || 'male'),
                level: Math.max(1, Number(profile.level || 1))
            };
        }
        ws.send(JSON.stringify({
            type: 'auth_character_select',
            slots,
            maxSlots
        }));
    }
    async handleCharacterCreate(ws, msg) {
        try {
            if (!ws.authUserId || !ws.authUsername) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Faca login antes de criar personagem.' }));
                return;
            }
            const account = await this.persistence.getUserById(String(ws.authUserId));
            if (!account) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Sessao invalida. Faca login novamente.' }));
                return;
            }
            const characters = Array.isArray(account.players) ? account.players : [];
            ws.pendingPlayerProfiles = characters;
            const maxSlots = 3;
            if (characters.length >= maxSlots) {
                ws.send(JSON.stringify({
                    type: 'auth_error',
                    message: 'Sua conta ja atingiu o limite de 3 personagens.'
                }));
                this.sendCharacterSelection(ws, characters);
                return;
            }
            const name = String(msg?.name || '').trim();
            const normalizedName = name.replace(/\s+/g, ' ');
            const selectedClass = this.normalizeClassId(msg?.class);
            const gender = String(msg?.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
            const validName = /^[a-zA-Z0-9_ ]{3,12}$/;
            if (!validName.test(normalizedName)) {
                ws.send(JSON.stringify({
                    type: 'auth_error',
                    message: 'Nome invalido. Use 3-12 caracteres (letras, numeros, espaco ou _).'
                }));
                return;
            }
            const existingPlayer = await this.persistence.getPlayerByName(normalizedName);
            if (existingPlayer) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Ja existe um personagem com esse nome.' }));
                return;
            }
            const usedSlots = new Set(characters.map((ch) => Number(ch?.slot)).filter((v) => Number.isInteger(v)));
            let freeSlot = -1;
            for (let i = 0; i < maxSlots; i++) {
                if (!usedSlots.has(i)) {
                    freeSlot = i;
                    break;
                }
            }
            if (freeSlot === -1) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Nao ha slot livre para novo personagem.' }));
                this.sendCharacterSelection(ws, characters);
                return;
            }
            const profile = this.buildNewPlayerProfile(ws.authUsername, normalizedName, selectedClass, gender);
            const created = await this.persistence.createPlayerForUser(String(ws.authUserId), freeSlot, profile);
            const nextCharacters = [...characters, created].sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0));
            ws.pendingPlayerProfiles = nextCharacters;
            ws.authRole = nextCharacters.some((ch) => ch?.role === 'adm') ? 'adm' : 'player';
            this.sendCharacterSelection(ws, nextCharacters);
        }
        catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Nao foi possivel criar personagem.' }));
            (0, logger_1.logEvent)('ERROR', 'character_create_error', { error: String(error), userId: ws.authUserId || null });
        }
    }
    async handleCharacterEnter(ws, msg) {
        try {
            if (!ws.authUserId || !ws.authUsername) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Faca login antes de entrar.' }));
                return;
            }
            const username = ws.authUsername;
            if (this.usernameToPlayerId.has(username)) {
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Esse usuario ja esta online.' }));
                return;
            }
            const account = await this.persistence.getUserById(String(ws.authUserId));
            const characters = Array.isArray(account?.players)
                ? account.players
                : (Array.isArray(ws.pendingPlayerProfiles) ? ws.pendingPlayerProfiles : []);
            if (!characters.length) {
                ws.send(JSON.stringify({ type: 'auth_character_required', message: 'Crie um personagem para continuar.' }));
                return;
            }
            const requestedSlot = Number(msg?.slot);
            const profile = Number.isInteger(requestedSlot)
                ? characters.find((ch) => Number(ch?.slot) === requestedSlot)
                : characters[0];
            if (!profile) {
                this.sendCharacterSelection(ws, characters);
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Slot de personagem invalido.' }));
                return;
            }
            const player = this.createRuntimePlayer(username, profile);
            player.ws = ws;
            this.players.set(player.id, player);
            this.usernameToPlayerId.set(username, player.id);
            ws.playerId = player.id;
            ws.send(JSON.stringify({
                type: 'auth_success',
                playerId: player.id,
                world: config_1.WORLD,
                role: player.role,
                statusIds: config_1.STATUS_IDS,
                hotbarBindings: this.getPlayerHotbarBindings(player)
            }));
            ws.send(JSON.stringify({
                type: 'hotbar.state',
                bindings: this.getPlayerHotbarBindings(player)
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
            ws.pendingPlayerProfiles = [];
            (0, logger_1.logEvent)('INFO', 'user_login', { username, playerId: player.id });
        }
        catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Nao foi possivel entrar no personagem.' }));
            (0, logger_1.logEvent)('ERROR', 'character_enter_error', { error: String(error), userId: ws.authUserId || null });
        }
    }
    buildNewPlayerProfile(username, name, selectedClass, gender) {
        const baseStats = this.buildClassBaseStats(selectedClass);
        const isSena = String(username || '').toLowerCase() === 'sena' || String(name || '').toLowerCase() === 'sena';
        return {
            name,
            class: selectedClass,
            gender,
            level: 1,
            xp: 0,
            hp: Number(baseStats.initialHp || 100),
            maxHp: Number(baseStats.initialHp || 100),
            role: isSena ? 'adm' : 'player',
            statusOverrides: {},
            pvpMode: 'peace',
            allocatedStats: {
                str: 0,
                int: 0,
                dex: 0,
                vit: 0
            },
            unspentPoints: 0,
            inventory: [],
            equippedWeaponId: null,
            mapKey: config_1.DEFAULT_MAP_KEY,
            mapId: config_1.DEFAULT_MAP_ID,
            posX: 500,
            posY: 500,
            baseStats,
            stats: {}
        };
    }
    createRuntimePlayer(username, profile) {
        const mapKey = config_1.MAP_KEYS.includes(profile?.mapKey) ? profile.mapKey : config_1.DEFAULT_MAP_KEY;
        const mapId = config_1.MAP_IDS.includes(profile?.mapId) ? profile.mapId : config_1.DEFAULT_MAP_ID;
        const spawn = this.projectToWalkable(mapKey, (0, math_1.clamp)(Number.isFinite(Number(profile?.posX)) ? Number(profile.posX) : 500, 0, config_1.WORLD.width), (0, math_1.clamp)(Number.isFinite(Number(profile?.posY)) ? Number(profile.posY) : 500, 0, config_1.WORLD.height));
        const parsedId = Number(profile?.id);
        const id = Number.isInteger(parsedId) ? parsedId : Math.floor(Date.now() % 2147483647);
        const normalizedClass = this.normalizeClassId(profile?.class);
        const baseStats = this.buildClassBaseStats(normalizedClass, profile?.baseStats);
        const maxHp = Number.isFinite(Number(profile?.maxHp)) ? Number(profile.maxHp) : Number(baseStats.initialHp || 100);
        const allocatedStats = this.normalizeAllocatedStats(profile.allocatedStats);
        const unspentRaw = Number(profile.unspentPoints);
        const unspentPoints = Number.isInteger(unspentRaw) && unspentRaw > 0 ? unspentRaw : 0;
        const isSena = String(username || '').toLowerCase() === 'sena' || String(profile?.name || '').toLowerCase() === 'sena';
        const runtime = {
            ...profile,
            id,
            ws: null,
            username,
            class: normalizedClass,
            baseStats,
            role: isSena ? 'adm' : profile?.role === 'adm' ? 'adm' : 'player',
            pvpMode: profile?.pvpMode === 'evil' ? 'evil' : 'peace',
            allocatedStats,
            unspentPoints,
            inventory: this.normalizeInventorySlots(Array.isArray(profile.inventory) ? profile.inventory : [], profile?.equippedWeaponId ? String(profile.equippedWeaponId) : null),
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
            skillLevels: this.normalizeSkillLevels(profile?.statusOverrides?.__skillLevels || {}),
            activeSkillEffects: [],
            movePath: [],
            nextPathfindAt: 0,
            pathDestinationX: spawn.x,
            pathDestinationY: spawn.y
        };
        this.recomputePlayerStats(runtime);
        return runtime;
    }
    handleMove(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const incomingX = Number(msg.x);
        const incomingY = Number(msg.y);
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        const projected = this.projectToWalkable(player.mapKey, (0, math_1.clamp)(Number.isFinite(incomingX) ? incomingX : player.x, 0, config_1.WORLD.width), (0, math_1.clamp)(Number.isFinite(incomingY) ? incomingY : player.y, 0, config_1.WORLD.height));
        this.assignPathTo(player, projected.x, projected.y);
        player.ws.send(JSON.stringify({
            type: 'move_ack',
            reqId: msg.reqId,
            targetX: player.targetX,
            targetY: player.targetY,
            pathNodes: Array.isArray(player.movePath) ? player.movePath : []
        }));
    }
    handleTargetMob(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
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
    handleChat(player, msg) {
        const scope = msg.scope === 'global' || msg.scope === 'map' ? msg.scope : 'local';
        const text = String(msg.text || '').trim();
        if (!text)
            return;
        const payload = {
            type: 'chat_message',
            id: (0, crypto_1.randomUUID)(),
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
            if (receiver.id === player.id)
                continue;
            if (scope === 'map') {
                if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey)
                    continue;
                this.sendRaw(receiver.ws, payload);
                continue;
            }
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey)
                continue;
            if ((0, math_1.distance)(receiver, player) > config_1.LOCAL_CHAT_RADIUS)
                continue;
            this.sendRaw(receiver.ws, payload);
        }
    }
    handleSwitchInstance(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const target = config_1.MAP_IDS.includes(msg.mapId) ? msg.mapId : null;
        if (!target || target === player.mapId)
            return;
        const inCombat = Date.now() - (player.lastCombatAt || 0) < config_1.COMBAT_LOCK_MS;
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
    handlePickupItem(player, msg) {
        const itemId = String(msg.itemId || '');
        const index = this.groundItems.findIndex((it) => it.id === itemId && it.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (index === -1)
            return;
        const item = this.groundItems[index];
        if (typeof item.expiresAt === 'number' && item.expiresAt <= Date.now()) {
            this.groundItems.splice(index, 1);
            return;
        }
        if ((0, math_1.distance)(player, item) > config_1.ITEM_PICKUP_RANGE)
            return;
        let remaining = Math.max(1, Math.floor(Number(item.quantity || 1)));
        remaining = this.addItemToInventory(player, item, remaining);
        if (remaining <= 0) {
            this.groundItems.splice(index, 1);
        }
        else {
            this.groundItems[index] = { ...item, quantity: remaining };
        }
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }
    handleHotbarSet(player, msg) {
        const raw = msg && typeof msg.bindings === 'object' ? msg.bindings : null;
        if (!raw)
            return;
        const normalized = this.normalizeHotbarBindings(raw);
        if (!player.statusOverrides || typeof player.statusOverrides !== 'object')
            player.statusOverrides = {};
        player.statusOverrides.__hotbarBindings = normalized;
        this.persistPlayer(player);
    }
    handleEquipItem(player, msg) {
        const itemId = msg.itemId ? String(msg.itemId) : null;
        if (!itemId) {
            const equipped = player.equippedWeaponId
                ? player.inventory.find((it) => it.id === player.equippedWeaponId && it.type === 'weapon')
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
        const found = player.inventory.find((it) => it.id === itemId && it.type === 'weapon');
        if (!found)
            return;
        const previousEquippedId = player.equippedWeaponId && player.equippedWeaponId !== found.id ? player.equippedWeaponId : null;
        if (previousEquippedId) {
            const oldEquipped = player.inventory.find((it) => it.id === previousEquippedId && it.type === 'weapon');
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
    handleInventoryMove(player, msg) {
        const itemId = String(msg.itemId || '');
        const toSlot = Number(msg.toSlot);
        if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= config_1.INVENTORY_SIZE)
            return;
        if (player.equippedWeaponId && player.equippedWeaponId === itemId)
            return;
        const item = player.inventory.find((it) => it.id === itemId);
        if (!item)
            return;
        const occupant = player.inventory.find((it) => it.slotIndex === toSlot);
        const fromSlot = item.slotIndex;
        if (occupant && occupant.id !== item.id && this.canItemsStack(occupant, item)) {
            const max = Math.min(this.getItemMaxStack(occupant), this.getItemMaxStack(item));
            const occupantQty = Math.max(1, Math.floor(Number(occupant.quantity || 1)));
            const itemQty = Math.max(1, Math.floor(Number(item.quantity || 1)));
            const room = Math.max(0, max - occupantQty);
            if (room > 0) {
                const moved = Math.min(room, itemQty);
                occupant.quantity = occupantQty + moved;
                occupant.stackable = true;
                occupant.maxStack = max;
                const remaining = itemQty - moved;
                if (remaining <= 0) {
                    const idx = player.inventory.findIndex((it) => it.id === item.id);
                    if (idx !== -1)
                        player.inventory.splice(idx, 1);
                }
                else {
                    item.quantity = remaining;
                    item.stackable = true;
                    item.maxStack = max;
                    item.slotIndex = fromSlot;
                }
                player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
                this.persistPlayer(player);
                this.sendInventoryState(player);
                return;
            }
        }
        item.slotIndex = toSlot;
        if (occupant && occupant.id !== item.id)
            occupant.slotIndex = fromSlot;
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }
    handleInventorySort(player) {
        const equippedId = player.equippedWeaponId || null;
        const sorted = [...player.inventory]
            .filter((it) => it.id !== equippedId)
            .sort((a, b) => {
            const byName = String(a.name || '').localeCompare(String(b.name || ''));
            if (byName !== 0)
                return byName;
            return String(a.id).localeCompare(String(b.id));
        });
        for (let i = 0; i < sorted.length && i < config_1.INVENTORY_SIZE; i++) {
            sorted[i].slotIndex = i;
        }
        if (equippedId) {
            const equipped = player.inventory.find((it) => it.id === equippedId);
            if (equipped)
                sorted.push({ ...equipped, slotIndex: -1 });
        }
        player.inventory = this.normalizeInventorySlots(sorted, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }
    handleInventoryDelete(player, msg) {
        const itemId = String(msg.itemId || '');
        const index = player.inventory.findIndex((it) => it.id === itemId);
        if (index === -1)
            return;
        if (player.equippedWeaponId === itemId) {
            player.equippedWeaponId = null;
            this.recomputePlayerStats(player);
        }
        player.inventory.splice(index, 1);
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }
    handleInventoryUnequipToSlot(player, msg) {
        const itemId = String(msg.itemId || '');
        const toSlot = Number(msg.toSlot);
        if (!Number.isInteger(toSlot) || toSlot < 0 || toSlot >= config_1.INVENTORY_SIZE)
            return;
        if (player.equippedWeaponId !== itemId)
            return;
        const item = player.inventory.find((it) => it.id === itemId);
        if (!item)
            return;
        const occupant = player.inventory.find((it) => it.slotIndex === toSlot && it.id !== itemId);
        const fromSlot = item.slotIndex;
        item.slotIndex = toSlot;
        if (occupant)
            occupant.slotIndex = fromSlot;
        player.equippedWeaponId = null;
        this.recomputePlayerStats(player);
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }
    handleItemUse(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const itemId = String(msg?.itemId || '');
        if (!itemId)
            return;
        const index = player.inventory.findIndex((it) => String(it?.id || '') === itemId);
        if (index === -1)
            return;
        const item = player.inventory[index];
        const itemType = String(item?.type || '');
        if (itemType !== 'potion_hp' && itemType !== 'skill_reset_hourglass')
            return;
        let returnedPoints = 0;
        if (itemType === 'potion_hp') {
            const healPercent = Number.isFinite(Number(item?.healPercent)) ? Number(item.healPercent) : Number(config_1.HP_POTION_TEMPLATE.healPercent || 0.5);
            const amount = Math.max(1, Math.floor(Number(player.maxHp || 1) * Math.max(0, healPercent)));
            player.hp = (0, math_1.clamp)(Number(player.hp || 0) + amount, 1, Number(player.maxHp || 1));
        }
        else {
            returnedPoints = this.getSpentSkillPoints(player);
            player.skillLevels = {};
            if (!player.statusOverrides || typeof player.statusOverrides !== 'object')
                player.statusOverrides = {};
            player.statusOverrides.__skillLevels = {};
            player.skillCooldowns = {};
            player.activeSkillEffects = [];
            this.recomputePlayerStats(player);
        }
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        if (quantity > 1) {
            item.quantity = quantity - 1;
        }
        else {
            player.inventory.splice(index, 1);
        }
        player.inventory = this.normalizeInventorySlots(player.inventory, player.equippedWeaponId);
        this.persistPlayer(player);
        this.sendInventoryState(player);
        this.sendStatsUpdated(player);
        if (itemType === 'skill_reset_hourglass') {
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `Ampulheta usada: habilidades resetadas e ${returnedPoints} ponto(s) devolvido(s).`
            });
        }
    }
    async handleAdminCommand(player, msg) {
        if (player.role !== 'adm')
            return;
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
            const key = config_1.STATUS_BY_ID[statusId];
            const value = Number(parts[2]);
            const target = this.findOnlinePlayerByName(parts[3]);
            if (!key || !Number.isFinite(value) || !target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Comando invalido.' });
                return;
            }
            target.statusOverrides = target.statusOverrides || {};
            const leveled = this.computeDerivedStats(target);
            const hasOverride = Object.prototype.hasOwnProperty.call(target.statusOverrides, key);
            const currentOverride = hasOverride
                ? Number(target.statusOverrides[key])
                : Number(leveled[key]);
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
            this.sendRaw(player.ws, {
                type: 'admin_result',
                ok: true,
                message: `${target.name} agora esta no nivel ${level} com ${target.unspentPoints} ponto(s) disponiveis.`
            });
            return;
        }
        if (command === 'gotomap') {
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: gotomap {codigodomapa} {jogador}' });
                return;
            }
            const targetMapCode = String(parts[1] || '').toUpperCase();
            const mapKey = config_1.MAP_KEY_BY_CODE[targetMapCode] || null;
            const target = this.findOnlinePlayerByName(parts[2]);
            if (!target || !mapKey) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Mapa/jogador invalido. Use A1, A2 ou A3.' });
                return;
            }
            target.mapKey = mapKey;
            const projected = this.projectToWalkable(target.mapKey, (0, math_1.clamp)(target.x, 0, config_1.WORLD.width), (0, math_1.clamp)(target.y, 0, config_1.WORLD.height));
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
            const projected = this.projectToWalkable(player.mapKey, (0, math_1.clamp)(target.x, 0, config_1.WORLD.width), (0, math_1.clamp)(target.y, 0, config_1.WORLD.height));
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
            const projected = this.projectToWalkable(target.mapKey, (0, math_1.clamp)(player.x, 0, config_1.WORLD.width), (0, math_1.clamp)(player.y, 0, config_1.WORLD.height));
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
            const template = (await this.persistence.getItemById(itemId)) || (config_1.BUILTIN_ITEM_TEMPLATE_BY_ID[itemId] ?? null);
            if (!template) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: `Item ${itemId} nao encontrado.` });
                return;
            }
            let added = 0;
            for (let i = 0; i < quantity; i++) {
                const slot = this.firstFreeInventorySlot(target.inventory);
                if (slot === -1)
                    break;
                target.inventory.push({
                    id: (0, crypto_1.randomUUID)(),
                    templateId: String(template.id || template.type || itemId),
                    type: String(template.type || 'misc'),
                    name: template.name,
                    slot: template.slot,
                    bonuses: template.bonuses || {},
                    quantity: Number(template.stackable ? 1 : 1),
                    stackable: Boolean(template.stackable),
                    maxStack: Number(template.maxStack || 1),
                    healPercent: Number.isFinite(Number(template.healPercent)) ? Number(template.healPercent) : undefined,
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
    handlePartyCreate(player) {
        if (player.partyId && this.parties.has(player.partyId)) {
            this.sendPartyError(player, 'Voce ja esta em um grupo.');
            return;
        }
        const partyId = (0, crypto_1.randomUUID)();
        const party = {
            id: partyId,
            leaderId: player.id,
            memberIds: [player.id],
            createdAt: Date.now(),
            areaId: this.getAreaIdForPlayer(player),
            maxMembers: config_1.PARTY_MAX_MEMBERS
        };
        this.parties.set(partyId, party);
        player.partyId = partyId;
        this.syncPartyStateForMembers(party, true);
        this.sendPartyAreaList(player);
    }
    handlePartyInvite(player, msg) {
        const targetName = String(msg.targetName || '').trim().toLowerCase();
        if (!targetName)
            return;
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
        const invite = {
            id: (0, crypto_1.randomUUID)(),
            partyId: party.id,
            fromPlayerId: player.id,
            toPlayerId: target.id,
            expiresAt: now + config_1.PARTY_INVITE_TTL_MS
        };
        this.partyInvites.set(invite.id, invite);
        this.sendRaw(target.ws, {
            type: 'party.inviteReceived',
            inviteId: invite.id,
            fromPlayerId: player.id,
            fromName: player.name,
            partyId: party.id,
            expiresIn: config_1.PARTY_INVITE_TTL_MS
        });
        this.sendRaw(player.ws, { type: 'system_message', text: `Convite enviado para ${target.name}.` });
    }
    handlePartyAcceptInvite(player, msg) {
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
    handlePartyDeclineInvite(player, msg) {
        const partyId = String(msg.partyId || '');
        const inviteId = String(msg.inviteId || '');
        if (inviteId) {
            const invite = this.partyInvites.get(inviteId);
            if (!invite || invite.toPlayerId !== player.id)
                return;
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
    handlePartyLeave(player) {
        this.removePlayerFromParty(player);
    }
    handlePartyKick(player, msg) {
        const targetPlayerId = Number(msg.targetPlayerId);
        if (!Number.isInteger(targetPlayerId))
            return;
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        if (!party)
            return;
        if (party.leaderId !== player.id) {
            this.sendPartyError(player, 'Somente o lider pode expulsar.');
            return;
        }
        if (targetPlayerId === player.id) {
            this.sendPartyError(player, 'Use sair para deixar o grupo.');
            return;
        }
        if (!party.memberIds.includes(targetPlayerId))
            return;
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
    handlePartyPromote(player, msg) {
        const targetPlayerId = Number(msg.targetPlayerId);
        if (!Number.isInteger(targetPlayerId))
            return;
        const party = player.partyId ? this.parties.get(player.partyId) : null;
        if (!party)
            return;
        if (party.leaderId !== player.id) {
            this.sendPartyError(player, 'Somente o lider pode promover.');
            return;
        }
        if (!party.memberIds.includes(targetPlayerId))
            return;
        party.leaderId = targetPlayerId;
        this.clearJoinRequestsForParty(party.id);
        this.syncPartyStateForMembers(party, true);
    }
    handlePartyRequestAreaParties(player) {
        this.sendPartyAreaList(player);
    }
    handlePartyRequestJoin(player, msg) {
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
        const request = {
            id: (0, crypto_1.randomUUID)(),
            partyId: party.id,
            fromPlayerId: player.id,
            toLeaderId: party.leaderId,
            expiresAt: now + config_1.PARTY_JOIN_REQUEST_TTL_MS
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
                expiresIn: config_1.PARTY_JOIN_REQUEST_TTL_MS
            });
        }
        this.sendRaw(player.ws, { type: 'system_message', text: 'Solicitacao enviada ao lider do grupo.' });
    }
    handlePartyApproveJoin(player, msg) {
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
    handlePartyWaypointPing(player, msg) {
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
        const waypointX = (0, math_1.clamp)(x, 0, config_1.WORLD.width);
        const waypointY = (0, math_1.clamp)(y, 0, config_1.WORLD.height);
        const createdAt = Date.now();
        const payload = {
            type: 'party.waypointPing',
            waypointId: (0, crypto_1.randomUUID)(),
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
            if (!member)
                continue;
            this.sendRaw(member.ws, payload);
        }
    }
    async handleFriendRequest(player, msg) {
        const byId = Number(msg?.targetPlayerId);
        const byName = String(msg?.targetName || '').trim().toLowerCase();
        let target;
        if (Number.isInteger(byId)) {
            target = this.players.get(byId);
        }
        else if (byName) {
            target = [...this.players.values()].find((candidate) => {
                const name = String(candidate.name || '').toLowerCase();
                const username = String(candidate.username || '').toLowerCase();
                return name === byName || username === byName;
            });
        }
        else {
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
        const request = {
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
    async handleFriendAccept(player, msg) {
        const requestId = String(msg.requestId || '');
        if (!requestId)
            return;
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
    async handleFriendDecline(player, msg) {
        const requestId = String(msg.requestId || '');
        if (!requestId)
            return;
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
    async handleFriendRemove(player, msg) {
        const friendPlayerId = Number(msg.friendPlayerId);
        if (!Number.isInteger(friendPlayerId))
            return;
        this.unlinkFriends(player.id, friendPlayerId);
        await this.persistence.deleteFriendship(player.id, friendPlayerId);
        this.sendFriendState(player);
        const other = this.players.get(friendPlayerId);
        if (other)
            this.sendFriendState(other);
    }
    handleFriendList(player) {
        this.sendFriendState(player);
    }
    handleAdminSetMobPeaceful(player, msg) {
        if (player.role !== 'adm')
            return;
        this.mobsPeacefulMode = Boolean(msg?.enabled);
        for (const mob of this.mobService.getMobs()) {
            mob.targetPlayerId = null;
            mob.lastAttackAt = 0;
        }
        for (const receiver of this.players.values()) {
            if (receiver.role !== 'adm')
                continue;
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
    handleSetPvpMode(player, msg) {
        const rawMode = String(msg?.mode || 'peace');
        const mode = rawMode === 'evil' ? 'evil' : rawMode === 'group' ? 'group' : 'peace';
        if (mode === 'group' && (!player.partyId || !this.parties.has(player.partyId))) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Modo Grupo exige estar em grupo.' });
            return;
        }
        if (player.pvpMode === mode)
            return;
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
    handleCombatTargetPlayer(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const targetPlayerId = Number(msg?.targetPlayerId);
        if (!Number.isInteger(targetPlayerId) || targetPlayerId <= 0 || targetPlayerId === player.id)
            return;
        const target = this.players.get(targetPlayerId);
        if (!target || target.dead || target.hp <= 0)
            return;
        if (player.mapId !== target.mapId || player.mapKey !== target.mapKey)
            return;
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
    handleCombatClearTarget(player) {
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        player.movePath = [];
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
    }
    handleCombatAttack(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const targetPlayerId = Number(msg?.targetPlayerId);
        if (!Number.isInteger(targetPlayerId) || targetPlayerId <= 0)
            return;
        if (targetPlayerId === player.id)
            return;
        this.tryPlayerAttack(player, targetPlayerId, Date.now(), false);
    }
    handlePlayerRevive(player) {
        if (!player.dead && player.hp > 0)
            return;
        player.dead = false;
        player.hp = player.maxHp;
        const reviveX = Number.isFinite(Number(player.deathX)) ? Number(player.deathX) : player.x;
        const reviveY = Number.isFinite(Number(player.deathY)) ? Number(player.deathY) : player.y;
        const projected = this.projectToWalkable(player.mapKey, (0, math_1.clamp)(reviveX, 0, config_1.WORLD.width), (0, math_1.clamp)(reviveY, 0, config_1.WORLD.height));
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
    handleSkillCast(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const skillId = String(msg?.skillId || '');
        const skill = SKILL_DEFS[skillId];
        if (!skill)
            return;
        const skillLevel = skillId === 'class_primary' || skillId === 'mod_fire_wing' ? 1 : this.getSkillLevel(player, skillId);
        if (skillId !== 'class_primary' && skillId !== 'mod_fire_wing' && skillLevel <= 0) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Habilidade nao aprendida.' });
            return;
        }
        const now = Date.now();
        player.skillCooldowns = player.skillCooldowns || {};
        const classId = this.normalizeClassId(player.class);
        const normalizedClass = classId === 'bandit' ? 'assassin' : classId === 'shifter' ? 'druid' : classId;
        const classMismatch = skill.id !== 'class_primary'
            && skill.id !== 'mod_fire_wing'
            && normalizedClass !== skill.classId;
        if (classMismatch) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Essa habilidade nao pertence a sua classe.' });
            return;
        }
        this.pruneExpiredSkillEffects(player, now);
        const cooldownMs = Math.max(400, Number(skill.cooldownMs || 2000));
        const nextAt = Number(player.skillCooldowns[skillId] || 0);
        if (now < nextAt) {
            this.sendRaw(player.ws, { type: 'system_message', text: `Habilidade em recarga (${Math.ceil((nextAt - now) / 1000)}s).` });
            return;
        }
        const hpBeforeCast = Number(player.hp || 0);
        let targetMob = null;
        let mapInstanceId = '';
        if (skill.target === 'mob') {
            const targetMobId = String(msg?.targetMobId || player.attackTargetId || '');
            mapInstanceId = this.mapInstanceId(player.mapKey, player.mapId);
            targetMob = this.mobService.getMobs().find((m) => m.id === targetMobId && m.mapId === mapInstanceId);
            if (!targetMob) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Selecione um alvo para usar a habilidade.' });
                return;
            }
            const currentDistance = (0, math_1.distance)(player, targetMob);
            const edgeDistance = currentDistance - (targetMob.size / 2 + config_1.PLAYER_HALF_SIZE);
            const range = Number(skill.range || 100);
            if (edgeDistance > range) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Muito longe para usar esta habilidade.' });
                return;
            }
        }
        if (skill.hpCostPct && skill.hpCostPct > 0) {
            const hpCost = Math.max(1, Math.floor(Number(player.maxHp || 1) * Number(skill.hpCostPct)));
            if (player.hp <= hpCost) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'HP insuficiente para usar esta habilidade.' });
                return;
            }
            player.hp = Math.max(1, player.hp - hpCost);
        }
        player.skillCooldowns[skillId] = now + cooldownMs;
        if (skill.healVitScale && skill.healVitScale > 0) {
            const vit = Number(player.stats?.vit || 0);
            const healScale = Number(skill.healVitScale) * (1 + (skillLevel - 1) * 0.2);
            const heal = Math.max(10, Math.floor(vit * healScale + Number(player.maxHp || 0) * (0.08 + (skillLevel - 1) * 0.01)));
            player.hp = Math.min(Number(player.maxHp || player.hp), Number(player.hp || 0) + heal);
            this.sendSkillEffect(player.mapKey, player.mapId, {
                sourceId: player.id,
                targetId: player.id,
                x: player.x,
                y: player.y,
                effectKey: skill.effectKey || skill.id
            });
        }
        if (skill.buff) {
            this.applyTimedSkillEffect(player, skill.buff, now);
            this.sendSkillEffect(player.mapKey, player.mapId, {
                sourceId: player.id,
                targetId: player.id,
                x: player.x,
                y: player.y,
                effectKey: skill.effectKey || skill.id
            });
        }
        if (skill.target === 'self') {
            if (Number(player.hp || 0) !== hpBeforeCast)
                this.sendStatsUpdated(player);
            return;
        }
        const basePower = Math.max(0.05, this.getSkillPowerWithLevel(skill, skillLevel));
        const hpLostRatio = Number(player.maxHp || 1) > 0
            ? Math.max(0, Math.min(1, (Number(player.maxHp || 1) - Number(player.hp || 0)) / Number(player.maxHp || 1)))
            : 0;
        const scaledPower = skill.lostHpScale
            ? basePower * (1 + hpLostRatio * Number(skill.lostHpScale || 0))
            : basePower;
        if (skill.aoeRadius && skill.aoeRadius > 0) {
            const mobsInRange = this.mobService.getMobsByMap(mapInstanceId).filter((m) => {
                const d = (0, math_1.distance)({ x: targetMob.x, y: targetMob.y }, m);
                return d <= Number(skill.aoeRadius);
            });
            for (const mob of mobsInRange) {
                const damage = this.computeMobDamage(player, mob, scaledPower, Boolean(skill.magic), now);
                this.applyDamageToMobAndHandleDeath(player, mob, damage, now);
                this.broadcastMobHit(player, mob);
                this.applyOnHitSkillEffects(player, damage, now);
            }
        }
        else {
            let damage = this.computeMobDamage(player, targetMob, scaledPower, Boolean(skill.magic), now);
            if (skill.id === 'ass_letal_emboscada' && this.hasActiveSkillEffect(player, 'ocultar', now)) {
                damage = Math.max(1, Math.floor(damage * 1.45));
                this.removeSkillEffectById(player, 'ocultar');
            }
            this.applyDamageToMobAndHandleDeath(player, targetMob, damage, now);
            this.broadcastMobHit(player, targetMob);
            this.applyOnHitSkillEffects(player, damage, now);
            if (skill.id === 'ass_letal_sentenca') {
                const delayedDamage = Math.max(1, Math.floor(damage * 0.75));
                setTimeout(() => {
                    const liveMob = this.mobService.getMobs().find((m) => m.id === targetMob.id && m.mapId === mapInstanceId);
                    if (!liveMob || liveMob.hp <= 0)
                        return;
                    this.applyDamageToMobAndHandleDeath(player, liveMob, delayedDamage, Date.now());
                    this.broadcastMobHit(player, liveMob);
                    this.sendSkillEffect(player.mapKey, player.mapId, {
                        sourceId: player.id,
                        targetId: liveMob.id,
                        x: liveMob.x,
                        y: liveMob.y,
                        effectKey: 'ass_sentence_drop'
                    });
                }, 3000);
            }
        }
        this.sendSkillEffect(player.mapKey, player.mapId, {
            sourceId: player.id,
            targetId: targetMob.id,
            x: targetMob.x,
            y: targetMob.y,
            effectKey: skill.effectKey || skill.id
        });
        player.lastCombatAt = now;
        if (Number(player.hp || 0) !== hpBeforeCast)
            this.sendStatsUpdated(player);
    }
    handleSkillLearn(player, msg) {
        const skillId = String(msg?.skillId || '');
        const skill = SKILL_DEFS[skillId];
        if (!skill)
            return;
        if (skillId === 'class_primary' || skillId === 'mod_fire_wing') {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Essa habilidade nao pode ser evoluida manualmente.' });
            return;
        }
        const classId = this.normalizeClassId(player.class);
        const normalizedClass = classId === 'bandit' ? 'assassin' : classId === 'shifter' ? 'druid' : classId;
        if (normalizedClass !== skill.classId) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Essa habilidade nao pertence a sua classe.' });
            return;
        }
        const levels = this.normalizeSkillLevels(player.skillLevels || {});
        const current = Math.max(0, Math.min(5, Number(levels[skillId] || 0)));
        if (current >= 5) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Essa habilidade ja esta no nivel maximo.' });
            return;
        }
        const nextLevel = current + 1;
        const prereq = this.getSkillPrerequisite(skillId);
        if (prereq) {
            const prereqLevel = Math.max(0, Math.min(5, Number(levels[prereq] || 0)));
            if (prereqLevel < 1) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Aprenda o pre-requisito antes desta habilidade.' });
                return;
            }
        }
        const skillPointsAvailable = this.getAvailableSkillPoints(player);
        if (skillPointsAvailable <= 0) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Sem pontos de habilidade disponiveis.' });
            return;
        }
        levels[skillId] = nextLevel;
        player.skillLevels = levels;
        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        this.sendRaw(player.ws, { type: 'system_message', text: `${skill.name} evoluiu para nivel ${nextLevel}.` });
        this.sendStatsUpdated(player);
    }
    handleStatsAllocate(player, msg) {
        const allocation = msg && typeof msg.allocation === 'object' ? msg.allocation : {};
        const sanitized = {
            str: 0,
            int: 0,
            dex: 0,
            vit: 0
        };
        for (const key of PRIMARY_STATS) {
            const value = Number(allocation[key] ?? allocation[this.primaryToLegacyKey(key)]);
            if (!Number.isInteger(value) || value < 0) {
                this.sendRaw(player.ws, { type: 'system_message', text: 'Distribuicao invalida de atributos.' });
                return;
            }
            sanitized[key] = value;
        }
        for (const [legacyKey, primaryKey] of Object.entries(LEGACY_ALLOC_MAP)) {
            if (Object.prototype.hasOwnProperty.call(allocation, legacyKey)) {
                const value = Number(allocation[legacyKey]);
                if (!Number.isInteger(value) || value < 0) {
                    this.sendRaw(player.ws, { type: 'system_message', text: 'Distribuicao invalida de atributos.' });
                    return;
                }
                sanitized[primaryKey] = value;
            }
        }
        const requestedTotal = this.getAllocatedTotal(sanitized);
        if (requestedTotal <= 0) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Nenhum ponto foi alocado.' });
            return;
        }
        const current = this.normalizeAllocatedStats(player.allocatedStats);
        const requestedCost = this.getAllocationCost(current, sanitized);
        const maxSpend = this.maxSpendablePointsByLevel(player.level);
        const alreadySpent = this.getAllocatedCost(current);
        player.unspentPoints = Number.isInteger(player.unspentPoints) && player.unspentPoints > 0 ? player.unspentPoints : 0;
        if (requestedCost > player.unspentPoints) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Pontos insuficientes para essa distribuicao.' });
            return;
        }
        if (alreadySpent + requestedCost > maxSpend) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Distribuicao invalida para o nivel atual.' });
            return;
        }
        const next = { ...current };
        for (const key of PRIMARY_STATS) {
            next[key] = Number(current[key] || 0) + Number(sanitized[key] || 0);
        }
        // Overrides absolutos antigos podem congelar PATK/PDEF/HP e invalidar ganhos de atributos.
        // Ao alocar pontos, removemos os overrides dependentes de atributo para manter consistencia.
        let clearedAttributeOverrides = 0;
        if (player.statusOverrides && typeof player.statusOverrides === 'object') {
            for (const key of ATTRIBUTE_DRIVEN_OVERRIDE_KEYS) {
                if (Object.prototype.hasOwnProperty.call(player.statusOverrides, key)) {
                    delete player.statusOverrides[key];
                    clearedAttributeOverrides += 1;
                }
            }
        }
        player.allocatedStats = next;
        player.unspentPoints -= requestedCost;
        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        this.sendRaw(player.ws, {
            type: 'system_message',
            text: `${requestedTotal} ponto(s) aplicado(s) (custo ${requestedCost}). Restantes: ${player.unspentPoints}.`
        });
        if (clearedAttributeOverrides > 0) {
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: 'Overrides de combate foram limpos para aplicar os atributos corretamente.'
            });
        }
        this.sendStatsUpdated(player);
    }
    tick(deltaSeconds, now) {
        this.pruneExpiredGroundItems(now);
        this.pruneExpiredPartyInvites(now);
        this.pruneExpiredPartyJoinRequests(now);
        this.pruneExpiredFriendRequests(now);
        this.processMobAggroAndCombat(deltaSeconds, now);
        for (const player of this.players.values()) {
            this.pruneExpiredSkillEffects(player, now);
            if (player.dead || player.hp <= 0)
                continue;
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
    buildWorldSnapshot(mapId = config_1.DEFAULT_MAP_ID, mapKey = config_1.DEFAULT_MAP_KEY) {
        const mapInstanceId = this.mapInstanceId(mapKey, mapId);
        const publicPlayers = {};
        for (const [id, player] of this.players.entries()) {
            if (player.mapId !== mapId || player.mapKey !== mapKey)
                continue;
            publicPlayers[String(id)] = this.sanitizePublicPlayer(player);
        }
        return {
            type: 'world_state',
            players: publicPlayers,
            mobs: this.mobService.getMobsByMap(mapInstanceId),
            groundItems: this.groundItems.filter((it) => it.mapId === mapInstanceId),
            mapCode: (0, config_1.mapCodeFromKey)(mapKey),
            mapKey,
            mapTheme: config_1.MAP_THEMES[mapKey] || 'forest',
            mapFeatures: config_1.MAP_FEATURES_BY_KEY[mapKey] || [],
            portals: config_1.PORTALS_BY_MAP_KEY[mapKey] || [],
            mapId,
            world: config_1.WORLD
        };
    }
    getPlayerByRuntimeId(playerId) {
        return this.players.get(playerId);
    }
    async handleDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (!player)
            return;
        this.removePlayerFromParty(player);
        if (!player.statusOverrides || typeof player.statusOverrides !== 'object')
            player.statusOverrides = {};
        player.statusOverrides.__skillLevels = this.normalizeSkillLevels(player.skillLevels || {});
        await this.persistence.savePlayer(player);
        this.usernameToPlayerId.delete(player.username);
        this.players.delete(playerId);
        this.clearPendingInvitesForPlayer(player.id);
        this.clearJoinRequestsForPlayer(player.id);
        this.clearFriendRequestsForPlayer(player.id);
    }
    firstFreeInventorySlot(items, ignoreItemIds = new Set()) {
        const used = new Set(items
            .filter((it) => !ignoreItemIds.has(String(it?.id || '')))
            .map((it) => it.slotIndex)
            .filter((n) => Number.isInteger(n) && n >= 0));
        for (let i = 0; i < config_1.INVENTORY_SIZE; i++) {
            if (!used.has(i))
                return i;
        }
        return -1;
    }
    sanitizePublicPlayer(player) {
        const weapon = Array.isArray(player.inventory) ? player.inventory.find((it) => it.id === player.equippedWeaponId) : null;
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
            pathNodes: Array.isArray(player.movePath) ? player.movePath.slice(0, 40).map((pt) => ({ x: Number(pt.x), y: Number(pt.y) })) : [],
            xp: player.xp,
            xpToNext: (0, math_1.xpRequired)(player.level),
            stats: player.stats,
            skillLevels: this.normalizeSkillLevels(player.skillLevels || {}),
            skillPointsAvailable: this.getAvailableSkillPoints(player),
            allocatedStats: this.normalizeAllocatedStats(player.allocatedStats),
            unspentPoints: Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0
        };
    }
    normalizeHotbarBinding(binding) {
        if (!binding || typeof binding !== 'object')
            return null;
        const type = String(binding.type || '');
        if (type === 'action') {
            const actionId = String(binding.actionId || '');
            if (actionId === 'basic_attack')
                return { type: 'action', actionId: 'basic_attack' };
            if (actionId === 'skill_cast') {
                const skillId = String(binding.skillId || '');
                if (!skillId)
                    return null;
                return {
                    type: 'action',
                    actionId: 'skill_cast',
                    skillId,
                    skillName: binding.skillName ? String(binding.skillName) : 'Skill'
                };
            }
            return null;
        }
        if (type === 'item') {
            const itemId = binding.itemId ? String(binding.itemId) : '';
            const itemType = binding.itemType ? String(binding.itemType) : '';
            if (!itemId && !itemType)
                return null;
            return {
                type: 'item',
                itemId,
                itemType,
                itemName: binding.itemName ? String(binding.itemName) : 'Item'
            };
        }
        return null;
    }
    normalizeHotbarBindings(raw) {
        const allowedKeys = ['1', '2', '3', '4', '5', '6', '7', '8', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f'];
        const source = raw && typeof raw === 'object' ? raw : {};
        const out = {};
        for (const key of allowedKeys) {
            out[key] = this.normalizeHotbarBinding(source[key]);
        }
        if (!out['1'])
            out['1'] = { type: 'action', actionId: 'basic_attack' };
        return out;
    }
    getPlayerHotbarBindings(player) {
        const raw = player?.statusOverrides?.__hotbarBindings;
        return this.normalizeHotbarBindings(raw);
    }
    movePlayerTowardTarget(player, deltaSeconds, now) {
        if (Array.isArray(player.movePath) && player.movePath.length > 0) {
            const next = player.movePath[0];
            if (next) {
                player.targetX = next.x;
                player.targetY = next.y;
            }
        }
        const rawMoveSpeed = Number(player.stats?.moveSpeed);
        const moveSpeedStat = Number.isFinite(rawMoveSpeed) && rawMoveSpeed > 0 ? rawMoveSpeed : 100;
        const fx = this.getActiveSkillEffectAggregate(player, now);
        const speed = config_1.BASE_MOVE_SPEED * (moveSpeedStat / 100) * Math.max(0.2, Number(fx.moveMul || 1));
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
                }
                else {
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
                }
                else {
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
    processAutoAttack(player, now) {
        if (!player.autoAttackActive || !player.attackTargetId)
            return;
        const mob = this.mobService.getMobs().find((m) => m.id === player.attackTargetId && m.mapId === this.mapInstanceId(player.mapKey, player.mapId));
        if (!mob) {
            player.autoAttackActive = false;
            player.attackTargetId = null;
            player.movePath = [];
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            return;
        }
        const currentDistance = (0, math_1.distance)(player, mob);
        const edgeDistance = currentDistance - (mob.size / 2 + config_1.PLAYER_HALF_SIZE);
        const attackRange = Number(player.stats?.attackRange || 60);
        const inRange = edgeDistance <= attackRange;
        if (!inRange) {
            const desiredDistance = mob.size / 2 + config_1.PLAYER_HALF_SIZE + Math.max(2, attackRange - 4);
            const dx = player.x - mob.x;
            const dy = player.y - mob.y;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            const projected = this.projectToWalkable(player.mapKey, (0, math_1.clamp)(mob.x + (dx / norm) * desiredDistance, 0, config_1.WORLD.width), (0, math_1.clamp)(mob.y + (dy / norm) * desiredDistance, 0, config_1.WORLD.height));
            this.recalculatePathToward(player, projected.x, projected.y, now);
            return;
        }
        player.movePath = [];
        player.targetX = player.x;
        player.targetY = player.y;
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        const fx = this.getActiveSkillEffectAggregate(player, now);
        const rawAttackSpeed = Number(player.stats?.attackSpeed);
        const attackSpeedStat = Number.isFinite(rawAttackSpeed) && rawAttackSpeed > 0 ? rawAttackSpeed : 100;
        const boostedAttackSpeed = attackSpeedStat * Math.max(0.2, Number(fx.attackSpeedMul || 1));
        const attackIntervalMs = 1000 * (100 / boostedAttackSpeed);
        if (now - player.lastAttackAt < attackIntervalMs)
            return;
        player.lastAttackAt = now;
        const hitChance = this.computeHitChance(Number(player.stats?.accuracy || 0), this.getMobEvasion(mob));
        if (Math.random() > hitChance) {
            this.broadcastMobHit(player, mob);
            return;
        }
        const damage = this.computeMobDamage(player, mob, 1, false, now);
        this.applyDamageToMobAndHandleDeath(player, mob, damage, now);
        const healed = this.applyOnHitSkillEffects(player, damage, now);
        if (healed > 0)
            this.sendStatsUpdated(player);
        player.lastCombatAt = now;
        for (const receiver of this.players.values()) {
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey)
                continue;
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
            }
            catch {
                // Ignore socket send failures; cleanup happens on disconnect.
            }
        }
    }
    computeMobDamage(player, mob, multiplier, forceMagic = false, now = Date.now()) {
        const fx = this.getActiveSkillEffectAggregate(player, now);
        const isMagic = forceMagic || player.stats?.damageType === 'magic';
        const rawAttack = (Number(isMagic ? player.stats?.magicAttack : player.stats?.physicalAttack) || 1) * Math.max(0.2, Number(fx.attackMul || 1));
        const defense = Number(isMagic ? mob.magicDefense : mob.physicalDefense) || 0;
        const reducedDefense = this.shouldLuckyStrike(player, mob) ? defense * 0.5 : defense;
        const base = Number(rawAttack) * Math.max(0.05, Number(multiplier || 1));
        return this.computeDamageAfterMitigation(base, reducedDefense, Number(mob.level || 1));
    }
    applyDamageToMobAndHandleDeath(player, mob, damage, now) {
        if (!mob)
            return false;
        if (mob.state === 'leash_return' || mob.ignoreDamage)
            return false;
        const finalDamage = Math.max(1, Math.floor(Number(damage || 0)));
        if (finalDamage <= 0)
            return false;
        this.mobService.addHate(mob, player.id, finalDamage);
        if (!mob.targetPlayerId)
            mob.targetPlayerId = player.id;
        mob.state = mob.state === 'attack_windup' ? mob.state : 'aggro';
        mob.nextRepathAt = now;
        mob.hp = Math.max(0, Number(mob.hp || 0) - finalDamage);
        if (mob.hp > 0)
            return true;
        this.grantXp(player, mob.xpReward);
        const mapInstanceId = this.mapInstanceId(player.mapKey, player.mapId);
        const dropDefs = [];
        if (Math.random() < 0.5)
            dropDefs.push('weapon');
        dropDefs.push('potion_hp');
        if (Math.random() < Number(config_1.SKILL_RESET_HOURGLASS_DROP_CHANCE || 0))
            dropDefs.push('skill_reset_hourglass');
        dropDefs.forEach((dropType, index) => {
            const dropPos = this.computeLootDropPosition(mob.x, mob.y, index, dropDefs.length, player.mapKey);
            if (dropType === 'weapon')
                this.dropWeaponAt(dropPos.x, dropPos.y, mapInstanceId, this.pickRandomWeaponTemplate());
            else if (dropType === 'potion_hp')
                this.dropHpPotionAt(dropPos.x, dropPos.y, mapInstanceId);
            else
                this.dropSkillResetHourglassAt(dropPos.x, dropPos.y, mapInstanceId);
        });
        this.mobService.removeMob(mob.id);
        return true;
    }
    pruneExpiredSkillEffects(player, now = Date.now()) {
        if (!Array.isArray(player.activeSkillEffects)) {
            player.activeSkillEffects = [];
            return;
        }
        player.activeSkillEffects = player.activeSkillEffects.filter((fx) => Number(fx?.expiresAt || 0) > now);
    }
    hasActiveSkillEffect(player, effectId, now = Date.now()) {
        this.pruneExpiredSkillEffects(player, now);
        return Array.isArray(player.activeSkillEffects)
            && player.activeSkillEffects.some((fx) => String(fx?.id || '') === String(effectId));
    }
    removeSkillEffectById(player, effectId) {
        if (!Array.isArray(player.activeSkillEffects))
            return;
        player.activeSkillEffects = player.activeSkillEffects.filter((fx) => String(fx?.id || '') !== String(effectId));
    }
    getActiveSkillEffectAggregate(player, now = Date.now()) {
        this.pruneExpiredSkillEffects(player, now);
        const out = {
            attackMul: 1,
            defenseMul: 1,
            magicDefenseMul: 1,
            moveMul: 1,
            attackSpeedMul: 1,
            critAdd: 0,
            evasionAdd: 0,
            damageReduction: 0,
            lifesteal: 0,
            reflect: 0,
            stealth: false
        };
        for (const fx of player.activeSkillEffects || []) {
            const data = fx && typeof fx === 'object' ? fx : {};
            if (Number(data.attackMul) > 0)
                out.attackMul *= Number(data.attackMul);
            if (Number(data.defenseMul) > 0)
                out.defenseMul *= Number(data.defenseMul);
            if (Number(data.magicDefenseMul) > 0)
                out.magicDefenseMul *= Number(data.magicDefenseMul);
            if (Number(data.moveMul) > 0)
                out.moveMul *= Number(data.moveMul);
            if (Number(data.attackSpeedMul) > 0)
                out.attackSpeedMul *= Number(data.attackSpeedMul);
            if (Number.isFinite(Number(data.critAdd)))
                out.critAdd += Number(data.critAdd);
            if (Number.isFinite(Number(data.evasionAdd)))
                out.evasionAdd += Number(data.evasionAdd);
            if (Number.isFinite(Number(data.damageReduction)))
                out.damageReduction = Math.max(out.damageReduction, Number(data.damageReduction));
            if (Number.isFinite(Number(data.lifesteal)))
                out.lifesteal = Math.max(out.lifesteal, Number(data.lifesteal));
            if (Number.isFinite(Number(data.reflect)))
                out.reflect = Math.max(out.reflect, Number(data.reflect));
            if (data.stealth)
                out.stealth = true;
        }
        return out;
    }
    applyTimedSkillEffect(player, buff, now = Date.now()) {
        if (!buff || typeof buff !== 'object')
            return;
        if (!Array.isArray(player.activeSkillEffects))
            player.activeSkillEffects = [];
        const id = String(buff.id || (0, crypto_1.randomUUID)());
        const expiresAt = now + Math.max(500, Number(buff.durationMs || 1000));
        player.activeSkillEffects = player.activeSkillEffects.filter((fx) => String(fx?.id || '') !== id);
        player.activeSkillEffects.push({ ...buff, id, expiresAt });
    }
    applyOnHitSkillEffects(player, dealtDamage, now = Date.now()) {
        const effects = this.getActiveSkillEffectAggregate(player, now);
        const lifesteal = Math.max(0, Math.min(0.6, Number(effects.lifesteal || 0)));
        if (lifesteal <= 0)
            return 0;
        const heal = Math.max(1, Math.floor(Number(dealtDamage || 0) * lifesteal));
        player.hp = Math.min(Number(player.maxHp || player.hp), Number(player.hp || 0) + heal);
        return heal;
    }
    sendSkillEffect(mapKey, mapId, payload) {
        for (const receiver of this.players.values()) {
            if (receiver.mapKey !== mapKey || receiver.mapId !== mapId)
                continue;
            this.sendRaw(receiver.ws, {
                type: 'skill.effect',
                ...payload
            });
        }
    }
    broadcastMobHit(player, mob) {
        for (const receiver of this.players.values()) {
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey)
                continue;
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
            }
            catch {
                // Ignore socket send failures; cleanup happens on disconnect.
            }
        }
    }
    cellKey(x, y, mapKey, mapId) {
        const cx = Math.floor(Number(x || 0) / MOB_AI_CELL_SIZE);
        const cy = Math.floor(Number(y || 0) / MOB_AI_CELL_SIZE);
        return `${mapKey}::${mapId}::${cx},${cy}`;
    }
    buildPlayerSpatialIndex() {
        const index = new Map();
        for (const player of this.players.values()) {
            if (player.dead || player.hp <= 0)
                continue;
            const key = this.cellKey(player.x, player.y, player.mapKey, player.mapId);
            const bucket = index.get(key);
            if (bucket)
                bucket.push(player);
            else
                index.set(key, [player]);
        }
        return index;
    }
    getPlayersNearCell(index, mapKey, mapId, x, y) {
        const baseCx = Math.floor(Number(x || 0) / MOB_AI_CELL_SIZE);
        const baseCy = Math.floor(Number(y || 0) / MOB_AI_CELL_SIZE);
        const out = [];
        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const key = `${mapKey}::${mapId}::${baseCx + ox},${baseCy + oy}`;
                const bucket = index.get(key);
                if (!bucket || !bucket.length)
                    continue;
                for (const player of bucket)
                    out.push(player);
            }
        }
        return out;
    }
    randomInt(min, max) {
        const safeMin = Math.floor(Math.max(0, Number(min || 0)));
        const safeMax = Math.floor(Math.max(safeMin, Number(max || safeMin)));
        return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
    }
    pickWanderTarget(homeX, homeY, radius) {
        const r = Math.max(24, Number(radius || 120));
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r;
        return {
            x: (0, math_1.clamp)(homeX + Math.cos(angle) * dist, 0, config_1.WORLD.width),
            y: (0, math_1.clamp)(homeY + Math.sin(angle) * dist, 0, config_1.WORLD.height)
        };
    }
    moveMobToward(mob, targetX, targetY, speed, deltaSeconds, mapKey) {
        const dx = Number(targetX || 0) - Number(mob.x || 0);
        const dy = Number(targetY || 0) - Number(mob.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 0.001)
            return true;
        const step = Math.max(0, Number(speed || 0)) * Math.max(0, Number(deltaSeconds || 0));
        if (step <= 0.0001)
            return false;
        const nx = (0, math_1.clamp)(Number(mob.x || 0) + (dx / dist) * Math.min(step, dist), 0, config_1.WORLD.width);
        const ny = (0, math_1.clamp)(Number(mob.y || 0) + (dy / dist) * Math.min(step, dist), 0, config_1.WORLD.height);
        if (!this.isBlockedAt(mapKey, nx, ny)) {
            mob.x = nx;
            mob.y = ny;
        }
        else {
            const axisX = (0, math_1.clamp)(Number(mob.x || 0) + (dx / dist) * Math.min(step, dist), 0, config_1.WORLD.width);
            const axisY = (0, math_1.clamp)(Number(mob.y || 0) + (dy / dist) * Math.min(step, dist), 0, config_1.WORLD.height);
            if (!this.isBlockedAt(mapKey, axisX, Number(mob.y || 0)))
                mob.x = axisX;
            else if (!this.isBlockedAt(mapKey, Number(mob.x || 0), axisY))
                mob.y = axisY;
            else
                return false;
        }
        return Math.abs(Number(targetX || 0) - Number(mob.x || 0)) < 2 && Math.abs(Number(targetY || 0) - Number(mob.y || 0)) < 2;
    }
    processAutoAttackPlayer(player, now) {
        if (!player.pvpAutoAttackActive || !player.attackTargetPlayerId)
            return;
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
        const currentDistance = (0, math_1.distance)(player, target);
        const edgeDistance = Math.max(0, currentDistance - config_1.PLAYER_HALF_SIZE * 2);
        const attackRange = Number(player.stats?.attackRange || 60);
        if (edgeDistance > attackRange) {
            const desiredDistance = config_1.PLAYER_HALF_SIZE * 2 + Math.max(2, attackRange - 4);
            const dx = player.x - target.x;
            const dy = player.y - target.y;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            const projected = this.projectToWalkable(player.mapKey, (0, math_1.clamp)(target.x + (dx / norm) * desiredDistance, 0, config_1.WORLD.width), (0, math_1.clamp)(target.y + (dy / norm) * desiredDistance, 0, config_1.WORLD.height));
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
    processMobAggroAndCombat(deltaSeconds, now) {
        const mobs = this.mobService.getMobs();
        const playerIndex = this.buildPlayerSpatialIndex();
        if (this.mobsPeacefulMode) {
            for (const mob of mobs) {
                mob.targetPlayerId = null;
                mob.lastAttackAt = 0;
                mob.state = 'idle';
                mob.ignoreDamage = false;
            }
            return;
        }
        for (const mob of mobs) {
            const template = this.mobService.getTemplateByMob(mob);
            const [mapKey, mapId] = String(mob.mapId || '').split('::');
            if (!mapKey || !mapId)
                continue;
            if (!Number.isFinite(Number(mob.homeX)))
                mob.homeX = Number(mob.x || 0);
            if (!Number.isFinite(Number(mob.homeY)))
                mob.homeY = Number(mob.y || 0);
            if (!mob.state)
                mob.state = 'idle';
            if (!mob.hateTable)
                mob.hateTable = {};
            const home = { x: Number(mob.homeX || mob.x), y: Number(mob.homeY || mob.y) };
            const distanceToHome = (0, math_1.distance)(mob, home);
            if (mob.state === 'leash_return' || distanceToHome > template.leashRange) {
                mob.state = 'leash_return';
                mob.ignoreDamage = true;
                mob.targetPlayerId = null;
                mob.hateTable = {};
                const regen = Number(mob.maxHp || 1) * MOB_LEASH_REGEN_PER_SEC * deltaSeconds;
                mob.hp = Math.min(Number(mob.maxHp || 1), Number(mob.hp || 0) + regen);
                const arrived = this.moveMobToward(mob, home.x, home.y, Number(template.moveSpeed) * 2, deltaSeconds, mapKey);
                if (arrived || (0, math_1.distance)(mob, home) <= 8) {
                    mob.x = home.x;
                    mob.y = home.y;
                    mob.state = 'idle';
                    mob.ignoreDamage = false;
                    mob.nextThinkAt = now + this.randomInt(Number(template.idleMinMs), Number(template.idleMaxMs));
                }
                continue;
            }
            mob.ignoreDamage = false;
            let target = mob.targetPlayerId ? this.players.get(Number(mob.targetPlayerId)) : null;
            if (!target || target.dead || target.hp <= 0 || target.mapKey !== mapKey || target.mapId !== mapId) {
                target = null;
                const hateTargetId = this.mobService.getTopHateTarget(mob);
                if (hateTargetId) {
                    const hated = this.players.get(hateTargetId);
                    if (hated && !hated.dead && hated.hp > 0 && hated.mapKey === mapKey && hated.mapId === mapId) {
                        target = hated;
                        mob.targetPlayerId = hated.id;
                    }
                }
            }
            const canThink = now >= Number(mob.nextThinkAt || 0);
            if (!target && canThink) {
                const candidates = this.getPlayersNearCell(playerIndex, mapKey, mapId, mob.x, mob.y);
                let nearest = null;
                let nearestDist = Number.POSITIVE_INFINITY;
                for (const player of candidates) {
                    const d = (0, math_1.distance)(mob, player);
                    if (d > template.aggroRange)
                        continue;
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearest = player;
                    }
                }
                if (nearest) {
                    target = nearest;
                    mob.targetPlayerId = nearest.id;
                    mob.state = 'aggro';
                    mob.nextRepathAt = now + MOB_DECISION_MS;
                }
                else {
                    if (mob.state !== 'wander') {
                        const wander = this.pickWanderTarget(home.x, home.y, template.wanderRadius);
                        mob.wanderTargetX = wander.x;
                        mob.wanderTargetY = wander.y;
                        mob.state = 'wander';
                    }
                    else {
                        mob.state = 'idle';
                    }
                    mob.nextThinkAt = now + this.randomInt(Number(template.idleMinMs), Number(template.idleMaxMs));
                }
            }
            if (!target) {
                if (mob.state === 'wander' && Number.isFinite(Number(mob.wanderTargetX)) && Number.isFinite(Number(mob.wanderTargetY))) {
                    const arrived = this.moveMobToward(mob, Number(mob.wanderTargetX), Number(mob.wanderTargetY), Number(template.moveSpeed) * 0.55, deltaSeconds, mapKey);
                    if (arrived) {
                        mob.state = 'idle';
                        mob.nextThinkAt = now + this.randomInt(Number(template.idleMinMs), Number(template.idleMaxMs));
                        mob.wanderTargetX = null;
                        mob.wanderTargetY = null;
                    }
                }
                continue;
            }
            const centerDistance = (0, math_1.distance)(mob, target);
            if (centerDistance > template.leashRange) {
                mob.state = 'leash_return';
                continue;
            }
            const edgeDistance = Math.max(0, centerDistance - (mob.size / 2 + config_1.PLAYER_HALF_SIZE));
            if (edgeDistance > template.attackRange) {
                mob.state = 'aggro';
                if (now >= Number(mob.nextRepathAt || 0)) {
                    mob.nextRepathAt = now + Number(template.repathMs || MOB_DECISION_MS);
                }
                this.moveMobToward(mob, target.x, target.y, Number(template.moveSpeed), deltaSeconds, mapKey);
                continue;
            }
            if (now < Number(mob.nextAttackAt || 0))
                continue;
            if (mob.state !== 'attack_windup') {
                mob.state = 'attack_windup';
                mob.nextAttackAt = now + MOB_ATTACK_WINDUP_MS;
                continue;
            }
            mob.state = 'aggro';
            mob.lastAttackAt = now;
            mob.nextAttackAt = now + Number(template.attackCadenceMs || config_1.MOB_ATTACK_INTERVAL_MS);
            const baseDamage = mob.kind === 'boss' ? 34 : mob.kind === 'subboss' ? 21 : mob.kind === 'elite' ? 14 : 8;
            const targetFx = this.getActiveSkillEffectAggregate(target, now);
            const hitChance = this.computeHitChance(Number(template.accuracy || 60), Number(target.stats?.evasion || 0) + Number(targetFx.evasionAdd || 0));
            if (Math.random() > hitChance)
                continue;
            const defense = Number(target.stats?.physicalDefense || 0) * Math.max(0.1, Number(targetFx.defenseMul || 1));
            const luckyBypass = Math.random() < Number(template.luckyStrikeChance || 0);
            const effectiveDefense = luckyBypass ? defense * 0.5 : defense;
            let damage = this.computeDamageAfterMitigation(baseDamage, effectiveDefense, Number(target.level || 1));
            damage = Math.max(1, Math.floor(damage * (1 - Math.max(0, Math.min(0.95, Number(targetFx.damageReduction || 0))))));
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
            const reflect = Math.max(0, Math.min(0.5, Number(targetFx.reflect || 0)));
            if (reflect > 0 && Number(mob.hp || 0) > 0) {
                const reflected = Math.max(1, Math.floor(damage * reflect));
                mob.hp = Math.max(0, Number(mob.hp || 0) - reflected);
                if (mob.hp <= 0) {
                    this.applyDamageToMobAndHandleDeath(target, mob, reflected, now);
                }
            }
            this.persistPlayer(target);
            this.syncAllPartyStates();
            for (const receiver of this.players.values()) {
                if (receiver.mapKey !== mapKey || receiver.mapId !== mapId)
                    continue;
                this.sendRaw(receiver.ws, {
                    type: 'combat.mobHitPlayer',
                    mobId: mob.id,
                    mobX: mob.x,
                    mobY: mob.y,
                    targetPlayerId: target.id,
                    targetX: target.x,
                    targetY: target.y,
                    damage,
                    luckyStrike: luckyBypass,
                    targetHp: target.hp,
                    targetMaxHp: target.maxHp
                });
            }
        }
    }
    tryPlayerAttack(player, targetPlayerId, now, silent) {
        const target = this.players.get(targetPlayerId);
        if (!target) {
            if (!silent)
                this.sendRaw(player.ws, { type: 'system_message', text: 'Alvo de PVP nao encontrado.' });
            return;
        }
        if (target.dead || target.hp <= 0)
            return;
        const permission = this.getPvpAttackPermission(player, target);
        if (!permission.ok) {
            if (!silent)
                this.sendRaw(player.ws, { type: 'system_message', text: permission.reason || 'Nao pode atacar esse alvo.' });
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
            return;
        }
        if (player.mapId !== target.mapId || player.mapKey !== target.mapKey)
            return;
        const currentDistance = (0, math_1.distance)(player, target);
        const edgeDistance = Math.max(0, currentDistance - config_1.PLAYER_HALF_SIZE * 2);
        const attackRange = Number(player.stats?.attackRange || 60);
        if (edgeDistance > attackRange) {
            if (!silent)
                this.sendRaw(player.ws, { type: 'system_message', text: 'Jogador fora de alcance.' });
            return;
        }
        const fx = this.getActiveSkillEffectAggregate(player, now);
        const rawAttackSpeed = Number(player.stats?.attackSpeed);
        const attackSpeedStat = Number.isFinite(rawAttackSpeed) && rawAttackSpeed > 0 ? rawAttackSpeed : 100;
        const boostedAttackSpeed = attackSpeedStat * Math.max(0.2, Number(fx.attackSpeedMul || 1));
        const attackIntervalMs = 1000 * (100 / boostedAttackSpeed);
        if (now - player.lastAttackAt < attackIntervalMs)
            return;
        player.lastAttackAt = now;
        const hitChance = this.computeHitChance(Number(player.stats?.accuracy || 0), Number(target.stats?.evasion || 0) + Number(this.getActiveSkillEffectAggregate(target, now).evasionAdd || 0));
        if (Math.random() > hitChance)
            return;
        const isMagic = player.stats?.damageType === 'magic';
        let rawAttack = Number(isMagic ? player.stats?.magicAttack : player.stats?.physicalAttack) || 1;
        rawAttack *= Math.max(0.2, Number(fx.attackMul || 1));
        const critChance = Math.max(0, Math.min(0.95, Number(player.stats?.criticalChance || 0) + Number(fx.critAdd || 0)));
        if (Math.random() < critChance)
            rawAttack *= 1.5;
        const targetFx = this.getActiveSkillEffectAggregate(target, now);
        let targetDefense = Number(isMagic ? target.stats?.magicDefense : target.stats?.physicalDefense) || 0;
        targetDefense *= isMagic
            ? Math.max(0.1, Number(targetFx.magicDefenseMul || 1))
            : Math.max(0.1, Number(targetFx.defenseMul || 1));
        if (this.shouldLuckyStrike(player, target))
            targetDefense *= 0.5;
        let damage = this.computeDamageAfterMitigation(rawAttack, targetDefense, Number(target.level || 1));
        damage = Math.max(1, Math.floor(damage * (1 - Math.max(0, Math.min(0.95, Number(targetFx.damageReduction || 0))))));
        const attackerHpBefore = Number(player.hp || 0);
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
        this.applyOnHitSkillEffects(player, damage, now);
        const reflect = Math.max(0, Math.min(0.5, Number(targetFx.reflect || 0)));
        if (reflect > 0 && player.hp > 0) {
            const reflected = Math.max(1, Math.floor(damage * reflect));
            player.hp = Math.max(0, Number(player.hp || 0) - reflected);
            if (player.hp <= 0) {
                player.dead = true;
                player.deathX = player.x;
                player.deathY = player.y;
                player.autoAttackActive = false;
                player.attackTargetId = null;
                player.pvpAutoAttackActive = false;
                player.attackTargetPlayerId = null;
                this.sendRaw(player.ws, { type: 'player.dead' });
            }
        }
        if (Number(player.hp || 0) !== attackerHpBefore)
            this.sendStatsUpdated(player);
        this.persistPlayer(target);
        this.syncAllPartyStates();
        for (const receiver of this.players.values()) {
            if (receiver.mapId !== player.mapId || receiver.mapKey !== player.mapKey)
                continue;
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
    getPvpAttackPermission(player, target) {
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
            if (targetMode !== 'group' && targetMode !== 'evil') {
                return { ok: false, reason: 'Modo Grupo so pode atacar jogadores nos modos Grupo ou Mal.' };
            }
            return { ok: true };
        }
        if (mode === 'evil') {
            return { ok: true };
        }
        return { ok: false, reason: 'Modo PVP invalido.' };
    }
    arePlayersInSameParty(a, b) {
        if (!a.partyId || !b.partyId)
            return false;
        if (a.partyId !== b.partyId)
            return false;
        return this.parties.has(a.partyId);
    }
    assignPathTo(player, destinationX, destinationY) {
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
    findPathWithNearbyGoals(mapKey, fromX, fromY, toX, toY) {
        const direct = this.findPath(mapKey, fromX, fromY, toX, toY);
        if (direct.length > 0)
            return direct;
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
                    if (!this.isPathCellWalkable(mapKey, cell.cx, cell.cy))
                        continue;
                    const world = this.pathCellToWorld(cell.cx, cell.cy);
                    const candidate = this.findPath(mapKey, fromX, fromY, world.x, world.y);
                    if (candidate.length > 0)
                        return candidate;
                    if (candidatesChecked >= maxCandidates)
                        break;
                }
            }
            for (let dy = -r + 1; dy <= r - 1 && candidatesChecked < maxCandidates; dy++) {
                const checks = [
                    { cx: goal.cx - r, cy: goal.cy + dy },
                    { cx: goal.cx + r, cy: goal.cy + dy }
                ];
                for (const cell of checks) {
                    candidatesChecked += 1;
                    if (!this.isPathCellWalkable(mapKey, cell.cx, cell.cy))
                        continue;
                    const world = this.pathCellToWorld(cell.cx, cell.cy);
                    const candidate = this.findPath(mapKey, fromX, fromY, world.x, world.y);
                    if (candidate.length > 0)
                        return candidate;
                    if (candidatesChecked >= maxCandidates)
                        break;
                }
            }
        }
        return [];
    }
    recalculatePathToward(player, destinationX, destinationY, now) {
        if (now < Number(player.nextPathfindAt || 0))
            return;
        player.nextPathfindAt = now + PATH_RECALC_MS;
        this.assignPathTo(player, destinationX, destinationY);
    }
    worldToPathCell(x, y) {
        const maxCellX = Math.floor(config_1.WORLD.width / PATHFIND_CELL_SIZE);
        const maxCellY = Math.floor(config_1.WORLD.height / PATHFIND_CELL_SIZE);
        return {
            cx: (0, math_1.clamp)(Math.floor((0, math_1.clamp)(x, 0, config_1.WORLD.width) / PATHFIND_CELL_SIZE), 0, maxCellX),
            cy: (0, math_1.clamp)(Math.floor((0, math_1.clamp)(y, 0, config_1.WORLD.height) / PATHFIND_CELL_SIZE), 0, maxCellY)
        };
    }
    pathCellToWorld(cx, cy) {
        return {
            x: (0, math_1.clamp)(cx * PATHFIND_CELL_SIZE + PATHFIND_CELL_SIZE / 2, 0, config_1.WORLD.width),
            y: (0, math_1.clamp)(cy * PATHFIND_CELL_SIZE + PATHFIND_CELL_SIZE / 2, 0, config_1.WORLD.height)
        };
    }
    isPathCellWalkable(mapKey, cx, cy) {
        const maxCellX = Math.floor(config_1.WORLD.width / PATHFIND_CELL_SIZE);
        const maxCellY = Math.floor(config_1.WORLD.height / PATHFIND_CELL_SIZE);
        if (cx < 0 || cy < 0 || cx > maxCellX || cy > maxCellY)
            return false;
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
            if (this.isPathBlockedAt(mapKey, probe.x, probe.y, PATH_PLAN_RADIUS))
                return false;
        }
        return true;
    }
    findPath(mapKey, fromX, fromY, toX, toY) {
        const startRaw = this.worldToPathCell(fromX, fromY);
        const goalRaw = this.worldToPathCell(toX, toY);
        const start = this.findNearestWalkableCell(mapKey, startRaw.cx, startRaw.cy, 20) || startRaw;
        const goal = this.findNearestWalkableCell(mapKey, goalRaw.cx, goalRaw.cy, 72) || goalRaw;
        const sameCell = start.cx === goal.cx && start.cy === goal.cy;
        if (sameCell)
            return [{ x: (0, math_1.clamp)(toX, 0, config_1.WORLD.width), y: (0, math_1.clamp)(toY, 0, config_1.WORLD.height) }];
        const startKey = `${start.cx},${start.cy}`;
        const goalKey = `${goal.cx},${goal.cy}`;
        const open = new Set([startKey]);
        const closed = new Set();
        const g = new Map([[startKey, 0]]);
        const f = new Map();
        const cameFrom = new Map();
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
            if (!current)
                break;
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
                if (closed.has(nkey))
                    continue;
                if (!this.isPathCellWalkable(mapKey, nx, ny))
                    continue;
                if (dir.x !== 0 && dir.y !== 0) {
                    if (!this.isPathCellWalkable(mapKey, cx + dir.x, cy) || !this.isPathCellWalkable(mapKey, cx, cy + dir.y)) {
                        continue;
                    }
                }
                const tentative = Number(g.get(current) ?? Number.POSITIVE_INFINITY) + dir.c;
                if (!open.has(nkey))
                    open.add(nkey);
                else if (tentative >= Number(g.get(nkey) ?? Number.POSITIVE_INFINITY))
                    continue;
                cameFrom.set(nkey, current);
                g.set(nkey, tentative);
                f.set(nkey, tentative + this.pathHeuristic(nx, ny, goal.cx, goal.cy));
            }
        }
        return [];
    }
    isPathBlockedAt(mapKey, x, y, radiusOverride) {
        const px = (0, math_1.clamp)(x, 0, config_1.WORLD.width);
        const py = (0, math_1.clamp)(y, 0, config_1.WORLD.height);
        const radius = Number.isFinite(Number(radiusOverride)) ? Number(radiusOverride) : PATH_PROBE_RADIUS;
        const tiledSampler = this.getMapTiledCollisionSampler(mapKey);
        if (tiledSampler && tiledSampler.isBlockedAt(px, py, radius))
            return true;
        const features = config_1.MAP_FEATURES_BY_KEY[mapKey] || [];
        for (const feature of features) {
            if (!feature.collision)
                continue;
            if (feature.shape === 'rect') {
                const insideX = px >= (feature.x - radius) && px <= (feature.x + feature.w + radius);
                const insideY = py >= (feature.y - radius) && py <= (feature.y + feature.h + radius);
                if (insideX && insideY)
                    return true;
                continue;
            }
            const dx = px - feature.x;
            const dy = py - feature.y;
            if (dx * dx + dy * dy <= (feature.r + radius) * (feature.r + radius))
                return true;
        }
        return false;
    }
    isPathSegmentBlocked(mapKey, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len <= 0.01)
            return false;
        const step = Math.max(6, PATHFIND_CELL_SIZE * 0.5);
        const steps = Math.max(1, Math.ceil(len / step));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            if (this.isPathBlockedAt(mapKey, x, y))
                return true;
        }
        return false;
    }
    findNearestWalkableCell(mapKey, cx, cy, maxRadius) {
        if (this.isPathCellWalkable(mapKey, cx, cy))
            return { cx, cy };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                const top = { cx: cx + dx, cy: cy - r };
                const bottom = { cx: cx + dx, cy: cy + r };
                if (this.isPathCellWalkable(mapKey, top.cx, top.cy))
                    return top;
                if (this.isPathCellWalkable(mapKey, bottom.cx, bottom.cy))
                    return bottom;
            }
            for (let dy = -r + 1; dy <= r - 1; dy++) {
                const left = { cx: cx - r, cy: cy + dy };
                const right = { cx: cx + r, cy: cy + dy };
                if (this.isPathCellWalkable(mapKey, left.cx, left.cy))
                    return left;
                if (this.isPathCellWalkable(mapKey, right.cx, right.cy))
                    return right;
            }
        }
        return null;
    }
    pathHeuristic(ax, ay, bx, by) {
        const dx = Math.abs(ax - bx);
        const dy = Math.abs(ay - by);
        const diag = Math.min(dx, dy);
        const straight = dx + dy - diag * 2;
        return diag * 1.4142 + straight;
    }
    rebuildPath(cameFrom, current, toX, toY) {
        const reversed = [current];
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
        path.push({ x: (0, math_1.clamp)(toX, 0, config_1.WORLD.width), y: (0, math_1.clamp)(toY, 0, config_1.WORLD.height) });
        return path;
    }
    processPortalCollision(player, now) {
        if (now - (player.lastPortalAt || 0) < config_1.PORTAL_COOLDOWN_MS)
            return;
        const portals = config_1.PORTALS_BY_MAP_KEY[player.mapKey] || [];
        for (const portal of portals) {
            const insideX = player.x >= portal.x && player.x <= portal.x + portal.w;
            const insideY = player.y >= portal.y && player.y <= portal.y + portal.h;
            if (!insideX || !insideY)
                continue;
            player.mapKey = portal.toMapKey;
            const projected = this.projectToWalkable(portal.toMapKey, (0, math_1.clamp)(portal.toX, 0, config_1.WORLD.width), (0, math_1.clamp)(portal.toY, 0, config_1.WORLD.height));
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
    mapInstanceId(mapKey, mapId) {
        return (0, config_1.composeMapInstanceId)(mapKey, mapId);
    }
    isBlockedAt(mapKey, x, y) {
        const px = (0, math_1.clamp)(x, 0, config_1.WORLD.width);
        const py = (0, math_1.clamp)(y, 0, config_1.WORLD.height);
        const radius = Math.max(8, config_1.PLAYER_HALF_SIZE - 6) + MOVE_COLLISION_PADDING;
        const tiledSampler = this.getMapTiledCollisionSampler(mapKey);
        if (tiledSampler && tiledSampler.isBlockedAt(px, py, radius))
            return true;
        const features = config_1.MAP_FEATURES_BY_KEY[mapKey] || [];
        for (const feature of features) {
            if (!feature.collision)
                continue;
            if (feature.shape === 'rect') {
                const insideX = px >= (feature.x - radius) && px <= (feature.x + feature.w + radius);
                const insideY = py >= (feature.y - radius) && py <= (feature.y + feature.h + radius);
                if (insideX && insideY)
                    return true;
                continue;
            }
            const dx = px - feature.x;
            const dy = py - feature.y;
            if (dx * dx + dy * dy <= (feature.r + radius) * (feature.r + radius))
                return true;
        }
        return false;
    }
    getMapTiledCollisionSampler(mapKey) {
        if (mapKey === 'forest')
            return (0, tiledForestCollision_1.getForestTiledCollisionSampler)();
        return null;
    }
    projectToWalkable(mapKey, x, y) {
        const px = (0, math_1.clamp)(x, 0, config_1.WORLD.width);
        const py = (0, math_1.clamp)(y, 0, config_1.WORLD.height);
        if (!this.isBlockedAt(mapKey, px, py))
            return { x: px, y: py };
        const maxRadius = Math.max(config_1.WORLD.width, config_1.WORLD.height);
        for (let radius = 16; radius <= maxRadius; radius += 16) {
            for (let i = 0; i < 64; i++) {
                const angle = (Math.PI * 2 * i) / 64;
                const nx = (0, math_1.clamp)(px + Math.cos(angle) * radius, 0, config_1.WORLD.width);
                const ny = (0, math_1.clamp)(py + Math.sin(angle) * radius, 0, config_1.WORLD.height);
                if (!this.isBlockedAt(mapKey, nx, ny))
                    return { x: nx, y: ny };
            }
        }
        return { x: px, y: py };
    }
    grantXp(player, amount) {
        player.xp += amount;
        let next = (0, math_1.xpRequired)(player.level);
        let levelsGained = 0;
        while (player.xp >= next) {
            player.xp -= next;
            player.level += 1;
            levelsGained += 1;
            next = (0, math_1.xpRequired)(player.level);
        }
        if (levelsGained > 0) {
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `Voce ganhou ${levelsGained * 5} ponto(s) de atributo.`
            });
        }
        this.recomputePlayerStats(player);
        this.persistPlayer(player);
        if (levelsGained > 0)
            this.sendStatsUpdated(player);
    }
    normalizeInventorySlots(items, equippedWeaponId = null) {
        const out = [];
        const used = new Set();
        for (const item of items) {
            const clone = { ...item };
            if (this.isStackableItem(clone)) {
                const max = this.getItemMaxStack(clone);
                const rawQty = Number(clone.quantity);
                clone.quantity = Number.isFinite(rawQty) ? (0, math_1.clamp)(Math.floor(rawQty), 1, max) : 1;
                clone.maxStack = max;
                clone.stackable = true;
            }
            else {
                clone.quantity = 1;
            }
            if (equippedWeaponId && clone.id === equippedWeaponId) {
                clone.slotIndex = -1;
                out.push(clone);
                continue;
            }
            if (!Number.isInteger(clone.slotIndex) || clone.slotIndex < 0 || clone.slotIndex >= config_1.INVENTORY_SIZE || used.has(clone.slotIndex)) {
                clone.slotIndex = this.firstFreeInventorySlot(out);
            }
            if (clone.slotIndex === -1)
                continue;
            used.add(clone.slotIndex);
            out.push(clone);
        }
        return out;
    }
    getEquippedWeapon(player) {
        if (!player.equippedWeaponId)
            return null;
        return Array.isArray(player.inventory) ? player.inventory.find((item) => item.id === player.equippedWeaponId) || null : null;
    }
    recomputePlayerStats(player) {
        const allocated = this.normalizeAllocatedStats(player.allocatedStats);
        const maxSpend = this.maxSpendablePointsByLevel(player.level);
        const boundedAllocated = this.enforceAllocationBudget(allocated, maxSpend);
        player.allocatedStats = boundedAllocated;
        const leveled = this.computeDerivedStats(player);
        const overrides = player.statusOverrides && typeof player.statusOverrides === 'object' ? player.statusOverrides : {};
        for (const [key, value] of Object.entries(overrides)) {
            if (typeof leveled[key] === 'number' && Number.isFinite(value)) {
                leveled[key] = value;
            }
        }
        const spent = this.getAllocatedCost(boundedAllocated);
        const maxUnspent = Math.max(0, maxSpend - spent);
        player.unspentPoints = maxUnspent;
        const weapon = this.getEquippedWeapon(player);
        if (weapon && weapon.bonuses) {
            player.stats = {
                ...leveled,
                physicalAttack: Number(leveled.physicalAttack || 0) + Number(weapon.bonuses.physicalAttack || 0),
                magicAttack: Number(leveled.magicAttack || 0) + Number(weapon.bonuses.magicAttack || 0),
                moveSpeed: Number(leveled.moveSpeed || 0) + Number(weapon.bonuses.moveSpeed || 0),
                attackSpeed: Number(leveled.attackSpeed || 0) + Number(weapon.bonuses.attackSpeed || 0)
            };
        }
        else {
            player.stats = leveled;
        }
        player.maxHp = Number(leveled.maxHp || player.maxHp || 100);
        player.hp = (0, math_1.clamp)(Number(player.hp || player.maxHp), 0, player.maxHp);
    }
    sendInventoryState(player) {
        this.sendRaw(player.ws, {
            type: 'inventory_state',
            inventory: [...player.inventory].sort((a, b) => Number(a.slotIndex) - Number(b.slotIndex)),
            equippedWeaponId: player.equippedWeaponId
        });
    }
    computeLootDropPosition(originX, originY, dropIndex, dropTotal, mapKey) {
        const center = this.projectToWalkable(mapKey, (0, math_1.clamp)(Number(originX || 0), 0, config_1.WORLD.width), (0, math_1.clamp)(Number(originY || 0), 0, config_1.WORLD.height));
        if (dropTotal <= 1 || dropIndex <= 0)
            return center;
        const ringIndex = Math.ceil(Math.sqrt(dropIndex));
        const radius = Math.min(64, Math.max(32, ringIndex * 32));
        const slotInRing = dropIndex - ((ringIndex - 1) * (ringIndex - 1));
        const ringSlots = ringIndex * 4;
        const angle = (Math.PI * 2 * (slotInRing - 1)) / Math.max(1, ringSlots);
        const tx = center.x + Math.cos(angle) * radius;
        const ty = center.y + Math.sin(angle) * radius;
        return this.projectToWalkable(mapKey, tx, ty);
    }
    pickRandomWeaponTemplate() {
        if (!Array.isArray(config_1.WEAPON_TEMPLATES) || config_1.WEAPON_TEMPLATES.length === 0)
            return config_1.WEAPON_TEMPLATE;
        const index = Math.floor(Math.random() * config_1.WEAPON_TEMPLATES.length);
        return config_1.WEAPON_TEMPLATES[index] || config_1.WEAPON_TEMPLATE;
    }
    dropWeaponAt(x, y, mapId, template = config_1.WEAPON_TEMPLATE) {
        this.groundItems.push({
            id: (0, crypto_1.randomUUID)(),
            templateId: String(template.id || template.type || 'weapon_teste'),
            type: String(template.type || 'weapon'),
            name: template.name,
            slot: template.slot,
            bonuses: { ...template.bonuses },
            x,
            y,
            mapId,
            expiresAt: Date.now() + config_1.GROUND_ITEM_TTL_MS
        });
    }
    dropHpPotionAt(x, y, mapId) {
        this.groundItems.push({
            id: (0, crypto_1.randomUUID)(),
            templateId: String(config_1.HP_POTION_TEMPLATE.id || config_1.HP_POTION_TEMPLATE.type || 'potion_hp'),
            type: String(config_1.HP_POTION_TEMPLATE.type || 'potion_hp'),
            name: config_1.HP_POTION_TEMPLATE.name,
            slot: config_1.HP_POTION_TEMPLATE.slot,
            bonuses: {},
            quantity: 1,
            stackable: Boolean(config_1.HP_POTION_TEMPLATE.stackable ?? true),
            maxStack: Number(config_1.HP_POTION_TEMPLATE.maxStack || 64),
            healPercent: Number(config_1.HP_POTION_TEMPLATE.healPercent || 0.5),
            x,
            y,
            mapId,
            expiresAt: Date.now() + config_1.GROUND_ITEM_TTL_MS
        });
    }
    dropSkillResetHourglassAt(x, y, mapId) {
        this.groundItems.push({
            id: (0, crypto_1.randomUUID)(),
            templateId: String(config_1.SKILL_RESET_HOURGLASS_TEMPLATE.id || config_1.SKILL_RESET_HOURGLASS_TEMPLATE.type || 'skill_reset_hourglass'),
            type: config_1.SKILL_RESET_HOURGLASS_TEMPLATE.type,
            name: config_1.SKILL_RESET_HOURGLASS_TEMPLATE.name,
            slot: config_1.SKILL_RESET_HOURGLASS_TEMPLATE.slot,
            bonuses: {},
            quantity: 1,
            stackable: Boolean(config_1.SKILL_RESET_HOURGLASS_TEMPLATE.stackable),
            maxStack: Number(config_1.SKILL_RESET_HOURGLASS_TEMPLATE.maxStack || 64),
            x,
            y,
            mapId,
            expiresAt: Date.now() + config_1.GROUND_ITEM_TTL_MS
        });
    }
    isStackableItem(item) {
        if (!item || typeof item !== 'object')
            return false;
        if (item.stackable === true)
            return true;
        return String(item.type || '') === 'potion_hp';
    }
    getItemMaxStack(item) {
        const parsed = Number(item?.maxStack);
        if (Number.isFinite(parsed) && parsed > 1)
            return Math.floor(parsed);
        return 64;
    }
    canItemsStack(a, b) {
        if (!this.isStackableItem(a) || !this.isStackableItem(b))
            return false;
        return String(a.type || '') === String(b.type || '')
            && String(a.name || '') === String(b.name || '')
            && String(a.slot || '') === String(b.slot || '');
    }
    addItemToInventory(player, item, quantity) {
        let remaining = Math.max(0, Math.floor(Number(quantity || 0)));
        if (remaining <= 0)
            return 0;
        if (!this.isStackableItem(item)) {
            while (remaining > 0) {
                const freeSlot = this.firstFreeInventorySlot(player.inventory);
                if (freeSlot === -1)
                    break;
                player.inventory.push({ ...item, id: (0, crypto_1.randomUUID)(), quantity: 1, slotIndex: freeSlot });
                remaining -= 1;
            }
            return remaining;
        }
        const max = this.getItemMaxStack(item);
        for (const existing of player.inventory) {
            if (remaining <= 0)
                break;
            if (!this.canItemsStack(existing, item))
                continue;
            const current = Math.max(1, Math.floor(Number(existing.quantity || 1)));
            if (current >= max)
                continue;
            const add = Math.min(max - current, remaining);
            existing.quantity = current + add;
            existing.maxStack = max;
            existing.stackable = true;
            remaining -= add;
        }
        while (remaining > 0) {
            const freeSlot = this.firstFreeInventorySlot(player.inventory);
            if (freeSlot === -1)
                break;
            const add = Math.min(max, remaining);
            player.inventory.push({
                ...item,
                id: (0, crypto_1.randomUUID)(),
                quantity: add,
                stackable: true,
                maxStack: max,
                slotIndex: freeSlot
            });
            remaining -= add;
        }
        return remaining;
    }
    pruneExpiredGroundItems(now) {
        this.groundItems = this.groundItems.filter((item) => {
            if (typeof item.expiresAt !== 'number')
                return true;
            return item.expiresAt > now;
        });
    }
    getAreaIdForPlayer(player) {
        return this.mapInstanceId(player.mapKey, player.mapId);
    }
    sendPartyError(player, message) {
        this.sendRaw(player.ws, { type: 'party.error', message });
    }
    buildPartySnapshot(party) {
        const members = party.memberIds
            .map((id) => this.players.get(id))
            .filter((p) => Boolean(p))
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
    sendPartyStateToPlayer(player, party) {
        this.sendRaw(player.ws, {
            type: 'party.state',
            party: party ? this.buildPartySnapshot(party) : null
        });
    }
    syncPartyStateForMembers(party, includeAreaList = false) {
        party.areaId = this.players.get(party.leaderId) ? this.getAreaIdForPlayer(this.players.get(party.leaderId)) : party.areaId;
        for (const memberId of party.memberIds) {
            const member = this.players.get(memberId);
            if (!member)
                continue;
            member.partyId = party.id;
            this.sendPartyStateToPlayer(member, party);
            if (includeAreaList)
                this.sendPartyAreaList(member);
        }
    }
    syncAllPartyStates() {
        for (const party of this.parties.values()) {
            this.syncPartyStateForMembers(party);
        }
    }
    sendPartyAreaList(player) {
        const areaId = this.getAreaIdForPlayer(player);
        const parties = [...this.parties.values()]
            .filter((party) => party.areaId === areaId)
            .map((party) => {
            const leader = this.players.get(party.leaderId);
            const levels = party.memberIds
                .map((id) => this.players.get(id))
                .filter((p) => Boolean(p))
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
    pruneExpiredPartyInvites(now) {
        for (const [inviteId, invite] of this.partyInvites.entries()) {
            if (invite.expiresAt > now)
                continue;
            this.partyInvites.delete(inviteId);
        }
    }
    pruneExpiredPartyJoinRequests(now) {
        for (const [requestId, request] of this.partyJoinRequests.entries()) {
            if (request.expiresAt > now)
                continue;
            this.partyJoinRequests.delete(requestId);
        }
    }
    clearPendingInvitesForPlayer(playerId) {
        for (const [inviteId, invite] of this.partyInvites.entries()) {
            if (invite.fromPlayerId === playerId || invite.toPlayerId === playerId) {
                this.partyInvites.delete(inviteId);
            }
        }
    }
    clearJoinRequestsForPlayer(playerId) {
        for (const [requestId, request] of this.partyJoinRequests.entries()) {
            if (request.fromPlayerId === playerId || request.toLeaderId === playerId) {
                this.partyJoinRequests.delete(requestId);
            }
        }
    }
    clearJoinRequestsForParty(partyId) {
        for (const [requestId, request] of this.partyJoinRequests.entries()) {
            if (request.partyId === partyId)
                this.partyJoinRequests.delete(requestId);
        }
    }
    sendFriendError(player, message) {
        this.sendRaw(player.ws, { type: 'friend.error', message });
    }
    getFriendSet(playerId) {
        if (!this.friendLinks.has(playerId))
            this.friendLinks.set(playerId, new Set());
        return this.friendLinks.get(playerId);
    }
    areFriends(a, b) {
        return this.getFriendSet(a).has(b) && this.getFriendSet(b).has(a);
    }
    linkFriends(a, b) {
        this.getFriendSet(a).add(b);
        this.getFriendSet(b).add(a);
    }
    unlinkFriends(a, b) {
        this.getFriendSet(a).delete(b);
        this.getFriendSet(b).delete(a);
    }
    consumeFriendRequestRate(playerId) {
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
    pruneExpiredFriendRequests(now) {
        for (const [requestId, request] of this.friendRequests.entries()) {
            if (request.expiresAt > now)
                continue;
            this.friendRequests.delete(requestId);
            const from = this.players.get(request.fromPlayerId);
            const to = this.players.get(request.toPlayerId);
            if (from)
                this.sendFriendState(from);
            if (to)
                this.sendFriendState(to);
        }
        if (now - this.lastFriendDbPruneAt >= 10000) {
            this.lastFriendDbPruneAt = now;
            void this.persistence.pruneExpiredFriendRequests(new Date(now));
        }
    }
    clearFriendRequestsForPlayer(playerId) {
        for (const [requestId, request] of this.friendRequests.entries()) {
            if (request.fromPlayerId === playerId || request.toPlayerId === playerId) {
                this.friendRequests.delete(requestId);
            }
        }
        this.friendRequestWindow.delete(playerId);
        void this.persistence.clearFriendRequestsForPlayer(playerId);
    }
    findOnlinePlayerByName(rawName) {
        const needle = String(rawName || '').trim().toLowerCase();
        if (!needle)
            return null;
        return [...this.players.values()].find((candidate) => {
            const byName = String(candidate.name || '').toLowerCase() === needle;
            const byUsername = String(candidate.username || '').toLowerCase() === needle;
            return byName || byUsername;
        }) || null;
    }
    sendFriendState(player) {
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
    async hydrateFriendStateForPlayer(player) {
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
    removePlayerFromParty(player) {
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
    normalizeClassId(rawClass) {
        const key = String(rawClass || '').toLowerCase();
        if (key === 'shifter')
            return 'druid';
        if (key === 'bandit')
            return 'assassin';
        if (key === 'cavaleiro')
            return 'knight';
        if (key === 'arqueiro')
            return 'archer';
        if (key === 'druida')
            return 'druid';
        if (key === 'assassino')
            return 'assassin';
        if (config_1.CLASS_TEMPLATES[key])
            return key;
        return 'knight';
    }
    buildClassBaseStats(classId, baseFromProfile) {
        const hasPrimary = Boolean(baseFromProfile
            && typeof baseFromProfile === 'object'
            && ['str', 'int', 'dex', 'vit'].every((k) => Number.isFinite(Number(baseFromProfile[k]))));
        const source = hasPrimary
            ? baseFromProfile
            : config_1.CLASS_TEMPLATES[this.normalizeClassId(classId)] || config_1.CLASS_TEMPLATES.knight;
        return {
            str: Number.isFinite(Number(source.str)) ? Number(source.str) : 8,
            int: Number.isFinite(Number(source.int)) ? Number(source.int) : 8,
            dex: Number.isFinite(Number(source.dex)) ? Number(source.dex) : 8,
            vit: Number.isFinite(Number(source.vit)) ? Number(source.vit) : 8,
            initialHp: Number.isFinite(Number(source.initialHp)) ? Number(source.initialHp) : 120,
            moveSpeed: Number.isFinite(Number(source.moveSpeed)) ? Number(source.moveSpeed) : 100,
            attackSpeed: Number.isFinite(Number(source.attackSpeed)) ? Number(source.attackSpeed) : 100,
            attackRange: Number.isFinite(Number(source.attackRange)) ? Number(source.attackRange) : 60,
            damageType: String(source.damageType || 'physical') === 'magic' ? 'magic' : 'physical'
        };
    }
    primaryToLegacyKey(primary) {
        if (primary === 'str')
            return 'physicalAttack';
        if (primary === 'int')
            return 'magicAttack';
        if (primary === 'vit')
            return 'physicalDefense';
        return 'magicDefense';
    }
    maxSpendablePointsByLevel(level) {
        return Math.max(0, (Math.max(1, Number(level || 1)) - 1) * 5);
    }
    getAllocatedTotal(allocated) {
        return PRIMARY_STATS.reduce((sum, key) => sum + Number(allocated[key] || 0), 0);
    }
    getAllocatedCost(allocated) {
        let total = 0;
        for (const key of PRIMARY_STATS) {
            const amount = Math.max(0, Math.floor(Number(allocated[key] || 0)));
            for (let i = 0; i < amount; i++) {
                total += i >= SOFT_CAP_THRESHOLD ? SOFT_CAP_COST : BASE_POINT_COST;
            }
        }
        return total;
    }
    getAllocationCost(current, incoming) {
        let total = 0;
        for (const key of PRIMARY_STATS) {
            const start = Math.max(0, Math.floor(Number(current[key] || 0)));
            const add = Math.max(0, Math.floor(Number(incoming[key] || 0)));
            for (let i = 0; i < add; i++) {
                const idx = start + i;
                total += idx >= SOFT_CAP_THRESHOLD ? SOFT_CAP_COST : BASE_POINT_COST;
            }
        }
        return total;
    }
    enforceAllocationBudget(input, maxCost) {
        const next = { ...input };
        if (this.getAllocatedCost(next) <= maxCost)
            return next;
        const downOrder = ['dex', 'int', 'str', 'vit'];
        while (this.getAllocatedCost(next) > maxCost) {
            let reduced = false;
            for (const key of downOrder) {
                if (next[key] <= 0)
                    continue;
                next[key] -= 1;
                reduced = true;
                if (this.getAllocatedCost(next) <= maxCost)
                    break;
            }
            if (!reduced)
                break;
        }
        return next;
    }
    computeDerivedStats(player) {
        const classId = this.normalizeClassId(player.class);
        const base = this.buildClassBaseStats(classId, player.baseStats);
        player.class = classId;
        player.baseStats = base;
        const allocated = this.normalizeAllocatedStats(player.allocatedStats);
        const str = Number(base.str || 0) + Number(allocated.str || 0);
        const int = Number(base.int || 0) + Number(allocated.int || 0);
        const dex = Number(base.dex || 0) + Number(allocated.dex || 0);
        const vit = Number(base.vit || 0) + Number(allocated.vit || 0);
        const level = Math.max(1, Number(player.level || 1));
        const maxHp = Number(base.initialHp || 100) + Math.max(0, (vit - Number(base.vit || 0))) * 15 + (level - 1) * 5;
        const physicalAttack = str * 2;
        const magicAttack = int * 3;
        const physicalDefense = str * 0.5 + vit * 1.2;
        const magicDefense = int * 0.8 + vit * 0.5;
        const accuracy = dex * 1.5;
        const evasion = dex * 0.8;
        const criticalChance = Math.max(0, dex * 0.0002);
        const luck = level / 2 + dex / 10;
        return {
            str,
            int,
            dex,
            vit,
            physicalAttack,
            magicAttack,
            physicalDefense,
            magicDefense,
            accuracy,
            evasion,
            criticalChance,
            luck,
            moveSpeed: Number(base.moveSpeed || 100),
            attackSpeed: Number(base.attackSpeed || 100),
            attackRange: Number(base.attackRange || 60),
            damageType: String(base.damageType || 'physical') === 'magic' ? 'magic' : 'physical',
            maxHp
        };
    }
    computeDamageReduction(defense, level) {
        const safeDefense = Math.max(0, Number(defense || 0));
        const safeLevel = Math.max(1, Number(level || 1));
        const k = 400 + safeLevel * 50;
        return safeDefense / (safeDefense + k);
    }
    computeDamageAfterMitigation(rawDamage, defense, targetLevel) {
        const safeRaw = Math.max(1, Number(rawDamage || 1));
        const reduction = this.computeDamageReduction(defense, targetLevel);
        return Math.max(1, Math.floor(safeRaw * (1 - reduction)));
    }
    computeHitChance(attackerAccuracy, defenderEvasion) {
        const acc = Math.max(1, Number(attackerAccuracy || 1));
        const eva = Math.max(0, Number(defenderEvasion || 0));
        const base = 0.85 + ((acc - eva) / (acc + eva));
        return (0, math_1.clamp)(base, 0.05, 0.98);
    }
    getEntityLuck(entity) {
        if (!entity)
            return 0;
        const level = Math.max(1, Number(entity.level || 1));
        if (entity.stats && typeof entity.stats === 'object')
            return Number(entity.stats.luck || 0);
        const dex = Math.max(0, Number(entity.dex || 0));
        return level / 2 + dex / 10;
    }
    shouldLuckyStrike(attacker, defender) {
        const atkLuck = this.getEntityLuck(attacker);
        const defLuck = this.getEntityLuck(defender);
        if (atkLuck < defLuck * 2)
            return false;
        return Math.random() < LUCKY_STRIKE_CHANCE;
    }
    getMobAccuracy(mob) {
        const base = mob?.kind === 'boss' ? 90 : mob?.kind === 'subboss' ? 80 : mob?.kind === 'elite' ? 70 : 60;
        return base;
    }
    getMobEvasion(mob) {
        return mob?.kind === 'boss' ? 16 : mob?.kind === 'subboss' ? 11 : mob?.kind === 'elite' ? 8 : 5;
    }
    persistPlayer(player) {
        if (!player.statusOverrides || typeof player.statusOverrides !== 'object')
            player.statusOverrides = {};
        player.statusOverrides.__skillLevels = this.normalizeSkillLevels(player.skillLevels || {});
        void this.persistence.savePlayer(player).catch((error) => {
            (0, logger_1.logEvent)('ERROR', 'save_player_error', { playerId: player.id, error: String(error) });
        });
    }
    normalizeAllocatedStats(input) {
        const source = input && typeof input === 'object' ? input : {};
        const toInt = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
        const str = toInt(source.str ?? source.for ?? source.physicalAttack);
        const int = toInt(source.int ?? source.magicAttack);
        const dex = toInt(source.dex ?? source.des ?? source.magicDefense);
        const vit = toInt(source.vit ?? source.physicalDefense);
        return {
            str,
            int,
            dex,
            vit
        };
    }
    normalizeSkillLevels(input) {
        const src = input && typeof input === 'object' ? input : {};
        const out = {};
        for (const [skillId, raw] of Object.entries(src)) {
            if (!SKILL_DEFS[String(skillId)])
                continue;
            const lvl = Math.max(0, Math.min(5, Math.floor(Number(raw || 0))));
            if (lvl > 0)
                out[String(skillId)] = lvl;
        }
        return out;
    }
    getSpentSkillPoints(player) {
        const levels = this.normalizeSkillLevels(player.skillLevels || {});
        return Object.values(levels).reduce((sum, lvl) => sum + Math.max(0, Number(lvl || 0)), 0);
    }
    getAvailableSkillPoints(player) {
        const level = Math.max(1, Math.floor(Number(player.level || 1)));
        const earned = Math.max(0, level - 1);
        const spent = this.getSpentSkillPoints(player);
        return Math.max(0, earned - spent);
    }
    getSkillLevel(player, skillId) {
        const levels = this.normalizeSkillLevels(player.skillLevels || {});
        return Math.max(0, Math.min(5, Number(levels[skillId] || 0)));
    }
    getSkillPrerequisite(skillId) {
        for (const chain of Object.values(SKILL_CHAINS)) {
            const idx = chain.indexOf(skillId);
            if (idx <= 0)
                continue;
            return chain[idx - 1];
        }
        return null;
    }
    getSkillPowerWithLevel(skill, level) {
        const safeLevel = Math.max(1, Math.min(5, Number(level || 1)));
        const base = Number(skill.power || 1);
        return base * (1 + (safeLevel - 1) * 0.22);
    }
    sendStatsUpdated(player) {
        this.sendRaw(player.ws, {
            type: 'player.statsUpdated',
            stats: player.stats,
            allocatedStats: this.normalizeAllocatedStats(player.allocatedStats),
            skillLevels: this.normalizeSkillLevels(player.skillLevels || {}),
            skillPointsAvailable: this.getAvailableSkillPoints(player),
            unspentPoints: Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0,
            level: player.level,
            xp: player.xp,
            xpToNext: (0, math_1.xpRequired)(player.level),
            hp: player.hp,
            maxHp: player.maxHp
        });
    }
    sendRaw(ws, payload) {
        try {
            ws?.send(JSON.stringify(payload));
        }
        catch {
            // Ignore socket send failures; cleanup happens on disconnect.
        }
    }
    broadcastRaw(payload) {
        for (const player of this.players.values()) {
            this.sendRaw(player.ws, payload);
        }
    }
}
exports.GameController = GameController;
//# sourceMappingURL=GameController.js.map