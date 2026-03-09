import { PLAYER_HALF_SIZE, SKILL_RESET_HOURGLASS_DROP_CHANCE } from '../config';
import { PlayerRuntime } from '../models/types';
import { distance } from '../utils/math';

type PermissionFn = (player: PlayerRuntime, target: PlayerRuntime) => { ok: boolean; reason?: string };
type SendRawFn = (ws: any, payload: any) => void;
type SkillAggregateFn = (player: PlayerRuntime, now: number) => any;
type HitChanceFn = (attackerAccuracy: number, defenderEvasion: number) => number;
type LuckyStrikeFn = (attacker: any, defender: any) => boolean;
type DamageAfterMitigationFn = (rawDamage: number, defense: number, targetLevel: number) => number;
type OnHitSkillFn = (player: PlayerRuntime, dealtDamage: number, now: number) => number;
type SendStatsFn = (player: PlayerRuntime) => void;
type PersistPlayerFn = (player: PlayerRuntime) => void;
type SyncPartyFn = () => void;
type GrantXpFn = (player: PlayerRuntime, amount: number, context?: { mapKey?: string; mapId?: string; }) => void;
type MapInstanceIdFn = (mapKey: string, mapId: string) => string;
type DropPosFn = (originX: number, originY: number, dropIndex: number, dropTotal: number, mapKey: string) => { x: number; y: number };
type PickWeaponTemplateFn = () => any;
type DropWeaponFn = (x: number, y: number, mapId: string, template?: any) => void;
type DropPotionFn = (x: number, y: number, mapId: string) => void;
type DropHourglassFn = (x: number, y: number, mapId: string) => void;

export class CombatCoreService {
    constructor(
        private readonly players: Map<number, PlayerRuntime>,
        private readonly mobService: any,
        private readonly getPvpAttackPermission: PermissionFn,
        private readonly sendRaw: SendRawFn,
        private readonly getActiveSkillEffectAggregate: SkillAggregateFn,
        private readonly computeHitChance: HitChanceFn,
        private readonly shouldLuckyStrike: LuckyStrikeFn,
        private readonly computeDamageAfterMitigation: DamageAfterMitigationFn,
        private readonly applyOnHitSkillEffects: OnHitSkillFn,
        private readonly sendStatsUpdated: SendStatsFn,
        private readonly persistPlayer: PersistPlayerFn,
        private readonly syncAllPartyStates: SyncPartyFn,
        private readonly grantXp: GrantXpFn,
        private readonly mapInstanceId: MapInstanceIdFn,
        private readonly computeLootDropPosition: DropPosFn,
        private readonly pickRandomWeaponTemplate: PickWeaponTemplateFn,
        private readonly dropWeaponAt: DropWeaponFn,
        private readonly dropHpPotionAt: DropPotionFn,
        private readonly dropSkillResetHourglassAt: DropHourglassFn
    ) {}

    computeMobDamage(player: PlayerRuntime, mob: any, multiplier: number, forceMagic: boolean = false, now: number = Date.now()) {
        const fx = this.getActiveSkillEffectAggregate(player, now);
        const isMagic = forceMagic || player.stats?.damageType === 'magic';
        const rawAttack = (Number(isMagic ? player.stats?.magicAttack : player.stats?.physicalAttack) || 1) * Math.max(0.2, Number(fx.attackMul || 1));
        const defense = Number(isMagic ? mob.magicDefense : mob.physicalDefense) || 0;
        const reducedDefense = this.shouldLuckyStrike(player, mob) ? defense * 0.5 : defense;
        const base = Number(rawAttack) * Math.max(0.05, Number(multiplier || 1));
        return this.computeDamageAfterMitigation(base, reducedDefense, Number(mob.level || 1));
    }

