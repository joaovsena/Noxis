"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUNGEON_BY_ENTRY_PORTAL = exports.DUNGEON_BY_ENTRY_NPC = exports.DUNGEON_BY_ID = exports.DUNGEON_TEMPLATES = void 0;
exports.DUNGEON_TEMPLATES = [
    {
        id: 'dng_forest_ruins_mvp',
        name: 'Ruinas de Alder',
        description: 'Instancia curta para grupo: limpe os corredores e derrote o Guardiao das Ruinas.',
        mapKey: 'forest',
        mapAssetKey: 'dungeon1',
        maxPlayers: 4,
        entryNpcId: 'npc_dungeon_warden',
        entryPortalId: 'forest_dungeon_ruins_01',
        entrySpawn: { x: 420, y: 420 },
        exitSpawn: { mapKey: 'forest', mapId: 'Z1', x: 610, y: 540 },
        mobs: [
            { id: 'pack_1_a', kind: 'normal', x: 560, y: 460 },
            { id: 'pack_1_b', kind: 'normal', x: 620, y: 480 },
            { id: 'pack_1_c', kind: 'elite', x: 690, y: 500, hpMultiplier: 1.15 },
            { id: 'pack_2_a', kind: 'normal', x: 860, y: 560 },
            { id: 'pack_2_b', kind: 'elite', x: 930, y: 590, hpMultiplier: 1.2 },
            { id: 'pack_2_c', kind: 'normal', x: 980, y: 620 },
            { id: 'boss_guardian', kind: 'boss', x: 1320, y: 710, hpMultiplier: 0.75, level: 4 }
        ],
        rewards: {
            currency: { gold: 1, silver: 20 },
            items: [{ templateId: 'skill_reset_hourglass', quantity: 1 }]
        },
        bossMechanics: {
            shockwaveIntervalMs: 7000,
            shockwaveDamagePctMaxHp: 0.08,
            addSummonHpThresholdPct: 0.6,
            addSpawns: [
                { id: 'add_1', kind: 'elite', x: 1210, y: 640, hpMultiplier: 0.9 },
                { id: 'add_2', kind: 'elite', x: 1420, y: 760, hpMultiplier: 0.9 }
            ]
        }
    }
];
exports.DUNGEON_BY_ID = Object.fromEntries(exports.DUNGEON_TEMPLATES.map((d) => [d.id, d]));
exports.DUNGEON_BY_ENTRY_NPC = Object.fromEntries(exports.DUNGEON_TEMPLATES.filter((d) => d.entryNpcId).map((d) => [String(d.entryNpcId), d]));
exports.DUNGEON_BY_ENTRY_PORTAL = Object.fromEntries(exports.DUNGEON_TEMPLATES.filter((d) => d.entryPortalId).map((d) => [String(d.entryPortalId), d]));
//# sourceMappingURL=dungeons.js.map