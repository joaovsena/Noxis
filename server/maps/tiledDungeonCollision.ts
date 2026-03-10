import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { WORLD } from '../config';

type TiledTilesetRef = {
    firstgid: number;
    source?: string;
};

type TiledLayer = {
    type?: string;
    name?: string;
    visible?: boolean;
    data?: number[] | string;
    encoding?: string;
    compression?: string;
};

type TiledMap = {
    width: number;
    height: number;
    tilewidth?: number;
    tileheight?: number;
    tilesets?: TiledTilesetRef[];
    layers?: TiledLayer[];
};

type CollisionSampler = {
    isBlockedAt: (worldX: number, worldY: number, radiusWorld: number) => boolean;
};

const TMJ_PATH = path.resolve(process.cwd(), 'public', 'maps', 'dungeon1', 'dungeon1.tmj');
const FLIPPED_GID_MASK = 0xe0000000;
const RAW_GID_MASK = 0x1fffffff;

let cachedSampler: CollisionSampler | null | undefined;

export function getDungeonTiledCollisionSampler(): CollisionSampler | null {
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
    const mapTileWidth = Math.max(1, Number(parsedMap.tilewidth || 1));
    const mapTileHeight = Math.max(1, Number(parsedMap.tileheight || 1));
    const tilesets = Array.isArray(parsedMap.tilesets) ? parsedMap.tilesets : [];
    const tilesetCollision = buildTilesetCollisionByFirstGid(tilesets);
    if (!tilesetCollision.length) return null;

    // Poligonos detalhados de tiles altos (512px) estavam deslocando/expandindo a
    // colisao em mapa isometrico e bloqueando piso/corredores validos.
    // Para dungeon, usamos malha de celula da camada "Paredes" (mais estavel).
    const detailedPolygons: WorldPolygon[] = [];
    const blocked = Array.from({ length: mapHeight }, () => Array<boolean>(mapWidth).fill(false));
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer') continue;
        if (layer?.visible === false) continue;
        if (String(layer?.name || '') !== 'Paredes') continue;
        const data = decodeLayerData(layer, mapWidth, mapHeight);
        if (!data.length) continue;
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

    return {
        isBlockedAt(worldX: number, worldY: number, radiusWorld: number) {
            const wx = clamp(worldX, 0, WORLD.width);
            const wy = clamp(worldY, 0, WORLD.height);
            const radius = Math.max(0, Number(radiusWorld || 0));
            // Passagens do mapa isometrico (arcos/corredores) ficam estreitas.
            // Reduzimos o raio efetivo apenas para a dungeon para evitar falso bloqueio.
            const effectiveRadius = radius * 0.62;

            if (detailedPolygons.length > 0) {
                return isBlockedByDetailedPolygons(wx, wy, effectiveRadius, detailedPolygons);
            }

            // Para mapa 32x32, expandir por "rx/ry" de celula gera falso-positivo forte.
            // Usamos probes pontuais no perimetro do raio para manter fidelidade visual.
            if (isBlockedCellAtWorld(wx, wy, mapWidth, mapHeight, blocked)) return true;
            if (effectiveRadius <= 0) return false;

            const probes = [
                [effectiveRadius, 0],
                [-effectiveRadius, 0],
                [0, effectiveRadius],
                [0, -effectiveRadius],
                [effectiveRadius * 0.7071, effectiveRadius * 0.7071],
                [effectiveRadius * 0.7071, -effectiveRadius * 0.7071],
                [-effectiveRadius * 0.7071, effectiveRadius * 0.7071],
                [-effectiveRadius * 0.7071, -effectiveRadius * 0.7071]
            ];
            for (const [dx, dy] of probes) {
                if (isBlockedCellAtWorld(wx + dx, wy + dy, mapWidth, mapHeight, blocked)) return true;
            }
            return false;
        }
    };
}

type LocalPolygon = {
    points: Array<{ x: number; y: number }>;
};

type TilesetCollisionDef = {
    firstgid: number;
    collisionTileIds: Set<number>;
    collisionPolygonsByTileId: Map<number, LocalPolygon[]>;
    imageSizeByTileId: Map<number, { width: number; height: number }>;
    imageNameByTileId: Map<number, string>;
};

