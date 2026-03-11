import { BASE_MOVE_SPEED, MAP_FEATURES_BY_KEY, PLAYER_HALF_SIZE, WORLD } from '../config';
import { MoveMessage, PlayerRuntime } from '../models/types';
import { clamp } from '../utils/math';
import { MapService } from './MapService';

const PATHFIND_CELL_SIZE = 12;
const PATHFIND_MAX_ITERS = 18000;
const PATHFIND_MAX_ITERS_DUNGEON = 18000;
const PATH_RECALC_MS = 280;
const PATH_PROBE_RADIUS = Math.max(8, PLAYER_HALF_SIZE - 6);
const PATH_STUCK_REPATH_MS = 520;
const PATH_STUCK_TIMEOUT_MS = 1200;
const PATH_NEARBY_GOAL_MAX_CANDIDATES = 72;
const PATH_NEARBY_GOAL_MAX_CANDIDATES_DUNGEON = 96;
const PATH_NEARBY_GOAL_MAX_RADIUS = 72;
const ISO_AXIAL_RATIO = 2;
const PATH_PLAN_RADIUS = Math.max(6, PATH_PROBE_RADIUS - 4);
const PATHFIND_BUDGET_MS = 12;
const PATHFIND_BUDGET_MS_DUNGEON = 18;
const MOVE_ACK_PATH_NODE_LIMIT = 80;

type GetEffectAggregateFn = (player: PlayerRuntime, now: number) => { moveMul?: number };

export class MovementService {
    constructor(
        private readonly mapService: MapService,
        private readonly getActiveSkillEffectAggregate: GetEffectAggregateFn
    ) {}

    handleMove(player: PlayerRuntime, msg: MoveMessage) {
        if (player.dead || player.hp <= 0) return;
        const incomingX = Number(msg.x);
        const incomingY = Number(msg.y);
        const world = this.mapService.getMapWorld(player.mapKey);
        player.autoAttackActive = false;
        player.attackTargetId = null;
        player.pvpAutoAttackActive = false;
        player.attackTargetPlayerId = null;
        const destinationX = clamp(Number.isFinite(incomingX) ? incomingX : player.x, 0, world.width);
        const destinationY = clamp(Number.isFinite(incomingY) ? incomingY : player.y, 0, world.height);
        this.assignPathTo(player, destinationX, destinationY);
        player.ws.send(JSON.stringify({
            type: 'move_ack',
            reqId: msg.reqId,
            targetX: player.targetX,
            targetY: player.targetY,
            projectedX: player.pathDestinationX,
            projectedY: player.pathDestinationY,
            pathNodes: Array.isArray(player.movePath) ? player.movePath.slice(0, MOVE_ACK_PATH_NODE_LIMIT) : [],
            pathNodesRaw: Array.isArray(player.rawMovePath) ? player.rawMovePath.slice(0, MOVE_ACK_PATH_NODE_LIMIT) : []
        }));
    }

    movePlayerTowardTarget(player: PlayerRuntime, deltaSeconds: number, now: number) {
        if (!Number.isFinite(Number(player.lastMoveProgressAt))) player.lastMoveProgressAt = now;
        if (!Number.isFinite(Number(player.lastMoveCheckX))) player.lastMoveCheckX = player.x;
        if (!Number.isFinite(Number(player.lastMoveCheckY))) player.lastMoveCheckY = player.y;
        const movedSinceCheck = Math.hypot(
            Number(player.x) - Number(player.lastMoveCheckX),
            Number(player.y) - Number(player.lastMoveCheckY)
        );
        if (movedSinceCheck >= 1.2) {
            player.lastMoveCheckX = player.x;
            player.lastMoveCheckY = player.y;
            player.lastMoveProgressAt = now;
        }

        if (Array.isArray(player.movePath) && player.movePath.length > 0) {
            const next = player.movePath[0];
            if (next) {
                player.targetX = next.x;
                player.targetY = next.y;
            }
        }
        const rawMoveSpeed = Number(player.stats?.moveSpeed);
        const moveSpeedStat = Number.isFinite(rawMoveSpeed) && rawMoveSpeed > 0 ? rawMoveSpeed : 100;
        const fx = this.getActiveSkillEffectAggregate(player, now);
        const speed = BASE_MOVE_SPEED * (moveSpeedStat / 100) * Math.max(0.2, Number(fx.moveMul || 1));
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 2) {
            if (Array.isArray(player.movePath) && player.movePath.length > 0) {
                player.movePath.shift();
                this.advancePathAfterNode(player, now);
            }
            return;
        }

