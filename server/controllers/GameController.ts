import { randomUUID } from 'crypto';
import { PersistenceService } from '../services/PersistenceService';
import { MobService } from '../services/MobService';
import { ChatService } from '../services/ChatService';
import { PartyService, Party } from '../services/PartyService';
import { FriendService } from '../services/FriendService';
import { MapService } from '../services/MapService';
import { MovementService } from '../services/MovementService';
import { CombatService } from '../services/CombatService';
import { InventoryService } from '../services/InventoryService';
import { SkillEffectsService } from '../services/SkillEffectsService';
import { SkillService } from '../services/SkillService';
import { CombatRuntimeService } from '../services/CombatRuntimeService';
import { CombatCoreService } from '../services/CombatCoreService';
import { QuestService } from '../services/QuestService';
import { EventService } from '../services/EventService';
import { DistributedLockService } from '../services/DistributedLockService';
import { DungeonService } from '../services/DungeonService';
import { PlayerRuntime, GroundItem, AuthMessage, MoveMessage } from '../models/types';
import { hashPassword } from '../utils/hash';
import { clamp, distance, xpRequired } from '../utils/math';
import { CURRENCY_LABELS, CurrencyName, formatWallet, normalizeWallet, parseCurrencyName, toCopperByCurrency, walletFromCopper, walletToCopper, Wallet } from '../utils/currency';
import { getMapMetadata } from '../maps/mapMetadata';
import {
    CLASS_TEMPLATES,
    WORLD,
    DEFAULT_MAP_ID,
    DEFAULT_MAP_KEY,
    MAP_IDS,
    MAP_KEYS,
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
    WEAPON_TEMPLATE,
    WEAPON_TEMPLATES,
    STATUS_BY_ID,
    GROUND_ITEM_TTL_MS,
    mapCodeFromKey,
    MAP_FEATURES_BY_KEY,
    HP_POTION_TEMPLATE,
    SKILL_RESET_HOURGLASS_TEMPLATE,
    BUILTIN_ITEM_TEMPLATE_BY_ID
} from '../config';
import { logEvent } from '../utils/logger';

interface AuthSocket {
    send: (payload: string) => void;
    playerId?: number;
    authUserId?: string;
    authUsername?: string;
    authRole?: string;
    pendingPlayerProfiles?: any[];
}

const PRIMARY_STATS = ['str', 'int', 'dex', 'vit'] as const;
type PrimaryStat = typeof PRIMARY_STATS[number];
const LEGACY_ALLOC_MAP: Record<string, PrimaryStat> = {
    physicalAttack: 'str',
    magicAttack: 'int',
    physicalDefense: 'vit',
    magicDefense: 'dex'
};
const SOFT_CAP_THRESHOLD = 150;
const SOFT_CAP_COST = 2;
const BASE_POINT_COST = 1;
const LUCKY_STRIKE_CHANCE = 0.15;
const AFK_THINK_MS = 260;
const AFK_VISION_RANGE = 900;
const AFK_RETURN_EPSILON = 10;
const parsedAutosaveMs = Number(process.env.AUTOSAVE_MS);
const AUTOSAVE_MS = Number.isFinite(parsedAutosaveMs)
    ? Math.max(10_000, Math.min(300_000, Math.floor(parsedAutosaveMs)))
    : 60_000;
const parsedPersistMaxRetries = Number(process.env.PERSIST_MAX_RETRIES);
const PERSIST_MAX_RETRIES = Number.isFinite(parsedPersistMaxRetries)
    ? Math.max(0, Math.min(8, Math.floor(parsedPersistMaxRetries)))
    : 3;
const parsedPersistRetryBaseMs = Number(process.env.PERSIST_RETRY_BASE_MS);
const PERSIST_RETRY_BASE_MS = Number.isFinite(parsedPersistRetryBaseMs)
    ? Math.max(25, Math.min(5_000, Math.floor(parsedPersistRetryBaseMs)))
    : 120;
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

type SkillDef = {
    id: string;
    classId: 'knight' | 'archer' | 'druid' | 'assassin';
    name: string;
    cooldownMs: number;
    target: 'mob' | 'self';
    range?: number;
    power?: number;
    magic?: boolean;
    aoeRadius?: number;
    hpCostPct?: number;
    lostHpScale?: number;
    healVitScale?: number;
    buff?: {
        id: string;
        durationMs: number;
        attackMul?: number;
        defenseMul?: number;
        magicDefenseMul?: number;
        moveMul?: number;
        attackSpeedMul?: number;
        critAdd?: number;
        evasionAdd?: number;
        damageReduction?: number;
        lifesteal?: number;
        reflect?: number;
        stealth?: boolean;
    };
    effectKey?: string;
};