type WorldPolygon = {
    points: Array<{ x: number; y: number }>;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

function buildDetailedCollisionPolygons(
    parsedMap: TiledMap,
    tilesets: TilesetCollisionDef[],
    mapTileWidth: number,
    mapTileHeight: number
) {
    const mapWidth = Math.max(1, Math.floor(Number(parsedMap.width || 1)));
    const mapHeight = Math.max(1, Math.floor(Number(parsedMap.height || 1)));
    const halfW = mapTileWidth / 2;
    const halfH = mapTileHeight / 2;
    const originX = (mapHeight - 1) * halfW;
    const out: WorldPolygon[] = [];
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    const passThroughByCell = new Set<string>();

    // Abre passagem quando tile visual representa arco/abertura.
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer') continue;
        if (layer?.visible === false) continue;
        const data = decodeLayerData(layer, mapWidth, mapHeight);
        if (!data.length) continue;
        const limit = Math.min(data.length, mapWidth * mapHeight);
        for (let idx = 0; idx < limit; idx += 1) {
            const rawGid = Number(data[idx] || 0);
            if (!Number.isFinite(rawGid) || rawGid === 0) continue;
            const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIPPED_GID_MASK;
            if (gid <= 0) continue;
            const ts = resolveTilesetForGid(tilesets, gid);
            if (!ts) continue;
            const localTileId = gid - ts.firstgid;
            const imageName = String(ts.imageNameByTileId.get(localTileId) || '').toLowerCase();
            if (!isPassThroughTileName(imageName)) continue;
            const col = idx % mapWidth;
            const row = Math.floor(idx / mapWidth);
            passThroughByCell.add(`${col},${row}`);
        }
    }

    for (const layer of layers) {
        if (layer?.type !== 'tilelayer') continue;
        if (layer?.visible === false) continue;
        const data = decodeLayerData(layer, mapWidth, mapHeight);
        if (!data.length) continue;
        const limit = Math.min(data.length, mapWidth * mapHeight);
        for (let idx = 0; idx < limit; idx += 1) {
            const rawGid = Number(data[idx] || 0);
            if (!Number.isFinite(rawGid) || rawGid === 0) continue;
            const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIPPED_GID_MASK;
            if (gid <= 0) continue;
            const ts = resolveTilesetForGid(tilesets, gid);
            if (!ts) continue;
            const localTileId = gid - ts.firstgid;
            const localPolys = ts.collisionPolygonsByTileId.get(localTileId);
            if (!localPolys?.length) continue;

            const col = idx % mapWidth;
            const row = Math.floor(idx / mapWidth);
            if (passThroughByCell.has(`${col},${row}`)) continue;
            const imageSize = ts.imageSizeByTileId.get(localTileId) || { width: mapTileWidth, height: mapTileHeight };
            const tileCenterX = (col - row) * halfW + originX;
            const tileTopY = (col + row) * halfH;
            const imageTopLeftX = tileCenterX - imageSize.width * 0.5;
            // Em layer isometrica do Tiled, sprite alto ancora no "chao" do tile.
            // Ajustamos topo do sprite para evitar colisao deslocada para o piso.
            const imageTopLeftY = tileTopY - Math.max(0, imageSize.height - mapTileHeight);

            for (const localPoly of localPolys) {
                const ptsWorld = localPoly.points.map((p) => {
                    const px = imageTopLeftX + Number(p.x || 0);
                    const py = imageTopLeftY + Number(p.y || 0);
                    return mapPixelToWorld(px, py, mapWidth, mapHeight, halfW, halfH, originX);
                });
                if (ptsWorld.length < 3) continue;
                let minX = Number.POSITIVE_INFINITY;
                let maxX = Number.NEGATIVE_INFINITY;
                let minY = Number.POSITIVE_INFINITY;
                let maxY = Number.NEGATIVE_INFINITY;
                for (const p of ptsWorld) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }
                out.push({ points: ptsWorld, minX, maxX, minY, maxY });
            }
        }
    }
    return out;
}

