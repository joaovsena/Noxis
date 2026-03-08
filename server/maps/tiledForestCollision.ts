import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { WORLD } from '../config';

type TiledTilesetRef = {
    firstgid: number;
    source?: string;
};

type TiledLayer = {
    type?: string;
    data?: number[];
};

type TiledMap = {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    tilesets?: TiledTilesetRef[];
    layers?: TiledLayer[];
};

type CollisionSampler = {
    isBlockedAt: (worldX: number, worldY: number, radiusWorld: number) => boolean;
};

const TMJ_PATH = path.resolve(process.cwd(), 'server', 'maps', 'map', 'a1.tmj');
const FLIPPED_GID_MASK = 0xe0000000;
const RAW_GID_MASK = 0x1fffffff;

let cachedSampler: CollisionSampler | null | undefined;

export function getForestTiledCollisionSampler(): CollisionSampler | null {
    if (cachedSampler !== undefined) return cachedSampler;
    cachedSampler = buildSampler();
    return cachedSampler;
}

function buildSampler(): CollisionSampler | null {
    if (!existsSync(TMJ_PATH)) return null;
    const rawMap = safeReadText(TMJ_PATH);
    if (!rawMap) return null;
    const parsedMap = safeParseMap(rawMap);
    if (!parsedMap) return null;

    const mapWidth = Math.max(1, Math.floor(Number(parsedMap.width || 0)));
    const mapHeight = Math.max(1, Math.floor(Number(parsedMap.height || 0)));

    const tilesets = Array.isArray(parsedMap.tilesets) ? parsedMap.tilesets : [];
    const tilesetCollision = buildTilesetCollisionByFirstGid(tilesets);
    if (!tilesetCollision.length) return null;

    const blocked = Array.from({ length: mapHeight }, () => Array<boolean>(mapWidth).fill(false));
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer') continue;
        if (!Array.isArray(layer.data)) continue;
        const data = layer.data;
        const limit = Math.min(data.length, mapWidth * mapHeight);
        for (let idx = 0; idx < limit; idx += 1) {
            const rawGid = Number(data[idx] || 0);
            if (!Number.isFinite(rawGid) || rawGid === 0) continue;
            const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIPPED_GID_MASK;
            if (gid <= 0) continue;
            const match = resolveTilesetForGid(tilesetCollision, gid);
            if (!match) continue;
            const localTileId = gid - match.firstgid;
            if (!match.collisionTileIds.has(localTileId)) continue;
            const x = idx % mapWidth;
            const y = Math.floor(idx / mapWidth);
            if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) continue;
            blocked[y][x] = true;
        }
    }

    const cellsX = Math.max(1, mapWidth - 1);
    const cellsY = Math.max(1, mapHeight - 1);
    const worldPerCellX = WORLD.width / cellsX;
    const worldPerCellY = WORLD.height / cellsY;

    return {
        isBlockedAt(worldX: number, worldY: number, radiusWorld: number) {
            const wx = clamp(worldX, 0, WORLD.width);
            const wy = clamp(worldY, 0, WORLD.height);
            // Servidor trabalha em coordenada "de mundo" normalizada; convertemos para grade do mapa TMJ.
            const cx = clamp(Math.round((wx / Math.max(1, WORLD.width)) * cellsX), 0, mapWidth - 1);
            const cy = clamp(Math.round((wy / Math.max(1, WORLD.height)) * cellsY), 0, mapHeight - 1);
            const radius = Math.max(0, Number(radiusWorld || 0));
            const rx = Math.max(0, Math.ceil(radius / Math.max(1, worldPerCellX)));
            const ry = Math.max(0, Math.ceil(radius / Math.max(1, worldPerCellY)));

            for (let y = cy - ry; y <= cy + ry; y += 1) {
                if (y < 0 || y >= mapHeight) continue;
                for (let x = cx - rx; x <= cx + rx; x += 1) {
                    if (x < 0 || x >= mapWidth) continue;
                    if (blocked[y][x]) return true;
                }
            }
            return false;
        }
    };
}

function buildTilesetCollisionByFirstGid(tilesets: TiledTilesetRef[]) {
    const out: Array<{ firstgid: number; collisionTileIds: Set<number> }> = [];
    for (const tileset of tilesets) {
        const firstgid = Math.max(1, Math.floor(Number(tileset?.firstgid || 0)));
        const source = typeof tileset?.source === 'string' ? tileset.source : '';
        if (!source) continue;
        const tsxPath = path.resolve(path.dirname(TMJ_PATH), source);
        const tsx = safeReadText(tsxPath);
        if (!tsx) continue;
        const collisionTileIds = parseCollisionTileIdsFromTsx(tsx);
        if (collisionTileIds.size === 0) continue;
        out.push({ firstgid, collisionTileIds });
    }
    return out.sort((a, b) => a.firstgid - b.firstgid);
}

function resolveTilesetForGid(
    tilesets: Array<{ firstgid: number; collisionTileIds: Set<number> }>,
    gid: number
) {
    let best: { firstgid: number; collisionTileIds: Set<number> } | null = null;
    for (const tileset of tilesets) {
        if (tileset.firstgid <= gid) best = tileset;
        else break;
    }
    return best;
}

function parseCollisionTileIdsFromTsx(tsx: string) {
    const out = new Set<number>();
    const tileBlockRegex = /<tile\s+id="(\d+)"[\s\S]*?<\/tile>/g;
    let match: RegExpExecArray | null = tileBlockRegex.exec(tsx);
    while (match) {
        const tileId = Math.floor(Number(match[1]));
        const block = String(match[0] || '');
        if (block.includes('<objectgroup') && block.includes('<object')) out.add(tileId);
        match = tileBlockRegex.exec(tsx);
    }
    return out;
}

function safeReadText(filePath: string) {
    try {
        return readFileSync(filePath, 'utf8');
    } catch {
        return '';
    }
}

function safeParseMap(raw: string): TiledMap | null {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as TiledMap;
    } catch {
        return null;
    }
}

function clamp(value: number, min: number, max: number) {
    const n = Number.isFinite(Number(value)) ? Number(value) : min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}
