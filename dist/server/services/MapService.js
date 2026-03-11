"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapService = void 0;
const config_1 = require("../config");
const math_1 = require("../utils/math");
const tiledCollision_1 = require("../maps/tiledCollision");
const mapMetadata_1 = require("../maps/mapMetadata");
const MOVE_COLLISION_PADDING = 4;
const PATHFIND_CELL_SIZE = 12;
const PATH_PLAN_RADIUS = 8;
const PROJECT_TO_WALKABLE_MAX_RADIUS = 420;
const PROJECT_TO_WALKABLE_ANGLE_STEPS = 64;
class MapService {
    getMapWorld(mapKey) {
        return (0, mapMetadata_1.getMapMetadata)(mapKey)?.world || config_1.WORLD;
    }
    getMapNavGrid(mapKey) {
        const metadata = (0, mapMetadata_1.getMapMetadata)(mapKey);
        const world = metadata?.world || config_1.WORLD;
        const derivedCols = Math.max(1, Math.floor(world.width / PATHFIND_CELL_SIZE));
        const derivedRows = Math.max(1, Math.floor(world.height / PATHFIND_CELL_SIZE));
        const cols = Math.max(derivedCols, Number(metadata?.width || 0) || 0, 1);
        const rows = Math.max(derivedRows, Number(metadata?.height || 0) || 0, 1);
        return {
            cols,
            rows,
            cellWidth: world.width / cols,
            cellHeight: world.height / rows
        };
    }
    mapInstanceId(mapKey, mapId) {
        return (0, config_1.composeMapInstanceId)(mapKey, mapId);
    }
    getAreaIdForPlayer(player) {
        return this.mapInstanceId(player.mapKey, player.mapId);
    }
    getMapTiledCollisionSampler(mapKey) {
        return (0, tiledCollision_1.getMapTiledCollisionSampler)(mapKey);
    }
    isBlockedAt(mapKey, x, y) {
        const world = this.getMapWorld(mapKey);
        const px = (0, math_1.clamp)(x, 0, world.width);
        const py = (0, math_1.clamp)(y, 0, world.height);
        const radius = Math.max(8, config_1.PLAYER_HALF_SIZE - 6) + MOVE_COLLISION_PADDING;
        const tiledSampler = this.getMapTiledCollisionSampler(mapKey);
        if (tiledSampler)
            return tiledSampler.isBlockedAt(px, py, radius);
        const features = config_1.MAP_FEATURES_BY_KEY[mapKey] || [];
        for (const feature of features) {
            if (!feature.collision)
                continue;
            if (feature.shape === 'rect') {
                const insideX = px >= (feature.x - radius) && px <= (feature.x + feature.w + radius);
                const insideY = py >= (feature.y - radius) && py <= (feature.y + feature.h + radius);
                if (insideX && insideY)
                    return true;
                continue;
            }
            const dx = px - feature.x;
            const dy = py - feature.y;
            if (dx * dx + dy * dy <= (feature.r + radius) * (feature.r + radius))
                return true;
        }
        return false;
    }
    projectToWalkable(mapKey, x, y) {
        const world = this.getMapWorld(mapKey);
        const px = (0, math_1.clamp)(x, 0, world.width);
        const py = (0, math_1.clamp)(y, 0, world.height);
        if (!this.isBlockedAt(mapKey, px, py))
            return { x: px, y: py };
        const goalCell = this.worldToPathCell(mapKey, px, py);
        const nearestGoalCell = this.findNearestWalkableCell(mapKey, goalCell.cx, goalCell.cy, 96);
        if (nearestGoalCell) {
            const snapped = this.pathCellToWorld(mapKey, nearestGoalCell.cx, nearestGoalCell.cy);
            if (!this.isBlockedAt(mapKey, snapped.x, snapped.y))
                return snapped;
        }
        for (let radius = 8; radius <= PROJECT_TO_WALKABLE_MAX_RADIUS; radius += 8) {
            for (let i = 0; i < PROJECT_TO_WALKABLE_ANGLE_STEPS; i++) {
                const angle = (Math.PI * 2 * i) / PROJECT_TO_WALKABLE_ANGLE_STEPS;
                const nx = (0, math_1.clamp)(px + Math.cos(angle) * radius, 0, world.width);
                const ny = (0, math_1.clamp)(py + Math.sin(angle) * radius, 0, world.height);
                if (!this.isBlockedAt(mapKey, nx, ny))
                    return { x: nx, y: ny };
            }
        }
        return { x: px, y: py };
    }
    processPortalCollision(player, now, onPortal, onDungeonPortal) {
        if (now - (player.lastPortalAt || 0) < config_1.PORTAL_COOLDOWN_MS)
            return;
        const portals = config_1.PORTALS_BY_MAP_KEY[player.mapKey] || [];
        for (const portal of portals) {
            const insideX = player.x >= portal.x && player.x <= portal.x + portal.w;
            const insideY = player.y >= portal.y && player.y <= portal.y + portal.h;
            if (!insideX || !insideY)
                continue;
            if (portal.dungeonTemplateId) {
                if (!onDungeonPortal)
                    continue;
                player.lastPortalAt = now;
                onDungeonPortal(player, String(portal.id || ''), String(portal.dungeonTemplateId || ''));
                return;
            }
            if (!portal.toMapKey || !Number.isFinite(Number(portal.toX)) || !Number.isFinite(Number(portal.toY)))
                continue;
            player.mapKey = portal.toMapKey;
            const targetWorld = this.getMapWorld(portal.toMapKey);
            const projected = this.projectToWalkable(portal.toMapKey, (0, math_1.clamp)(Number(portal.toX), 0, targetWorld.width), (0, math_1.clamp)(Number(portal.toY), 0, targetWorld.height));
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
            if (onPortal)
                onPortal(player);
            return;
        }
    }
    worldToPathCell(mapKey, x, y) {
        const world = this.getMapWorld(mapKey);
        const grid = this.getMapNavGrid(mapKey);
        const maxCellX = Math.max(0, grid.cols - 1);
        const maxCellY = Math.max(0, grid.rows - 1);
        return {
            cx: (0, math_1.clamp)(Math.floor((0, math_1.clamp)(x, 0, world.width) / Math.max(1, grid.cellWidth)), 0, maxCellX),
            cy: (0, math_1.clamp)(Math.floor((0, math_1.clamp)(y, 0, world.height) / Math.max(1, grid.cellHeight)), 0, maxCellY)
        };
    }
    pathCellToWorld(mapKey, cx, cy) {
        const world = this.getMapWorld(mapKey);
        const grid = this.getMapNavGrid(mapKey);
        return {
            x: (0, math_1.clamp)(cx * grid.cellWidth + grid.cellWidth / 2, 0, world.width),
            y: (0, math_1.clamp)(cy * grid.cellHeight + grid.cellHeight / 2, 0, world.height)
        };
    }
    isPathCellWalkable(mapKey, cx, cy) {
        const grid = this.getMapNavGrid(mapKey);
        const maxCellX = Math.max(0, grid.cols - 1);
        const maxCellY = Math.max(0, grid.rows - 1);
        if (cx < 0 || cy < 0 || cx > maxCellX || cy > maxCellY)
            return false;
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
            if (this.isBlockedAt(mapKey, probe.x, probe.y))
                return false;
        }
        return true;
    }
    findNearestWalkableCell(mapKey, cx, cy, maxRadius) {
        if (this.isPathCellWalkable(mapKey, cx, cy))
            return { cx, cy };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                const top = { cx: cx + dx, cy: cy - r };
                const bottom = { cx: cx + dx, cy: cy + r };
                if (this.isPathCellWalkable(mapKey, top.cx, top.cy))
                    return top;
                if (this.isPathCellWalkable(mapKey, bottom.cx, bottom.cy))
                    return bottom;
            }
            for (let dy = -r + 1; dy <= r - 1; dy++) {
                const left = { cx: cx - r, cy: cy + dy };
                const right = { cx: cx + r, cy: cy + dy };
                if (this.isPathCellWalkable(mapKey, left.cx, left.cy))
                    return left;
                if (this.isPathCellWalkable(mapKey, right.cx, right.cy))
                    return right;
            }
        }
        return null;
    }
}
exports.MapService = MapService;
//# sourceMappingURL=MapService.js.map