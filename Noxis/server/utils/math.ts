export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function xpRequired(level: number): number {
    return 100 + (level - 1) * 40;
}

export function levelUpStats(baseStats: any, level: number): any {
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