import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { WORLD, MAP_CODE_BY_KEY, mapCodeFromKey } from '../config';
import { DUNGEON_BY_ID } from '../content/dungeons';

type TiledProperty = {
    name?: string;
    value?: unknown;
};

type TiledMapDoc = {
    width?: number;
    height?: number;
    tilewidth?: number;
    tileheight?: number;
    orientation?: string;
    properties?: TiledProperty[];
    tilesets?: Array<{ source?: string }>;
};

export type MapMetadata = {
    mapKey: string;
    assetKey: string;
    mapCode: string;
    tmjPath: string;
    tmjUrl: string;
    tilesBaseUrl: string;
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    orientation: string;
    worldTileSize: number;
    worldScale: number;
    world: { width: number; height: number };
};

const cache = new Map<string, MapMetadata | null>();

export function getMapMetadata(mapKey: string): MapMetadata | null {
    const key = String(mapKey || '').trim();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key) || null;
    const metadata = loadMapMetadata(key);
    cache.set(key, metadata);
    return metadata;
}

function loadMapMetadata(mapKey: string): MapMetadata | null {
    const assetKey = resolveMapAssetKey(mapKey);
    if (!assetKey) return null;
    const assetDir = path.resolve(process.cwd(), 'public', 'maps', assetKey);
    if (!existsSync(assetDir)) return null;
    const tmjPath = resolveTmjPath(assetDir, assetKey);
    if (!tmjPath) return null;
    const raw = safeReadText(tmjPath);
    if (!raw) return null;
    const doc = safeParseMap(raw);
    if (!doc) return null;
    const props = propertiesToRecord(doc.properties);
    const tmjName = path.basename(tmjPath);
    const width = Math.max(1, Math.floor(Number(doc.width || 1)));
    const height = Math.max(1, Math.floor(Number(doc.height || 1)));
    const tilewidth = Math.max(1, Number(doc.tilewidth || 1));
    const tileheight = Math.max(1, Number(doc.tileheight || 1));
    const orientation = String(doc.orientation || '').toLowerCase();
    const worldConfig = deriveWorldConfig(width, height, props);
    const configuredMapCode = String(props.mapCode ?? props.mapcode ?? '').trim();
    const mapCode = (configuredMapCode || assetKey).toUpperCase();
    const tilesBaseUrl = resolveTilesBaseUrl(assetDir, assetKey, tmjPath, doc, props);
    return {
        mapKey,
        assetKey,
        mapCode,
        tmjPath,
        tmjUrl: `/maps/${assetKey}/${tmjName}`,
        tilesBaseUrl,
        width,
        height,
        tilewidth,
        tileheight,
        orientation,
        worldTileSize: worldConfig.worldTileSize,
        worldScale: worldConfig.worldScale,
        world: worldConfig.world
    };
}

function deriveWorldConfig(
    mapWidth: number,
    mapHeight: number,
    props: Record<string, unknown>
) {
    const configuredWorldWidth = Number(props.worldWidth ?? props.worldwidth);
    const configuredWorldHeight = Number(props.worldHeight ?? props.worldheight);
    if (Number.isFinite(configuredWorldWidth) && configuredWorldWidth > 0
        && Number.isFinite(configuredWorldHeight) && configuredWorldHeight > 0) {
        const tileSizeFromExplicit = Math.max(
            1,
            Number(props.worldTileSize ?? props.worldtilesize)
                || Number(props.worldTileSizeX ?? props.worldtilesizex)
                || Number(props.worldTileSizeY ?? props.worldtilesizey)
                || Math.min(configuredWorldWidth / Math.max(1, mapWidth), configuredWorldHeight / Math.max(1, mapHeight))
        );
        return {
            worldTileSize: tileSizeFromExplicit,
            worldScale: 1,
            world: {
                width: configuredWorldWidth,
                height: configuredWorldHeight
            }
        };
    }

    const configuredWorldScale = Number(props.worldScale ?? props.worldscale);
    const safeWorldScale = Number.isFinite(configuredWorldScale) && configuredWorldScale > 0 ? configuredWorldScale : 1;
    const configuredTileSize = Number(props.worldTileSize ?? props.worldtilesize);
    const configuredTileSizeX = Number(props.worldTileSizeX ?? props.worldtilesizex);
    const configuredTileSizeY = Number(props.worldTileSizeY ?? props.worldtilesizey);
    const fallbackTileSizeX = WORLD.width / Math.max(1, mapWidth);
    const fallbackTileSizeY = WORLD.height / Math.max(1, mapHeight);
    const fallbackUnifiedTileSize = deriveDefaultWorldTileSize(
        mapWidth,
        mapHeight,
        fallbackTileSizeX,
        fallbackTileSizeY
    );
    const baseTileSize = Number.isFinite(configuredTileSize) && configuredTileSize > 0
        ? configuredTileSize
        : fallbackUnifiedTileSize;
    const tileSizeX = (Number.isFinite(configuredTileSizeX) && configuredTileSizeX > 0 ? configuredTileSizeX : baseTileSize) * safeWorldScale;
    const tileSizeY = (Number.isFinite(configuredTileSizeY) && configuredTileSizeY > 0 ? configuredTileSizeY : baseTileSize) * safeWorldScale;
    return {
        worldTileSize: baseTileSize,
        worldScale: safeWorldScale,
        world: {
            width: Math.max(1, Math.round(mapWidth * tileSizeX)),
            height: Math.max(1, Math.round(mapHeight * tileSizeY))
        }
    };
}

