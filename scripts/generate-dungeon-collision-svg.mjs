import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TMJ_PATH = path.join(ROOT, 'public', 'maps', 'dungeon1', 'dungeon1.tmj');
const TSX_PATH = path.join(ROOT, 'public', 'maps', 'dungeon1', 'dungeon.tsx');
const OUT_PATH = path.join(ROOT, 'public', 'maps', 'dungeon1', 'collision-debug.svg');

const RAW_GID_MASK = 0x1fffffff;
const FLIP_MASK = 0xe0000000;
const WALL_LAYER_NAMES = new Set(['paredes', 'walls', 'wall', 'collision', 'colisao', 'collisions']);

function decodeLayerData(layer, width, height) {
  if (Array.isArray(layer?.data)) return layer.data;
  const encoded = String(layer?.data || '').trim();
  if (!encoded) return [];
  if (String(layer?.encoding || '').toLowerCase() !== 'base64') return [];
  if (String(layer?.compression || '').trim()) return [];
  const buf = Buffer.from(encoded, 'base64');
  const out = [];
  const n = Math.min(width * height, Math.floor(buf.length / 4));
  for (let i = 0; i < n; i += 1) out.push(buf.readUInt32LE(i * 4));
  return out;
}

function parseTilesetCollision(tsxRaw) {
  const collisionTileIds = new Set();
  const imageNameByTileId = new Map();
  const tileRegex = /<tile\s+id="(\d+)"[\s\S]*?<\/tile>/g;
  let match = tileRegex.exec(tsxRaw);
  while (match) {
    const tileId = Number(match[1]);
    const block = String(match[0] || '');
    const imageSrcMatch = block.match(/<image\s+[^>]*source="([^"]+)"/);
    if (imageSrcMatch?.[1]) {
      const src = String(imageSrcMatch[1] || '');
      const imageName = src.split('/').pop()?.split('\\').pop() || src;
      imageNameByTileId.set(tileId, imageName);
    }
    if (block.includes('<objectgroup') && block.includes('<object')) {
      collisionTileIds.add(tileId);
    }
    match = tileRegex.exec(tsxRaw);
  }
  return { collisionTileIds, imageNameByTileId };
}

function isPassThroughTileName(imageName) {
  const s = String(imageName || '').toLowerCase();
  if (!s) return false;
  return s.includes('archway') || s.includes('dooropen') || s.includes('gateopen') || s.includes('wallhole');
}

