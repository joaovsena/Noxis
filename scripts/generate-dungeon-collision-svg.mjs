import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TMJ_PATH = path.join(ROOT, 'public', 'maps', 'dungeon1', 'dungeon1.tmj');
const TSX_PATH = path.join(ROOT, 'public', 'maps', 'dungeon1', 'dungeon.tsx');
const OUT_PATH = path.join(ROOT, 'public', 'maps', 'dungeon1', 'collision-debug.svg');
const RAW_GID_MASK = 0x1fffffff;
const FLIP_MASK = 0xe0000000;

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

function parseCollisionTileIds(tsxRaw) {
  const ids = new Set();
  const tileRegex = /<tile\s+id="(\d+)"[\s\S]*?<\/tile>/g;
  let m = tileRegex.exec(tsxRaw);
  while (m) {
    const id = Number(m[1]);
    const block = String(m[0] || '');
    if (block.includes('<objectgroup') && block.includes('<object')) ids.add(id);
    m = tileRegex.exec(tsxRaw);
  }
  return ids;
}

const tmjRaw = fs.readFileSync(TMJ_PATH, 'utf8');
const tsxRaw = fs.readFileSync(TSX_PATH, 'utf8');
const map = JSON.parse(tmjRaw);

const width = Number(map.width || 0);
const height = Number(map.height || 0);
const tileW = Number(map.tilewidth || 256);
const tileH = Number(map.tileheight || 128);
const layers = Array.isArray(map.layers) ? map.layers : [];
const wallLayer = layers.find((l) => l?.type === 'tilelayer' && l?.visible !== false && String(l?.name || '') === 'Paredes');
if (!wallLayer) {
  throw new Error('Camada "Paredes" nao encontrada no TMJ.');
}

const collisionIds = parseCollisionTileIds(tsxRaw);
const data = decodeLayerData(wallLayer, width, height);
const blocked = [];
for (let idx = 0; idx < Math.min(data.length, width * height); idx += 1) {
  const rawGid = Number(data[idx] || 0);
  if (!rawGid) continue;
  const gid = (rawGid >>> 0) & RAW_GID_MASK & ~FLIP_MASK;
  const tileId = gid - 1;
  if (!collisionIds.has(tileId)) continue;
  const col = idx % width;
  const row = Math.floor(idx / width);
  blocked.push({ col, row, gid, tileId });
}

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
  <rect x="14" y="14" width="300" height="66" rx="8" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.2)"/>
  <text x="28" y="38" fill="#fff" font-size="18" font-family="Segoe UI, Arial">Dungeon Collision Debug</text>
  <rect x="28" y="48" width="20" height="12" fill="rgba(255,50,50,0.45)" stroke="rgba(255,90,90,0.95)"/>
  <text x="56" y="59" fill="#fff" font-size="14" font-family="Segoe UI, Arial">Célula bloqueada (servidor)</text>
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