function deriveDefaultWorldTileSize(
    mapWidth: number,
    mapHeight: number,
    fallbackTileSizeX: number,
    fallbackTileSizeY: number
) {
    return Math.max(1, Math.round((fallbackTileSizeX + fallbackTileSizeY) * 0.5));
}

function resolveMapAssetKey(mapKey: string) {
    const key = String(mapKey || '').trim();
    if (!key) return '';
    const fromDungeon = String(DUNGEON_BY_ID[key]?.mapAssetKey || '').trim();
    if (fromDungeon) return fromDungeon;
    if (existsSync(path.resolve(process.cwd(), 'public', 'maps', key))) return key;
    const directCode = String(MAP_CODE_BY_KEY[key] || '').trim();
    if (directCode && existsSync(path.resolve(process.cwd(), 'public', 'maps', directCode))) return directCode;
    const fallbackCode = String(mapCodeFromKey(key) || '').trim();
    if (fallbackCode && existsSync(path.resolve(process.cwd(), 'public', 'maps', fallbackCode))) return fallbackCode;
    return '';
}

function resolveTmjPath(assetDir: string, assetKey: string) {
    const candidates = [`${assetKey}.tmj`, `${String(assetKey || '').toLowerCase()}.tmj`];
    for (const candidate of candidates) {
        const full = path.resolve(assetDir, candidate);
        if (existsSync(full)) return full;
    }
    try {
        const entry = readdirSync(assetDir, { withFileTypes: true }).find((item) => item.isFile() && item.name.toLowerCase().endsWith('.tmj'));
        return entry ? path.resolve(assetDir, entry.name) : '';
    } catch {
        return '';
    }
}

function resolveTilesBaseUrl(
    assetDir: string,
    assetKey: string,
    tmjPath: string,
    doc: TiledMapDoc,
    props: Record<string, unknown>
) {
    const configured = String(props.tilesBaseUrl ?? props.tilesbaseurl ?? '').trim();
    if (configured) return configured;
    const localTilesDir = path.resolve(assetDir, 'tiles');
    if (existsSync(localTilesDir)) return `/maps/${assetKey}/tiles`;
    const firstTilesetSource = String(doc.tilesets?.[0]?.source || '').trim();
    if (!firstTilesetSource) return `/maps/${assetKey}`;
    const tsxPath = path.resolve(path.dirname(tmjPath), firstTilesetSource);
    const publicMapsRoot = path.resolve(process.cwd(), 'public');
    const relativeDir = path.relative(publicMapsRoot, path.dirname(tsxPath)).replace(/\\/g, '/');
    return relativeDir ? `/${relativeDir}` : `/maps/${assetKey}`;
}

function propertiesToRecord(properties?: TiledProperty[]) {
    const out: Record<string, unknown> = {};
    for (const prop of Array.isArray(properties) ? properties : []) {
        const name = String(prop?.name || '').trim();
        if (!name) continue;
        out[name] = prop?.value;
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

function safeParseMap(raw: string): TiledMapDoc | null {
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as TiledMapDoc;
    } catch {
        return null;
    }
}
