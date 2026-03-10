import { randomUUID } from 'crypto';
import { PlayerRuntime } from '../models/types';
import { DungeonTemplate, DUNGEON_BY_ENTRY_NPC, DUNGEON_BY_ID } from '../content/dungeons';
import { clamp, distance } from '../utils/math';
import { WORLD, composeMapInstanceId } from '../config';
import { DungeonMap } from './DungeonMap';
import { generateDungeonLayout } from './ProceduralDungeonGenerator';

type SendRawFn = (ws: any, payload: any) => void;
type SendStatsUpdatedFn = (player: PlayerRuntime) => void;
type PersistPlayerFn = (player: PlayerRuntime) => void;
type PersistPlayerCriticalFn = (player: PlayerRuntime, reason?: string) => void;
type GrantCurrencyFn = (player: PlayerRuntime, reward: any, sourceLabel: string) => void;
type ProjectToWalkableFn = (mapKey: string, x: number, y: number) => { x: number; y: number };
type RemoveGroundItemsByMapInstanceFn = (mapInstanceId: string) => void;
type DropTemplateAtFn = (
    x: number,
    y: number,
    mapId: string,
    templateId: string,
    ownerId?: number | null,
    ownerPartyId?: string | null,
    reservedMs?: number
) => void;

const DUNGEON_EMPTY_TIMEOUT_MS = 20_000;
const DUNGEON_CLEANUP_AFTER_COMPLETE_MS = 5 * 60_000;
const DUNGEON_ENTRY_RANGE = 190;
const READY_CHECK_TIMEOUT_MS = 15_000;
const TELEPORT_READY_CHECK_TIMEOUT_MS = 8_000;
const TELEPORT_ACCEPT_DELAY_MS = 10_000;

export class DungeonService {
    private readonly instances = new Map<string, DungeonMap>();
    private readonly playerToInstanceId = new Map<number, string>();
    private readonly partyToOpenInstanceId = new Map<string, string>();
    private readonly emptySince = new Map<string, number>();
    private readonly readyCheckToInstanceId = new Map<string, string>();
    private readonly pendingTeleportByRequestId = new Map<string, { instanceId: string; acceptedIds: number[]; teleportAt: number }>();

    constructor(
        private readonly players: Map<number, PlayerRuntime>,
        private readonly mobService: any,
        private readonly sendRaw: SendRawFn,
        private readonly sendStatsUpdated: SendStatsUpdatedFn,
        private readonly persistPlayer: PersistPlayerFn,
        private readonly persistPlayerCritical: PersistPlayerCriticalFn,
        private readonly grantCurrency: GrantCurrencyFn,
        private readonly projectToWalkable: ProjectToWalkableFn,
        private readonly removeGroundItemsByMapInstance: RemoveGroundItemsByMapInstanceFn,
        private readonly dropTemplateAt: DropTemplateAtFn
    ) {}

    getDungeonEntryForNpc(npcId: string) {
        const template = DUNGEON_BY_ENTRY_NPC[String(npcId || '')];
        if (!template) return null;
        return {
            templateId: template.id,
            name: template.name,
            description: template.description,
            maxPlayers: template.maxPlayers
        };
    }

    getNpcUiStateForPlayer(player: PlayerRuntime, npcId: string) {
        const template = DUNGEON_BY_ENTRY_NPC[String(npcId || '')];
        if (!template) return null;
        const partyId = String(player.partyId || '');
        const opened = partyId ? Boolean(this.getOpenInstanceForParty(partyId)) : false;
        return {
            opened
        };
    }

    getDebugSnapshot() {
        return [...this.instances.values()].map((instance) => {
            const members = instance.getMemberIds().map((playerId) => {
                const player = this.players.get(playerId);
                const state = instance.players.get(playerId);
                return {
                    playerId,
                    name: player?.name || `#${playerId}`,
                    connected: Boolean(state?.connected),
                    ready: Boolean(state?.ready),
                    onlineInside: Boolean(
                        player
                        && player.mapKey === instance.mapKey
                        && player.mapId === instance.mapId
                    ),
                    dead: Boolean(player?.dead),
                    hp: Number(player?.hp || 0)
                };
            });
            const bossId = String(instance.bossRuntimeId || '');
            const boss = bossId ? this.mobService.getMobById(bossId) : null;
            return {
                id: instance.id,
                templateId: instance.template.id,
                mapKey: instance.mapKey,
                mapId: instance.mapId,
                state: instance.state,
                locked: instance.locked,
                doorLocked: instance.doorLocked,
                readyCheckId: instance.readyCheckId,
                readyDeadlineAt: instance.readyDeadlineAt,
                cleanupAt: instance.cleanupAt,
                mobCount: instance.mobs.size,
                boss: boss
                    ? {
                        runtimeId: bossId,
                        hp: Number(boss.hp || 0),
                        maxHp: Number(boss.maxHp || 0)
                    }
                    : null,
                members
            };
        });
    }

