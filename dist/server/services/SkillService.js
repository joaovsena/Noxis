"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillService = void 0;
const config_1 = require("../config");
const math_1 = require("../utils/math");
class SkillService {
    constructor(skillDefs, sendRaw, normalizeClassId, getSkillLevel, pruneExpiredSkillEffects, applyTimedSkillEffect, sendSkillEffect, computeMobDamage, applyDamageToMobAndHandleDeath, broadcastMobHit, applyOnHitSkillEffects, hasActiveSkillEffect, removeSkillEffectById, getSkillPowerWithLevel, sendStatsUpdated, mapInstanceId, getMobs, getMobsByMap, assignPathTo, getSkillPrerequisite, normalizeSkillLevels, getAvailableSkillPoints, recomputePlayerStats, persistPlayer) {
        this.skillDefs = skillDefs;
        this.sendRaw = sendRaw;
        this.normalizeClassId = normalizeClassId;
        this.getSkillLevel = getSkillLevel;
        this.pruneExpiredSkillEffects = pruneExpiredSkillEffects;
        this.applyTimedSkillEffect = applyTimedSkillEffect;
        this.sendSkillEffect = sendSkillEffect;
        this.computeMobDamage = computeMobDamage;
        this.applyDamageToMobAndHandleDeath = applyDamageToMobAndHandleDeath;
        this.broadcastMobHit = broadcastMobHit;
        this.applyOnHitSkillEffects = applyOnHitSkillEffects;
        this.hasActiveSkillEffect = hasActiveSkillEffect;
        this.removeSkillEffectById = removeSkillEffectById;
        this.getSkillPowerWithLevel = getSkillPowerWithLevel;
        this.sendStatsUpdated = sendStatsUpdated;
        this.mapInstanceId = mapInstanceId;
        this.getMobs = getMobs;
        this.getMobsByMap = getMobsByMap;
        this.assignPathTo = assignPathTo;
        this.getSkillPrerequisite = getSkillPrerequisite;
        this.normalizeSkillLevels = normalizeSkillLevels;
        this.getAvailableSkillPoints = getAvailableSkillPoints;
        this.recomputePlayerStats = recomputePlayerStats;
        this.persistPlayer = persistPlayer;
        this.mobDotTokens = new Map();
    }
    processPendingSkillCast(player, now) {
        const pending = player.pendingSkillCast;
        if (!pending || typeof pending !== 'object')
            return;
        const issuedAt = Number(pending.issuedAt || 0);
        if (!Number.isFinite(issuedAt) || now - issuedAt > 7000) {
            player.pendingSkillCast = null;
            return;
        }
        const nextAttemptAt = Number(pending.nextAttemptAt || 0);
        if (now < nextAttemptAt)
            return;
        pending.nextAttemptAt = now + 150;
        this.handleSkillCast(player, {
            skillId: pending.skillId,
            targetMobId: pending.targetMobId || null,
            targetPlayerId: pending.targetPlayerId || null,
            __autoRetry: true
        });
    }
    handleSkillCast(player, msg) {
        if (player.dead || player.hp <= 0)
            return;
        const isAutoRetry = Boolean(msg?.__autoRetry);
        const skillId = String(msg?.skillId || '');
        const skill = this.skillDefs[skillId];
        if (!skill)
            return;
        const skillLevel = skillId === 'class_primary' || skillId === 'mod_fire_wing' ? 1 : this.getSkillLevel(player, skillId);
        if (skillId !== 'class_primary' && skillId !== 'mod_fire_wing' && skillLevel <= 0) {
            if (!isAutoRetry)
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
            if (!isAutoRetry)
                this.sendRaw(player.ws, { type: 'system_message', text: `Habilidade em recarga (${Math.ceil((nextAt - now) / 1000)}s).` });
            return;
        }
        const hpBeforeCast = Number(player.hp || 0);
        let targetMob = null;
        let mapInstanceId = '';
        if (skill.target === 'mob') {
            const targetMobId = String(msg?.targetMobId || player.attackTargetId || '');
            mapInstanceId = this.mapInstanceId(player.mapKey, player.mapId);
            targetMob = this.getMobs().find((m) => m.id === targetMobId && m.mapId === mapInstanceId);
            if (!targetMob) {
                player.pendingSkillCast = null;
                if (!isAutoRetry)
                    this.sendRaw(player.ws, { type: 'system_message', text: 'Selecione um alvo para usar a habilidade.' });
                return;
            }
            const currentDistance = (0, math_1.distance)(player, targetMob);
            const edgeDistance = currentDistance - (targetMob.size / 2 + config_1.PLAYER_HALF_SIZE);
            const range = Number(skill.range || 100);
            if (edgeDistance > range) {
                player.pendingSkillCast = {
                    skillId,
                    targetMobId: targetMob.id,
                    targetPlayerId: null,
                    issuedAt: Number(player.pendingSkillCast?.issuedAt || now),
                    nextAttemptAt: now + 150
                };
                this.assignPathTo(player, Number(targetMob.x), Number(targetMob.y));
                return;
            }
        }
        player.pendingSkillCast = null;
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
            const mobsInRange = this.getMobsByMap(mapInstanceId).filter((m) => {
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
            if (skill.id === 'arc_franco_ponteira_envenenada' && Number(targetMob.hp || 0) > 0) {
                this.applyMobDamageOverTime(player, targetMob, mapInstanceId, {
                    dotKey: 'arc_poison',
                    ticks: 4,
                    intervalMs: 1000,
                    damagePerTick: Math.max(1, Math.floor(damage * 0.24)),
                    effectKey: 'arc_poison_tick'
                });
            }
            if (skill.id === 'ass_letal_sentenca') {
                const delayedDamage = Math.max(1, Math.floor(damage * 0.75));
                setTimeout(() => {
                    const liveMob = this.getMobs().find((m) => m.id === targetMob.id && m.mapId === mapInstanceId);
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
    applyMobDamageOverTime(player, targetMob, mapInstanceId, config) {
        const key = `${config.dotKey}:${player.id}:${String(targetMob.id)}`;
        const token = Number(this.mobDotTokens.get(key) || 0) + 1;
        this.mobDotTokens.set(key, token);
        const ticks = Math.max(1, Math.floor(Number(config.ticks || 1)));
        const intervalMs = Math.max(250, Math.floor(Number(config.intervalMs || 1000)));
        const damagePerTick = Math.max(1, Math.floor(Number(config.damagePerTick || 1)));
        for (let i = 1; i <= ticks; i++) {
            setTimeout(() => {
                const activeToken = Number(this.mobDotTokens.get(key) || 0);
                if (activeToken !== token)
                    return;
                const liveMob = this.getMobs().find((m) => m.id === targetMob.id && m.mapId === mapInstanceId);
                if (!liveMob || Number(liveMob.hp || 0) <= 0)
                    return;
                this.applyDamageToMobAndHandleDeath(player, liveMob, damagePerTick, Date.now());
                this.broadcastMobHit(player, liveMob);
                this.sendSkillEffect(player.mapKey, player.mapId, {
                    sourceId: player.id,
                    targetId: liveMob.id,
                    x: liveMob.x,
                    y: liveMob.y,
                    effectKey: config.effectKey
                });
            }, i * intervalMs);
        }
    }
    handleSkillLearn(player, msg) {
        const skillId = String(msg?.skillId || '');
        const skill = this.skillDefs[skillId];
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
}
exports.SkillService = SkillService;
//# sourceMappingURL=SkillService.js.map