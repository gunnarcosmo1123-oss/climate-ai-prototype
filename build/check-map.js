'use strict';
/* 地图几何完整性检验:node build/check-map.js
   解析 map-data.js 的路径,用射线法验证首都/城市点是否落在对应国家内 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'map-data.js'), 'utf8');
(0, eval)(src + '\n;globalThis.__M=MAP_DATA;');
const MAP = globalThis.__M;

function parseRings(d){
  const rings = [];
  let cur = null;
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let i = 0;
  const cmds = d.match(/[MLZ]/g) || [];
  for(const cmd of cmds){
    if(cmd === 'M'){ if(cur && cur.length > 2) rings.push(cur); cur = [[nums[i++], nums[i++]]]; }
    else if(cmd === 'L'){ cur.push([nums[i++], nums[i++]]); }
    else if(cmd === 'Z'){ if(cur && cur.length > 2) rings.push(cur); cur = null; }
  }
  if(cur && cur.length > 2) rings.push(cur);
  return rings;
}
function pointInRing(p, ring){
  let inside = false;
  for(let i = 0, j = ring.length - 1; i < ring.length; j = i++){
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if(((yi > p[1]) !== (yj > p[1])) &&
       (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function pointInCountry(d, p){
  return parseRings(d).some(r => pointInRing(p, r));
}
function country(name){ return MAP.countries.find(c => c.name === name); }
function bbox(d){
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const m = d.match(/-?\d+(\.\d+)?/g).map(Number);
  for(let i = 0; i < m.length; i += 2){ x0 = Math.min(x0, m[i]); y0 = Math.min(y0, m[i+1]); x1 = Math.max(x1, m[i]); y1 = Math.max(y1, m[i+1]); }
  return [x0, y0, x1, y1];
}
/* 测试点:y 轴已翻转(北纬 → 负 y) */
const TESTS = [
  ['China', '北京', 116.4, -39.9],
  ['India', '德里', 77.2, -28.6],
  ['Brazil', '巴西利亚', -47.9, 15.8],
  ['Australia', '堪培拉', 149.1, 35.3],
  ['United States of America', '华盛顿', -77.0, -38.9],
  ['France', '巴黎', 2.35, -48.85],
  ['Russia', '莫斯科', 37.6, -55.7],
  ['Japan', '东京', 139.7, -35.7],
  ['Egypt', '开罗', 31.2, -30.0],
  ['Indonesia', '雅加达', 106.8, 6.2],
  ['South Africa', '约翰内斯堡', 28.0, 26.2],
  ['Canada', '渥太华', -75.7, -45.4]
];
let pass = 0;
TESTS.forEach(([n, city, x, y]) => {
  const c = country(n);
  if(!c){ console.log('✗', n, '国家不存在'); return; }
  const bb = bbox(c.d);
  const ok = pointInCountry(c.d, [x, y]);
  if(ok) pass++;
  console.log((ok ? '✓' : '✗'), n, city, '| bbox:', bb.map(v => v.toFixed(1)).join('..'));
});
console.log(`\n${pass}/${TESTS.length} 通过`);
/* 环闭合检查 */
let closed = 0, total = 0;
MAP.countries.forEach(c => {
  parseRings(c.d).forEach(r => {
    total++;
    const a = r[0], b = r[r.length - 1];
    if(Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01) closed++;
  });
});
console.log(`环闭合: ${closed}/${total}`);