        const step = speed * deltaSeconds;
        const ux = dist > 0.0001 ? dx / dist : 0;
        const uy = dist > 0.0001 ? dy / dist : 0;
        const isoMul = this.getIsoMoveStepMultiplier(player.mapKey, ux, uy);
        const adjustedStep = step * isoMul;
        if (adjustedStep >= dist) {
            if (!this.mapService.isBlockedAt(player.mapKey, player.targetX, player.targetY)) {
                player.x = player.targetX;
                player.y = player.targetY;
            }
            if (Array.isArray(player.movePath) && player.movePath.length > 0) {
                player.movePath.shift();
                this.advancePathAfterNode(player, now);
            }
            return;
        }

        const nextX = player.x + (dx / dist) * adjustedStep;
        const nextY = player.y + (dy / dist) * adjustedStep;
        if (!this.mapService.isBlockedAt(player.mapKey, nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
            return;
        }
        const axisX = player.x + (dx / dist) * adjustedStep;
        if (!this.mapService.isBlockedAt(player.mapKey, axisX, player.y)) {
            player.x = axisX;
            return;
        }
        const axisY = player.y + (dy / dist) * adjustedStep;
        if (!this.mapService.isBlockedAt(player.mapKey, player.x, axisY)) {
            player.y = axisY;
            return;
        }
        const destinationX = Number.isFinite(Number(player.pathDestinationX)) ? Number(player.pathDestinationX) : player.targetX;
        const destinationY = Number.isFinite(Number(player.pathDestinationY)) ? Number(player.pathDestinationY) : player.targetY;
        const stuckForMs = now - Number(player.lastMoveProgressAt || now);
        if (stuckForMs >= PATH_STUCK_REPATH_MS) {
            this.recalculatePathToward(player, destinationX, destinationY, now);
        }
        if (stuckForMs >= PATH_STUCK_TIMEOUT_MS) {
            const fallback = this.mapService.projectToWalkable(player.mapKey, destinationX, destinationY);
            this.assignPathTo(player, fallback.x, fallback.y);
            player.lastMoveProgressAt = now;
            player.lastMoveCheckX = player.x;
            player.lastMoveCheckY = player.y;
        }
        if (!Array.isArray(player.movePath) || player.movePath.length === 0) {
            player.targetX = player.x;
            player.targetY = player.y;
            player.pathDestinationX = player.x;
            player.pathDestinationY = player.y;
            player.rawMovePath = [];
        }
    }

    assignPathTo(player: PlayerRuntime, destinationX: number, destinationY: number) {
        const projected = this.mapService.projectToWalkable(player.mapKey, destinationX, destinationY);
        const deadlineMs = Date.now() + this.getPathfindBudgetMs(player.mapKey);
        player.pathDestinationX = projected.x;
        player.pathDestinationY = projected.y;
        const rawPath = this.findPathWithNearbyGoals(player.mapKey, player.x, player.y, projected.x, projected.y, deadlineMs);
        player.rawMovePath = rawPath;
        player.movePath = this.smoothWorldPath(player.mapKey, player.x, player.y, rawPath);
        if (player.movePath.length > 0) {
            player.targetX = player.movePath[0].x;
            player.targetY = player.movePath[0].y;
            return;
        }
        if (!this.isPathSegmentBlocked(player.mapKey, player.x, player.y, projected.x, projected.y)) {
            player.targetX = projected.x;
            player.targetY = projected.y;
            return;
        }
        player.rawMovePath = [];
        player.targetX = player.x;
        player.targetY = player.y;
    }

    recalculatePathToward(player: PlayerRuntime, destinationX: number, destinationY: number, now: number) {
        if (now < Number(player.nextPathfindAt || 0)) return;
        player.nextPathfindAt = now + PATH_RECALC_MS;
        this.assignPathTo(player, destinationX, destinationY);
    }