    tryEnterByNpc(player: PlayerRuntime, npc: any, modeRaw?: string) {
        const entry = this.getDungeonEntryForNpc(String(npc?.id || ''));
        if (!entry) return { ok: false, message: 'NPC sem dungeon configurada.' };
        if (distance(player, npc as any) > Math.max(DUNGEON_ENTRY_RANGE, Number(npc?.interactRange || 170))) {
            return { ok: false, message: 'Aproxime-se do NPC para iniciar a expedicao.' };
        }
        const partyId = String(player.partyId || '');
        if (!partyId) return { ok: false, message: 'Entrada permitida apenas para jogadores em grupo.' };
        const opened = this.getOpenInstanceForParty(partyId);
        const modeValue = String(modeRaw || '').toLowerCase();
        const mode = modeValue === 'group'
            ? 'group'
            : modeValue === 'solo'
                ? 'solo'
                : modeValue === 'open'
                    ? 'open'
                    : 'self';
        if (!opened) {
            return this.startReadyCheck(player, entry.templateId);
        }
        if (mode === 'group' && this.canUseGroupTeleport(player)) {
            return this.startTeleportReadyCheck(player, opened);
        }
        this.teleportPlayerIntoInstance(player, opened);
        this.sendRaw(player.ws, { type: 'system_message', text: `Voce entrou na dungeon ${opened.template.name}.` });
        return { ok: true, message: 'Teleporte realizado.' };
    }

    handleReadyResponse(player: PlayerRuntime, requestId: string, accept: boolean) {
        const instanceId = this.readyCheckToInstanceId.get(String(requestId || ''));
        if (!instanceId) return;
        const instance = this.instances.get(instanceId);
        if (!instance || instance.state !== 'ready_check') return;
        if (!instance.readyMemberIds.includes(player.id)) return;
        instance.markReady(player.id, Boolean(accept));
        this.broadcastReadyState(instance, instance.readyMemberIds);
    }

    leaveDungeon(player: PlayerRuntime, reason: string = 'Saida voluntaria') {
        const instanceId = this.playerToInstanceId.get(player.id);
        if (!instanceId) return false;
        const instance = this.instances.get(instanceId);
        if (!instance) {
            this.playerToInstanceId.delete(player.id);
            return false;
        }
        this.teleportPlayerToOrigin(player, instance);
        this.sendRaw(player.ws, { type: 'system_message', text: reason });
        this.onPlayerExitedInstance(instance, player.id);
        return true;
    }

    onMobKilled(_killer: PlayerRuntime, mob: any) {
        const instanceId = String(mob?.eventId || '');
        if (!instanceId) return;
        const instance = this.instances.get(instanceId);
        if (!instance || instance.state !== 'active') return;

        instance.mobs.delete(String(mob.id || ''));
        if (String(mob.id || '') === String(instance.bossRuntimeId || '')) {
            this.completeInstance(instance);
        }
    }

    onPlayerDisconnected(playerId: number) {
        const instanceId = this.playerToInstanceId.get(playerId);
        if (!instanceId) return;
        const instance = this.instances.get(instanceId);
        if (!instance) {
            this.playerToInstanceId.delete(playerId);
            return;
        }
        instance.setConnected(playerId, false);
        this.onPlayerExitedInstance(instance, playerId, true);
    }

    tick(now: number) {
        for (const instance of this.instances.values()) {
            if (instance.state === 'ready_check') {
                this.tickReadyCheck(instance, now);
                continue;
            }
            if (instance.state === 'active') {
                this.tickBossAndWipe(instance, now);
                this.checkEmptyInstance(instance, now);
                continue;
            }
            if (instance.cleanupAt && now >= instance.cleanupAt) {
                this.cleanupInstance(instance, 'completed_cleanup');
            }
        }
        this.tickPendingTeleports(now);
    }

