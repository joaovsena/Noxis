"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestService = void 0;
const math_1 = require("../utils/math");
const NPC_INTERACT_RANGE = 170;
const NPCS = [
    {
        id: 'npc_guard_alden',
        name: 'Guarda Alden',
        mapKey: 'forest',
        mapId: 'Z1',
        x: 560,
        y: 560,
        role: 'quest_giver',
        greeting: 'Patrulheiro, preciso de ajuda na area.',
        hitbox: { w: 54, h: 80, offsetX: 0, offsetY: 0 },
        anchor: { x: 0.5, y: 1 },
        interactRange: 170,
        spriteKey: null
    },
    {
        id: 'npc_scout_lina',
        name: 'Exploradora Lina',
        mapKey: 'forest',
        mapId: 'Z1',
        x: 930,
        y: 680,
        role: 'quest_giver',
        greeting: 'Estou observando os movimentos dos monstros.',
        hitbox: { w: 54, h: 80, offsetX: 0, offsetY: 0 },
        anchor: { x: 0.5, y: 1 },
        interactRange: 170,
        spriteKey: null
    }
];
const QUESTS = [
    {
        id: 'q_forest_hunt_01',
        title: 'Limpeza da Clareira',
        description: 'Elimine monstros proximos para reduzir a pressao na entrada da floresta.',
        giverNpcId: 'npc_guard_alden',
        turnInNpcId: 'npc_guard_alden',
        objectives: [
            { id: 'kill_normal', type: 'kill', targetKinds: ['normal', 'elite'], required: 6, text: 'Derrote 6 monstros' }
        ],
        rewards: {
            xp: 120
        }
    },
    {
        id: 'q_forest_supply_01',
        title: 'Suprimentos de Emergencia',
        description: 'Alden precisa de pocoes para reforcar a guarnicao.',
        giverNpcId: 'npc_guard_alden',
        turnInNpcId: 'npc_guard_alden',
        objectives: [
            { id: 'collect_potions', type: 'collect', templateId: 'potion_hp', required: 3, text: 'Colete 3 Pocoes HP' }
        ],
        rewards: {
            xp: 150,
            items: [{ templateId: 'potion_hp', quantity: 2 }]
        }
    },
    {
        id: 'q_forest_report_01',
        title: 'Relatorio de Campo',
        description: 'Converse com a Exploradora Lina e retorne com informacoes.',
        giverNpcId: 'npc_guard_alden',
        turnInNpcId: 'npc_guard_alden',
        objectives: [
            { id: 'talk_lina', type: 'talk', npcId: 'npc_scout_lina', required: 1, text: 'Converse com Lina' }
        ],
        rewards: {
            xp: 180
        }
    }
];
const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));
class QuestService {
    constructor(sendRaw, persistPlayer, grantXp, grantRewardItem) {
        this.sendRaw = sendRaw;
        this.persistPlayer = persistPlayer;
        this.grantXp = grantXp;
        this.grantRewardItem = grantRewardItem;
    }
    getNpcsForMap(mapKey, mapId) {
        return NPCS.filter((n) => n.mapKey === mapKey && n.mapId === mapId).map((n) => ({
            id: n.id,
            name: n.name,
            x: n.x,
            y: n.y,
            role: n.role,
            spriteKey: n.spriteKey || null,
            hitbox: n.hitbox || { w: 54, h: 80, offsetX: 0, offsetY: 0 },
            anchor: n.anchor || { x: 0.5, y: 1 },
            interactRange: Number(n.interactRange || NPC_INTERACT_RANGE)
        }));
    }
    sendQuestState(player) {
        this.sendRaw(player.ws, {
            type: 'quest.state',
            quests: this.buildQuestStatePayload(player)
        });
    }
    handleNpcInteract(player, msg) {
        const npcId = String(msg?.npcId || '');
        const npc = NPC_BY_ID[npcId];
        if (!npc)
            return;
        if (npc.mapKey !== player.mapKey || npc.mapId !== player.mapId)
            return;
        const interactRange = Number(npc.interactRange || NPC_INTERACT_RANGE);
        if ((0, math_1.distance)(player, npc) > interactRange) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Voce esta longe demais do NPC.' });
            return;
        }
        const changedByTalk = this.applyTalkProgress(player, npc.id);
        const questState = this.getQuestState(player);
        const availableQuestIds = QUESTS
            .filter((q) => q.giverNpcId === npc.id)
            .filter((q) => !questState.completedIds.includes(q.id))
            .filter((q) => !questState.accepted[q.id])
            .map((q) => q.id);
        const turnInQuestIds = QUESTS
            .filter((q) => q.turnInNpcId === npc.id)
            .filter((q) => questState.accepted[q.id]?.status === 'ready')
            .map((q) => q.id);
        this.sendRaw(player.ws, {
            type: 'npc.dialog',
            npc: { id: npc.id, name: npc.name, greeting: npc.greeting },
            availableQuestIds,
            turnInQuestIds,
            quests: QUESTS
                .filter((q) => availableQuestIds.includes(q.id) || turnInQuestIds.includes(q.id))
                .map((q) => ({
                id: q.id,
                title: q.title,
                description: q.description,
                objectives: q.objectives.map((o) => ({ id: o.id, type: o.type, text: o.text, required: Number(o.required || 1) })),
                rewards: q.rewards
            }))
        });
        if (changedByTalk)
            this.sendQuestState(player);
    }
    handleQuestAccept(player, msg) {
        const questId = String(msg?.questId || '');
        const quest = QUEST_BY_ID[questId];
        if (!quest)
            return;
        const giver = NPC_BY_ID[quest.giverNpcId];
        const giverRange = Number(giver?.interactRange || NPC_INTERACT_RANGE);
        if (!giver || giver.mapKey !== player.mapKey || giver.mapId !== player.mapId || (0, math_1.distance)(player, giver) > giverRange) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Aproxime-se do NPC para aceitar a quest.' });
            return;
        }
        const state = this.getQuestState(player);
        if (state.completedIds.includes(questId)) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Essa quest ja foi concluida.' });
            return;
        }
        if (state.accepted[questId]) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Essa quest ja esta ativa.' });
            return;
        }
        const progress = {};
        for (const obj of quest.objectives)
            progress[obj.id] = 0;
        state.accepted[questId] = {
            status: 'active',
            progress,
            acceptedAt: Date.now()
        };
        this.setQuestState(player, state);
        this.persistPlayer(player);
        this.sendRaw(player.ws, { type: 'system_message', text: `Quest aceita: ${quest.title}` });
        this.sendQuestState(player);
    }
    handleQuestComplete(player, msg) {
        const questId = String(msg?.questId || '');
        const quest = QUEST_BY_ID[questId];
        if (!quest)
            return;
        const turnInNpc = NPC_BY_ID[quest.turnInNpcId];
        const turnInRange = Number(turnInNpc?.interactRange || NPC_INTERACT_RANGE);
        if (!turnInNpc || turnInNpc.mapKey !== player.mapKey || turnInNpc.mapId !== player.mapId || (0, math_1.distance)(player, turnInNpc) > turnInRange) {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Aproxime-se do NPC correto para concluir.' });
            return;
        }
        const state = this.getQuestState(player);
        const entry = state.accepted[questId];
        if (!entry || entry.status !== 'ready') {
            this.sendRaw(player.ws, { type: 'system_message', text: 'Objetivos da quest ainda nao concluidos.' });
            return;
        }
        entry.status = 'completed';
        entry.completedAt = Date.now();
        delete state.accepted[questId];
        if (!state.completedIds.includes(questId))
            state.completedIds.push(questId);
        this.setQuestState(player, state);
        this.persistPlayer(player);
        this.grantXp(player, Number(quest.rewards.xp || 0), { mapKey: player.mapKey, mapId: player.mapId });
        if (Array.isArray(quest.rewards.items)) {
            for (const reward of quest.rewards.items) {
                const left = this.grantRewardItem(player, String(reward.templateId), Math.max(1, Number(reward.quantity || 1)));
                if (left > 0) {
                    this.sendRaw(player.ws, { type: 'system_message', text: `Inventario cheio: faltou receber ${left}x ${reward.templateId}.` });
                }
            }
        }
        this.persistPlayer(player);
        this.sendRaw(player.ws, { type: 'system_message', text: `Quest concluida: ${quest.title}` });
        this.sendQuestState(player);
    }
    onMobKilled(player, mob) {
        const mobKind = String(mob?.kind || '');
        if (!mobKind)
            return;
        const state = this.getQuestState(player);
        let changed = false;
        for (const [questId, entry] of Object.entries(state.accepted)) {
            if (!entry || entry.status !== 'active')
                continue;
            const quest = QUEST_BY_ID[questId];
            if (!quest)
                continue;
            for (const obj of quest.objectives) {
                if (obj.type !== 'kill')
                    continue;
                if (Array.isArray(obj.targetKinds) && obj.targetKinds.length > 0 && !obj.targetKinds.includes(mobKind))
                    continue;
                const prev = Number(entry.progress[obj.id] || 0);
                const next = Math.min(Number(obj.required || 1), prev + 1);
                if (next !== prev) {
                    entry.progress[obj.id] = next;
                    changed = true;
                }
            }
            if (this.areAllObjectivesDone(quest, entry)) {
                entry.status = 'ready';
                changed = true;
                this.sendRaw(player.ws, { type: 'system_message', text: `Quest pronta para entrega: ${quest.title}` });
            }
        }
        if (!changed)
            return;
        this.setQuestState(player, state);
        this.persistPlayer(player);
        this.sendQuestState(player);
    }
    onItemCollected(player, templateId, quantity) {
        const tid = String(templateId || '');
        const qty = Math.max(0, Math.floor(Number(quantity || 0)));
        if (!tid || qty <= 0)
            return;
        const state = this.getQuestState(player);
        let changed = false;
        for (const [questId, entry] of Object.entries(state.accepted)) {
            if (!entry || entry.status !== 'active')
                continue;
            const quest = QUEST_BY_ID[questId];
            if (!quest)
                continue;
            for (const obj of quest.objectives) {
                if (obj.type !== 'collect')
                    continue;
                if (String(obj.templateId) !== tid)
                    continue;
                const prev = Number(entry.progress[obj.id] || 0);
                const next = Math.min(Number(obj.required || 1), prev + qty);
                if (next !== prev) {
                    entry.progress[obj.id] = next;
                    changed = true;
                }
            }
            if (this.areAllObjectivesDone(quest, entry)) {
                entry.status = 'ready';
                changed = true;
                this.sendRaw(player.ws, { type: 'system_message', text: `Quest pronta para entrega: ${quest.title}` });
            }
        }
        if (!changed)
            return;
        this.setQuestState(player, state);
        this.persistPlayer(player);
        this.sendQuestState(player);
    }
    buildQuestStatePayload(player) {
        const state = this.getQuestState(player);
        const out = [];
        for (const [questId, entry] of Object.entries(state.accepted)) {
            const quest = QUEST_BY_ID[questId];
            if (!quest)
                continue;
            out.push({
                id: quest.id,
                title: quest.title,
                description: quest.description,
                status: entry.status,
                giverNpcId: quest.giverNpcId,
                turnInNpcId: quest.turnInNpcId,
                objectives: quest.objectives.map((obj) => ({
                    id: obj.id,
                    type: obj.type,
                    text: obj.text,
                    current: Math.max(0, Math.floor(Number(entry.progress[obj.id] || 0))),
                    required: Math.max(1, Math.floor(Number(obj.required || 1)))
                })),
                rewards: quest.rewards
            });
        }
        return out;
    }
    areAllObjectivesDone(quest, entry) {
        return quest.objectives.every((obj) => Number(entry.progress[obj.id] || 0) >= Number(obj.required || 1));
    }
    applyTalkProgress(player, npcId) {
        const state = this.getQuestState(player);
        let changed = false;
        for (const [questId, entry] of Object.entries(state.accepted)) {
            if (!entry || entry.status !== 'active')
                continue;
            const quest = QUEST_BY_ID[questId];
            if (!quest)
                continue;
            for (const obj of quest.objectives) {
                if (obj.type !== 'talk')
                    continue;
                if (String(obj.npcId) !== String(npcId))
                    continue;
                const prev = Number(entry.progress[obj.id] || 0);
                const next = Math.min(Number(obj.required || 1), prev + 1);
                if (next !== prev) {
                    entry.progress[obj.id] = next;
                    changed = true;
                }
            }
            if (this.areAllObjectivesDone(quest, entry)) {
                entry.status = 'ready';
                changed = true;
                this.sendRaw(player.ws, { type: 'system_message', text: `Quest pronta para entrega: ${quest.title}` });
            }
        }
        if (!changed)
            return false;
        this.setQuestState(player, state);
        this.persistPlayer(player);
        return true;
    }
    getQuestState(player) {
        const overrides = player.statusOverrides && typeof player.statusOverrides === 'object'
            ? player.statusOverrides
            : {};
        const raw = overrides.__quests && typeof overrides.__quests === 'object'
            ? overrides.__quests
            : {};
        const accepted = raw.accepted && typeof raw.accepted === 'object' ? raw.accepted : {};
        const completedIdsRaw = Array.isArray(raw.completedIds) ? raw.completedIds : [];
        return {
            accepted: { ...accepted },
            completedIds: [...new Set(completedIdsRaw.map((id) => String(id || '')).filter(Boolean))]
        };
    }
    setQuestState(player, state) {
        if (!player.statusOverrides || typeof player.statusOverrides !== 'object')
            player.statusOverrides = {};
        player.statusOverrides.__quests = {
            accepted: state.accepted,
            completedIds: state.completedIds
        };
    }
}
exports.QuestService = QuestService;
//# sourceMappingURL=QuestService.js.map