const SKILL_DEFS: Record<string, SkillDef> = {
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

const SKILL_CHAINS: Record<string, string[]> = {
    war_bastion: ['war_bastion_escudo_fe', 'war_bastion_muralha', 'war_bastion_renovacao', 'war_bastion_inabalavel', 'war_bastion_impacto_sismico'],
    war_carrasco: ['war_carrasco_frenesi', 'war_carrasco_lacerar', 'war_carrasco_ira', 'war_carrasco_golpe_sacrificio', 'war_carrasco_aniquilacao'],
    arc_patrulheiro: ['arc_patrulheiro_tiro_ofuscante', 'arc_patrulheiro_foco_distante', 'arc_patrulheiro_abrolhos', 'arc_patrulheiro_salva_flechas', 'arc_patrulheiro_passo_vento'],
    arc_franco: ['arc_franco_flecha_debilitante', 'arc_franco_ponteira_envenenada', 'arc_franco_olho_aguia', 'arc_franco_disparo_perfurante', 'arc_franco_tiro_misericordia'],
    dru_preservador: ['dru_preservador_florescer', 'dru_preservador_casca_ferro', 'dru_preservador_emaranhado', 'dru_preservador_prece_natureza', 'dru_preservador_avatar_espiritual'],
    dru_primal: ['dru_primal_espinhos', 'dru_primal_enxame', 'dru_primal_patada_sombria', 'dru_primal_nevoa_obscura', 'dru_primal_invocacao_primal'],
    ass_agil: ['ass_agil_reflexos', 'ass_agil_contra_ataque', 'ass_agil_passo_fantasma', 'ass_agil_golpe_nervos', 'ass_agil_miragem'],
    ass_letal: ['ass_letal_expor_fraqueza', 'ass_letal_ocultar', 'ass_letal_emboscada', 'ass_letal_bomba_fumaca', 'ass_letal_sentenca']
};

export class GameController {
    private persistence: PersistenceService;
    private mobService: MobService;
    private chatService: ChatService;
    private partyService: PartyService;
    private friendService: FriendService;
    private mapService: MapService;
    private movementService: MovementService;
    private combatService: CombatService;
    private inventoryService: InventoryService;
    private skillEffectsService: SkillEffectsService;
    private skillService: SkillService;
    private combatRuntimeService: CombatRuntimeService;
    private combatCoreService: CombatCoreService;
    private questService: QuestService;
    private eventService: EventService;
    private lockService: DistributedLockService;
    private dungeonService: DungeonService;
    players: Map<number, PlayerRuntime> = new Map();
    usernameToPlayerId: Map<string, number> = new Map();
    groundItems: GroundItem[] = [];
    private lastPartySyncAt = 0;
    private lastAutosaveAt = 0;
    private mobsPeacefulMode = false;
    private dirtyPlayerIds: Set<number> = new Set();
    private persistInFlightByPlayerId: Set<number> = new Set();
    private persistRevisionByPlayerId: Map<number, number> = new Map();
    private lastPersistSignatureByPlayerId: Map<number, string> = new Map();
    private autosaveInFlight = false;
    private persistStats = {
        enqueued: 0,
        saved: 0,
        skipped: 0,
        failed: 0,
        retried: 0
    };

    constructor(persistence: PersistenceService, mobService: MobService, lockService: DistributedLockService) {
        this.persistence = persistence;
        this.mobService = mobService;
        this.lockService = lockService;
        this.mapService = new MapService();
        this.chatService = new ChatService(this.players, this.sendRaw.bind(this), this.broadcastRaw.bind(this));
        this.partyService = new PartyService(
            this.players,
            this.sendRaw.bind(this),
            this.broadcastRaw.bind(this),
            this.persistPlayer.bind(this),
            this.getAreaIdForPlayer.bind(this)
        );
        this.friendService = new FriendService(this.players, this.persistence, this.sendRaw.bind(this));
        this.movementService = new MovementService(this.mapService, this.getActiveSkillEffectAggregate.bind(this));
        this.combatService = new CombatService(
            this.players,
            this.mapInstanceId.bind(this),
            this.sendRaw.bind(this),
            this.partyService.hasParty.bind(this.partyService),
            this.partyService.arePlayersInSameParty.bind(this.partyService),
            this.tryPlayerAttack.bind(this)
        );
        this.inventoryService = new InventoryService(
            () => this.groundItems,
            (items) => { this.groundItems = items; },
            this.mapInstanceId.bind(this),
            this.persistPlayer.bind(this),
            this.recomputePlayerStats.bind(this),
            this.sendInventoryState.bind(this),
            this.sendStatsUpdated.bind(this),
            this.normalizeHotbarBindings.bind(this),
            this.firstFreeInventorySlot.bind(this),
            this.getSpentSkillPoints.bind(this),
            this.sendRaw.bind(this),
            this.normalizeClassId.bind(this),
            this.onItemCollected.bind(this)
        );
        this.questService = new QuestService(
            this.sendRaw.bind(this),
            this.persistPlayer.bind(this),
            this.persistPlayerCritical.bind(this),
            this.grantXp.bind(this),
            this.grantRewardItem.bind(this),
            this.grantCurrency.bind(this),
            (player, npcId) => this.dungeonService?.getNpcUiStateForPlayer(player, npcId) || null
        );
        this.eventService = new EventService(
            this.mobService,
            this.broadcastMapInstance.bind(this),
            this.projectToWalkable.bind(this)
        );
        this.dungeonService = new DungeonService(
            this.players,
            this.mobService,
            this.sendRaw.bind(this),
            this.sendStatsUpdated.bind(this),
            this.persistPlayer.bind(this),
            this.persistPlayerCritical.bind(this),
            this.grantCurrency.bind(this),
            this.projectToWalkable.bind(this),
            this.removeGroundItemsByMapInstance.bind(this),
            this.dropTemplateAt.bind(this)
        );
        this.skillEffectsService = new SkillEffectsService(this.players, this.sendRaw.bind(this));
        this.skillService = new SkillService(
            SKILL_DEFS,
            this.sendRaw.bind(this),
            this.normalizeClassId.bind(this),
            this.getSkillLevel.bind(this),
            this.pruneExpiredSkillEffects.bind(this),
            this.applyTimedSkillEffect.bind(this),
            this.sendSkillEffect.bind(this),
            this.computeMobDamage.bind(this),
            this.applyDamageToMobAndHandleDeath.bind(this),
            this.broadcastMobHit.bind(this),
            this.applyOnHitSkillEffects.bind(this),
            this.hasActiveSkillEffect.bind(this),
            this.removeSkillEffectById.bind(this),
            this.getSkillPowerWithLevel.bind(this),
            this.sendStatsUpdated.bind(this),
            this.mapInstanceId.bind(this),
            () => this.mobService.getMobs(),
            (mapId) => this.mobService.getMobsByMap(mapId),
            this.assignPathTo.bind(this),
            this.getSkillPrerequisite.bind(this),
            this.normalizeSkillLevels.bind(this),
            this.getAvailableSkillPoints.bind(this),
            this.recomputePlayerStats.bind(this),
            this.persistPlayer.bind(this)
        );
        this.combatRuntimeService = new CombatRuntimeService(
            this.players,
            this.mobService,
            () => this.mobsPeacefulMode,
            this.mapInstanceId.bind(this),
            this.projectToWalkable.bind(this),
            this.recalculatePathToward.bind(this),
            this.getActiveSkillEffectAggregate.bind(this),
            this.computeHitChance.bind(this),
            this.getMobEvasion.bind(this),
            this.computeMobDamage.bind(this),
            this.applyDamageToMobAndHandleDeath.bind(this),
            this.applyOnHitSkillEffects.bind(this),
            this.sendStatsUpdated.bind(this),
            this.broadcastMobHit.bind(this),
            this.sendRaw.bind(this),
            this.persistPlayer.bind(this),
            this.syncAllPartyStates.bind(this),
            this.tryPlayerAttack.bind(this),
            this.getPvpAttackPermission.bind(this),
            this.isBlockedAt.bind(this),
            this.computeDamageAfterMitigation.bind(this)
        );
        this.combatCoreService = new CombatCoreService(
            this.players,
            this.mobService,
            this.getPvpAttackPermission.bind(this),
            this.sendRaw.bind(this),
            this.getActiveSkillEffectAggregate.bind(this),
            this.computeHitChance.bind(this),
            this.shouldLuckyStrike.bind(this),
            this.computeDamageAfterMitigation.bind(this),
            this.applyOnHitSkillEffects.bind(this),
            this.sendStatsUpdated.bind(this),
            this.persistPlayer.bind(this),
            this.syncAllPartyStates.bind(this),
            this.grantXp.bind(this),
            this.grantMobCurrency.bind(this),
            this.mapInstanceId.bind(this),
            this.computeLootDropPosition.bind(this),
            this.pickRandomWeaponTemplate.bind(this),
            this.dropWeaponAt.bind(this),
            this.dropHpPotionAt.bind(this),
            this.dropSkillResetHourglassAt.bind(this)
        );
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

    private async handleRegister(ws: AuthSocket, msg: AuthMessage) {
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

    private async handleLogin(ws: AuthSocket, msg: AuthMessage) {
        const username = String(msg.username || '').trim().toLowerCase();
        const password = String(msg.password || '');

        try {
            const account = await this.persistence.getUser(username);

            if (!account) {
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

            ws.authUserId = String(account.id);
            ws.authUsername = username;
            const characters = Array.isArray((account as any).players) ? (account as any).players : [];
            ws.authRole = characters.some((ch: any) => ch?.role === 'adm') ? 'adm' : 'player';
            ws.pendingPlayerProfiles = characters;

            if (!characters.length) {
                ws.send(JSON.stringify({
                    type: 'auth_character_required',
                    message: 'Conta criada. Crie seu personagem para continuar.'
                }));
                logEvent('INFO', 'user_login_waiting_character', { username });
                return;
            }

            this.sendCharacterSelection(ws, characters);
            logEvent('INFO', 'user_login_character_select', { username, characters: characters.length });
        } catch (error) {
            logEvent('ERROR', 'login_error', { username, error: String(error) });
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Erro ao fazer login.' }));
        }
    }

    private sendCharacterSelection(ws: AuthSocket, profiles: any[]) {
        const slots = [null, null, null] as Array<any>;
        const maxSlots = 3;
        for (const profile of Array.isArray(profiles) ? profiles : []) {
            const slot = Number(profile?.slot);
            if (!Number.isInteger(slot) || slot < 0 || slot >= maxSlots) continue;
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

    async handleCharacterCreate(ws: AuthSocket, msg: { name?: string; class?: string; gender?: string }) {
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

            const characters = Array.isArray((account as any).players) ? (account as any).players : [];
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

            const usedSlots = new Set(characters.map((ch: any) => Number(ch?.slot)).filter((v: number) => Number.isInteger(v)));
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
            const nextCharacters = [...characters, created].sort((a: any, b: any) => Number(a.slot || 0) - Number(b.slot || 0));
            ws.pendingPlayerProfiles = nextCharacters;
            ws.authRole = nextCharacters.some((ch: any) => ch?.role === 'adm') ? 'adm' : 'player';
            this.sendCharacterSelection(ws, nextCharacters);
        } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Nao foi possivel criar personagem.' }));
            logEvent('ERROR', 'character_create_error', { error: String(error), userId: ws.authUserId || null });
        }
    }

    async handleCharacterEnter(ws: AuthSocket, msg: { slot?: number }) {
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
            const characters = Array.isArray((account as any)?.players)
                ? (account as any).players
                : (Array.isArray(ws.pendingPlayerProfiles) ? ws.pendingPlayerProfiles : []);
            if (!characters.length) {
                ws.send(JSON.stringify({ type: 'auth_character_required', message: 'Crie um personagem para continuar.' }));
                return;
            }

            const requestedSlot = Number(msg?.slot);
            const profile = Number.isInteger(requestedSlot)
                ? characters.find((ch: any) => Number(ch?.slot) === requestedSlot)
                : characters[0];
            if (!profile) {
                this.sendCharacterSelection(ws, characters);
                ws.send(JSON.stringify({ type: 'auth_error', message: 'Slot de personagem invalido.' }));
                return;
            }

            const player = this.createRuntimePlayer(username, profile);
            player.ws = ws as any;
            this.players.set(player.id, player);
            this.usernameToPlayerId.set(username, player.id);
            ws.playerId = player.id;
            const mapMetadata = getMapMetadata(player.mapKey);

            ws.send(JSON.stringify({
                type: 'auth_success',
                playerId: player.id,
                world: mapMetadata?.world || WORLD,
                mapTiled: mapMetadata
                    ? {
                        mapCode: mapMetadata.mapCode,
                        assetKey: mapMetadata.assetKey,
                        tmjUrl: mapMetadata.tmjUrl,
                        tilesBaseUrl: mapMetadata.tilesBaseUrl,
                        orientation: mapMetadata.orientation,
                        worldTileSize: mapMetadata.worldTileSize,
                        worldScale: mapMetadata.worldScale
                    }
                    : null,
                role: player.role,
                statusIds: STATUS_IDS,
                hotbarBindings: this.getPlayerHotbarBindings(player)
            }));
            ws.send(JSON.stringify({
                type: 'hotbar.state',
                bindings: this.getPlayerHotbarBindings(player)
            }));
            this.sendInventoryState(player);
            this.questService.sendQuestState(player);
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
            logEvent('INFO', 'user_login', { username, playerId: player.id });
        } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Nao foi possivel entrar no personagem.' }));
            logEvent('ERROR', 'character_enter_error', { error: String(error), userId: ws.authUserId || null });
        }
    }

    async handleCharacterBack(ws: AuthSocket) {
        try {
            const playerId = Number(ws?.playerId || 0);
            const hasActiveRuntime = Number.isInteger(playerId) && playerId > 0 && this.players.has(playerId);
            const activePlayer = hasActiveRuntime ? this.players.get(playerId)! : null;
            const authUserId = String(ws.authUserId || activePlayer?.userId || '').trim();
            if (!authUserId) {
                this.sendRaw(ws as any, { type: 'auth_error', message: 'Sessao invalida para troca de personagem.' });
                return;
            }
            if (hasActiveRuntime) await this.handleDisconnect(playerId);
            ws.playerId = undefined;
            ws.authUserId = authUserId;
            const account = await this.persistence.getUserById(authUserId);
            const characters = Array.isArray((account as any)?.players)
                ? (account as any).players
                : [];
            ws.pendingPlayerProfiles = characters;
            ws.authRole = characters.some((ch: any) => ch?.role === 'adm') ? 'adm' : 'player';
            if (!characters.length) {
                ws.send(JSON.stringify({ type: 'auth_character_required', message: 'Crie um personagem para continuar.' }));
                return;
            }
            this.sendCharacterSelection(ws, characters);
        } catch (error) {
            this.sendRaw(ws as any, { type: 'auth_error', message: 'Nao foi possivel voltar para a selecao.' });
            logEvent('ERROR', 'character_back_error', { error: String(error), userId: ws?.authUserId || null });
        }
    }

    private buildNewPlayerProfile(username: string, name: string, selectedClass: string, gender: 'male' | 'female') {
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
            currencyCopper: 0,
            currencySilver: 0,
            currencyGold: 0,
            currencyDiamond: 0,
            mapKey: DEFAULT_MAP_KEY,
            mapId: DEFAULT_MAP_ID,
            posX: 500,
            posY: 500,
            baseStats,
            stats: {}
        };
    }

    private createRuntimePlayer(username: string, profile: any): PlayerRuntime {
        const mapKey = MAP_KEYS.includes(profile?.mapKey) ? profile.mapKey : DEFAULT_MAP_KEY;
        const mapId = MAP_IDS.includes(profile?.mapId) ? profile.mapId : DEFAULT_MAP_ID;
        const mapWorld = this.mapService.getMapWorld(mapKey);
        const spawn = this.projectToWalkable(
            mapKey,
            clamp(Number.isFinite(Number(profile?.posX)) ? Number(profile.posX) : 500, 0, mapWorld.width),
            clamp(Number.isFinite(Number(profile?.posY)) ? Number(profile.posY) : 500, 0, mapWorld.height)
        );
        const parsedId = Number(profile?.id);
        const id = Number.isInteger(parsedId) ? parsedId : Math.floor(Date.now() % 2147483647);
        const normalizedClass = this.normalizeClassId(profile?.class);
        const baseStats = this.buildClassBaseStats(normalizedClass, profile?.baseStats);
        const maxHp = Number.isFinite(Number(profile?.maxHp)) ? Number(profile.maxHp) : Number(baseStats.initialHp || 100);
        const allocatedStats = this.normalizeAllocatedStats(profile.allocatedStats);
        const unspentRaw = Number(profile.unspentPoints);
        const unspentPoints = Number.isInteger(unspentRaw) && unspentRaw > 0 ? unspentRaw : 0;
        const isSena = String(username || '').toLowerCase() === 'sena' || String(profile?.name || '').toLowerCase() === 'sena';
        const runtime: PlayerRuntime = {
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
            inventory: this.normalizeInventorySlots(
                Array.isArray(profile.inventory) ? profile.inventory : [],
                profile?.equippedWeaponId ? String(profile.equippedWeaponId) : null
            ),
            wallet: normalizeWallet({
                copper: Number(profile?.wallet?.copper ?? profile?.currencyCopper ?? 0),
                silver: Number(profile?.wallet?.silver ?? profile?.currencySilver ?? 0),
                gold: Number(profile?.wallet?.gold ?? profile?.currencyGold ?? 0),
                diamond: Number(profile?.wallet?.diamond ?? profile?.currencyDiamond ?? 0)
            }),
            persistenceVersion: Number.isFinite(Number(profile?.stateVersion)) ? Number(profile.stateVersion) : 0,
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
            pendingSkillCast: null,
            afkActive: false,
            afkOriginX: spawn.x,
            afkOriginY: spawn.y,
            afkOriginMapKey: mapKey,
            afkOriginMapId: mapId,
            afkNextThinkAt: 0
        };
        this.recomputePlayerStats(runtime);
        return runtime;
    }

    handleMove(player: PlayerRuntime, msg: MoveMessage) {
        if (player.afkActive) {
            this.setAfkState(player, false);
        }
        player.pendingSkillCast = null;
        this.movementService.handleMove(player, msg);
    }

    handleTargetMob(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
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

    handleChat(player: PlayerRuntime, msg: any) {
        this.chatService.handleChat(player, msg);
    }

    handleSwitchInstance(player: PlayerRuntime, msg: any) {
        if (player.dead || player.hp <= 0) return;
        if (!MAP_IDS.includes(player.mapId as any)) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Voce esta em uma dungeon. Aguarde o retorno automatico.' });
            return;
        }
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
        player.rawMovePath = [];
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        player.attackTargetId = null;
        player.autoAttackActive = false;
        this.setAfkState(player, false);
        player.ws.send(JSON.stringify({ type: 'system_message', text: `Instancia alterada para ${target}.` }));
        this.sendPartyAreaList(player);
    }

    handlePickupItem(player: PlayerRuntime, msg: any) {
        this.inventoryService.handlePickupItem(player, msg);
    }

    handleHotbarSet(player: PlayerRuntime, msg: any) {
        this.inventoryService.handleHotbarSet(player, msg);
    }

    handleEquipItem(player: PlayerRuntime, msg: any) {
        this.inventoryService.handleEquipItem(player, msg);
    }

    handleInventoryMove(player: PlayerRuntime, msg: any) {
        this.inventoryService.handleInventoryMove(player, msg);
    }

    handleInventorySort(player: PlayerRuntime) {
        this.inventoryService.handleInventorySort(player);
    }

    handleInventoryDelete(player: PlayerRuntime, msg: any) {
        this.inventoryService.handleInventoryDelete(player, msg);
    }

    handleInventoryUnequipToSlot(player: PlayerRuntime, msg: any) {
        this.inventoryService.handleInventoryUnequipToSlot(player, msg);
    }

    handleItemUse(player: PlayerRuntime, msg: any) {
        this.inventoryService.handleItemUse(player, msg);
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
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: setstatus {id} {quantia} {jogador?}' });
                return;
            }
            const statusId = String(parts[1]);
            const key = STATUS_BY_ID[statusId];
            const value = Number(parts[2]);
            const target = this.resolveAdminTarget(player, parts[3]);
            if (!key || !Number.isFinite(value) || !target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Comando invalido.' });
                return;
            }

            target.statusOverrides = target.statusOverrides || {};
            const leveled = this.computeDerivedStats(target);
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
            if (parts.length < 2) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: setrolelevel {nivel} {jogador?}' });
                return;
            }
            const level = Number(parts[1]);
            const target = this.resolveAdminTarget(player, parts[2]);
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
            if (parts.length < 2) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: gotomap {codigodomapa} {jogador?}' });
                return;
            }
            const targetMapCode = String(parts[1] || '').toUpperCase();
            const mapKey = MAP_KEY_BY_CODE[targetMapCode] || null;
            const target = this.resolveAdminTarget(player, parts[2]);
            if (!target || !mapKey) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Mapa/jogador invalido. Use A1, A2 ou A3.' });
                return;
            }
            target.mapKey = mapKey;
            const targetWorld = this.mapService.getMapWorld(target.mapKey);
            const projected = this.projectToWalkable(
                target.mapKey,
                clamp(target.x, 0, targetWorld.width),
                clamp(target.y, 0, targetWorld.height)
            );
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
            const target = this.resolveAdminTarget(player, parts[1]);
            if (!target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Jogador nao encontrado.' });
                return;
            }
            player.mapKey = target.mapKey;
            player.mapId = target.mapId;
            const playerWorld = this.mapService.getMapWorld(player.mapKey);
            const projected = this.projectToWalkable(
                player.mapKey,
                clamp(target.x, 0, playerWorld.width),
                clamp(target.y, 0, playerWorld.height)
            );
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
            const target = this.resolveAdminTarget(player, parts[1]);
            if (!target) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Jogador nao encontrado.' });
                return;
            }
            target.mapKey = player.mapKey;
            target.mapId = player.mapId;
            const summonWorld = this.mapService.getMapWorld(target.mapKey);
            const projected = this.projectToWalkable(
                target.mapKey,
                clamp(player.x, 0, summonWorld.width),
                clamp(player.y, 0, summonWorld.height)
            );
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
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: additem {iddoitem} {quantia} {jogador?}' });
                return;
            }
            const itemId = String(parts[1]);
            const quantity = Number(parts[2]);
            const target = this.resolveAdminTarget(player, parts[3]);
            if (!target || !Number.isInteger(quantity) || quantity <= 0) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Item/quantia/jogador invalido.' });
                return;
            }
            const template = (await this.persistence.getItemById(itemId)) || (BUILTIN_ITEM_TEMPLATE_BY_ID[itemId] ?? null);
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
            this.persistPlayerCritical(target, 'admin_additem');
            this.sendInventoryState(target);
            this.sendRaw(player.ws, {
                type: 'admin_result',
                ok: true,
                message: `${added}/${quantity}x ${template.name} adicionado(s) para ${target.name}.`
            });
            return;
        }

        if (command === 'settag') {
            if (parts.length < 2) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: settag {player|adm} {jogador?}' });
                return;
            }
            const rawTag = String(parts[1] || '').toLowerCase();
            const tag = rawTag === 'players' ? 'player' : rawTag;
            const target = this.resolveAdminTarget(player, parts[2]);
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

        if (command === 'addgold') {
            if (parts.length < 3) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Uso: addgold {quantia} {moeda} {jogador?}' });
                return;
            }
            const amount = Number(parts[1]);
            const currency = parseCurrencyName(parts[2]);
            const target = this.resolveAdminTarget(player, parts[3]);
            if (!target || !Number.isInteger(amount) || amount <= 0 || !currency) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: false, message: 'Comando invalido. Moeda: cobre, prata, ouro ou diamante.' });
                return;
            }
            const addCopper = toCopperByCurrency(amount, currency);
            this.addWalletCopper(target, addCopper, 'comando addgold');
            this.persistPlayerCritical(target, 'admin_addgold');
            this.sendInventoryState(target);
            this.sendStatsUpdated(target);
            this.sendRaw(player.ws, {
                type: 'admin_result',
                ok: true,
                message: `${amount} ${CURRENCY_LABELS[currency]} adicionado(s) para ${target.name}. Saldo: ${formatWallet(target.wallet)}.`
            });
            return;
        }

        if (command === 'dungeon.debug') {
            const snapshot = this.dungeonService.getDebugSnapshot();
            if (!snapshot.length) {
                this.sendRaw(player.ws, { type: 'admin_result', ok: true, message: 'Dungeon Debug: nenhuma instancia ativa.' });
                this.sendRaw(player.ws, { type: 'system_message', text: 'Dungeon Debug: nenhuma instancia ativa.' });
                return;
            }
            const lines: string[] = [];
            for (const instance of snapshot) {
                const bossText = instance.boss
                    ? `boss=${instance.boss.hp}/${instance.boss.maxHp}`
                    : 'boss=none';
                const membersText = instance.members
                    .map((m) => `${m.name}[${m.connected ? 'on' : 'off'}|${m.onlineInside ? 'in' : 'out'}|${m.dead ? 'dead' : `hp:${m.hp}`}|${m.ready ? 'ready' : 'wait'}]`)
                    .join(', ');
                lines.push(
                    `${instance.id} ${instance.templateId} state=${instance.state} lock=${instance.locked ? 'on' : 'off'} `
                    + `door=${instance.doorLocked ? 'on' : 'off'} mobs=${instance.mobCount} ${bossText} `
                    + `map=${instance.mapKey}/${instance.mapId} members={${membersText}}`
                );
            }
            const message = `Dungeon Debug (${snapshot.length}): ${lines.join(' || ')}`;
            this.sendRaw(player.ws, { type: 'admin_result', ok: true, message });
            this.sendRaw(player.ws, { type: 'system_message', text: message });
            return;
        }

        this.sendRaw(player.ws, {
            type: 'admin_result',
            ok: false,
            message: 'Comando invalido. Use: setstatus, setrolelevel, gotomap, teleport, summonplayer, additem, addgold, settag, dungeon.debug.'
        });
    }

    handlePartyCreate(player: PlayerRuntime) {
        this.partyService.handlePartyCreate(player);
    }

    handlePartyInvite(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyInvite(player, msg);
    }

    handlePartyAcceptInvite(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyAcceptInvite(player, msg);
    }

    handlePartyDeclineInvite(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyDeclineInvite(player, msg);
    }

    handlePartyLeave(player: PlayerRuntime) {
        this.dungeonService.leaveDungeon(player, 'Voce saiu do grupo e deixou a dungeon.');
        this.partyService.handlePartyLeave(player);
    }

    handlePartyKick(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyKick(player, msg);
    }

    handlePartyPromote(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyPromote(player, msg);
    }

    handlePartyRequestAreaParties(player: PlayerRuntime) {
        this.partyService.handlePartyRequestAreaParties(player);
    }

    handlePartyRequestJoin(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyRequestJoin(player, msg);
    }

    handlePartyApproveJoin(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyApproveJoin(player, msg);
    }

    handlePartyWaypointPing(player: PlayerRuntime, msg: any) {
        this.partyService.handlePartyWaypointPing(player, msg);
    }

    async handleFriendRequest(player: PlayerRuntime, msg: any) {
        await this.friendService.handleFriendRequest(player, msg);
    }

    async handleFriendAccept(player: PlayerRuntime, msg: any) {
        await this.friendService.handleFriendAccept(player, msg);
    }

    async handleFriendDecline(player: PlayerRuntime, msg: any) {
        await this.friendService.handleFriendDecline(player, msg);
    }

    async handleFriendRemove(player: PlayerRuntime, msg: any) {
        await this.friendService.handleFriendRemove(player, msg);
    }

    handleFriendList(player: PlayerRuntime) {
        this.friendService.handleFriendList(player);
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
        if (mode === 'group' && !this.partyService.hasParty(player.partyId)) {
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
        this.combatService.handleCombatTargetPlayer(player, msg);
    }

    handleCombatClearTarget(player: PlayerRuntime) {
        this.combatService.handleCombatClearTarget(player);
    }

    handleCombatAttack(player: PlayerRuntime, msg: any) {
        this.combatService.handleCombatAttack(player, msg);
    }

    handlePlayerRevive(player: PlayerRuntime) {
        if (!player.dead && player.hp > 0) return;
        player.dead = false;
        player.hp = player.maxHp;
        const reviveX = Number.isFinite(Number(player.deathX)) ? Number(player.deathX) : player.x;
        const reviveY = Number.isFinite(Number(player.deathY)) ? Number(player.deathY) : player.y;
        const mapWorld = this.mapService.getMapWorld(player.mapKey);
        const projected = this.projectToWalkable(
            player.mapKey,
            clamp(reviveX, 0, mapWorld.width),
            clamp(reviveY, 0, mapWorld.height)
        );
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
        this.setAfkState(player, false);
        this.persistPlayer(player);
        this.sendRaw(player.ws, { type: 'system_message', text: 'Voce reviveu no local da morte.' });
    }

    handleSkillCast(player: PlayerRuntime, msg: any) {
        this.skillService.handleSkillCast(player, msg);
    }

    handleSkillLearn(player: PlayerRuntime, msg: any) {
        this.skillService.handleSkillLearn(player, msg);
    }

    handleNpcInteract(player: PlayerRuntime, msg: any) {
        this.questService.handleNpcInteract(player, msg);
    }

    handleNpcBuy(player: PlayerRuntime, msg: any) {
        const npcId = String(msg?.npcId || '');
        const offerId = String(msg?.offerId || '');
        const quantity = Math.max(1, Math.floor(Number(msg?.quantity || 1)));
        if (!npcId || !offerId || quantity <= 0) return;

        const npc = this.questService.getNpcById(npcId);
        if (!npc) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'NPC nao encontrado.' });
            return;
        }
        if (String(npc.mapKey || '') !== String(player.mapKey || '') || String(npc.mapId || '') !== String(player.mapId || '')) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Esse NPC nao esta neste mapa.' });
            return;
        }
        const range = Math.max(80, Number(npc.interactRange || 170));
        if (distance(player, npc as any) > range) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Aproxime-se do NPC para comprar.' });
            return;
        }

        const offer = this.questService.getShopOffers(npcId).find((entry: any) => String(entry.offerId || '') === offerId);
        if (!offer) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Oferta nao encontrada.' });
            return;
        }
        const template = BUILTIN_ITEM_TEMPLATE_BY_ID[String(offer.templateId || '')];
        if (!template) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Item da oferta nao encontrado.' });
            return;
        }
        const itemQuantity = Math.max(1, Number(offer.quantity || 1));
        const totalToGrant = itemQuantity * quantity;
        const priceCopper = this.computeTemplatePriceCopper(template) * quantity;
        if (priceCopper <= 0) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Oferta com preco invalido.' });
            return;
        }
        if (!this.trySpendCopper(player, priceCopper)) {
            this.sendRaw(player.ws, { type: 'system_message', text: `Moedas insuficientes. Saldo: ${formatWallet(player.wallet)}.` });
            return;
        }

        const baseItem = {
            ...template,
            id: randomUUID()
        };
        const remaining = this.addItemToInventory(player, baseItem, totalToGrant);
        const granted = Math.max(0, totalToGrant - remaining);
        if (granted <= 0) {
            this.addWalletCopper(player, priceCopper, 'estorno');
            this.sendRaw(player.ws, { type: 'system_message', text: 'Inventario cheio. Compra cancelada.' });
            return;
        }

        if (remaining > 0) {
            const unitCopper = Math.max(1, Math.floor(priceCopper / totalToGrant));
            const refundCopper = unitCopper * remaining;
            this.addWalletCopper(player, refundCopper, 'estorno');
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `Inventario cheio: recebido ${granted}/${totalToGrant}. ${refundCopper} cobre devolvido.`
            });
        } else {
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `Compra concluida: ${granted}x ${template.name}.`
            });
        }

        this.persistPlayerCritical(player, 'npc_buy');
        this.sendInventoryState(player);
        this.sendStatsUpdated(player);
    }

    handleQuestAccept(player: PlayerRuntime, msg: any) {
        this.questService.handleQuestAccept(player, msg);
    }

    handleQuestComplete(player: PlayerRuntime, msg: any) {
        this.questService.handleQuestComplete(player, msg);
    }

    handleDungeonEnter(player: PlayerRuntime, msg: any) {
        const npcId = String(msg?.npcId || '');
        const mode = String(msg?.mode || '').toLowerCase();
        if (!npcId) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'NPC de entrada invalido.' });
            return;
        }
        const npc = this.questService.getNpcById(npcId);
        if (!npc) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'NPC nao encontrado.' });
            return;
        }
        const result = this.dungeonService.tryEnterByNpc(player, npc, mode);
        if (!result.ok) {
            this.sendRaw(player.ws, { type: 'system_message', text: String(result.message || 'Nao foi possivel entrar na dungeon.') });
            return;
        }
        this.sendPartyAreaList(player);
        this.sendRaw(player.ws, { type: 'system_message', text: 'Entrada na dungeon confirmada.' });
    }

    handleDungeonReady(player: PlayerRuntime, msg: any) {
        const requestId = String(msg?.requestId || '');
        const accept = Boolean(msg?.accept);
        if (!requestId) return;
        this.dungeonService.handleReadyResponse(player, requestId, accept);
    }

    handleDungeonLeave(player: PlayerRuntime) {
        const ok = this.dungeonService.leaveDungeon(player, 'Voce deixou a dungeon.');
        if (!ok) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Voce nao esta em uma dungeon instanciada.' });
            return;
        }
        this.sendPartyAreaList(player);
    }

    handleToggleAfk(player: PlayerRuntime) {
        if (player.dead || player.hp <= 0) return;
        this.setAfkState(player, !Boolean(player.afkActive));
    }

    handleStatsAllocate(player: PlayerRuntime, msg: any) {
        const allocation = msg && typeof msg.allocation === 'object' ? msg.allocation : {};
        const sanitized: Record<PrimaryStat, number> = {
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

        const next: Record<PrimaryStat, number> = { ...current };
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

    tick(deltaSeconds: number, now: number) {
        this.eventService.tick(now);
        this.dungeonService.tick(now);
        this.pruneExpiredGroundItems(now);
        this.pruneExpiredPartyInvites(now);
        this.pruneExpiredPartyJoinRequests(now);
        this.pruneExpiredFriendRequests(now);
        this.processMobAggroAndCombat(deltaSeconds, now);
        for (const player of this.players.values()) {
            this.pruneExpiredSkillEffects(player, now);
            if (player.dead || player.hp <= 0) continue;
            this.processAfkBehavior(player, now);
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
        if (now - this.lastAutosaveAt >= AUTOSAVE_MS) {
            this.lastAutosaveAt = now;
            void this.flushAutosavePlayers();
        }
    }

    buildWorldSnapshot(mapId: string = DEFAULT_MAP_ID, mapKey: string = DEFAULT_MAP_KEY) {
        const mapInstanceId = this.mapInstanceId(mapKey, mapId);
        const hasTiledCollision = Boolean(this.getMapTiledCollisionSampler(mapKey));
        const isDungeonMap = String(mapKey || '').startsWith('dng_');
        const mapMetadata = getMapMetadata(mapKey);
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
            mapCode: mapMetadata?.mapCode || mapCodeFromKey(mapKey),
            mapKey,
            mapTheme: isDungeonMap ? 'undead' : (MAP_THEMES[mapKey] || 'forest'),
            mapFeatures: hasTiledCollision ? [] : (MAP_FEATURES_BY_KEY[mapKey] || []),
            npcs: this.questService.getNpcsForMap(mapKey, mapId),
            activeEvents: this.eventService.getActiveEventsForMap(mapKey, mapId),
            portals: PORTALS_BY_MAP_KEY[mapKey] || [],
            mapId,
            world: mapMetadata?.world || WORLD,
            mapTiled: mapMetadata
                ? {
                    mapCode: mapMetadata.mapCode,
                    assetKey: mapMetadata.assetKey,
                    tmjUrl: mapMetadata.tmjUrl,
                    tilesBaseUrl: mapMetadata.tilesBaseUrl,
                    orientation: mapMetadata.orientation,
                    worldTileSize: mapMetadata.worldTileSize,
                    worldScale: mapMetadata.worldScale
                }
                : null
        };
    }

    getPlayerByRuntimeId(playerId: number) {
        return this.players.get(playerId);
    }

    async handleDisconnect(playerId: number) {
        const player = this.players.get(playerId);
        if (!player) return;
        this.dungeonService.onPlayerDisconnected(player.id);
        this.removePlayerFromParty(player);
        await this.persistPlayerNow(player, 'disconnect');
        this.usernameToPlayerId.delete(player.username);
        this.players.delete(playerId);
        this.dirtyPlayerIds.delete(playerId);
        this.persistRevisionByPlayerId.delete(playerId);
        this.lastPersistSignatureByPlayerId.delete(playerId);
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
        const equippedBySlot = this.getEquippedItemsBySlot(player);
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
            afkActive: Boolean(player.afkActive),
            equippedWeaponName: weapon ? weapon.name : null,
            equippedBySlot,
            wallet: normalizeWallet(player.wallet),
            pathNodes: Array.isArray(player.movePath) ? player.movePath.slice(0, 40).map((pt: any) => ({ x: Number(pt.x), y: Number(pt.y) })) : [],
            xp: player.xp,
            xpToNext: xpRequired(player.level),
            stats: player.stats,
            skillLevels: this.normalizeSkillLevels(player.skillLevels || {}),
            skillPointsAvailable: this.getAvailableSkillPoints(player),
            allocatedStats: this.normalizeAllocatedStats(player.allocatedStats),
            unspentPoints: Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0
        };
    }

    private normalizeHotbarBinding(binding: any) {
        if (!binding || typeof binding !== 'object') return null;
        const type = String(binding.type || '');
        if (type === 'action') {
            const actionId = String(binding.actionId || '');
            if (actionId === 'basic_attack') return { type: 'action', actionId: 'basic_attack' };
            if (actionId === 'skill_cast') {
                const skillId = String(binding.skillId || '');
                if (!skillId) return null;
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
            if (!itemId && !itemType) return null;
            return {
                type: 'item',
                itemId,
                itemType,
                itemName: binding.itemName ? String(binding.itemName) : 'Item'
            };
        }
        return null;
    }

    private normalizeHotbarBindings(raw: any) {
        const allowedKeys = ['1', '2', '3', '4', '5', '6', '7', '8', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f'];
        const source = raw && typeof raw === 'object' ? raw : {};
        const out: Record<string, any> = {};
        for (const key of allowedKeys) {
            out[key] = this.normalizeHotbarBinding(source[key]);
        }
        if (!out['1']) out['1'] = { type: 'action', actionId: 'basic_attack' };
        return out;
    }

    private getPlayerHotbarBindings(player: PlayerRuntime) {
        const raw = player?.statusOverrides?.__hotbarBindings;
        return this.normalizeHotbarBindings(raw);
    }

    private movePlayerTowardTarget(player: PlayerRuntime, deltaSeconds: number, now: number) {
        this.movementService.movePlayerTowardTarget(player, deltaSeconds, now);
    }

    private processAutoAttack(player: PlayerRuntime, now: number) {
        this.combatRuntimeService.processAutoAttack(player, now);
    }

    private computeMobDamage(player: PlayerRuntime, mob: any, multiplier: number, forceMagic: boolean = false, now: number = Date.now()) {
        return this.combatCoreService.computeMobDamage(player, mob, multiplier, forceMagic, now);
    }

    private applyDamageToMobAndHandleDeath(player: PlayerRuntime, mob: any, damage: number, now: number) {
        const wasAlive = Boolean(mob && Number(mob.hp || 0) > 0);
        const ok = this.combatCoreService.applyDamageToMobAndHandleDeath(player, mob, damage, now);
        if (ok && wasAlive && mob && Number(mob.hp || 0) <= 0) {
            this.questService.onMobKilled(player, mob);
            this.dungeonService.onMobKilled(player, mob);
        }
        return ok;
    }

    private pruneExpiredSkillEffects(player: PlayerRuntime, now: number = Date.now()) {
        this.skillEffectsService.pruneExpiredSkillEffects(player, now);
    }

    private hasActiveSkillEffect(player: PlayerRuntime, effectId: string, now: number = Date.now()) {
        return this.skillEffectsService.hasActiveSkillEffect(player, effectId, now);
    }

    private removeSkillEffectById(player: PlayerRuntime, effectId: string) {
        this.skillEffectsService.removeSkillEffectById(player, effectId);
    }

    private getActiveSkillEffectAggregate(player: PlayerRuntime, now: number = Date.now()) {
        return this.skillEffectsService.getActiveSkillEffectAggregate(player, now);
    }

    private applyTimedSkillEffect(player: PlayerRuntime, buff: any, now: number = Date.now()) {
        this.skillEffectsService.applyTimedSkillEffect(player, buff, now);
    }

    private applyOnHitSkillEffects(player: PlayerRuntime, dealtDamage: number, now: number = Date.now()) {
        return this.skillEffectsService.applyOnHitSkillEffects(player, dealtDamage, now);
    }

    private sendSkillEffect(mapKey: string, mapId: string, payload: any) {
        this.skillEffectsService.sendSkillEffect(mapKey, mapId, payload);
    }

    private broadcastMobHit(player: PlayerRuntime, mob: any) {
        this.skillEffectsService.broadcastMobHit(player, mob);
    }

    private processAutoAttackPlayer(player: PlayerRuntime, now: number) {
        this.combatRuntimeService.processAutoAttackPlayer(player, now);
    }

    private setAfkState(player: PlayerRuntime, active: boolean) {
        const next = Boolean(active);
        if (Boolean(player.afkActive) === next) return;
        player.afkActive = next;
        player.afkNextThinkAt = 0;
        if (next) {
            player.afkOriginX = Number(player.x);
            player.afkOriginY = Number(player.y);
            player.afkOriginMapKey = String(player.mapKey);
            player.afkOriginMapId = String(player.mapId);
            this.sendRaw(player.ws, { type: 'system_message', text: 'Voce esta no modo AFK.' });
            return;
        }
        player.movePath = [];
        player.rawMovePath = [];
        player.targetX = player.x;
        player.targetY = player.y;
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pendingSkillCast = null;
        this.sendRaw(player.ws, { type: 'system_message', text: 'Modo AFK desativado.' });
    }

    private processAfkBehavior(player: PlayerRuntime, now: number) {
        if (!player.afkActive) return;
        if (now < Number(player.afkNextThinkAt || 0)) return;
        player.afkNextThinkAt = now + AFK_THINK_MS;

        const originMapKey = String(player.afkOriginMapKey || player.mapKey);
        const originMapId = String(player.afkOriginMapId || player.mapId);
        if (originMapKey !== player.mapKey || originMapId !== player.mapId) {
            this.setAfkState(player, false);
            return;
        }

        const currentTarget = player.attackTargetId
            ? this.mobService.getMobs().find((m: any) =>
                m.id === player.attackTargetId
                && m.mapId === this.mapInstanceId(player.mapKey, player.mapId)
                && Number(m.hp || 0) > 0
            )
            : null;
        if (currentTarget) return;

        const nearestMob = this.findNearestMobForAfk(player, AFK_VISION_RANGE);
        if (nearestMob) {
            player.pvpAutoAttackActive = false;
            player.attackTargetPlayerId = null;
            player.autoAttackActive = true;
            player.attackTargetId = String(nearestMob.id);
            return;
        }

        player.autoAttackActive = false;
        player.attackTargetId = null;
        const ox = Number.isFinite(Number(player.afkOriginX)) ? Number(player.afkOriginX) : Number(player.x);
        const oy = Number.isFinite(Number(player.afkOriginY)) ? Number(player.afkOriginY) : Number(player.y);
        if (distance(player, { x: ox, y: oy } as any) <= AFK_RETURN_EPSILON) return;
        this.recalculatePathToward(player, ox, oy, now);
    }

    private findNearestMobForAfk(player: PlayerRuntime, maxDistance: number) {
        const mapInstance = this.mapInstanceId(player.mapKey, player.mapId);
        let nearest: any = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const mob of this.mobService.getMobsByMap(mapInstance)) {
            if (!mob || Number(mob.hp || 0) <= 0) continue;
            const d = distance(player, mob);
            if (d > maxDistance) continue;
            if (d < nearestDistance) {
                nearestDistance = d;
                nearest = mob;
            }
        }
        return nearest;
    }

    private processMobAggroAndCombat(deltaSeconds: number, now: number) {
        this.combatRuntimeService.processMobAggroAndCombat(deltaSeconds, now);
    }

    private tryPlayerAttack(player: PlayerRuntime, targetPlayerId: number, now: number, silent: boolean) {
        this.combatCoreService.tryPlayerAttack(player, targetPlayerId, now, silent);
    }

    private getPvpAttackPermission(player: PlayerRuntime, target: PlayerRuntime): { ok: boolean; reason?: string } {
        return this.combatService.getPvpAttackPermission(player, target);
    }

    private assignPathTo(player: PlayerRuntime, destinationX: number, destinationY: number) {
        this.movementService.assignPathTo(player, destinationX, destinationY);
    }

    private recalculatePathToward(player: PlayerRuntime, destinationX: number, destinationY: number, now: number) {
        this.movementService.recalculatePathToward(player, destinationX, destinationY, now);
    }

    private processPortalCollision(player: PlayerRuntime, now: number) {
        this.mapService.processPortalCollision(player, now, (movedPlayer) => this.sendPartyAreaList(movedPlayer));
    }

    private mapInstanceId(mapKey: string, mapId: string) {
        return this.mapService.mapInstanceId(mapKey, mapId);
    }

    private isBlockedAt(mapKey: string, x: number, y: number) {
        return this.mapService.isBlockedAt(mapKey, x, y);
    }

    private getMapTiledCollisionSampler(mapKey: string) {
        return this.mapService.getMapTiledCollisionSampler(mapKey);
    }

    private projectToWalkable(mapKey: string, x: number, y: number) {
        return this.mapService.projectToWalkable(mapKey, x, y);
    }

    private grantXp(player: PlayerRuntime, amount: number, context?: { mapKey?: string; mapId?: string; }) {
        const totalXp = Math.max(0, Math.floor(Number(amount || 0)));
        if (totalXp <= 0) return;
        const mapKey = String(context?.mapKey || player.mapKey || '');
        const mapId = String(context?.mapId || player.mapId || '');
        const eligible = [...this.players.values()].filter((candidate) =>
            String(candidate.partyId || '') !== ''
            && String(candidate.partyId || '') === String(player.partyId || '')
            && String(candidate.mapKey || '') === mapKey
            && String(candidate.mapId || '') === mapId
        );
        const targets = eligible.length > 0 ? eligible : [player];
        const share = Math.max(1, Math.floor(totalXp / targets.length));
        const remainder = Math.max(0, totalXp - (share * targets.length));

        targets.forEach((target, index) => {
            const gain = share + (index === 0 ? remainder : 0);
            target.xp += gain;
            let next = xpRequired(target.level);
            let levelsGained = 0;
            while (target.xp >= next) {
                target.xp -= next;
                target.level += 1;
                levelsGained += 1;
                next = xpRequired(target.level);
            }
            if (levelsGained > 0) {
                this.sendRaw(target.ws, {
                    type: 'system_message',
                    text: `Voce ganhou ${levelsGained * 5} ponto(s) de atributo.`
                });
            }
            this.recomputePlayerStats(target);
            if (levelsGained > 0) {
                this.persistPlayerCritical(target, 'level_up');
            } else {
                this.persistPlayer(target);
            }
            this.sendStatsUpdated(target);
        });
    }

    private normalizeInventorySlots(items: any[], equippedWeaponId: string | null = null) {
        return this.inventoryService.normalizeInventorySlots(items, equippedWeaponId);
    }

    private getEquippedWeapon(player: PlayerRuntime) {
        if (!player.equippedWeaponId) return null;
        return Array.isArray(player.inventory) ? player.inventory.find((item: any) => item.id === player.equippedWeaponId) || null : null;
    }

    private getEquippedItemsBySlot(player: PlayerRuntime) {
        const equipped: Record<string, any> = {};
        if (!Array.isArray(player.inventory)) return equipped;
        for (const item of player.inventory) {
            if (!item || typeof item !== 'object') continue;
            const isWeapon = String(item.id || '') === String(player.equippedWeaponId || '');
            const isAccessory = item.equipped === true && String(item.equippedSlot || '').length > 0;
            if (!isWeapon && !isAccessory) continue;
            const slot = isWeapon ? 'weapon' : String(item.equippedSlot || item.slot || '');
            if (!slot) continue;
            equipped[slot] = item;
        }
        return equipped;
    }

    private recomputePlayerStats(player: PlayerRuntime) {
        const allocated = this.normalizeAllocatedStats(player.allocatedStats);
        const maxSpend = this.maxSpendablePointsByLevel(player.level);
        const boundedAllocated = this.enforceAllocationBudget(allocated, maxSpend);
        player.allocatedStats = boundedAllocated;
        const leveled = this.computeDerivedStats(player);
        const overrides = player.statusOverrides && typeof player.statusOverrides === 'object' ? player.statusOverrides : {};
        for (const [key, value] of Object.entries(overrides)) {
            if (typeof (leveled as any)[key] === 'number' && Number.isFinite(value as number)) {
                (leveled as any)[key] = value;
            }
        }

        const spent = this.getAllocatedCost(boundedAllocated);
        const maxUnspent = Math.max(0, maxSpend - spent);
        player.unspentPoints = maxUnspent;

        const equippedItems = Array.isArray(player.inventory)
            ? player.inventory.filter((item: any) =>
                (item?.id && String(item.id) === String(player.equippedWeaponId || ''))
                || item?.equipped === true
            )
            : [];
        if (equippedItems.length > 0) {
            const bonusSum = equippedItems.reduce((acc: Record<string, number>, item: any) => {
                const bonuses = item?.bonuses && typeof item.bonuses === 'object' ? item.bonuses : {};
                for (const [key, value] of Object.entries(bonuses)) {
                    const current = Number(acc[key] || 0);
                    const add = Number.isFinite(Number(value)) ? Number(value) : 0;
                    acc[key] = current + add;
                }
                return acc;
            }, {});
            player.stats = {
                ...leveled,
                physicalAttack: Number(leveled.physicalAttack || 0) + Number(bonusSum.physicalAttack || 0),
                magicAttack: Number(leveled.magicAttack || 0) + Number(bonusSum.magicAttack || 0),
                moveSpeed: Number(leveled.moveSpeed || 0) + Number(bonusSum.moveSpeed || 0),
                attackSpeed: Number(leveled.attackSpeed || 0) + Number(bonusSum.attackSpeed || 0),
                physicalDefense: Number(leveled.physicalDefense || 0) + Number(bonusSum.physicalDefense || 0),
                magicDefense: Number(leveled.magicDefense || 0) + Number(bonusSum.magicDefense || 0),
                evasion: Number(leveled.evasion || 0) + Number(bonusSum.evasion || 0),
                accuracy: Number(leveled.accuracy || 0) + Number(bonusSum.accuracy || 0),
                attackRange: Number(leveled.attackRange || 0) + Number(bonusSum.attackRange || 0),
                maxHp: Number(leveled.maxHp || 0) + Number(bonusSum.maxHp || 0)
            };
        } else {
            player.stats = { ...leveled };
        }
        player.maxHp = Number((player.stats as any).maxHp || (leveled as any).maxHp || player.maxHp || 100);
        player.hp = clamp(Number(player.hp || player.maxHp), 0, player.maxHp);
    }

    private sendInventoryState(player: PlayerRuntime) {
        const equippedBySlot = this.getEquippedItemsBySlot(player);
        this.sendRaw(player.ws, {
            type: 'inventory_state',
            inventory: [...player.inventory].sort((a: any, b: any) => Number(a.slotIndex) - Number(b.slotIndex)),
            equippedWeaponId: player.equippedWeaponId,
            equippedBySlot,
            wallet: normalizeWallet(player.wallet)
        });
    }

    private ensureWallet(player: PlayerRuntime) {
        player.wallet = normalizeWallet(player.wallet);
    }

    private addWalletCopper(player: PlayerRuntime, amountCopper: number, sourceLabel: string) {
        const amount = Math.max(0, Math.floor(Number(amountCopper || 0)));
        if (amount <= 0) return;
        this.ensureWallet(player);
        const total = walletToCopper(player.wallet) + amount;
        player.wallet = walletFromCopper(total);
        if (sourceLabel) {
            this.sendRaw(player.ws, {
                type: 'system_message',
                text: `${sourceLabel}: +${formatWallet(walletFromCopper(amount))}. Saldo: ${formatWallet(player.wallet)}.`
            });
        }
    }

    private trySpendCopper(player: PlayerRuntime, amountCopper: number) {
        const amount = Math.max(0, Math.floor(Number(amountCopper || 0)));
        if (amount <= 0) return true;
        this.ensureWallet(player);
        const current = walletToCopper(player.wallet);
        if (current < amount) return false;
        player.wallet = walletFromCopper(current - amount);
        return true;
    }

    private computeTemplatePriceCopper(template: any) {
        const price = template?.price && typeof template.price === 'object' ? template.price : {};
        const asWallet = normalizeWallet({
            copper: Number(price.copper || 0),
            silver: Number(price.silver || 0),
            gold: Number(price.gold || 0),
            diamond: Number(price.diamond || 0)
        });
        return walletToCopper(asWallet);
    }

    private grantCurrency(player: PlayerRuntime, reward: Partial<Wallet>, sourceLabel: string) {
        const safe = normalizeWallet({
            copper: Number(reward?.copper || 0),
            silver: Number(reward?.silver || 0),
            gold: Number(reward?.gold || 0),
            diamond: Number(reward?.diamond || 0)
        });
        const copperTotal = walletToCopper(safe);
        if (copperTotal <= 0) return;
        this.addWalletCopper(player, copperTotal, sourceLabel);
        this.persistPlayer(player);
        this.sendInventoryState(player);
    }

    private grantMobCurrency(player: PlayerRuntime, mob: any) {
        const kind = String(mob?.kind || 'normal');
        const rewardByKind: Record<string, Partial<Wallet>> = {
            normal: { copper: 25 },
            elite: { silver: 1, copper: 40 },
            subboss: { silver: 4, copper: 80 },
            boss: { gold: 1, silver: 30 }
        };
        const reward = rewardByKind[kind] || { copper: 20 };
        this.grantCurrency(player, reward, 'Recompensa de mob');
    }

    private computeLootDropPosition(originX: number, originY: number, dropIndex: number, dropTotal: number, mapKey: string) {
        const mapWorld = this.mapService.getMapWorld(mapKey);
        const center = this.projectToWalkable(
            mapKey,
            clamp(Number(originX || 0), 0, mapWorld.width),
            clamp(Number(originY || 0), 0, mapWorld.height)
        );
        if (dropTotal <= 1 || dropIndex <= 0) return center;

        const ringIndex = Math.ceil(Math.sqrt(dropIndex));
        const radius = Math.min(64, Math.max(32, ringIndex * 32));
        const slotInRing = dropIndex - ((ringIndex - 1) * (ringIndex - 1));
        const ringSlots = ringIndex * 4;
        const angle = (Math.PI * 2 * (slotInRing - 1)) / Math.max(1, ringSlots);
        const tx = center.x + Math.cos(angle) * radius;
        const ty = center.y + Math.sin(angle) * radius;
        return this.projectToWalkable(mapKey, tx, ty);
    }

    private pickRandomWeaponTemplate() {
        if (!Array.isArray(WEAPON_TEMPLATES) || WEAPON_TEMPLATES.length === 0) return WEAPON_TEMPLATE;
        const index = Math.floor(Math.random() * WEAPON_TEMPLATES.length);
        return WEAPON_TEMPLATES[index] || WEAPON_TEMPLATE;
    }

    private dropWeaponAt(
        x: number,
        y: number,
        mapId: string,
        template: any = WEAPON_TEMPLATE,
        ownerId: number | null = null,
        ownerPartyId: string | null = null,
        reservedMs: number = 0
    ) {
        const now = Date.now();
        this.groundItems.push({
            id: randomUUID(),
            templateId: String(template.id || template.type || 'weapon_teste'),
            type: String(template.type || 'weapon'),
            name: template.name,
            slot: template.slot,
            bonuses: { ...template.bonuses },
            x,
            y,
            mapId,
            ownerId: Number.isFinite(Number(ownerId)) && Number(ownerId) > 0 ? Number(ownerId) : null,
            ownerPartyId: ownerPartyId ? String(ownerPartyId) : null,
            reservedUntil: reservedMs > 0 ? now + Math.max(1000, Math.floor(reservedMs)) : undefined,
            expiresAt: now + GROUND_ITEM_TTL_MS
        });
    }

    private dropHpPotionAt(
        x: number,
        y: number,
        mapId: string,
        ownerId: number | null = null,
        ownerPartyId: string | null = null,
        reservedMs: number = 0
    ) {
        const now = Date.now();
        this.groundItems.push({
            id: randomUUID(),
            templateId: String(HP_POTION_TEMPLATE.id || HP_POTION_TEMPLATE.type || 'potion_hp'),
            type: String(HP_POTION_TEMPLATE.type || 'potion_hp'),
            name: HP_POTION_TEMPLATE.name,
            slot: HP_POTION_TEMPLATE.slot,
            bonuses: {},
            quantity: 1,
            stackable: Boolean(HP_POTION_TEMPLATE.stackable ?? true),
            maxStack: Number(HP_POTION_TEMPLATE.maxStack || 64),
            healPercent: Number(HP_POTION_TEMPLATE.healPercent || 0.5),
            x,
            y,
            mapId,
            ownerId: Number.isFinite(Number(ownerId)) && Number(ownerId) > 0 ? Number(ownerId) : null,
            ownerPartyId: ownerPartyId ? String(ownerPartyId) : null,
            reservedUntil: reservedMs > 0 ? now + Math.max(1000, Math.floor(reservedMs)) : undefined,
            expiresAt: now + GROUND_ITEM_TTL_MS
        } as any);
    }

    private dropSkillResetHourglassAt(
        x: number,
        y: number,
        mapId: string,
        ownerId: number | null = null,
        ownerPartyId: string | null = null,
        reservedMs: number = 0
    ) {
        const now = Date.now();
        this.groundItems.push({
            id: randomUUID(),
            templateId: String(SKILL_RESET_HOURGLASS_TEMPLATE.id || SKILL_RESET_HOURGLASS_TEMPLATE.type || 'skill_reset_hourglass'),
            type: SKILL_RESET_HOURGLASS_TEMPLATE.type,
            name: SKILL_RESET_HOURGLASS_TEMPLATE.name,
            slot: SKILL_RESET_HOURGLASS_TEMPLATE.slot,
            bonuses: {},
            quantity: 1,
            stackable: Boolean(SKILL_RESET_HOURGLASS_TEMPLATE.stackable),
            maxStack: Number(SKILL_RESET_HOURGLASS_TEMPLATE.maxStack || 64),
            x,
            y,
            mapId,
            ownerId: Number.isFinite(Number(ownerId)) && Number(ownerId) > 0 ? Number(ownerId) : null,
            ownerPartyId: ownerPartyId ? String(ownerPartyId) : null,
            reservedUntil: reservedMs > 0 ? now + Math.max(1000, Math.floor(reservedMs)) : undefined,
            expiresAt: now + GROUND_ITEM_TTL_MS
        } as any);
    }

    private addItemToInventory(player: PlayerRuntime, item: any, quantity: number) {
        return this.inventoryService.addItemToInventory(player, item, quantity);
    }

    private dropTemplateAt(
        x: number,
        y: number,
        mapId: string,
        templateId: string,
        ownerId: number | null = null,
        ownerPartyId: string | null = null,
        reservedMs: number = 0
    ) {
        const template = BUILTIN_ITEM_TEMPLATE_BY_ID[String(templateId || '')];
        if (!template) return;
        const type = String(template.type || '');
        if (type === 'weapon' || type === 'equipment') {
            this.dropWeaponAt(x, y, mapId, template, ownerId, ownerPartyId, reservedMs);
            return;
        }
        if (type === 'potion_hp') {
            this.dropHpPotionAt(x, y, mapId, ownerId, ownerPartyId, reservedMs);
            return;
        }
        if (type === 'skill_reset_hourglass') {
            this.dropSkillResetHourglassAt(x, y, mapId, ownerId, ownerPartyId, reservedMs);
            return;
        }
        this.dropWeaponAt(x, y, mapId, template, ownerId, ownerPartyId, reservedMs);
    }

    private grantRewardItem(player: PlayerRuntime, templateId: string, quantity: number) {
        const qty = Math.max(0, Math.floor(Number(quantity || 0)));
        if (qty <= 0) return 0;
        const key = String(templateId || '');
        if (!key) return qty;
        const template = key === 'potion_hp'
            ? HP_POTION_TEMPLATE
            : BUILTIN_ITEM_TEMPLATE_BY_ID[key];
        if (!template) return qty;
        const baseItem = {
            ...template,
            id: randomUUID()
        };
        const remaining = this.addItemToInventory(player, baseItem, qty);
        this.sendInventoryState(player);
        return remaining;
    }

    private onItemCollected(player: PlayerRuntime, templateId: string, quantity: number) {
        this.questService.onItemCollected(player, templateId, quantity);
    }

    private pruneExpiredGroundItems(now: number) {
        this.groundItems = this.groundItems.filter((item) => {
            if (typeof item.expiresAt !== 'number') return true;
            return item.expiresAt > now;
        });
    }

    private removeGroundItemsByMapInstance(mapInstanceId: string) {
        this.groundItems = this.groundItems.filter((item) => String(item.mapId || '') !== String(mapInstanceId || ''));
    }

    private getAreaIdForPlayer(player: PlayerRuntime) {
        return this.mapService.getAreaIdForPlayer(player);
    }

    private sendPartyStateToPlayer(player: PlayerRuntime, party: Party | null) {
        this.partyService.sendPartyStateToPlayer(player, party);
    }

    private syncAllPartyStates() {
        this.partyService.syncAllPartyStates();
    }

    private sendPartyAreaList(player: PlayerRuntime) {
        this.partyService.sendPartyAreaList(player);
    }

    private pruneExpiredPartyInvites(now: number) {
        this.partyService.pruneExpiredPartyInvites(now);
    }

    private pruneExpiredPartyJoinRequests(now: number) {
        this.partyService.pruneExpiredPartyJoinRequests(now);
    }

    private clearPendingInvitesForPlayer(playerId: number) {
        this.partyService.clearPendingInvitesForPlayer(playerId);
    }

    private clearJoinRequestsForPlayer(playerId: number) {
        this.partyService.clearJoinRequestsForPlayer(playerId);
    }

    private clearJoinRequestsForParty(partyId: string) {
        this.partyService.clearJoinRequestsForParty(partyId);
    }

    private pruneExpiredFriendRequests(now: number) {
        void this.friendService.pruneExpiredFriendRequests(now).catch((error) => {
            logEvent('ERROR', 'friend_prune_error', { error: String(error) });
        });
    }

    private clearFriendRequestsForPlayer(playerId: number) {
        this.friendService.clearFriendRequestsForPlayer(playerId);
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

    private resolveAdminTarget(actor: PlayerRuntime, rawName?: string) {
        const hasName = String(rawName || '').trim().length > 0;
        if (!hasName) return actor;
        return this.findOnlinePlayerByName(String(rawName || ''));
    }

    private sendFriendState(player: PlayerRuntime) {
        this.friendService.sendFriendState(player);
    }

    private async hydrateFriendStateForPlayer(player: PlayerRuntime) {
        await this.friendService.hydrateFriendStateForPlayer(player);
    }

    private removePlayerFromParty(player: PlayerRuntime) {
        this.partyService.removePlayerFromParty(player);
    }

    private normalizeClassId(rawClass: any): string {
        const key = String(rawClass || '').toLowerCase();
        if (key === 'shifter') return 'druid';
        if (key === 'bandit') return 'assassin';
        if (key === 'cavaleiro') return 'knight';
        if (key === 'arqueiro') return 'archer';
        if (key === 'druida') return 'druid';
        if (key === 'assassino') return 'assassin';
        if (CLASS_TEMPLATES[key as keyof typeof CLASS_TEMPLATES]) return key;
        return 'knight';
    }

    private buildClassBaseStats(classId: string, baseFromProfile?: any) {
        const hasPrimary = Boolean(
            baseFromProfile
            && typeof baseFromProfile === 'object'
            && ['str', 'int', 'dex', 'vit'].every((k) => Number.isFinite(Number(baseFromProfile[k])))
        );
        const source = hasPrimary
            ? baseFromProfile
            : CLASS_TEMPLATES[this.normalizeClassId(classId) as keyof typeof CLASS_TEMPLATES] || CLASS_TEMPLATES.knight;
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

    private primaryToLegacyKey(primary: PrimaryStat) {
        if (primary === 'str') return 'physicalAttack';
        if (primary === 'int') return 'magicAttack';
        if (primary === 'vit') return 'physicalDefense';
        return 'magicDefense';
    }

    private maxSpendablePointsByLevel(level: number) {
        return Math.max(0, (Math.max(1, Number(level || 1)) - 1) * 5);
    }

    private getAllocatedTotal(allocated: Record<PrimaryStat, number>) {
        return PRIMARY_STATS.reduce((sum, key) => sum + Number(allocated[key] || 0), 0);
    }

    private getAllocatedCost(allocated: Record<PrimaryStat, number>) {
        let total = 0;
        for (const key of PRIMARY_STATS) {
            const amount = Math.max(0, Math.floor(Number(allocated[key] || 0)));
            for (let i = 0; i < amount; i++) {
                total += i >= SOFT_CAP_THRESHOLD ? SOFT_CAP_COST : BASE_POINT_COST;
            }
        }
        return total;
    }

    private getAllocationCost(current: Record<PrimaryStat, number>, incoming: Record<PrimaryStat, number>) {
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

    private enforceAllocationBudget(input: Record<PrimaryStat, number>, maxCost: number) {
        const next: Record<PrimaryStat, number> = { ...input };
        if (this.getAllocatedCost(next) <= maxCost) return next;
        const downOrder: PrimaryStat[] = ['dex', 'int', 'str', 'vit'];
        while (this.getAllocatedCost(next) > maxCost) {
            let reduced = false;
            for (const key of downOrder) {
                if (next[key] <= 0) continue;
                next[key] -= 1;
                reduced = true;
                if (this.getAllocatedCost(next) <= maxCost) break;
            }
            if (!reduced) break;
        }
        return next;
    }

    private computeDerivedStats(player: PlayerRuntime) {
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

    private computeDamageReduction(defense: number, level: number) {
        const safeDefense = Math.max(0, Number(defense || 0));
        const safeLevel = Math.max(1, Number(level || 1));
        const k = 400 + safeLevel * 50;
        return safeDefense / (safeDefense + k);
    }

    private computeDamageAfterMitigation(rawDamage: number, defense: number, targetLevel: number) {
        const safeRaw = Math.max(1, Number(rawDamage || 1));
        const reduction = this.computeDamageReduction(defense, targetLevel);
        return Math.max(1, Math.floor(safeRaw * (1 - reduction)));
    }

    private computeHitChance(attackerAccuracy: number, defenderEvasion: number) {
        const acc = Math.max(1, Number(attackerAccuracy || 1));
        const eva = Math.max(0, Number(defenderEvasion || 0));
        const base = 0.85 + ((acc - eva) / (acc + eva));
        return clamp(base, 0.05, 0.98);
    }

    private getEntityLuck(entity: any) {
        if (!entity) return 0;
        const level = Math.max(1, Number(entity.level || 1));
        if (entity.stats && typeof entity.stats === 'object') return Number(entity.stats.luck || 0);
        const dex = Math.max(0, Number(entity.dex || 0));
        return level / 2 + dex / 10;
    }

    private shouldLuckyStrike(attacker: any, defender: any) {
        const atkLuck = this.getEntityLuck(attacker);
        const defLuck = this.getEntityLuck(defender);
        if (atkLuck < defLuck * 2) return false;
        return Math.random() < LUCKY_STRIKE_CHANCE;
    }

    private getMobEvasion(mob: any) {
        return mob?.kind === 'boss' ? 16 : mob?.kind === 'subboss' ? 11 : mob?.kind === 'elite' ? 8 : 5;
    }

    private persistPlayer(player: PlayerRuntime) {
        this.preparePlayerForSave(player);
        this.markPlayerDirty(player.id);
    }

    private persistPlayerCritical(player: PlayerRuntime, reason: string = 'critical') {
        this.preparePlayerForSave(player);
        this.markPlayerDirty(player.id);
        void this.persistPlayerNow(player, reason);
    }

    async flushAllPlayers(reason: string = 'shutdown') {
        for (const playerId of this.players.keys()) {
            this.markPlayerDirty(playerId);
        }
        await this.flushDirtyPlayers(reason, true);
    }

    async processPersistenceQueue(limit: number = 20) {
        return await this.persistence.processPendingPlayerSaveJobs(limit);
    }

    private async flushAutosavePlayers() {
        for (const playerId of this.players.keys()) {
            this.markPlayerDirty(playerId);
        }
        await this.flushDirtyPlayers('autosave', false);
    }

    private async flushDirtyPlayers(reason: string, force: boolean = false) {
        if (this.autosaveInFlight && !force) return;
        this.autosaveInFlight = true;
        try {
            const dirtyIds = [...this.dirtyPlayerIds.values()];
            for (const playerId of dirtyIds) {
                const player = this.players.get(playerId);
                if (!player) {
                    this.dirtyPlayerIds.delete(playerId);
                    continue;
                }
                await this.persistPlayerNow(player, reason, force);
            }
            if (reason === 'autosave') {
                logEvent('INFO', 'autosave_cycle', {
                    online: this.players.size,
                    dirty: dirtyIds.length,
                    enqueued: this.persistStats.enqueued,
                    saved: this.persistStats.saved,
                    skipped: this.persistStats.skipped,
                    failed: this.persistStats.failed,
                    retried: this.persistStats.retried
                });
            }
        } finally {
            this.autosaveInFlight = false;
        }
    }

    private async persistPlayerNow(player: PlayerRuntime, reason: string, forceSave: boolean = false) {
        const playerId = Number(player.id);
        if (!Number.isFinite(playerId) || playerId <= 0) return;
        if (this.persistInFlightByPlayerId.has(playerId)) return;
        const lockKey = `lock:player:save:${playerId}`;
        const lockToken = await this.lockService.acquire(lockKey, 5000);
        if (!lockToken) {
            this.dirtyPlayerIds.add(playerId);
            return;
        }
        this.persistInFlightByPlayerId.add(playerId);
        this.preparePlayerForSave(player);
        const saveRevision = Number(this.persistRevisionByPlayerId.get(playerId) || 0);
        let saveOk = false;
        let shouldEnqueueFallback = false;
        this.persistStats.enqueued += 1;
        try {
            const signature = this.computePersistenceSignature(player);
            const previousSignature = this.lastPersistSignatureByPlayerId.get(playerId);
            if (!forceSave && previousSignature === signature) {
                this.persistStats.skipped += 1;
                this.dirtyPlayerIds.delete(playerId);
                return;
            }

            let attempt = 0;
            while (true) {
                try {
                    const result = await this.persistence.savePlayer(player, {
                        expectedVersion: Number(player.persistenceVersion || 0),
                        useOptimisticLock: true
                    });
                    if (!result.ok && result.conflict) {
                        player.persistenceVersion = Number(result.version || player.persistenceVersion || 0);
                        throw new Error('player_version_conflict');
                    }
                    player.persistenceVersion = Number(result.version || player.persistenceVersion || 0);
                    this.lastPersistSignatureByPlayerId.set(playerId, signature);
                    break;
                } catch (error) {
                    if (attempt >= PERSIST_MAX_RETRIES) throw error;
                    attempt += 1;
                    this.persistStats.retried += 1;
                    const backoffMs = PERSIST_RETRY_BASE_MS * (2 ** (attempt - 1));
                    await this.sleep(backoffMs);
                }
            }
            saveOk = true;
            this.persistStats.saved += 1;
            const currentRevision = Number(this.persistRevisionByPlayerId.get(playerId) || 0);
            if (currentRevision === saveRevision) {
                this.dirtyPlayerIds.delete(playerId);
            }
        } catch (error) {
            this.dirtyPlayerIds.add(playerId);
            this.persistStats.failed += 1;
            shouldEnqueueFallback = true;
            logEvent('ERROR', 'save_player_error', { playerId: player.id, reason, error: String(error) });
        } finally {
            this.persistInFlightByPlayerId.delete(playerId);
            await this.lockService.release(lockKey, lockToken);
            if (shouldEnqueueFallback) {
                try {
                    await this.persistence.enqueuePlayerSave(player, String(reason || 'save_failure'));
                } catch (queueError) {
                    logEvent('ERROR', 'enqueue_player_save_error', { playerId: player.id, reason, error: String(queueError) });
                }
            }
            if (saveOk && this.dirtyPlayerIds.has(playerId)) {
                void this.persistPlayerNow(player, `${reason}:followup`, forceSave);
            }
        }
    }

    private markPlayerDirty(playerId: number) {
        const next = Number(this.persistRevisionByPlayerId.get(playerId) || 0) + 1;
        this.persistRevisionByPlayerId.set(playerId, next);
        this.dirtyPlayerIds.add(playerId);
    }

    private computePersistenceSignature(player: PlayerRuntime) {
        const wallet = normalizeWallet(player.wallet);
        const inventory = Array.isArray(player.inventory)
            ? player.inventory.map((item: any) => ({
                id: String(item?.id || ''),
                templateId: String(item?.templateId || ''),
                type: String(item?.type || ''),
                quantity: Number(item?.quantity || 0),
                slotIndex: Number(item?.slotIndex || 0),
                equipped: Boolean(item?.equipped),
                equippedSlot: String(item?.equippedSlot || '')
            }))
            : [];
        const statusOverrides = player.statusOverrides && typeof player.statusOverrides === 'object'
            ? player.statusOverrides
            : {};
        return JSON.stringify({
            level: Number(player.level || 1),
            xp: Number(player.xp || 0),
            hp: Number(player.hp || 0),
            maxHp: Number(player.maxHp || 0),
            role: String(player.role || 'player'),
            pvpMode: String(player.pvpMode || 'peace'),
            mapKey: String(player.mapKey || ''),
            mapId: String(player.mapId || ''),
            x: Number(player.x || 0),
            y: Number(player.y || 0),
            equippedWeaponId: String(player.equippedWeaponId || ''),
            wallet,
            stats: player.stats || {},
            allocatedStats: player.allocatedStats || {},
            unspentPoints: Number(player.unspentPoints || 0),
            statusOverrides,
            inventory
        });
    }

    private sleep(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));
    }

    private preparePlayerForSave(player: PlayerRuntime) {
        if (!player.statusOverrides || typeof player.statusOverrides !== 'object') player.statusOverrides = {};
        player.statusOverrides.__skillLevels = this.normalizeSkillLevels(player.skillLevels || {});
    }

    private normalizeAllocatedStats(input: any): Record<PrimaryStat, number> {
        const source = input && typeof input === 'object' ? input : {};
        const toInt = (v: any) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
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

    private normalizeSkillLevels(input: any): Record<string, number> {
        const src = input && typeof input === 'object' ? input : {};
        const out: Record<string, number> = {};
        for (const [skillId, raw] of Object.entries(src)) {
            if (!SKILL_DEFS[String(skillId)]) continue;
            const lvl = Math.max(0, Math.min(5, Math.floor(Number(raw || 0))));
            if (lvl > 0) out[String(skillId)] = lvl;
        }
        return out;
    }

    private getSpentSkillPoints(player: PlayerRuntime) {
        const levels = this.normalizeSkillLevels(player.skillLevels || {});
        return Object.values(levels).reduce((sum, lvl) => sum + Math.max(0, Number(lvl || 0)), 0);
    }

    private getAvailableSkillPoints(player: PlayerRuntime) {
        const level = Math.max(1, Math.floor(Number(player.level || 1)));
        const earned = Math.max(0, level - 1);
        const spent = this.getSpentSkillPoints(player);
        return Math.max(0, earned - spent);
    }

    private getSkillLevel(player: PlayerRuntime, skillId: string) {
        const levels = this.normalizeSkillLevels(player.skillLevels || {});
        return Math.max(0, Math.min(5, Number(levels[skillId] || 0)));
    }

    private getSkillPrerequisite(skillId: string) {
        for (const chain of Object.values(SKILL_CHAINS)) {
            const idx = chain.indexOf(skillId);
            if (idx <= 0) continue;
            return chain[idx - 1];
        }
        return null;
    }

    private getSkillPowerWithLevel(skill: SkillDef, level: number) {
        const safeLevel = Math.max(1, Math.min(5, Number(level || 1)));
        const base = Number(skill.power || 1);
        return base * (1 + (safeLevel - 1) * 0.22);
    }

    private sendStatsUpdated(player: PlayerRuntime) {
        this.sendRaw(player.ws, {
            type: 'player.statsUpdated',
            stats: player.stats,
            allocatedStats: this.normalizeAllocatedStats(player.allocatedStats),
            skillLevels: this.normalizeSkillLevels(player.skillLevels || {}),
            skillPointsAvailable: this.getAvailableSkillPoints(player),
            unspentPoints: Number.isInteger(player.unspentPoints) ? player.unspentPoints : 0,
            level: player.level,
            xp: player.xp,
            xpToNext: xpRequired(player.level),
            hp: player.hp,
            maxHp: player.maxHp,
            wallet: normalizeWallet(player.wallet)
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

    private broadcastMapInstance(mapKey: string, mapId: string, payload: any) {
        for (const player of this.players.values()) {
            if (player.mapKey !== mapKey || player.mapId !== mapId) continue;
            this.sendRaw(player.ws, payload);
        }
    }
}
