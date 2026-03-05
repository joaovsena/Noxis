"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = clamp;
exports.distance = distance;
exports.xpRequired = xpRequired;
exports.levelUpStats = levelUpStats;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function xpRequired(level) {
    return 100 + (level - 1) * 40;
}
function levelUpStats(baseStats, level) {
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
//# sourceMappingURL=math.js.map