    private startReadyCheck(leader: PlayerRuntime, templateId: string) {
        const template = DUNGEON_BY_ID[String(templateId || '')];
        if (!template) return { ok: false, message: 'Dungeon nao encontrada.' };
        if (leader.dead || leader.hp <= 0) return { ok: false, message: 'Voce esta morto e nao pode entrar.' };
        if (this.playerToInstanceId.has(leader.id)) return { ok: false, message: 'Voce ja esta em uma expedicao.' };
        if (!leader.partyId) return { ok: false, message: 'Entrada permitida apenas para jogadores em grupo.' };
        if (this.getOpenInstanceForParty(String(leader.partyId || ''))) {
            return { ok: false, message: 'Ja existe uma dungeon aberta para o seu grupo.' };
        }

        const group = this.resolveEntryGroup(leader, template.maxPlayers);
        if (group.length <= 0) return { ok: false, message: 'Nenhum membro elegivel para o ready check.' };
        const alreadyIn = group.find((p) => this.playerToInstanceId.has(p.id));
        if (alreadyIn) return { ok: false, message: `${alreadyIn.name} ja esta em uma expedicao.` };

        const instance = this.createInstance(template, group);
        instance.state = 'ready_check';
        instance.readyPurpose = 'open';
        instance.ownerPartyId = String(leader.partyId || '');
        instance.readyCheckId = `RDY-${randomUUID().slice(0, 8)}`;
        instance.readyDeadlineAt = Date.now() + READY_CHECK_TIMEOUT_MS;
        instance.readyMemberIds = group.map((m) => m.id);
        this.readyCheckToInstanceId.set(String(instance.readyCheckId), instance.id);

        for (const memberId of instance.readyMemberIds) {
            const member = this.players.get(memberId);
            if (!member) continue;
            this.sendRaw(member.ws, {
                type: 'dungeon.readyCheck',
                requestId: instance.readyCheckId,
                purpose: 'open',
                dungeon: {
                    templateId: template.id,
                    name: template.name,
                    maxPlayers: template.maxPlayers
                },
                timeoutMs: READY_CHECK_TIMEOUT_MS,
                members: instance.readyMemberIds.map((id) => ({
                    playerId: id,
                    name: this.players.get(id)?.name || `#${id}`,
                    ready: Boolean(instance.players.get(id)?.ready),
                    responded: Boolean(instance.players.get(id)?.responded)
                }))
            });
        }
        return { ok: true, message: 'Ready Check de abertura iniciado.', requestId: instance.readyCheckId };
    }

