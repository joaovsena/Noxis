"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMapMetadata = getMapMetadata;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const dungeons_1 = require("../content/dungeons");
const cache = new Map();
function getMapMetadata(mapKey) {
    const key = String(mapKey || '').trim();
    if (!key)
        return null;
    if (cache.has(key))
        return cache.get(key) || null;
    const metadata = loadMapMetadata(key);
    cache.set(key, metadata);
    return metadata;
}
function loadMapMetadata(mapKey) {
    const assetKey = resolveMapAssetKey(mapKey);
    if (!assetKey)
        return null;
    const assetDir = path_1.default.resolve(process.cwd(), 'public', 'maps', assetKey);
    if (!(0, fs_1.existsSync)(assetDir))
        return null;
    const tmjPath = resolveTmjPath(assetDir, assetKey);
    if (!tmjPath)
        return null;
    const raw = safeReadText(tmjPath);
    if (!raw)
        return null;
    const doc = safeParseMap(raw);
    if (!doc)
        return null;
    const props = propertiesToRecord(doc.properties);
    const tmjName = path_1.default.basename(tmjPath);
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
function deriveWorldConfig(mapWidth, mapHeight, props) {
    const configuredWorldWidth = Number(props.worldWidth ?? props.worldwidth);
    const configuredWorldHeight = Number(props.worldHeight ?? props.worldheight);
    if (Number.isFinite(configuredWorldWidth) && configuredWorldWidth > 0
        && Number.isFinite(configuredWorldHeight) && configuredWorldHeight > 0) {
        const tileSizeFromExplicit = Math.max(1, Number(props.worldTileSize ?? props.worldtilesize)
            || Number(props.worldTileSizeX ?? props.worldtilesizex)
            || Number(props.worldTileSizeY ?? props.worldtilesizey)
            || Math.min(configuredWorldWidth / Math.max(1, mapWidth), configuredWorldHeight / Math.max(1, mapHeight)));
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
    const fallbackTileSizeX = config_1.WORLD.width / Math.max(1, mapWidth);
    const fallbackTileSizeY = config_1.WORLD.height / Math.max(1, mapHeight);
    const fallbackUnifiedTileSize = deriveDefaultWorldTileSize(mapWidth, mapHeight, fallbackTileSizeX, fallbackTileSizeY);
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
function deriveDefaultWorldTileSize(mapWidth, mapHeight, fallbackTileSizeX, fallbackTileSizeY) {
    return Math.max(1, Math.round((fallbackTileSizeX + fallbackTileSizeY) * 0.5));
}
function resolveMapAssetKey(mapKey) {
    const key = String(mapKey || '').trim();
    if (!key)
        return '';
    const fromDungeon = String(dungeons_1.DUNGEON_BY_ID[key]?.mapAssetKey || '').trim();
    if (fromDungeon)
        return fromDungeon;
    if ((0, fs_1.existsSync)(path_1.default.resolve(process.cwd(), 'public', 'maps', key)))
        return key;
    const directCode = String(config_1.MAP_CODE_BY_KEY[key] || '').trim();
    if (directCode && (0, fs_1.existsSync)(path_1.default.resolve(process.cwd(), 'public', 'maps', directCode)))
        return directCode;
    const fallbackCode = String((0, config_1.mapCodeFromKey)(key) || '').trim();
    if (fallbackCode && (0, fs_1.existsSync)(path_1.default.resolve(process.cwd(), 'public', 'maps', fallbackCode)))
        return fallbackCode;
    return '';
}
function resolveTmjPath(assetDir, assetKey) {
    const candidates = [`${assetKey}.tmj`, `${String(assetKey || '').toLowerCase()}.tmj`];
    for (const candidate of candidates) {
        const full = path_1.default.resolve(assetDir, candidate);
        if ((0, fs_1.existsSync)(full))
            return full;
    }
    try {
        const entry = (0, fs_1.readdirSync)(assetDir, { withFileTypes: true }).find((item) => item.isFile() && item.name.toLowerCase().endsWith('.tmj'));
        return entry ? path_1.default.resolve(assetDir, entry.name) : '';
    }
    catch {
        return '';
    }
}
function resolveTilesBaseUrl(assetDir, assetKey, tmjPath, doc, props) {
    const configured = String(props.tilesBaseUrl ?? props.tilesbaseurl ?? '').trim();
    if (configured)
        return configured;
    const localTilesDir = path_1.default.resolve(assetDir, 'tiles');
    if ((0, fs_1.existsSync)(localTilesDir))
        return `/maps/${assetKey}/tiles`;
    const firstTilesetSource = String(doc.tilesets?.[0]?.source || '').trim();
    if (!firstTilesetSource)
        return `/maps/${assetKey}`;
    const tsxPath = path_1.default.resolve(path_1.default.dirname(tmjPath), firstTilesetSource);
    const publicMapsRoot = path_1.default.resolve(process.cwd(), 'public');
    const relativeDir = path_1.default.relative(publicMapsRoot, path_1.default.dirname(tsxPath)).replace(/\\/g, '/');
    return relativeDir ? `/${relativeDir}` : `/maps/${assetKey}`;
}
function propertiesToRecord(properties) {
    const out = {};
    for (const prop of Array.isArray(properties) ? properties : []) {
        const name = String(prop?.name || '').trim();
        if (!name)
            continue;
        out[name] = prop?.value;
    }
    return out;
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
//# sourceMappingURL=mapMetadata.js.map