    private advancePathAfterNode(player: PlayerRuntime, now: number) {
        const next = Array.isArray(player.movePath) ? player.movePath[0] : null;
        if (next) {
            player.targetX = next.x;
            player.targetY = next.y;
            return;
        }

        const destinationX = Number.isFinite(Number(player.pathDestinationX)) ? Number(player.pathDestinationX) : player.x;
        const destinationY = Number.isFinite(Number(player.pathDestinationY)) ? Number(player.pathDestinationY) : player.y;
        const remainingDistance = Math.hypot(destinationX - player.x, destinationY - player.y);
        const continueThreshold = Math.max(PATHFIND_CELL_SIZE * 1.5, 18);
        if (remainingDistance > continueThreshold) {
            this.assignPathTo(player, destinationX, destinationY);
            const repathNext = Array.isArray(player.movePath) ? player.movePath[0] : null;
            if (repathNext) {
                player.targetX = repathNext.x;
                player.targetY = repathNext.y;
                return;
            }
            if (!this.isPathSegmentBlocked(player.mapKey, player.x, player.y, destinationX, destinationY)) {
                player.targetX = destinationX;
                player.targetY = destinationY;
                return;
            }
            player.targetX = destinationX;
            player.targetY = destinationY;
            player.nextPathfindAt = now;
            return;
        }

        player.targetX = player.x;
        player.targetY = player.y;
        player.pathDestinationX = player.x;
        player.pathDestinationY = player.y;
        player.rawMovePath = [];
    }

    private getIsoMoveStepMultiplier(mapKey: string, ux: number, uy: number) {
        if (!this.mapService.getMapTiledCollisionSampler(mapKey)) return 1;
        const a = ISO_AXIAL_RATIO;
        const b = 1;
        const proj = Math.hypot(a * (ux - uy), b * (ux + uy));
        const card = Math.hypot(a, b);
        if (!Number.isFinite(proj) || proj <= 0.0001) return 1;
        return clamp(card / proj, 0.78, 1.62);
    }

    private isDungeonMap(mapKey: string) {
        return String(mapKey || '').startsWith('dng_');
    }

    private getPathfindBudgetMs(mapKey: string) {
        return this.isDungeonMap(mapKey) ? PATHFIND_BUDGET_MS_DUNGEON : PATHFIND_BUDGET_MS;
    }

    private getPathfindMaxIters(mapKey: string) {
        return this.isDungeonMap(mapKey) ? PATHFIND_MAX_ITERS_DUNGEON : PATHFIND_MAX_ITERS;
    }

    private getNearbyGoalCandidateLimit(mapKey: string) {
        return this.isDungeonMap(mapKey) ? PATH_NEARBY_GOAL_MAX_CANDIDATES_DUNGEON : PATH_NEARBY_GOAL_MAX_CANDIDATES;
    }

    private findPathWithNearbyGoals(mapKey: string, fromX: number, fromY: number, toX: number, toY: number, deadlineMs: number) {
        const direct = this.findPath(mapKey, fromX, fromY, toX, toY, deadlineMs);
        if (direct.length > 0) return direct;
        if (Date.now() > deadlineMs) return [];

        const goal = this.worldToPathCell(mapKey, toX, toY);
        let candidatesChecked = 0;
        const maxCandidates = this.getNearbyGoalCandidateLimit(mapKey);
        const maxRadius = PATH_NEARBY_GOAL_MAX_RADIUS;
        for (let r = 1; r <= maxRadius && candidatesChecked < maxCandidates; r++) {
            if (Date.now() > deadlineMs) break;
            for (let dx = -r; dx <= r && candidatesChecked < maxCandidates; dx++) {
                if (Date.now() > deadlineMs) break;
                const checks = [
                    { cx: goal.cx + dx, cy: goal.cy - r },
                    { cx: goal.cx + dx, cy: goal.cy + r }
                ];
                for (const cell of checks) {
                    if (Date.now() > deadlineMs) break;
                    candidatesChecked += 1;
                    if (!this.isPathCellWalkable(mapKey, cell.cx, cell.cy)) continue;
                    const world = this.pathCellToWorld(mapKey, cell.cx, cell.cy);
                    const candidate = this.findPath(mapKey, fromX, fromY, world.x, world.y, deadlineMs);
                    if (candidate.length > 0) return candidate;
                    if (candidatesChecked >= maxCandidates) break;
                }
            }
            for (let dy = -r + 1; dy <= r - 1 && candidatesChecked < maxCandidates; dy++) {
                if (Date.now() > deadlineMs) break;
                const checks = [
                    { cx: goal.cx - r, cy: goal.cy + dy },
                    { cx: goal.cx + r, cy: goal.cy + dy }
                ];
                for (const cell of checks) {
                    if (Date.now() > deadlineMs) break;
                    candidatesChecked += 1;
                    if (!this.isPathCellWalkable(mapKey, cell.cx, cell.cy)) continue;
                    const world = this.pathCellToWorld(mapKey, cell.cx, cell.cy);
                    const candidate = this.findPath(mapKey, fromX, fromY, world.x, world.y, deadlineMs);
                    if (candidate.length > 0) return candidate;
                    if (candidatesChecked >= maxCandidates) break;
                }
            }
        }
        return [];
    }

