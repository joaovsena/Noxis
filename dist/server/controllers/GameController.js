"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const crypto_1 = require("crypto");
const ChatService_1 = require("../services/ChatService");
const PartyService_1 = require("../services/PartyService");
const FriendService_1 = require("../services/FriendService");
const MapService_1 = require("../services/MapService");
const MovementService_1 = require("../services/MovementService");
const CombatService_1 = require("../services/CombatService");
const InventoryService_1 = require("../services/InventoryService");
const SkillEffectsService_1 = require("../services/SkillEffectsService");
const SkillService_1 = require("../services/SkillService");
const CombatRuntimeService_1 = require("../services/CombatRuntimeService");
const CombatCoreService_1 = require("../services/CombatCoreService");
const hash_1 = require("../utils/hash");
const math_1 = require("../utils/math");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
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
        this.lastPartySyncAt = 0;
        this.mobsPeacefulMode = false;
        this.persistence = persistence;
        this.mobService = mobService;
        this.mapService = new MapService_1.MapService();
        this.chatService = new ChatService_1.ChatService(this.players, this.sendRaw.bind(this), this.broadcastRaw.bind(this));
        this.partyService = new PartyService_1.PartyService(this.players, this.sendRaw.bind(this), this.broadcastRaw.bind(this), this.persistPlayer.bind(this), this.getAreaIdForPlayer.bind(this));
        this.friendService = new FriendService_1.FriendService(this.players, this.persistence, this.sendRaw.bind(this));
        this.movementService = new MovementService_1.MovementService(this.mapService, this.getActiveSkillEffectAggregate.bind(this));
        this.combatService = new CombatService_1.CombatService(this.players, this.mapInstanceId.bind(this), this.sendRaw.bind(this), this.partyService.hasParty.bind(this.partyService), this.partyService.arePlayersInSameParty.bind(this.partyService), this.tryPlayerAttack.bind(this));
        this.inventoryService = new InventoryService_1.InventoryService(() => this.groundItems, (items) => { this.groundItems = items; }, this.mapInstanceId.bind(this), this.persistPlayer.bind(this), this.recomputePlayerStats.bind(this), this.sendInventoryState.bind(this), this.sendStatsUpdated.bind(this), this.normalizeHotbarBindings.bind(this), this.firstFreeInventorySlot.bind(this), this.getSpentSkillPoints.bind(this), this.sendRaw.bind(this));
        this.skillEffectsService = new SkillEffectsService_1.SkillEffectsService(this.players, this.sendRaw.bind(this));
        this.skillService = new SkillService_1.SkillService(SKILL_DEFS, this.sendRaw.bind(this), this.normalizeClassId.bind(this), this.getSkillLevel.bind(this), this.pruneExpiredSkillEffects.bind(this), this.applyTimedSkillEffect.bind(this), this.sendSkillEffect.bind(this), this.computeMobDamage.bind(this), this.applyDamageToMobAndHandleDeath.bind(this), this.broadcastMobHit.bind(this), this.applyOnHitSkillEffects.bind(this), this.hasActiveSkillEffect.bind(this), this.removeSkillEffectById.bind(this), this.getSkillPowerWithLevel.bind(this), this.sendStatsUpdated.bind(this), this.mapInstanceId.bind(this), () => this.mobService.getMobs(), (mapId) => this.mobService.getMobsByMap(mapId), this.assignPathTo.bind(this), this.getSkillPrerequisite.bind(this), this.normalizeSkillLevels.bind(this), this.getAvailableSkillPoints.bind(this), this.recomputePlayerStats.bind(this), this.persistPlayer.bind(this));
        this.combatRuntimeService = new CombatRuntimeService_1.CombatRuntimeService(this.players, this.mobService, () => this.mobsPeacefulMode, this.mapInstanceId.bind(this), this.projectToWalkable.bind(this), this.recalculatePathToward.bind(this), this.getActiveSkillEffectAggregate.bind(this), this.computeHitChance.bind(this), this.getMobEvasion.bind(this), this.computeMobDamage.bind(this), this.applyDamageToMobAndHandleDeath.bind(this), this.applyOnHitSkillEffects.bind(this), this.sendStatsUpdated.bind(this), this.broadcastMobHit.bind(this), this.sendRaw.bind(this), this.persistPlayer.bind(this), this.syncAllPartyStates.bind(this), this.tryPlayerAttack.bind(this), this.getPvpAttackPermission.bind(this), this.isBlockedAt.bind(this), this.computeDamageAfterMitigation.bind(this));
        this.combatCoreService = new CombatCoreService_1.CombatCoreService(this.players, this.mobService, this.getPvpAttackPermission.bind(this), this.sendRaw.bind(this), this.getActiveSkillEffectAggregate.bind(this), this.computeHitChance.bind(this), this.shouldLuckyStrike.bind(this), this.computeDamageAfterMitigation.bind(this), this.applyOnHitSkillEffects.bind(this), this.sendStatsUpdated.bind(this), this.persistPlayer.bind(this), this.syncAllPartyStates.bind(this), this.grantXp.bind(this), this.mapInstanceId.bind(this), this.computeLootDropPosition.bind(this), this.pickRandomWeaponTemplate.bind(this), this.dropWeaponAt.bind(this), this.dropHpPotionAt.bind(this), this.dropSkillResetHourglassAt.bind(this));
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
    async handleCharacterBack(ws) {
        try {
            const playerId = Number(ws?.playerId || 0);
            const hasActiveRuntime = Number.isInteger(playerId) && playerId > 0 && this.players.has(playerId);
            const activePlayer = hasActiveRuntime ? this.players.get(playerId) : null;
            const authUserId = String(ws.authUserId || activePlayer?.userId || '').trim();
            if (!authUserId) {
                this.sendRaw(ws, { type: 'auth_error', message: 'Sessao invalida para troca de personagem.' });
                return;
            }
            if (hasActiveRuntime)
                await this.handleDisconnect(playerId);
            ws.playerId = undefined;
            ws.authUserId = authUserId;
            const account = await this.persistence.getUserById(authUserId);
            const characters = Array.isArray(account?.players)
                ? account.players
                : [];
            ws.pendingPlayerProfiles = characters;
            ws.authRole = characters.some((ch) => ch?.role === 'adm') ? 'adm' : 'player';
            if (!characters.length) {
                ws.send(JSON.stringify({ type: 'auth_character_required', message: 'Crie um personagem para continuar.' }));
                return;
            }
            this.sendCharacterSelection(ws, characters);
        }
        catch (error) {
            this.sendRaw(ws, { type: 'auth_error', message: 'Nao foi possivel voltar para a selecao.' });
            (0, logger_1.logEvent)('ERROR', 'character_back_error', { error: String(error), userId: ws?.authUserId || null });
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
            rawMovePath: [],
            nextPathfindAt: 0,
            pathDestinationX: spawn.x,
            pathDestinationY: spawn.y,
            lastMoveCheckX: spawn.x,
            lastMoveCheckY: spawn.y,
            lastMoveProgressAt: Date.now(),
            pendingSkillCast: null
        };
        this.recomputePlayerStats(runtime);
        return runtime;
    }
    handleMove(player, msg) {
        player.pendingSkillCast = null;
        this.movementService.handleMove(player, msg);
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
            player.rawMovePath = [];
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
        this.chatService.handleChat(player, msg);
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
        player.rawMovePath = [];
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        player.attackTargetId = null;
        player.autoAttackActive = false;
        player.ws.send(JSON.stringify({ type: 'system_message', text: `Instancia alterada para ${target}.` }));
        this.sendPartyAreaList(player);
    }
    handlePickupItem(player, msg) {
        this.inventoryService.handlePickupItem(player, msg);
    }
    handleHotbarSet(player, msg) {
        this.inventoryService.handleHotbarSet(player, msg);
    }
    handleEquipItem(player, msg) {
        this.inventoryService.handleEquipItem(player, msg);
    }
    handleInventoryMove(player, msg) {
        this.inventoryService.handleInventoryMove(player, msg);
    }
    handleInventorySort(player) {
        this.inventoryService.handleInventorySort(player);
    }
    handleInventoryDelete(player, msg) {
        this.inventoryService.handleInventoryDelete(player, msg);
    }
    handleInventoryUnequipToSlot(player, msg) {
        this.inventoryService.handleInventoryUnequipToSlot(player, msg);
    }
    handleItemUse(player, msg) {
        this.inventoryService.handleItemUse(player, msg);
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
            target.rawMovePath = [];
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
            player.rawMovePath = [];
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
            target.rawMovePath = [];
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
        this.partyService.handlePartyCreate(player);
    }
    handlePartyInvite(player, msg) {
        this.partyService.handlePartyInvite(player, msg);
    }
    handlePartyAcceptInvite(player, msg) {
        this.partyService.handlePartyAcceptInvite(player, msg);
    }
    handlePartyDeclineInvite(player, msg) {
        this.partyService.handlePartyDeclineInvite(player, msg);
    }
    handlePartyLeave(player) {
        this.partyService.handlePartyLeave(player);
    }
    handlePartyKick(player, msg) {
        this.partyService.handlePartyKick(player, msg);
    }
    handlePartyPromote(player, msg) {
        this.partyService.handlePartyPromote(player, msg);
    }
    handlePartyRequestAreaParties(player) {
        this.partyService.handlePartyRequestAreaParties(player);
    }
    handlePartyRequestJoin(player, msg) {
        this.partyService.handlePartyRequestJoin(player, msg);
    }
    handlePartyApproveJoin(player, msg) {
        this.partyService.handlePartyApproveJoin(player, msg);
    }
    handlePartyWaypointPing(player, msg) {
        this.partyService.handlePartyWaypointPing(player, msg);
    }
    async handleFriendRequest(player, msg) {
        await this.friendService.handleFriendRequest(player, msg);
    }
    async handleFriendAccept(player, msg) {
        await this.friendService.handleFriendAccept(player, msg);
    }
    async handleFriendDecline(player, msg) {
        await this.friendService.handleFriendDecline(player, msg);
    }
    async handleFriendRemove(player, msg) {
        await this.friendService.handleFriendRemove(player, msg);
    }
    handleFriendList(player) {
        this.friendService.handleFriendList(player);
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
        if (mode === 'group' && !this.partyService.hasParty(player.partyId)) {
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
        this.combatService.handleCombatTargetPlayer(player, msg);
    }
    handleCombatClearTarget(player) {
        this.combatService.handleCombatClearTarget(player);
    }
    handleCombatAttack(player, msg) {
        this.combatService.handleCombatAttack(player, msg);
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
        player.rawMovePath = [];
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
        this.skillService.handleSkillCast(player, msg);
    }
    handleSkillLearn(player, msg) {
        this.skillService.handleSkillLearn(player, msg);
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
            this.skillService.processPendingSkillCast(player, now);
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
        const hasTiledCollision = Boolean(this.getMapTiledCollisionSampler(mapKey));
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
            mapFeatures: hasTiledCollision ? [] : (config_1.MAP_FEATURES_BY_KEY[mapKey] || []),
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
        this.movementService.movePlayerTowardTarget(player, deltaSeconds, now);
    }
    processAutoAttack(player, now) {
        this.combatRuntimeService.processAutoAttack(player, now);
    }
    computeMobDamage(player, mob, multiplier, forceMagic = false, now = Date.now()) {
        return this.combatCoreService.computeMobDamage(player, mob, multiplier, forceMagic, now);
    }
    applyDamageToMobAndHandleDeath(player, mob, damage, now) {
        return this.combatCoreService.applyDamageToMobAndHandleDeath(player, mob, damage, now);
    }
    pruneExpiredSkillEffects(player, now = Date.now()) {
        this.skillEffectsService.pruneExpiredSkillEffects(player, now);
    }
    hasActiveSkillEffect(player, effectId, now = Date.now()) {
        return this.skillEffectsService.hasActiveSkillEffect(player, effectId, now);
    }
    removeSkillEffectById(player, effectId) {
        this.skillEffectsService.removeSkillEffectById(player, effectId);
    }
    getActiveSkillEffectAggregate(player, now = Date.now()) {
        return this.skillEffectsService.getActiveSkillEffectAggregate(player, now);
    }
    applyTimedSkillEffect(player, buff, now = Date.now()) {
        this.skillEffectsService.applyTimedSkillEffect(player, buff, now);
    }
    applyOnHitSkillEffects(player, dealtDamage, now = Date.now()) {
        return this.skillEffectsService.applyOnHitSkillEffects(player, dealtDamage, now);
    }
    sendSkillEffect(mapKey, mapId, payload) {
        this.skillEffectsService.sendSkillEffect(mapKey, mapId, payload);
    }
    broadcastMobHit(player, mob) {
        this.skillEffectsService.broadcastMobHit(player, mob);
    }
    processAutoAttackPlayer(player, now) {
        this.combatRuntimeService.processAutoAttackPlayer(player, now);
    }
    processMobAggroAndCombat(deltaSeconds, now) {
        this.combatRuntimeService.processMobAggroAndCombat(deltaSeconds, now);
    }
    tryPlayerAttack(player, targetPlayerId, now, silent) {
        this.combatCoreService.tryPlayerAttack(player, targetPlayerId, now, silent);
    }
    getPvpAttackPermission(player, target) {
        return this.combatService.getPvpAttackPermission(player, target);
    }
    assignPathTo(player, destinationX, destinationY) {
        this.movementService.assignPathTo(player, destinationX, destinationY);
    }
    recalculatePathToward(player, destinationX, destinationY, now) {
        this.movementService.recalculatePathToward(player, destinationX, destinationY, now);
    }
    processPortalCollision(player, now) {
        this.mapService.processPortalCollision(player, now, (movedPlayer) => this.sendPartyAreaList(movedPlayer));
    }
    mapInstanceId(mapKey, mapId) {
        return this.mapService.mapInstanceId(mapKey, mapId);
    }
    isBlockedAt(mapKey, x, y) {
        return this.mapService.isBlockedAt(mapKey, x, y);
    }
    getMapTiledCollisionSampler(mapKey) {
        return this.mapService.getMapTiledCollisionSampler(mapKey);
    }
    projectToWalkable(mapKey, x, y) {
        return this.mapService.projectToWalkable(mapKey, x, y);
    }
    grantXp(player, amount, context) {
        const totalXp = Math.max(0, Math.floor(Number(amount || 0)));
        if (totalXp <= 0)
            return;
        const mapKey = String(context?.mapKey || player.mapKey || '');
        const mapId = String(context?.mapId || player.mapId || '');
        const eligible = [...this.players.values()].filter((candidate) => String(candidate.partyId || '') !== ''
            && String(candidate.partyId || '') === String(player.partyId || '')
            && String(candidate.mapKey || '') === mapKey
            && String(candidate.mapId || '') === mapId);
        const targets = eligible.length > 0 ? eligible : [player];
        const share = Math.max(1, Math.floor(totalXp / targets.length));
        const remainder = Math.max(0, totalXp - (share * targets.length));
        targets.forEach((target, index) => {
            const gain = share + (index === 0 ? remainder : 0);
            target.xp += gain;
            let next = (0, math_1.xpRequired)(target.level);
            let levelsGained = 0;
            while (target.xp >= next) {
                target.xp -= next;
                target.level += 1;
                levelsGained += 1;
                next = (0, math_1.xpRequired)(target.level);
            }
            if (levelsGained > 0) {
                this.sendRaw(target.ws, {
                    type: 'system_message',
                    text: `Voce ganhou ${levelsGained * 5} ponto(s) de atributo.`
                });
            }
            this.recomputePlayerStats(target);
            this.persistPlayer(target);
            this.sendStatsUpdated(target);
        });
    }
    normalizeInventorySlots(items, equippedWeaponId = null) {
        return this.inventoryService.normalizeInventorySlots(items, equippedWeaponId);
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
    addItemToInventory(player, item, quantity) {
        return this.inventoryService.addItemToInventory(player, item, quantity);
    }
    pruneExpiredGroundItems(now) {
        this.groundItems = this.groundItems.filter((item) => {
            if (typeof item.expiresAt !== 'number')
                return true;
            return item.expiresAt > now;
        });
    }
    getAreaIdForPlayer(player) {
        return this.mapService.getAreaIdForPlayer(player);
    }
    sendPartyStateToPlayer(player, party) {
        this.partyService.sendPartyStateToPlayer(player, party);
    }
    syncAllPartyStates() {
        this.partyService.syncAllPartyStates();
    }
    sendPartyAreaList(player) {
        this.partyService.sendPartyAreaList(player);
    }
    pruneExpiredPartyInvites(now) {
        this.partyService.pruneExpiredPartyInvites(now);
    }
    pruneExpiredPartyJoinRequests(now) {
        this.partyService.pruneExpiredPartyJoinRequests(now);
    }
    clearPendingInvitesForPlayer(playerId) {
        this.partyService.clearPendingInvitesForPlayer(playerId);
    }
    clearJoinRequestsForPlayer(playerId) {
        this.partyService.clearJoinRequestsForPlayer(playerId);
    }
    clearJoinRequestsForParty(partyId) {
        this.partyService.clearJoinRequestsForParty(partyId);
    }
    pruneExpiredFriendRequests(now) {
        void this.friendService.pruneExpiredFriendRequests(now).catch((error) => {
            (0, logger_1.logEvent)('ERROR', 'friend_prune_error', { error: String(error) });
        });
    }
    clearFriendRequestsForPlayer(playerId) {
        this.friendService.clearFriendRequestsForPlayer(playerId);
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
        this.friendService.sendFriendState(player);
    }
    async hydrateFriendStateForPlayer(player) {
        await this.friendService.hydrateFriendStateForPlayer(player);
    }
    removePlayerFromParty(player) {
        this.partyService.removePlayerFromParty(player);
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