    applyDamageToMobAndHandleDeath(player: PlayerRuntime, mob: any, damage: number, now: number) {
        if (!mob) return false;
        if (mob.state === 'leash_return' || mob.ignoreDamage) return false;
        const finalDamage = Math.max(1, Math.floor(Number(damage || 0)));
        if (finalDamage <= 0) return false;

        this.mobService.addHate(mob, player.id, finalDamage);
        if (!mob.targetPlayerId) mob.targetPlayerId = player.id;
        mob.state = mob.state === 'attack_windup' ? mob.state : 'aggro';
        mob.nextRepathAt = now;
        mob.hp = Math.max(0, Number(mob.hp || 0) - finalDamage);

        if (mob.hp > 0) return true;

        this.grantXp(player, mob.xpReward, { mapKey: player.mapKey, mapId: player.mapId });
        const mapInstanceId = this.mapInstanceId(player.mapKey, player.mapId);
        const dropDefs: Array<'weapon' | 'potion_hp' | 'skill_reset_hourglass'> = [];
        if (Math.random() < 0.5) dropDefs.push('weapon');
        dropDefs.push('potion_hp');
        if (Math.random() < Number(SKILL_RESET_HOURGLASS_DROP_CHANCE || 0)) dropDefs.push('skill_reset_hourglass');
        if (Array.isArray(mob.eventLootTable)) {
            for (const entry of mob.eventLootTable) {
                const type = String(entry?.type || '') as 'weapon' | 'potion_hp' | 'skill_reset_hourglass';
                const chance = Math.max(0, Math.min(1, Number(entry?.chance || 0)));
                if ((type === 'weapon' || type === 'potion_hp' || type === 'skill_reset_hourglass') && Math.random() < chance) {
                    dropDefs.push(type);
                }
            }
        }
        dropDefs.forEach((dropType, index) => {
            const dropPos = this.computeLootDropPosition(mob.x, mob.y, index, dropDefs.length, player.mapKey);
            if (dropType === 'weapon') this.dropWeaponAt(dropPos.x, dropPos.y, mapInstanceId, this.pickRandomWeaponTemplate());
            else if (dropType === 'potion_hp') this.dropHpPotionAt(dropPos.x, dropPos.y, mapInstanceId);
            else this.dropSkillResetHourglassAt(dropPos.x, dropPos.y, mapInstanceId);
        });
        this.mobService.removeMob(mob.id);
        return true;
    }

    tryPlayerAttack(player: PlayerRuntime, targetPlayerId: number, now: number, silent: boolean) {
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

        const fx = this.getActiveSkillEffectAggregate(player, now);
        const rawAttackSpeed = Number(player.stats?.attackSpeed);
        const attackSpeedStat = Number.isFinite(rawAttackSpeed) && rawAttackSpeed > 0 ? rawAttackSpeed : 100;
        const boostedAttackSpeed = attackSpeedStat * Math.max(0.2, Number(fx.attackSpeedMul || 1));
        const attackIntervalMs = 1000 * (100 / boostedAttackSpeed);
        if (now - player.lastAttackAt < attackIntervalMs) return;
        player.lastAttackAt = now;

        const hitChance = this.computeHitChance(
            Number(player.stats?.accuracy || 0),
            Number(target.stats?.evasion || 0) + Number(this.getActiveSkillEffectAggregate(target, now).evasionAdd || 0)
        );
        if (Math.random() > hitChance) return;

        const isMagic = player.stats?.damageType === 'magic';
        let rawAttack = Number(isMagic ? player.stats?.magicAttack : player.stats?.physicalAttack) || 1;
        rawAttack *= Math.max(0.2, Number(fx.attackMul || 1));
        const critChance = Math.max(0, Math.min(0.95, Number(player.stats?.criticalChance || 0) + Number(fx.critAdd || 0)));
        if (Math.random() < critChance) rawAttack *= 1.5;
        const targetFx = this.getActiveSkillEffectAggregate(target, now);
        let targetDefense = Number(isMagic ? target.stats?.magicDefense : target.stats?.physicalDefense) || 0;
        targetDefense *= isMagic
            ? Math.max(0.1, Number(targetFx.magicDefenseMul || 1))
            : Math.max(0.1, Number(targetFx.defenseMul || 1));
        if (this.shouldLuckyStrike(player, target)) targetDefense *= 0.5;
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
        if (Number(player.hp || 0) !== attackerHpBefore) this.sendStatsUpdated(player);

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
}