function mapPixelToWorld(
    px: number,
    py: number,
    mapWidth: number,
    mapHeight: number,
    halfW: number,
    halfH: number,
    originX: number
) {
    const isoX = Number(px || 0) - originX;
    const isoY = Number(py || 0);
    const gx = (isoY / Math.max(0.0001, halfH) + isoX / Math.max(0.0001, halfW)) * 0.5;
    const gy = (isoY / Math.max(0.0001, halfH) - isoX / Math.max(0.0001, halfW)) * 0.5;
    const wx = clamp((gx / Math.max(1, mapWidth - 1)) * WORLD.width, 0, WORLD.width);
    const wy = clamp((gy / Math.max(1, mapHeight - 1)) * WORLD.height, 0, WORLD.height);
    return { x: wx, y: wy };
}

function isBlockedByDetailedPolygons(x: number, y: number, radius: number, polygons: WorldPolygon[]) {
    const r = Math.max(0, Number(radius || 0));
    const probes = [{ x, y }];
    if (r > 0) {
        probes.push(
            { x: x + r, y },
            { x: x - r, y },
            { x, y: y + r },
            { x, y: y - r },
            { x: x + r * 0.7071, y: y + r * 0.7071 },
            { x: x + r * 0.7071, y: y - r * 0.7071 },
            { x: x - r * 0.7071, y: y + r * 0.7071 },
            { x: x - r * 0.7071, y: y - r * 0.7071 }
        );
    }
    for (const poly of polygons) {
        const minX = poly.minX - r;
        const maxX = poly.maxX + r;
        const minY = poly.minY - r;
        const maxY = poly.maxY + r;
        let near = false;
        for (const p of probes) {
            if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
            near = true;
            break;
        }
        if (!near) continue;
        for (const p of probes) {
            if (pointInPolygon(p.x, p.y, poly.points)) return true;
        }
    }
    return false;
}

