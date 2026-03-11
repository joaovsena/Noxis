"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDungeonLayout = generateDungeonLayout;
function hashSeed(input) {
    let h = 2166136261;
    const s = String(input || 'seed');
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) || 1;
}
function rngFactory(seedInput) {
    let state = hashSeed(seedInput);
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        const v = state >>> 0;
        return v / 0xffffffff;
    };
}
function generateDungeonLayout(instanceId, template) {
    const rand = rngFactory(`${template.id}:${instanceId}`);
    const features = [];
    const room1Spawn = { x: 340, y: 2260 };
    const roomCenters = [
        { room: 2, x: 900, y: 1200 },
        { room: 3, x: 1500, y: 1450 },
        { room: 4, x: 1080, y: 1860 },
        { room: 5, x: 1600, y: 2320 },
        { room: 6, x: 2140, y: 1860 },
        { room: 7, x: 2520, y: 1410 },
        { room: 8, x: 2080, y: 980 }
    ];
    const mobSpawns = [];
    let mobSeq = 1;
    const pushPack = (cx, cy, count, radius) => {
        for (let i = 0; i < count; i++) {
            const angle = rand() * Math.PI * 2;
            const r = 20 + rand() * radius;
            const elite = rand() < 0.22;
            mobSpawns.push({
                id: `${elite ? 'mob_e' : 'mob_n'}_${mobSeq++}`,
                kind: elite ? 'elite' : 'normal',
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r,
                hpMultiplier: elite ? (1.08 + rand() * 0.2) : undefined
            });
        }
    };
    // Salas 2..8: cada horda tem de 2 a 8 mobs.
    for (const room of roomCenters) {
        const hordeSize = 2 + Math.floor(rand() * 7);
        pushPack(room.x, room.y, hordeSize, 130);
    }
    // Boss final apos as hordas.
    mobSpawns.push({
        id: 'boss_final',
        kind: 'boss',
        x: 1600,
        y: 700,
        hpMultiplier: 1.0,
        level: 7
    });
    return {
        mapKey: template.id,
        entrySpawn: room1Spawn,
        features,
        mobSpawns,
        doorFeature: null,
        bossAggroRange: 290
    };
}
//# sourceMappingURL=ProceduralDungeonGenerator.js.map