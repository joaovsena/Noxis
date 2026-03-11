"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMapTiledCollisionSampler = getMapTiledCollisionSampler;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const mapMetadata_1 = require("./mapMetadata");
const FLIPPED_GID_MASK = 0xe0000000;
const RAW_GID_MASK = 0x1fffffff;
const cache = new Map();
const WALL_LAYER_NAMES = new Set(['paredes', 'walls', 'wall', 'collision', 'colisao', 'collisions']);
function getMapTiledCollisionSampler(mapKey) {
    const metadata = (0, mapMetadata_1.getMapMetadata)(mapKey);
    const tmjPath = String(metadata?.tmjPath || '');
    if (!tmjPath)
        return null;
    if (cache.has(tmjPath))
        return cache.get(tmjPath) || null;
    const sampler = buildSampler(tmjPath, metadata?.world || config_1.WORLD);
    cache.set(tmjPath, sampler);
    return sampler;
}
function buildSampler(tmjPath, world) {
    if (!(0, fs_1.existsSync)(tmjPath))
        return null;
    const rawMap = safeReadText(tmjPath);
    if (!rawMap)
        return null;
    const parsedMap = safeParseMap(rawMap);
    if (!parsedMap)
        return null;
    const mapWidth = Math.max(1, Math.floor(Number(parsedMap.width || 0)));
    const mapHeight = Math.max(1, Math.floor(Number(parsedMap.height || 0)));
    const tilesets = Array.isArray(parsedMap.tilesets) ? parsedMap.tilesets : [];
    const tilesetCollision = buildTilesetCollisionByFirstGid(tmjPath, tilesets);
    if (!tilesetCollision.length)
        return null;
    const blocked = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(false));
    const wallLayerNames = collectWallLayerNames(parsedMap);
    const passThroughByCell = collectPassThroughCells(parsedMap, tilesetCollision, mapWidth, mapHeight, wallLayerNames);
    const passThroughZones = buildPassThroughZones(passThroughByCell, mapWidth, mapHeight, world);
    const noCollisionPolygons = buildNoCollisionPolygons(parsedMap, mapWidth, mapHeight, Math.max(1, Number(parsedMap.tilewidth || 1)), Math.max(1, Number(parsedMap.tileheight || 1)), world);
    const detailedPolygons = buildDetailedCollisionPolygons(parsedMap, tilesetCollision, Math.max(1, Number(parsedMap.tilewidth || 1)), Math.max(1, Number(parsedMap.tileheight || 1)), wallLayerNames, world, passThroughByCell);
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer')
            continue;
        if (layer?.visible === false)
            continue;
        if (!wallLayerNames.has(String(layer?.name || '')))
            continue;
        const data = decodeLayerData(layer, mapWidth, mapHeight);
        if (!data.length)
            continue;
        const limit = Math.min(data.length, mapWidth * mapHeight);
        for (let idx = 0; idx < limit; idx += 1) {
            const rawGid = Number(data[idx] || 0);
            if (!Number.isFinite(rawGid) || rawGid === 0)
                continue;
            const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIPPED_GID_MASK;
            if (gid <= 0)
                continue;
            const match = resolveTilesetForGid(tilesetCollision, gid);
            if (!match)
                continue;
            const localTileId = gid - match.firstgid;
            if (!match.collisionTileIds.has(localTileId))
                continue;
            const localPolys = match.collisionPolygonsByTileId.get(localTileId);
            if (Array.isArray(localPolys) && localPolys.length > 0)
                continue;
            const imageName = String(match.imageNameByTileId.get(localTileId) || '').toLowerCase();
            if (isPassThroughTileName(imageName))
                continue;
            const rawX = idx % mapWidth;
            const rawY = Math.floor(idx / mapWidth);
            if (passThroughByCell.has(`${rawX},${rawY}`))
                continue;
            const shifted = shiftBlockedCell(rawX, rawY, imageName, mapWidth, mapHeight);
            const x = shifted.x;
            const y = shifted.y;
            if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight)
                continue;
            blocked[y][x] = true;
        }
    }
    carveBlockedCellsWithNoCollision(blocked, mapWidth, mapHeight, world, noCollisionPolygons);
    return {
        isBlockedAt(worldX, worldY, radiusWorld) {
            const wx = clamp(worldX, 0, world.width);
            const wy = clamp(worldY, 0, world.height);
            const radius = Math.max(0, Number(radiusWorld || 0));
            if (isInsidePassThroughZone(wx, wy, radius, passThroughZones))
                return false;
            if (isBlockedByDetailedPolygons(wx, wy, radius, noCollisionPolygons))
                return false;
            const effectiveRadius = Math.min(4, radius * 0.12);
            if (detailedPolygons.length > 0 && isBlockedByDetailedPolygons(wx, wy, effectiveRadius, detailedPolygons)) {
                return true;
            }
            if (isBlockedCellAtWorld(wx, wy, mapWidth, mapHeight, blocked, world))
                return true;
            if (effectiveRadius <= 0)
                return false;
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
                if (isBlockedCellAtWorld(wx + dx, wy + dy, mapWidth, mapHeight, blocked, world))
                    return true;
            }
            return false;
        }
    };
}
function collectWallLayerNames(parsedMap) {
    const out = new Set();
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer')
            continue;
        if (layer?.visible === false)
            continue;
        const layerName = String(layer?.name || '');
        if (WALL_LAYER_NAMES.has(layerName.toLowerCase()))
            out.add(layerName);
    }
    return out;
}
function buildNoCollisionPolygons(parsedMap, mapWidth, mapHeight, mapTileWidth, mapTileHeight, world) {
    const projection = buildIsoProjectionConfig(mapWidth, mapHeight, mapTileWidth, mapTileHeight, world);
    const out = [];
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'objectgroup')
            continue;
        if (layer?.visible === false)
            continue;
        const objects = Array.isArray(layer?.objects) ? layer.objects : [];
        for (const obj of objects) {
            if (!hasNoCollisionProperty(obj?.properties))
                continue;
            const baseX = Number(obj?.x || 0);
            const baseY = Number(obj?.y || 0);
            const poly = Array.isArray(obj?.polygon) ? obj.polygon : [];
            const points = poly
                .map((pt) => tiledObjectToWorldCoords(String(parsedMap?.orientation || ''), baseX + Number(pt?.x || 0), baseY + Number(pt?.y || 0), mapWidth, mapHeight, mapTileWidth, mapTileHeight, projection, world))
                .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
            if (points.length < 3)
                continue;
            let minX = Number.POSITIVE_INFINITY;
            let maxX = Number.NEGATIVE_INFINITY;
            let minY = Number.POSITIVE_INFINITY;
            let maxY = Number.NEGATIVE_INFINITY;
            for (const p of points) {
                if (p.x < minX)
                    minX = p.x;
                if (p.x > maxX)
                    maxX = p.x;
                if (p.y < minY)
                    minY = p.y;
                if (p.y > maxY)
                    maxY = p.y;
            }
            out.push({ points, minX, maxX, minY, maxY });
        }
    }
    return out;
}
function hasNoCollisionProperty(properties) {
    for (const prop of Array.isArray(properties) ? properties : []) {
        const name = String(prop?.name || '').trim().toLowerCase();
        if (name !== 'nocolission' && name !== 'nocollision' && name !== 'no_collision')
            continue;
        return Boolean(prop?.value);
    }
    return false;
}
function buildDetailedCollisionPolygons(parsedMap, tilesets, mapTileWidth, mapTileHeight, includedLayerNames, world, passThroughByCell) {
    const mapWidth = Math.max(1, Math.floor(Number(parsedMap.width || 1)));
    const mapHeight = Math.max(1, Math.floor(Number(parsedMap.height || 1)));
    const projection = buildIsoProjectionConfig(mapWidth, mapHeight, mapTileWidth, mapTileHeight, world);
    const out = [];
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer')
            continue;
        if (layer?.visible === false)
            continue;
        if (!includedLayerNames.has(String(layer?.name || '')))
            continue;
        const data = decodeLayerData(layer, mapWidth, mapHeight);
        if (!data.length)
            continue;
        const limit = Math.min(data.length, mapWidth * mapHeight);
        for (let idx = 0; idx < limit; idx += 1) {
            const rawGid = Number(data[idx] || 0);
            if (!Number.isFinite(rawGid) || rawGid === 0)
                continue;
            const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIPPED_GID_MASK;
            if (gid <= 0)
                continue;
            const ts = resolveTilesetForGid(tilesets, gid);
            if (!ts)
                continue;
            const localTileId = gid - ts.firstgid;
            const localPolys = ts.collisionPolygonsByTileId.get(localTileId);
            if (!localPolys?.length)
                continue;
            const col = idx % mapWidth;
            const row = Math.floor(idx / mapWidth);
            if (passThroughByCell.has(`${col},${row}`))
                continue;
            const imageName = String(ts.imageNameByTileId.get(localTileId) || '').toLowerCase();
            if (isPassThroughTileName(imageName))
                continue;
            const imageSize = ts.imageSizeByTileId.get(localTileId) || { width: mapTileWidth, height: mapTileHeight };
            const projected = isoGridToWorldCoords(col, row, projection);
            const tilesetTileWidth = Math.max(1, Number(ts.tilesetTileWidth || mapTileWidth || 1));
            const tilesetTileHeight = Math.max(1, Number(ts.tilesetTileHeight || mapTileHeight || 1));
            const spriteScale = projection.scale * (mapTileWidth / tilesetTileWidth);
            const drawW = imageSize.width * spriteScale;
            const drawH = imageSize.height * spriteScale;
            const offsetX = Number(ts.tileoffsetX || 0) * spriteScale;
            const offsetY = Number(ts.tileoffsetY || 0) * spriteScale;
            const imageTopLeftX = projected.x - drawW * 0.5 + offsetX;
            const imageTopLeftY = projected.y - drawH + (tilesetTileHeight * spriteScale) + offsetY;
            for (const localPoly of localPolys) {
                const ptsWorld = localPoly.points.map((p) => {
                    const px = imageTopLeftX + Number(p.x || 0) * spriteScale;
                    const py = imageTopLeftY + Number(p.y || 0) * spriteScale;
                    return renderToWorldCoords(px, py, projection, world);
                });
                if (ptsWorld.length < 3)
                    continue;
                let minX = Number.POSITIVE_INFINITY;
                let maxX = Number.NEGATIVE_INFINITY;
                let minY = Number.POSITIVE_INFINITY;
                let maxY = Number.NEGATIVE_INFINITY;
                for (const p of ptsWorld) {
                    if (p.x < minX)
                        minX = p.x;
                    if (p.x > maxX)
                        maxX = p.x;
                    if (p.y < minY)
                        minY = p.y;
                    if (p.y > maxY)
                        maxY = p.y;
                }
                out.push({ points: ptsWorld, minX, maxX, minY, maxY });
            }
        }
    }
    return out;
}
function collectPassThroughCells(parsedMap, tilesets, mapWidth, mapHeight, wallLayerNames) {
    const out = new Set();
    const layers = Array.isArray(parsedMap.layers) ? parsedMap.layers : [];
    for (const layer of layers) {
        if (layer?.type !== 'tilelayer')
            continue;
        if (layer?.visible === false)
            continue;
        const layerName = String(layer?.name || '');
        const isWallLayer = wallLayerNames.has(layerName);
        if (!isWallLayer)
            continue;
        const data = decodeLayerData(layer, mapWidth, mapHeight);
        if (!data.length)
            continue;
        const limit = Math.min(data.length, mapWidth * mapHeight);
        for (let idx = 0; idx < limit; idx += 1) {
            const rawGid = Number(data[idx] || 0);
            if (!Number.isFinite(rawGid) || rawGid === 0)
                continue;
            const col = idx % mapWidth;
            const row = Math.floor(idx / mapWidth);
            const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIPPED_GID_MASK;
            if (gid <= 0)
                continue;
            const ts = resolveTilesetForGid(tilesets, gid);
            if (!ts)
                continue;
            const localTileId = gid - ts.firstgid;
            const imageName = String(ts.imageNameByTileId.get(localTileId) || '').toLowerCase();
            if (isPassThroughTileName(imageName))
                out.add(`${col},${row}`);
        }
    }
    return out;
}
function buildPassThroughZones(passThroughByCell, mapWidth, mapHeight, world) {
    const cellWidth = world.width / Math.max(1, mapWidth);
    const cellHeight = world.height / Math.max(1, mapHeight);
    const expandX = cellWidth * 1.1;
    const expandY = cellHeight * 1.1;
    const zones = [];
    for (const key of passThroughByCell) {
        const [cxRaw, cyRaw] = key.split(',');
        const cx = clamp(Number(cxRaw), 0, mapWidth - 1);
        const cy = clamp(Number(cyRaw), 0, mapHeight - 1);
        zones.push({
            minX: clamp(cx * cellWidth - expandX, 0, world.width),
            maxX: clamp((cx + 1) * cellWidth + expandX, 0, world.width),
            minY: clamp(cy * cellHeight - expandY, 0, world.height),
            maxY: clamp((cy + 1) * cellHeight + expandY, 0, world.height)
        });
    }
    return zones;
}
function isInsidePassThroughZone(x, y, radius, zones) {
    for (const zone of zones) {
        if (x < zone.minX - radius || x > zone.maxX + radius || y < zone.minY - radius || y > zone.maxY + radius)
            continue;
        return true;
    }
    return false;
}
function isoGridToWorldCoords(col, row, projection) {
    const isoX = (col - row) * projection.halfW;
    const isoY = (col + row) * projection.halfH;
    return {
        x: (isoX - projection.minIsoX) * projection.scale + projection.offsetX,
        y: isoY * projection.scale + projection.offsetY
    };
}
function tiledObjectToWorldCoords(orientation, objectX, objectY, mapWidth, mapHeight, mapTileWidth, mapTileHeight, projection, world) {
    if (String(orientation || '').toLowerCase() === 'isometric') {
        const divisor = Math.max(1, mapTileHeight);
        const gx = (Number(objectX || 0) + Number(objectY || 0)) / divisor;
        const gy = (Number(objectY || 0) - Number(objectX || 0)) / divisor;
        return {
            x: (gx / Math.max(1, mapWidth - 1)) * world.width,
            y: (gy / Math.max(1, mapHeight - 1)) * world.height
        };
    }
    return renderToWorldCoords(objectX, objectY, projection, world);
}
function renderToWorldCoords(renderX, renderY, projection, world) {
    const isoX = ((Number(renderX || 0) - projection.offsetX) / Math.max(0.0001, projection.scale)) + projection.minIsoX;
    const isoY = (Number(renderY || 0) - projection.offsetY) / Math.max(0.0001, projection.scale);
    const gx = (isoY / Math.max(0.0001, projection.halfH) + isoX / Math.max(0.0001, projection.halfW)) * 0.5;
    const gy = (isoY / Math.max(0.0001, projection.halfH) - isoX / Math.max(0.0001, projection.halfW)) * 0.5;
    return {
        x: (gx / Math.max(1, projection.mapWidth - 1)) * world.width,
        y: (gy / Math.max(1, projection.mapHeight - 1)) * world.height
    };
}
function buildTilesetCollisionByFirstGid(tmjPath, tilesets) {
    const out = [];
    for (const tileset of tilesets) {
        const firstgid = Math.max(1, Math.floor(Number(tileset?.firstgid || 0)));
        const source = typeof tileset?.source === 'string' ? tileset.source : '';
        if (!source)
            continue;
        const tsxPath = path_1.default.resolve(path_1.default.dirname(tmjPath), source);
        const tsx = safeReadText(tsxPath);
        if (!tsx)
            continue;
        const parsed = parseCollisionFromTsx(tsx);
        if (parsed.collisionTileIds.size === 0)
            continue;
        out.push({
            firstgid,
            tileoffsetX: parsed.tileoffsetX,
            tileoffsetY: parsed.tileoffsetY,
            tilesetTileWidth: parsed.tilesetTileWidth,
            tilesetTileHeight: parsed.tilesetTileHeight,
            collisionTileIds: parsed.collisionTileIds,
            collisionPolygonsByTileId: parsed.collisionPolygonsByTileId,
            imageSizeByTileId: parsed.imageSizeByTileId,
            imageNameByTileId: parsed.imageNameByTileId
        });
    }
    return out.sort((a, b) => a.firstgid - b.firstgid);
}
function resolveTilesetForGid(tilesets, gid) {
    let best = null;
    for (const tileset of tilesets) {
        if (tileset.firstgid <= gid)
            best = tileset;
        else
            break;
    }
    return best;
}
function parseCollisionFromTsx(tsx) {
    const collisionTileIds = new Set();
    const collisionPolygonsByTileId = new Map();
    const imageSizeByTileId = new Map();
    const imageNameByTileId = new Map();
    const tileOffsetMatch = tsx.match(/<tileoffset\s+x="(-?\d+)"\s+y="(-?\d+)"/);
    const tilesetTileWidthMatch = tsx.match(/tilewidth="(\d+)"/);
    const tilesetTileHeightMatch = tsx.match(/tileheight="(\d+)"/);
    const tileoffsetX = tileOffsetMatch ? Number(tileOffsetMatch[1] || 0) : 0;
    const tileoffsetY = tileOffsetMatch ? Number(tileOffsetMatch[2] || 0) : 0;
    const tilesetTileWidth = tilesetTileWidthMatch ? Math.max(1, Number(tilesetTileWidthMatch[1] || 1)) : 1;
    const tilesetTileHeight = tilesetTileHeightMatch ? Math.max(1, Number(tilesetTileHeightMatch[1] || 1)) : 1;
    const tileBlockRegex = /<tile\s+id="(\d+)"[\s\S]*?<\/tile>/g;
    let match = tileBlockRegex.exec(tsx);
    while (match) {
        const tileId = Math.floor(Number(match[1]));
        const block = String(match[0] || '');
        const imageSrcMatch = block.match(/<image\s+[^>]*source="([^"]+)"/);
        if (imageSrcMatch?.[1]) {
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
        const polys = [];
        const objectRegex = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
        let om = objectRegex.exec(block);
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
            const points = String(polyMatch[1] || '')
                .split(' ')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((pair) => {
                const [pxRaw, pyRaw] = pair.split(',');
                return { x: ox + Number(pxRaw || 0), y: oy + Number(pyRaw || 0) };
            })
                .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
            if (points.length >= 3)
                polys.push({ points });
            om = objectRegex.exec(block);
        }
        if (polys.length > 0)
            collisionPolygonsByTileId.set(tileId, polys);
        match = tileBlockRegex.exec(tsx);
    }
    return {
        tileoffsetX,
        tileoffsetY,
        tilesetTileWidth,
        tilesetTileHeight,
        collisionTileIds,
        collisionPolygonsByTileId,
        imageSizeByTileId,
        imageNameByTileId
    };
}
function decodeLayerData(layer, mapWidth, mapHeight) {
    if (Array.isArray(layer?.data))
        return layer.data;
    const encoded = String(layer?.data || '').trim();
    if (!encoded)
        return [];
    const encoding = String(layer?.encoding || '').toLowerCase();
    if (encoding !== 'base64')
        return [];
    const compression = String(layer?.compression || '').toLowerCase();
    if (compression)
        return [];
    try {
        const buf = Buffer.from(encoded, 'base64');
        const expected = mapWidth * mapHeight;
        const out = [];
        const max = Math.min(expected, Math.floor(buf.length / 4));
        for (let i = 0; i < max; i += 1)
            out.push(buf.readUInt32LE(i * 4));
        return out;
    }
    catch {
        return [];
    }
}
function buildIsoProjectionConfig(mapWidth, mapHeight, tileWidth, tileHeight, world) {
    const halfW = tileWidth / 2;
    const halfH = tileHeight / 2;
    const span = Math.max(1, mapWidth + mapHeight - 2);
    const isoW = span * halfW;
    const isoH = span * halfH;
    const scale = Math.min(world.width / Math.max(1, isoW), world.height / Math.max(1, isoH));
    const projectedW = isoW * scale;
    const projectedH = isoH * scale;
    return {
        mapWidth,
        mapHeight,
        halfW,
        halfH,
        scale,
        offsetX: (world.width - projectedW) * 0.5,
        offsetY: (world.height - projectedH) * 0.5,
        minIsoX: -(Math.max(1, mapHeight - 1) * halfW)
    };
}
function isBlockedByDetailedPolygons(x, y, radius, polygons) {
    const r = Math.max(0, Number(radius || 0));
    const probes = [{ x, y }];
    if (r > 0) {
        probes.push({ x: x + r, y }, { x: x - r, y }, { x, y: y + r }, { x, y: y - r }, { x: x + r * 0.7071, y: y + r * 0.7071 }, { x: x + r * 0.7071, y: y - r * 0.7071 }, { x: x - r * 0.7071, y: y + r * 0.7071 }, { x: x - r * 0.7071, y: y - r * 0.7071 });
    }
    for (const poly of polygons) {
        const minX = poly.minX - r;
        const maxX = poly.maxX + r;
        const minY = poly.minY - r;
        const maxY = poly.maxY + r;
        let near = false;
        for (const p of probes) {
            if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY)
                continue;
            near = true;
            break;
        }
        if (!near)
            continue;
        for (const p of probes) {
            if (pointInPolygon(p.x, p.y, poly.points))
                return true;
        }
    }
    return false;
}
function pointInPolygon(x, y, points) {
    let inside = false;
    const n = points.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = Number(points[i]?.x || 0);
        const yi = Number(points[i]?.y || 0);
        const xj = Number(points[j]?.x || 0);
        const yj = Number(points[j]?.y || 0);
        const intersects = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / Math.max(0.000001, yj - yi) + xi);
        if (intersects)
            inside = !inside;
    }
    return inside;
}
function carveBlockedCellsWithNoCollision(blocked, mapWidth, mapHeight, world, noCollisionPolygons) {
    if (!Array.isArray(noCollisionPolygons) || noCollisionPolygons.length === 0)
        return;
    const cellWidth = world.width / Math.max(1, mapWidth);
    const cellHeight = world.height / Math.max(1, mapHeight);
    for (let cy = 0; cy < mapHeight; cy += 1) {
        for (let cx = 0; cx < mapWidth; cx += 1) {
            if (!blocked[cy]?.[cx])
                continue;
            const minX = cx * cellWidth;
            const maxX = (cx + 1) * cellWidth;
            const minY = cy * cellHeight;
            const maxY = (cy + 1) * cellHeight;
            const probes = [
                { x: (minX + maxX) * 0.5, y: (minY + maxY) * 0.5 },
                { x: minX + cellWidth * 0.2, y: minY + cellHeight * 0.2 },
                { x: maxX - cellWidth * 0.2, y: minY + cellHeight * 0.2 },
                { x: minX + cellWidth * 0.2, y: maxY - cellHeight * 0.2 },
                { x: maxX - cellWidth * 0.2, y: maxY - cellHeight * 0.2 }
            ];
            let clear = false;
            for (const poly of noCollisionPolygons) {
                if (maxX < poly.minX || minX > poly.maxX || maxY < poly.minY || minY > poly.maxY)
                    continue;
                if (probes.some((probe) => pointInPolygon(probe.x, probe.y, poly.points))) {
                    clear = true;
                    break;
                }
            }
            if (clear)
                blocked[cy][cx] = false;
        }
    }
}
function isBlockedCellAtWorld(worldX, worldY, mapWidth, mapHeight, blocked, world) {
    const wx = clamp(worldX, 0, world.width);
    const wy = clamp(worldY, 0, world.height);
    const cx = clamp(Math.floor((wx / Math.max(1, world.width)) * mapWidth), 0, mapWidth - 1);
    const cy = clamp(Math.floor((wy / Math.max(1, world.height)) * mapHeight), 0, mapHeight - 1);
    return Boolean(blocked[cy]?.[cx]);
}
function isPassThroughTileName(imageName) {
    const s = String(imageName || '').toLowerCase();
    if (!s)
        return false;
    if (s.includes('archway'))
        return true;
    if (s.includes('dooropen'))
        return true;
    if (s.includes('gateopen'))
        return true;
    if (s.includes('wallhole'))
        return true;
    return false;
}
function shiftBlockedCell(x, y, imageName, mapWidth, mapHeight) {
    const s = String(imageName || '').toLowerCase();
    let nx = x;
    let ny = y;
    if (s.includes('_s.')) {
        nx += 1;
        ny += 1;
    }
    else if (s.includes('_w.')) {
        nx += 1;
    }
    else if (s.includes('_e.')) {
        ny += 1;
    }
    return {
        x: clamp(nx, 0, mapWidth - 1),
        y: clamp(ny, 0, mapHeight - 1)
    };
}
function safeReadText(filePath) {
    try {
        return (0, fs_1.readFileSync)(filePath, 'utf8');
    }
    catch {
        return '';
    }
}
function safeParseMap(raw) {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
function clamp(value, min, max) {
    const n = Number.isFinite(Number(value)) ? Number(value) : min;
    if (n < min)
        return min;
    if (n > max)
        return max;
    return n;
}
//# sourceMappingURL=tiledCollision.js.map