    private createInstance(template: DungeonTemplate, members: PlayerRuntime[]) {
        const instanceId = `DNG-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
        const mapId = instanceId;
        const layout = generateDungeonLayout(instanceId, template);
        const mapKey = layout.mapKey;
        const mapInstanceId = composeMapInstanceId(mapKey, mapId);
        const instance = new DungeonMap(instanceId, template, mapKey, mapId, mapInstanceId, Date.now());
        instance.generatedFeatures = layout.features;
        instance.doorFeature = layout.doorFeature;
        instance.entrySpawn = { x: Number(layout.entrySpawn.x), y: Number(layout.entrySpawn.y) };
        instance.bossAggroRange = Math.max(80, Number(layout.bossAggroRange || 260));
        for (const member of members) {
            instance.addPlayer(member.id, {
                mapKey: String(member.mapKey || 'forest'),
                mapId: String(member.mapId || 'Z1'),
                x: Number(member.x || 0),
                y: Number(member.y || 0)
            });
        }
        this.instances.set(instance.id, instance);
        return instance;
    }

    private resolveEntryGroup(leader: PlayerRuntime, maxPlayers: number) {
        if (!leader.partyId) return [];
        const samePlace = [...this.players.values()].filter((p) =>
            String(p.partyId || '') === String(leader.partyId || '')
            && p.mapKey === leader.mapKey
            && p.mapId === leader.mapId
            && !p.dead
            && p.hp > 0
        );
        samePlace.sort((a, b) => (Number(a.id) === Number(leader.id) ? -1 : Number(b.id) === Number(leader.id) ? 1 : 0));
        return samePlace.slice(0, maxPlayers);
    }

    private resolvePartyOnlineMembers(partyId: string, maxPlayers: number) {
        return [...this.players.values()]
            .filter((p) =>
                String(p.partyId || '') === String(partyId || '')
                && !p.dead
                && p.hp > 0
            )
            .slice(0, maxPlayers);
    }

    private startTeleportReadyCheck(leader: PlayerRuntime, instance: DungeonMap) {
        if (!leader.partyId) return { ok: false, message: 'Entrada permitida apenas para jogadores em grupo.' };
        const members = this.resolvePartyOnlineMembers(String(leader.partyId || ''), instance.template.maxPlayers);
        if (!members.length) return { ok: false, message: 'Nenhum membro elegivel para teleporte.' };

        for (const member of members) {
            const hasState = instance.players.has(member.id);
            if (!hasState) {
                instance.addPlayer(member.id, {
                    mapKey: String(member.mapKey || 'forest'),
                    mapId: String(member.mapId || 'Z1'),
                    x: Number(member.x || 0),
                    y: Number(member.y || 0)
                });
            }
            const state = instance.players.get(member.id);
            if (!state) continue;
            state.responded = false;
            state.ready = false;
            state.connected = true;
        }

        instance.state = 'ready_check';
        instance.readyPurpose = 'teleport';
        instance.readyCheckId = `RDY-${randomUUID().slice(0, 8)}`;
        instance.readyDeadlineAt = Date.now() + TELEPORT_READY_CHECK_TIMEOUT_MS;
        instance.readyMemberIds = members.map((m) => m.id);
        this.readyCheckToInstanceId.set(String(instance.readyCheckId), instance.id);
        for (const memberId of instance.readyMemberIds) {
            const member = this.players.get(memberId);
            if (!member) continue;
            this.sendRaw(member.ws, {
                type: 'dungeon.readyCheck',
                requestId: instance.readyCheckId,
                purpose: 'teleport',
                dungeon: {
                    templateId: instance.template.id,
                    name: instance.template.name,
                    maxPlayers: instance.template.maxPlayers
                },
                timeoutMs: TELEPORT_READY_CHECK_TIMEOUT_MS,
                members: instance.readyMemberIds.map((id) => ({
                    playerId: id,
                    name: this.players.get(id)?.name || `#${id}`,
                    ready: Boolean(instance.players.get(id)?.ready),
                    responded: Boolean(instance.players.get(id)?.responded)
                }))
            });
        }
        this.broadcastReadyState(instance, instance.readyMemberIds);
        return { ok: true, message: 'Ready Check de teleporte iniciado.', requestId: instance.readyCheckId };
    }

    private canUseGroupTeleport(player: PlayerRuntime) {
        const partyId = String(player.partyId || '');
        if (!partyId) return false;
        const partyMembers = [...this.players.values()].filter((p) => String(p.partyId || '') === partyId);
        return partyMembers.length > 1;
    }

    private getOpenInstanceForParty(partyId: string) {
        const instanceId = this.partyToOpenInstanceId.get(String(partyId || ''));
        if (!instanceId) return null;
        const instance = this.instances.get(instanceId) || null;
        if (!instance) {
            this.partyToOpenInstanceId.delete(String(partyId || ''));
            return null;
        }
        return instance;
    }

    private areReadyMembersResolved(instance: DungeonMap) {
        if (!instance.readyMemberIds.length) return false;
        for (const memberId of instance.readyMemberIds) {
            if (!instance.players.get(memberId)?.responded) return false;
        }
        return true;
    }

    private tickReadyCheck(instance: DungeonMap, now: number) {
        if (!instance.readyDeadlineAt || !instance.readyCheckId) return;
        if (this.areReadyMembersResolved(instance)) {
            this.finalizeReadyCheck(instance);
            return;
        }
        if (now < instance.readyDeadlineAt) return;
        this.finalizeReadyCheck(instance);
    }

    private finalizeReadyCheck(instance: DungeonMap) {
        const acceptedIds = instance.readyMemberIds.filter((id) => Boolean(instance.players.get(id)?.ready));
        if (acceptedIds.length <= 0) {
            const missing = instance.readyMemberIds
                .filter((id) => !instance.players.get(id)?.responded)
                .map((id) => this.players.get(id)?.name || `#${id}`);
            for (const memberId of instance.readyMemberIds) {
                const member = this.players.get(memberId);
                if (!member) continue;
                const suffix = missing.length ? ` Ausentes: ${missing.join(', ')}` : '';
                this.sendRaw(member.ws, {
                    type: 'system_message',
                    text: `Ready Check encerrado sem confirmacoes.${suffix}`
                });
            }
            this.destroyReadyCheck(instance);
            this.instances.delete(instance.id);
            return;
        }
        if (instance.readyPurpose === 'open') {
            const total = instance.readyMemberIds.length;
            if (acceptedIds.length < total) {
                for (const memberId of instance.readyMemberIds) {
                    const member = this.players.get(memberId);
                    if (!member) continue;
                    this.sendRaw(member.ws, {
                        type: 'system_message',
                        text: 'Abertura cancelada: todos os membros precisam confirmar.'
                    });
                }
                this.destroyReadyCheck(instance);
                this.instances.delete(instance.id);
                return;
            }
            this.destroyReadyCheck(instance);
            instance.state = 'open';
            if (instance.ownerPartyId) this.partyToOpenInstanceId.set(instance.ownerPartyId, instance.id);
            for (const memberId of instance.readyMemberIds) {
                const member = this.players.get(memberId);
                if (!member) continue;
                this.sendRaw(member.ws, {
                    type: 'system_message',
                    text: `Dungeon aberta: ${instance.template.name}. Use o NPC para teleportar.`
                });
            }
            return;
        }
        const acceptedSet = new Set<number>(acceptedIds);
        for (const memberId of instance.readyMemberIds) {
            if (acceptedSet.has(memberId)) continue;
            const member = this.players.get(memberId);
            if (!member) continue;
            this.sendRaw(member.ws, {
                type: 'system_message',
                text: 'Ready Check finalizado: voce nao foi teleportado.'
            });
        }
        const teleportAt = Date.now() + TELEPORT_ACCEPT_DELAY_MS;
        const readyId = String(instance.readyCheckId || '');
        if (readyId && acceptedIds.length > 0) {
            this.pendingTeleportByRequestId.set(readyId, {
                instanceId: instance.id,
                acceptedIds: [...acceptedIds],
                teleportAt
            });
            this.broadcastReadyState(instance, instance.readyMemberIds, {
                phase: 'teleport_queued',
                teleportAt
            });
        }
        for (const memberId of acceptedIds) {
            const member = this.players.get(memberId);
            if (!member) continue;
            this.sendRaw(member.ws, {
                type: 'system_message',
                text: `Entrada confirmada. Teleporte em ${Math.floor(TELEPORT_ACCEPT_DELAY_MS / 1000)}s.`
            });
        }
        this.destroyReadyCheck(instance);
    }

    private broadcastReadyState(instance: DungeonMap, targetMemberIds?: number[], extraPayload: Record<string, any> = {}) {
        if (!instance.readyCheckId) return;
        const memberIds = Array.isArray(targetMemberIds) && targetMemberIds.length
            ? targetMemberIds
            : instance.getMemberIds();
        const payload = {
            type: 'dungeon.readyUpdate',
            requestId: instance.readyCheckId,
            members: memberIds.map((id) => ({
                playerId: id,
                name: this.players.get(id)?.name || `#${id}`,
                ready: Boolean(instance.players.get(id)?.ready),
                responded: Boolean(instance.players.get(id)?.responded)
            })),
            ...extraPayload
        };
        for (const memberId of memberIds) {
            const member = this.players.get(memberId);
            if (!member) continue;
            this.sendRaw(member.ws, payload);
        }
    }

    private tickPendingTeleports(now: number) {
        for (const [requestId, pending] of this.pendingTeleportByRequestId.entries()) {
            if (now < Number(pending.teleportAt || 0)) continue;
            const instance = this.instances.get(String(pending.instanceId || ''));
            if (!instance) {
                this.pendingTeleportByRequestId.delete(requestId);
                continue;
            }
            this.ensureInstanceActive(instance);
            for (const memberId of pending.acceptedIds) {
                const member = this.players.get(memberId);
                if (!member) continue;
                this.teleportPlayerIntoInstance(member, instance);
            }
            this.pendingTeleportByRequestId.delete(requestId);
        }
    }

    private ensureInstanceActive(instance: DungeonMap) {
        instance.state = 'active';
        instance.locked = false;
        instance.cleanupAt = null;
        instance.addsSummoned = false;
        instance.nextShockwaveAt = Date.now() + Math.max(1000, Number(instance.template.bossMechanics.shockwaveIntervalMs || 7000));
        if (instance.mobsSpawned) return;
        instance.mobsSpawned = true;
        const layout = generateDungeonLayout(instance.id, instance.template);
        this.spawnTemplateMobs(instance, layout.mobSpawns);
    }

    private teleportPlayerIntoInstance(player: PlayerRuntime, instance: DungeonMap) {
        this.ensureInstanceActive(instance);
        this.playerToInstanceId.set(player.id, instance.id);
        this.movePlayerToInstance(player, instance);
        this.sendRaw(player.ws, {
            type: 'system_message',
            text: `Expedicao iniciada: ${instance.template.name}.`
        });
    }

    private movePlayerToInstance(player: PlayerRuntime, instance: DungeonMap) {
        const spawnBase = instance.entrySpawn || instance.template.entrySpawn;
        const jitter = String(instance.mapKey || '').startsWith('dng_') ? 0 : 20;
        const spawn = this.projectToWalkable(
            instance.mapKey,
            clamp(Number(spawnBase.x || 0) + (Math.random() * (jitter * 2) - jitter), 0, WORLD.width),
            clamp(Number(spawnBase.y || 0) + (Math.random() * (jitter * 2) - jitter), 0, WORLD.height)
        );
        player.mapKey = instance.mapKey;
        player.mapId = instance.mapId;
        player.x = spawn.x;
        player.y = spawn.y;
        player.targetX = spawn.x;
        player.targetY = spawn.y;
        // Limpa vetores e estado de movimento/combate para evitar desync de transicao.
        player.movePath = [];
        player.rawMovePath = [];
        player.pathDestinationX = spawn.x;
        player.pathDestinationY = spawn.y;
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        this.persistPlayer(player);
    }

    private spawnTemplateMobs(instance: DungeonMap, spawns: any[]) {
        for (const def of spawns) {
            const projected = this.projectToWalkable(
                instance.mapKey,
                clamp(Number(def.x || 0), 0, WORLD.width),
                clamp(Number(def.y || 0), 0, WORLD.height)
            );
            const spawned = this.mobService.createMobWithOverrides(
                String(def.kind || 'normal'),
                instance.mapInstanceId,
                {
                    x: projected.x,
                    y: projected.y,
                    homeX: projected.x,
                    homeY: projected.y,
                    spawnX: projected.x,
                    spawnY: projected.y,
                    noRespawn: true,
                    eventId: instance.id,
                    eventName: instance.template.id,
                    level: Number.isFinite(Number(def.level)) ? Number(def.level) : 1
                },
                { skipQuota: true }
            );
            if (!spawned) continue;
            if (Number.isFinite(Number(def.hpMultiplier)) && Number(def.hpMultiplier) > 0) {
                const mult = Number(def.hpMultiplier);
                spawned.maxHp = Math.max(1, Math.floor(Number(spawned.maxHp || 1) * mult));
                spawned.hp = spawned.maxHp;
            }
            instance.mobs.set(String(spawned.id), { ...def, runtimeId: String(spawned.id) });
            if (String(def.kind) === 'boss') {
                instance.bossRuntimeId = String(spawned.id);
                instance.bossMaxHp = Number(spawned.maxHp || 1);
            }
        }
    }

    private tickBossAndWipe(instance: DungeonMap, now: number) {
        const bossId = String(instance.bossRuntimeId || '');
        if (!bossId) return;
        const boss = this.mobService.getMobById(bossId);
        if (!boss || Number(boss.hp || 0) <= 0) return;

        const hasAggro = Number(boss.targetPlayerId || 0) > 0
            || this.getOnlineInstanceMembers(instance).some((p) => distance(p, boss as any) <= instance.bossAggroRange);
        if (!instance.locked && hasAggro) {
            instance.locked = true;
            this.setBossDoorLocked(instance, true);
            this.sendToInstance(instance, { type: 'system_message', text: 'Lockdown ativado: sala do boss selada.' });
        }

        if (instance.locked) {
            const aliveOrConnected = this.getOnlineInstanceMembers(instance).some((p) => !p.dead && Number(p.hp || 0) > 0);
            if (!aliveOrConnected) {
                this.resetBossEncounter(instance, boss);
                return;
            }
        }

        if (now >= instance.nextShockwaveAt) {
            instance.nextShockwaveAt = now + Math.max(1000, Number(instance.template.bossMechanics.shockwaveIntervalMs || 7000));
            this.applyShockwave(instance, boss);
        }

        const hpPct = Number(boss.hp || 0) / Math.max(1, Number(boss.maxHp || 1));
        const threshold = Math.max(0.1, Math.min(0.95, Number(instance.template.bossMechanics.addSummonHpThresholdPct || 0.6)));
        if (!instance.addsSummoned && hpPct <= threshold) {
            instance.addsSummoned = true;
            this.spawnTemplateMobs(instance, instance.template.bossMechanics.addSpawns || []);
            const addRuntimeIds = [...instance.mobs.values()]
                .filter((m) => (instance.template.bossMechanics.addSpawns || []).some((s) => s.id === m.id))
                .map((m) => String(m.runtimeId || ''))
                .filter(Boolean);
            for (const addId of addRuntimeIds) instance.addMobRuntimeIds.add(addId);
            this.sendToInstance(instance, { type: 'system_message', text: 'Mecanica do boss: reforcos invocados!' });
        }
    }

    private resetBossEncounter(instance: DungeonMap, boss: any) {
        boss.hp = Math.max(1, Number(instance.bossMaxHp || boss.maxHp || 1));
        boss.maxHp = Math.max(1, Number(instance.bossMaxHp || boss.maxHp || 1));
        boss.targetPlayerId = null;
        boss.hateTable = {};
        instance.locked = false;
        this.setBossDoorLocked(instance, false);
        instance.addsSummoned = false;
        for (const addId of instance.addMobRuntimeIds.values()) {
            this.mobService.removeMob(addId, { skipRespawn: true });
            instance.mobs.delete(addId);
        }
        instance.addMobRuntimeIds.clear();
        this.sendToInstance(instance, { type: 'system_message', text: 'Wipe detectado. Boss resetado e sala reaberta.' });
    }

    private applyShockwave(instance: DungeonMap, boss: any) {
        if (!instance.locked) return;
        const damagePct = Math.max(0.01, Math.min(0.4, Number(instance.template.bossMechanics.shockwaveDamagePctMaxHp || 0.08)));
        this.sendToInstance(instance, { type: 'system_message', text: 'Mecanica do boss: Onda de choque!' });
        for (const member of this.getOnlineInstanceMembers(instance)) {
            if (member.dead || member.hp <= 0) continue;
            const damage = Math.max(12, Math.floor(Number(member.maxHp || 100) * damagePct));
            member.hp = Math.max(1, Number(member.hp || 0) - damage);
            member.lastCombatAt = Date.now();
            this.sendStatsUpdated(member);
            this.sendRaw(member.ws, {
                type: 'combat.mobHitPlayer',
                mobId: String(boss.id || 'boss'),
                mobX: Number(boss.x || 0),
                mobY: Number(boss.y || 0),
                targetId: member.id,
                targetX: Number(member.x || 0),
                targetY: Number(member.y || 0),
                damage,
                targetHp: member.hp,
                targetMaxHp: member.maxHp
            });
            this.persistPlayer(member);
        }
    }

    private completeInstance(instance: DungeonMap) {
        if (instance.state !== 'active') return;
        instance.state = 'completed';
        instance.cleanupAt = Date.now() + DUNGEON_CLEANUP_AFTER_COMPLETE_MS;
        instance.locked = false;
        this.setBossDoorLocked(instance, false);

        // Recompensa por moeda imediata + itens no chao por dono (owner_id + party reserve 60s).
        for (const member of this.getOnlineInstanceMembers(instance)) {
            if (instance.template.rewards.currency) {
                this.grantCurrency(member, instance.template.rewards.currency, `Dungeon: ${instance.template.name}`);
            }
            if (Array.isArray(instance.template.rewards.items)) {
                let idx = 0;
                for (const item of instance.template.rewards.items) {
                    const qty = Math.max(1, Number(item.quantity || 1));
                    for (let i = 0; i < qty; i++) {
                        const angle = (Math.PI * 2 * idx) / Math.max(1, qty);
                        const rx = member.x + Math.cos(angle) * 24;
                        const ry = member.y + Math.sin(angle) * 24;
                        this.dropTemplateAt(
                            rx,
                            ry,
                            instance.mapInstanceId,
                            String(item.templateId),
                            member.id,
                            String(member.partyId || '') || null,
                            60_000
                        );
                        idx += 1;
                    }
                }
            }
            this.persistPlayerCritical(member, 'dungeon_complete');
            this.sendRaw(member.ws, {
                type: 'system_message',
                text: `Boss derrotado. A instancia fecha em ${Math.floor(DUNGEON_CLEANUP_AFTER_COMPLETE_MS / 60000)} min.`
            });
        }
    }

    private checkEmptyInstance(instance: DungeonMap, now: number) {
        const onlineInside = this.getOnlineInstanceMembers(instance).length;
        if (onlineInside > 0) {
            this.emptySince.delete(instance.id);
            return;
        }
        const emptyAt = this.emptySince.get(instance.id) || now;
        this.emptySince.set(instance.id, emptyAt);
        if (now - emptyAt >= DUNGEON_EMPTY_TIMEOUT_MS) {
            this.cleanupInstance(instance, 'empty_timeout');
        }
    }

    private cleanupInstance(instance: DungeonMap, reason: string) {
        this.clearPendingTeleportsForInstance(instance.id);
        for (const mobRuntime of instance.mobs.values()) {
            if (!mobRuntime.runtimeId) continue;
            this.mobService.removeMob(String(mobRuntime.runtimeId), { skipRespawn: true });
        }
        this.removeGroundItemsByMapInstance(instance.mapInstanceId);
        for (const memberState of instance.players.values()) {
            const member = this.players.get(memberState.playerId);
            if (!member) continue;
            this.teleportPlayerToOrigin(member, instance);
            this.sendRaw(member.ws, {
                type: 'system_message',
                text: reason === 'completed_cleanup'
                    ? 'Expedicao encerrada. Retornando ao mundo aberto.'
                    : 'Instancia encerrada por inatividade.'
            });
            this.persistPlayerCritical(member, 'dungeon_cleanup');
        }
        for (const memberId of instance.getMemberIds()) {
            this.playerToInstanceId.delete(memberId);
        }
        if (instance.ownerPartyId) this.partyToOpenInstanceId.delete(instance.ownerPartyId);
        this.emptySince.delete(instance.id);
        this.instances.delete(instance.id);
    }

    private clearPendingTeleportsForInstance(instanceId: string) {
        for (const [requestId, pending] of this.pendingTeleportByRequestId.entries()) {
            if (String(pending.instanceId || '') !== String(instanceId || '')) continue;
            this.pendingTeleportByRequestId.delete(requestId);
        }
    }

    private teleportPlayerToOrigin(player: PlayerRuntime, instance: DungeonMap) {
        const state = instance.players.get(player.id);
        const fallback = {
            mapKey: 'forest',
            mapId: 'Z1',
            x: 500,
            y: 500
        };
        const origin = state?.origin || fallback;
        const projected = this.projectToWalkable(
            origin.mapKey,
            clamp(Number(origin.x || 0), 0, WORLD.width),
            clamp(Number(origin.y || 0), 0, WORLD.height)
        );
        player.mapKey = origin.mapKey;
        player.mapId = origin.mapId;
        player.x = projected.x;
        player.y = projected.y;
        player.targetX = projected.x;
        player.targetY = projected.y;
        player.movePath = [];
        player.rawMovePath = [];
        player.pathDestinationX = projected.x;
        player.pathDestinationY = projected.y;
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
    }

    private onPlayerExitedInstance(instance: DungeonMap, playerId: number, disconnected: boolean = false) {
        if (disconnected) {
            instance.setConnected(playerId, false);
            return;
        }
        instance.removePlayer(playerId);
        this.playerToInstanceId.delete(playerId);
        if (instance.players.size <= 0) {
            this.cleanupInstance(instance, 'all_left');
        }
    }

    private getOnlineInstanceMembers(instance: DungeonMap) {
        return [...this.players.values()].filter((p) =>
            instance.players.has(p.id)
            && p.mapKey === instance.mapKey
            && p.mapId === instance.mapId
        );
    }

    private sendToInstance(instance: DungeonMap, payload: any) {
        for (const member of this.getOnlineInstanceMembers(instance)) {
            this.sendRaw(member.ws, payload);
        }
    }

    private destroyReadyCheck(instance: DungeonMap) {
        const readyId = String(instance.readyCheckId || '');
        if (readyId) this.readyCheckToInstanceId.delete(readyId);
        instance.readyCheckId = null;
        instance.readyDeadlineAt = null;
        instance.readyMemberIds = [];
    }

    private setBossDoorLocked(instance: DungeonMap, locked: boolean) {
        if (!instance.doorFeature) {
            instance.doorLocked = locked;
            return;
        }
        if (instance.doorLocked === locked) return;
        instance.doorLocked = locked;
    }
}
