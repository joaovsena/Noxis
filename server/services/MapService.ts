import {
    MAP_FEATURES_BY_KEY,
    PLAYER_HALF_SIZE,
    PORTAL_COOLDOWN_MS,
    PORTALS_BY_MAP_KEY,
    WORLD,
    composeMapInstanceId
} from '../config';
import { PlayerRuntime } from '../models/types';
import { clamp } from '../utils/math';
import { getForestTiledCollisionSampler } from '../maps/tiledForestCollision';
import { getDungeonTiledCollisionSampler } from '../maps/tiledDungeonCollision';

const MOVE_COLLISION_PADDING = 4;
const PATHFIND_CELL_SIZE = 12;
const PATH_PLAN_RADIUS = 8;
const PROJECT_TO_WALKABLE_MAX_RADIUS = 420;
const PROJECT_TO_WALKABLE_ANGLE_STEPS = 64;

export class MapService {
    mapInstanceId(mapKey: string, mapId: string) {
        return composeMapInstanceId(mapKey, mapId);
    }

    getAreaIdForPlayer(player: PlayerRuntime) {
        return this.mapInstanceId(player.mapKey, player.mapId);
    }

    getMapTiledCollisionSampler(mapKey: string) {
        if (mapKey === 'forest') return getForestTiledCollisionSampler();
        if (String(mapKey || '').startsWith('dng_')) return getDungeonTiledCollisionSampler();
        return null;
    }

    isBlockedAt(mapKey: string, x: number, y: number) {
        const px = clamp(x, 0, WORLD.width);
        const py = clamp(y, 0, WORLD.height);
        const radius = Math.max(8, PLAYER_HALF_SIZE - 6) + MOVE_COLLISION_PADDING;
        const tiledSampler = this.getMapTiledCollisionSampler(mapKey);
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

    projectToWalkable(mapKey: string, x: number, y: number) {
        const px = clamp(x, 0, WORLD.width);
        const py = clamp(y, 0, WORLD.height);
        if (!this.isBlockedAt(mapKey, px, py)) return { x: px, y: py };
        const goalCell = this.worldToPathCell(px, py);
        const nearestGoalCell = this.findNearestWalkableCell(mapKey, goalCell.cx, goalCell.cy, 96);
        if (nearestGoalCell) {
            const snapped = this.pathCellToWorld(nearestGoalCell.cx, nearestGoalCell.cy);
            if (!this.isBlockedAt(mapKey, snapped.x, snapped.y)) return snapped;
        }
        for (let radius = 8; radius <= PROJECT_TO_WALKABLE_MAX_RADIUS; radius += 8) {
            for (let i = 0; i < PROJECT_TO_WALKABLE_ANGLE_STEPS; i++) {
                const angle = (Math.PI * 2 * i) / PROJECT_TO_WALKABLE_ANGLE_STEPS;
                const nx = clamp(px + Math.cos(angle) * radius, 0, WORLD.width);
                const ny = clamp(py + Math.sin(angle) * radius, 0, WORLD.height);
                if (!this.isBlockedAt(mapKey, nx, ny)) return { x: nx, y: ny };
            }
        }
        return { x: px, y: py };
    }

    processPortalCollision(
        player: PlayerRuntime,
        now: number,
        onPortal?: (player: PlayerRuntime) => void,
        onDungeonPortal?: (player: PlayerRuntime, portalId: string, dungeonTemplateId: string) => void
    ) {
        if (now - (player.lastPortalAt || 0) < PORTAL_COOLDOWN_MS) return;
        const portals = PORTALS_BY_MAP_KEY[player.mapKey] || [];
        for (const portal of portals) {
            const insideX = player.x >= portal.x && player.x <= portal.x + portal.w;
            const insideY = player.y >= portal.y && player.y <= portal.y + portal.h;
            if (!insideX || !insideY) continue;
            if (portal.dungeonTemplateId) {
                if (!onDungeonPortal) continue;
                player.lastPortalAt = now;
                onDungeonPortal(player, String(portal.id || ''), String(portal.dungeonTemplateId || ''));
                return;
            }
            if (!portal.toMapKey || !Number.isFinite(Number(portal.toX)) || !Number.isFinite(Number(portal.toY))) continue;
            player.mapKey = portal.toMapKey;
            const projected = this.projectToWalkable(
                portal.toMapKey,
                clamp(Number(portal.toX), 0, WORLD.width),
                clamp(Number(portal.toY), 0, WORLD.height)
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
            player.lastPortalAt = now;
            player.ws?.send(JSON.stringify({ type: 'system_message', text: `Portal: ${portal.toMapKey.toUpperCase()}` }));
            if (onPortal) onPortal(player);
            return;
        }
    }

    private worldToPathCell(x: number, y: number) {
        const maxCellX = Math.floor(WORLD.width / PATHFIND_CELL_SIZE);
        const maxCellY = Math.floor(WORLD.height / PATHFIND_CELL_SIZE);
        return {
            cx: clamp(Math.floor(clamp(x, 0, WORLD.width) / PATHFIND_CELL_SIZE), 0, maxCellX),
            cy: clamp(Math.floor(clamp(y, 0, WORLD.height) / PATHFIND_CELL_SIZE), 0, maxCellY)
        };
    }

    private pathCellToWorld(cx: number, cy: number) {
        return {
            x: clamp(cx * PATHFIND_CELL_SIZE + PATHFIND_CELL_SIZE / 2, 0, WORLD.width),
            y: clamp(cy * PATHFIND_CELL_SIZE + PATHFIND_CELL_SIZE / 2, 0, WORLD.height)
        };
    }

    private isPathCellWalkable(mapKey: string, cx: number, cy: number) {
        const maxCellX = Math.floor(WORLD.width / PATHFIND_CELL_SIZE);
        const maxCellY = Math.floor(WORLD.height / PATHFIND_CELL_SIZE);
        if (cx < 0 || cy < 0 || cx > maxCellX || cy > maxCellY) return false;
        const world = this.pathCellToWorld(cx, cy);
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
            if (this.isBlockedAt(mapKey, probe.x, probe.y)) return false;
        }
        return true;
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
}