    private smoothWorldPath(mapKey: string, startX: number, startY: number, points: Array<{ x: number; y: number }>) {
        if (!Array.isArray(points) || points.length <= 2) return Array.isArray(points) ? points : [];
        const path = points
            .map((pt) => ({ x: Number(pt?.x), y: Number(pt?.y) }))
            .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));
        if (path.length <= 2) return path;

        const smoothed: Array<{ x: number; y: number }> = [];
        let anchor = { x: Number(startX), y: Number(startY) };
        let index = 0;

        while (index < path.length) {
            let best = index;
            for (let probe = path.length - 1; probe >= index; probe--) {
                const node = path[probe];
                if (!this.isPathSegmentBlocked(mapKey, anchor.x, anchor.y, node.x, node.y)) {
                    best = probe;
                    break;
                }
            }
            const picked = path[best];
            smoothed.push(picked);
            anchor = picked;
            index = best + 1;
        }

        return smoothed;
    }

    private worldToPathCell(mapKey: string, x: number, y: number) {
        const world = this.mapService.getMapWorld(mapKey);
        const grid = this.mapService.getMapNavGrid(mapKey);
        const maxCellX = Math.max(0, grid.cols - 1);
        const maxCellY = Math.max(0, grid.rows - 1);
        return {
            cx: clamp(Math.floor(clamp(x, 0, world.width) / Math.max(1, grid.cellWidth)), 0, maxCellX),
            cy: clamp(Math.floor(clamp(y, 0, world.height) / Math.max(1, grid.cellHeight)), 0, maxCellY)
        };
    }

    private pathCellToWorld(mapKey: string, cx: number, cy: number) {
        const world = this.mapService.getMapWorld(mapKey);
        const grid = this.mapService.getMapNavGrid(mapKey);
        return {
            x: clamp(cx * grid.cellWidth + grid.cellWidth / 2, 0, world.width),
            y: clamp(cy * grid.cellHeight + grid.cellHeight / 2, 0, world.height)
        };
    }

    private isPathCellWalkable(mapKey: string, cx: number, cy: number) {
        const grid = this.mapService.getMapNavGrid(mapKey);
        const maxCellX = Math.max(0, grid.cols - 1);
        const maxCellY = Math.max(0, grid.rows - 1);
        if (cx < 0 || cy < 0 || cx > maxCellX || cy > maxCellY) return false;
        const world = this.pathCellToWorld(mapKey, cx, cy);
        const offset = Math.max(2, PATH_PLAN_RADIUS * 0.55);
        const probes = [
            { x: world.x, y: world.y },
            { x: world.x + offset, y: world.y },
            { x: world.x - offset, y: world.y },
            { x: world.x, y: world.y + offset },
            { x: world.x, y: world.y - offset },
            { x: world.x + offset, y: world.y + offset },
            { x: world.x - offset, y: world.y + offset },
            { x: world.x + offset, y: world.y - offset },
            { x: world.x - offset, y: world.y - offset }
        ];
        for (const probe of probes) {
            if (this.isPathBlockedAt(mapKey, probe.x, probe.y, PATH_PLAN_RADIUS)) return false;
        }
        return true;
    }

    private findPath(mapKey: string, fromX: number, fromY: number, toX: number, toY: number, deadlineMs: number) {
        const world = this.mapService.getMapWorld(mapKey);
        const startRaw = this.worldToPathCell(mapKey, fromX, fromY);
        const goalRaw = this.worldToPathCell(mapKey, toX, toY);
        const start = this.findNearestWalkableCell(mapKey, startRaw.cx, startRaw.cy, this.isDungeonMap(mapKey) ? 36 : 20) || startRaw;
        const goal = this.findNearestWalkableCell(mapKey, goalRaw.cx, goalRaw.cy, this.isDungeonMap(mapKey) ? 140 : 72) || goalRaw;
        const sameCell = start.cx === goal.cx && start.cy === goal.cy;
        if (sameCell) return [{ x: clamp(toX, 0, world.width), y: clamp(toY, 0, world.height) }];

        const walkableMemo = new Map<string, boolean>();
        const isWalkable = (cx: number, cy: number) => {
            const key = `${cx},${cy}`;
            if (walkableMemo.has(key)) return Boolean(walkableMemo.get(key));
            const ok = this.isPathCellWalkable(mapKey, cx, cy);
            walkableMemo.set(key, ok);
            return ok;
        };

        const startKey = `${start.cx},${start.cy}`;
        const goalKey = `${goal.cx},${goal.cy}`;
        const open = new Set<string>([startKey]);
        const closed = new Set<string>();
        const g = new Map<string, number>([[startKey, 0]]);
        const f = new Map<string, number>();
        const cameFrom = new Map<string, string>();
        let bestReachedKey = startKey;
        let bestReachedHeuristic = this.pathHeuristic(start.cx, start.cy, goal.cx, goal.cy);
        f.set(startKey, bestReachedHeuristic);

        const dirs = [
            { x: 1, y: 0, c: 1 },
            { x: -1, y: 0, c: 1 },
            { x: 0, y: 1, c: 1 },
            { x: 0, y: -1, c: 1 },
            { x: 1, y: 1, c: 1.4142 },
            { x: 1, y: -1, c: 1.4142 },
            { x: -1, y: 1, c: 1.4142 },
            { x: -1, y: -1, c: 1.4142 }
        ];

        let iter = 0;
        const iterLimit = this.getPathfindMaxIters(mapKey);
        while (open.size > 0 && iter < iterLimit && Date.now() <= deadlineMs) {
            iter += 1;
            let current = '';
            let bestF = Number.POSITIVE_INFINITY;
            for (const node of open) {
                const score = Number(f.get(node) ?? Number.POSITIVE_INFINITY);
                if (score < bestF) {
                    bestF = score;
                    current = node;
                }
            }
            if (!current) break;
            if (current === goalKey) {
                return this.rebuildPath(mapKey, cameFrom, current, toX, toY);
            }
            open.delete(current);
            closed.add(current);
            const [cxRaw, cyRaw] = current.split(',');
            const cx = Number(cxRaw);
            const cy = Number(cyRaw);
            for (const dir of dirs) {
                const nx = cx + dir.x;
                const ny = cy + dir.y;
                const nkey = `${nx},${ny}`;
                if (closed.has(nkey)) continue;
                if (!isWalkable(nx, ny)) continue;
                if (dir.x !== 0 && dir.y !== 0) {
                    const from = this.pathCellToWorld(mapKey, cx, cy);
                    const to = this.pathCellToWorld(mapKey, nx, ny);
                    if (this.isPathSegmentBlocked(mapKey, from.x, from.y, to.x, to.y)) continue;
                }
                const tentative = Number(g.get(current) ?? Number.POSITIVE_INFINITY) + dir.c;
                if (!open.has(nkey)) open.add(nkey);
                else if (tentative >= Number(g.get(nkey) ?? Number.POSITIVE_INFINITY)) continue;
                cameFrom.set(nkey, current);
                g.set(nkey, tentative);
                const heuristic = this.pathHeuristic(nx, ny, goal.cx, goal.cy);
                f.set(nkey, tentative + heuristic);
                if (
                    heuristic < bestReachedHeuristic
                    || (
                        heuristic === bestReachedHeuristic
                        && tentative < Number(g.get(bestReachedKey) ?? Number.POSITIVE_INFINITY)
                    )
                ) {
                    bestReachedKey = nkey;
                    bestReachedHeuristic = heuristic;
                }
            }
        }
        if (bestReachedKey !== startKey) {
            const [bestCxRaw, bestCyRaw] = bestReachedKey.split(',');
            const bestWorld = this.pathCellToWorld(mapKey, Number(bestCxRaw), Number(bestCyRaw));
            return this.rebuildPath(mapKey, cameFrom, bestReachedKey, bestWorld.x, bestWorld.y);
        }
        return [];
    }

    private isPathBlockedAt(mapKey: string, x: number, y: number, radiusOverride?: number) {
        const world = this.mapService.getMapWorld(mapKey);
        const px = clamp(x, 0, world.width);
        const py = clamp(y, 0, world.height);
        const radius = Number.isFinite(Number(radiusOverride)) ? Number(radiusOverride) : PATH_PROBE_RADIUS;
        const tiledSampler = this.mapService.getMapTiledCollisionSampler(mapKey);
        if (tiledSampler) return tiledSampler.isBlockedAt(px, py, radius);
        const features = MAP_FEATURES_BY_KEY[mapKey] || [];
        for (const feature of features) {
            if (!feature.collision) continue;
            if (feature.shape === 'rect') {
                const insideX = px >= (feature.x - radius) && px <= (feature.x + feature.w + radius);
                const insideY = py >= (feature.y - radius) && py <= (feature.y + feature.h + radius);
                if (insideX && insideY) return true;
                continue;
            }
            const dx = px - feature.x;
            const dy = py - feature.y;
            if (dx * dx + dy * dy <= (feature.r + radius) * (feature.r + radius)) return true;
        }
        return false;
    }

    private isPathSegmentBlocked(mapKey: string, x1: number, y1: number, x2: number, y2: number) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len <= 0.01) return false;
        const step = Math.max(6, PATHFIND_CELL_SIZE * 0.5);
        const steps = Math.max(1, Math.ceil(len / step));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + dx * t;
            const y = y1 + dy * t;
            if (this.isPathBlockedAt(mapKey, x, y)) return true;
        }
        return false;
    }

    private findNearestWalkableCell(mapKey: string, cx: number, cy: number, maxRadius: number) {
        if (this.isPathCellWalkable(mapKey, cx, cy)) return { cx, cy };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                const top = { cx: cx + dx, cy: cy - r };
                const bottom = { cx: cx + dx, cy: cy + r };
                if (this.isPathCellWalkable(mapKey, top.cx, top.cy)) return top;
                if (this.isPathCellWalkable(mapKey, bottom.cx, bottom.cy)) return bottom;
            }
            for (let dy = -r + 1; dy <= r - 1; dy++) {
                const left = { cx: cx - r, cy: cy + dy };
                const right = { cx: cx + r, cy: cy + dy };
                if (this.isPathCellWalkable(mapKey, left.cx, left.cy)) return left;
                if (this.isPathCellWalkable(mapKey, right.cx, right.cy)) return right;
            }
        }
        return null;
    }

    private pathHeuristic(ax: number, ay: number, bx: number, by: number) {
        const dx = Math.abs(ax - bx);
        const dy = Math.abs(ay - by);
        const diag = Math.min(dx, dy);
        const straight = dx + dy - diag * 2;
        return diag * 1.4142 + straight;
    }

    private rebuildPath(mapKey: string, cameFrom: Map<string, string>, current: string, toX: number, toY: number) {
        const reversed: string[] = [current];
        while (cameFrom.has(current)) {
            current = String(cameFrom.get(current));
            reversed.push(current);
        }
        reversed.reverse();
        const path = reversed
            .slice(1)
            .map((key) => {
                const [cxRaw, cyRaw] = key.split(',');
                const cx = Number(cxRaw);
                const cy = Number(cyRaw);
                return this.pathCellToWorld(mapKey, cx, cy);
            });
        const world = this.mapService.getMapWorld(mapKey);
        path.push({ x: clamp(toX, 0, world.width), y: clamp(toY, 0, world.height) });
        return path;
    }
}