function pointInPolygon(x: number, y: number, points: Array<{ x: number; y: number }>) {
    let inside = false;
    const n = points.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = Number(points[i]?.x || 0);
        const yi = Number(points[i]?.y || 0);
        const xj = Number(points[j]?.x || 0);
        const yj = Number(points[j]?.y || 0);
        const intersects = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / Math.max(0.000001, (yj - yi)) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

function isBlockedCellAtWorld(
    worldX: number,
    worldY: number,
    mapWidth: number,
    mapHeight: number,
    blocked: boolean[][]
) {
    const wx = clamp(worldX, 0, WORLD.width);
    const wy = clamp(worldY, 0, WORLD.height);
    // Floor evita alternancia de celula em borda (round cria falso bloqueio em passagens estreitas).
    const cx = clamp(Math.floor((wx / Math.max(1, WORLD.width)) * mapWidth), 0, mapWidth - 1);
    const cy = clamp(Math.floor((wy / Math.max(1, WORLD.height)) * mapHeight), 0, mapHeight - 1);
    return Boolean(blocked[cy]?.[cx]);
}

function decodeLayerData(layer: TiledLayer, mapWidth: number, mapHeight: number) {
    if (Array.isArray(layer?.data)) return layer.data;
    const encoded = String(layer?.data || '').trim();
    if (!encoded) return [];
    const encoding = String(layer?.encoding || '').toLowerCase();
    if (encoding !== 'base64') return [];
    const compression = String(layer?.compression || '').toLowerCase();
    if (compression) return [];

    try {
        const buf = Buffer.from(encoded, 'base64');
        const expected = mapWidth * mapHeight;
        const out: number[] = [];
        const max = Math.min(expected, Math.floor(buf.length / 4));
        for (let i = 0; i < max; i += 1) {
            out.push(buf.readUInt32LE(i * 4));
        }
        return out;
    } catch {
        return [];
    }
}

function buildTilesetCollisionByFirstGid(tilesets: TiledTilesetRef[]) {
    const out: TilesetCollisionDef[] = [];
    for (const tileset of tilesets) {
        const firstgid = Math.max(1, Math.floor(Number(tileset?.firstgid || 0)));
        const source = typeof tileset?.source === 'string' ? tileset.source : '';
        if (!source) continue;
        const tsxPath = path.resolve(path.dirname(TMJ_PATH), source);
        const tsx = safeReadText(tsxPath);
        if (!tsx) continue;
        const parsed = parseCollisionFromTsx(tsx);
        const collisionTileIds = parsed.collisionTileIds;
        if (collisionTileIds.size === 0) continue;
        out.push({
            firstgid,
            collisionTileIds,
            collisionPolygonsByTileId: parsed.collisionPolygonsByTileId,
            imageSizeByTileId: parsed.imageSizeByTileId,
            imageNameByTileId: parsed.imageNameByTileId
        });
    }
    return out.sort((a, b) => a.firstgid - b.firstgid);
}

function resolveTilesetForGid(
    tilesets: Array<TilesetCollisionDef>,
    gid: number
) {
    let best: TilesetCollisionDef | null = null;
    for (const tileset of tilesets) {
        if (tileset.firstgid <= gid) best = tileset;
        else break;
    }
    return best;
}

function parseCollisionFromTsx(tsx: string) {
    const collisionTileIds = new Set<number>();
    const collisionPolygonsByTileId = new Map<number, LocalPolygon[]>();
    const imageSizeByTileId = new Map<number, { width: number; height: number }>();
    const imageNameByTileId = new Map<number, string>();
    const tileBlockRegex = /<tile\s+id="(\d+)"[\s\S]*?<\/tile>/g;
    let match: RegExpExecArray | null = tileBlockRegex.exec(tsx);
    while (match) {
        const tileId = Math.floor(Number(match[1]));
        const block = String(match[0] || '');
        const imageSrcMatch = block.match(/<image\s+[^>]*source="([^"]+)"/);
        if (imageSrcMatch && imageSrcMatch[1]) {
            const src = String(imageSrcMatch[1] || '');
            const name = src.split('/').pop()?.split('\\').pop() || src;
            imageNameByTileId.set(tileId, name);
        }
        const imageMatch = block.match(/<image\s+[^>]*width="(\d+)"\s+height="(\d+)"/);
        if (imageMatch) {
            imageSizeByTileId.set(tileId, {
                width: Math.max(1, Math.floor(Number(imageMatch[1] || 1))),
                height: Math.max(1, Math.floor(Number(imageMatch[2] || 1)))
            });
        }
        if (!(block.includes('<objectgroup') && block.includes('<object'))) {
            match = tileBlockRegex.exec(tsx);
            continue;
        }
        collisionTileIds.add(tileId);
        const polys: LocalPolygon[] = [];
        const objectRegex = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
        let om: RegExpExecArray | null = objectRegex.exec(block);
        while (om) {
            const openAttrs = String(om[1] || '');
            const objectBody = String(om[2] || '');
            const objectBlock = `<object ${openAttrs}>${objectBody}</object>`;
            if (/\bname="collision"\b[\s\S]*?\bvalue="false"/i.test(objectBlock)) {
                om = objectRegex.exec(block);
                continue;
            }
            const xMatch = openAttrs.match(/\bx="(-?\d+(?:\.\d+)?)"/);
            const yMatch = openAttrs.match(/\by="(-?\d+(?:\.\d+)?)"/);
            const polyMatch = objectBody.match(/<polygon\s+points="([^"]+)"/);
            if (!xMatch || !yMatch || !polyMatch) {
                om = objectRegex.exec(block);
                continue;
            }
            const ox = Number(xMatch[1] || 0);
            const oy = Number(yMatch[1] || 0);
            const pointsRaw = String(polyMatch[1] || '');
            const points = pointsRaw
                .split(' ')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((pair) => {
                    const [pxRaw, pyRaw] = pair.split(',');
                    return {
                        x: ox + Number(pxRaw || 0),
                        y: oy + Number(pyRaw || 0)
                    };
                })
                .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
            if (points.length >= 3) polys.push({ points });
            om = objectRegex.exec(block);
        }
        if (polys.length > 0) collisionPolygonsByTileId.set(tileId, polys);
        match = tileBlockRegex.exec(tsx);
    }
    return {
        collisionTileIds,
        collisionPolygonsByTileId,
        imageSizeByTileId,
        imageNameByTileId
    };
}

function isPassThroughTileName(imageName: string) {
    const s = String(imageName || '').toLowerCase();
    if (!s) return false;
    if (s.includes('archway')) return true;
    if (s.includes('dooropen')) return true;
    if (s.includes('gateopen')) return true;
    if (s.includes('wallhole')) return true;
    return false;
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