function shiftBlockedCell(x, y, imageName, mapWidth, mapHeight) {
  const s = String(imageName || '').toLowerCase();
  let nx = x;
  let ny = y;
  if (s.includes('_s.')) {
    nx += 1;
    ny += 1;
  } else if (s.includes('_w.')) {
    nx += 1;
  } else if (s.includes('_e.')) {
    ny += 1;
  }
  return {
    x: clamp(nx, 0, mapWidth - 1),
    y: clamp(ny, 0, mapHeight - 1)
  };
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

const tmjRaw = fs.readFileSync(TMJ_PATH, 'utf8');
const tsxRaw = fs.readFileSync(TSX_PATH, 'utf8');
const map = JSON.parse(tmjRaw);

const width = Number(map.width || 0);
const height = Number(map.height || 0);
const tileW = Number(map.tilewidth || 256);
const tileH = Number(map.tileheight || 128);
const layers = Array.isArray(map.layers) ? map.layers : [];
const wallLayers = layers.filter((layer) => {
  if (layer?.type !== 'tilelayer') return false;
  if (layer?.visible === false) return false;
  return WALL_LAYER_NAMES.has(String(layer?.name || '').toLowerCase());
});

if (!wallLayers.length) {
  throw new Error('Nenhuma camada de parede encontrada no TMJ.');
}

const { collisionTileIds, imageNameByTileId } = parseTilesetCollision(tsxRaw);
const blockedKeySet = new Set();
const passThroughKeySet = new Set();

for (const wallLayer of wallLayers) {
  const data = decodeLayerData(wallLayer, width, height);
  const limit = Math.min(data.length, width * height);
  for (let idx = 0; idx < limit; idx += 1) {
    const rawGid = Number(data[idx] || 0);
    if (!rawGid) continue;
    const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIP_MASK;
    if (gid <= 0) continue;
    const tileId = gid - 1;
    const col = idx % width;
    const row = Math.floor(idx / width);
    const imageName = String(imageNameByTileId.get(tileId) || '');
    if (isPassThroughTileName(imageName)) {
      passThroughKeySet.add(`${col},${row}`);
      continue;
    }
    if (!collisionTileIds.has(tileId)) continue;
    const shifted = shiftBlockedCell(col, row, imageName, width, height);
    blockedKeySet.add(`${shifted.x},${shifted.y}`);
  }
}

for (const passThroughKey of passThroughKeySet) {
  blockedKeySet.delete(passThroughKey);
}

const blocked = Array.from(blockedKeySet, (key) => {
  const [colRaw, rowRaw] = key.split(',');
  return { col: Number(colRaw), row: Number(rowRaw) };
});

const scale = 0.2;
const halfW = tileW / 2;
const halfH = tileH / 2;
const worldW = (width + height) * halfW;
const worldH = (width + height) * halfH;
const svgW = Math.ceil(worldW * scale) + 20;
const svgH = Math.ceil(worldH * scale) + 20;
const originX = (height - 1) * halfW;

function isoPoint(col, row) {
  const x = (col - row) * halfW + originX;
  const y = (col + row) * halfH;
  return { x: x * scale + 10, y: y * scale + 10 };
}

function diamondPath(col, row) {
  const c = isoPoint(col, row);
  const top = { x: c.x, y: c.y };
  const right = { x: c.x + halfW * scale, y: c.y + halfH * scale };
  const bottom = { x: c.x, y: c.y + tileH * scale };
  const left = { x: c.x - halfW * scale, y: c.y + halfH * scale };
  return `M ${top.x.toFixed(2)} ${top.y.toFixed(2)} L ${right.x.toFixed(2)} ${right.y.toFixed(2)} L ${bottom.x.toFixed(2)} ${bottom.y.toFixed(2)} L ${left.x.toFixed(2)} ${left.y.toFixed(2)} Z`;
}

let grid = '';
for (let row = 0; row < height; row += 1) {
  for (let col = 0; col < width; col += 1) {
    grid += `<path d="${diamondPath(col, row)}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  }
}

let blockedSvg = '';
for (const cell of blocked) {
  blockedSvg += `<path d="${diamondPath(cell.col, cell.row)}" fill="rgba(255,50,50,0.45)" stroke="rgba(255,90,90,0.95)" stroke-width="1.3"/>`;
}

const legend = `
  <rect x="14" y="14" width="360" height="84" rx="8" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.2)"/>
  <text x="28" y="38" fill="#fff" font-size="18" font-family="Segoe UI, Arial">Dungeon Collision Debug</text>
  <rect x="28" y="50" width="20" height="12" fill="rgba(255,50,50,0.45)" stroke="rgba(255,90,90,0.95)"/>
  <text x="56" y="61" fill="#fff" font-size="14" font-family="Segoe UI, Arial">Celula bloqueada efetiva (servidor)</text>
  <text x="28" y="83" fill="#c8d2e0" font-size="13" font-family="Segoe UI, Arial">blocked=${blocked.length} passThrough=${passThroughKeySet.size}</text>
`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#0c1220"/>
  ${grid}
  ${blockedSvg}
  ${legend}
</svg>`;

fs.writeFileSync(OUT_PATH, svg, 'utf8');
console.log(`OK: ${OUT_PATH}`);
console.log(`blocked_cells=${blocked.length}`);
console.log(`pass_through_cells=${passThroughKeySet.size}`);
