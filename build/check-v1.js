'use strict';
/* v1.1.4 数据完整性检验:node build/check-v1.js */
const fs = require('fs');
const path = require('path');
const v1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'world-110m-v1.json'), 'utf8'));
const v2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries-110m.json'), 'utf8'));

const tr = v1.transform;
const dec = a => {
  let x = 0, y = 0;
  const out = [];
  for(const p of a){
    x += p[0]; y += p[1];
    out.push([+(x*tr.scale[0]+tr.translate[0]).toFixed(2), +(y*tr.scale[1]+tr.translate[1]).toFixed(2)]);
  }
  return out;
};
const arcs = v1.arcs.map(dec);

function ringsOf(g){
  if(g.type === 'Polygon') return g.arcs;
  const rings = [];
  g.arcs.forEach(poly => poly.forEach(r => rings.push(r)));
  return rings;
}
let total = 0, breaks = 0, oor = 0;
v1.objects.countries.geometries.forEach(g => {
  ringsOf(g).forEach(ring => {
    total++;
    for(let k = 0; k < ring.length; k++){
      const ai = ring[k], bi = ring[(k+1) % ring.length];
      if(Math.abs(ai) >= arcs.length || Math.abs(bi) >= arcs.length){ oor++; return; }
      const a = arcs[Math.abs(ai)], b = arcs[Math.abs(bi)];
      const e = ai < 0 ? a[0] : a[a.length-1];
      const s = bi < 0 ? b[b.length-1] : b[0];
      if(Math.hypot(e[0]-s[0], e[1]-s[1]) > 0.5){
        breaks++;
        if(breaks <= 3) console.log('断裂:', g.id, 'ring', ring.join(','), 'Δ=', Math.hypot(e[0]-s[0], e[1]-s[1]).toFixed(1));
      }
    }
  });
});
console.log('v1 环总数:', total, '| 弧线断裂:', breaks, '| 越界引用:', oor);

const ids1 = v1.objects.countries.geometries.map(g => g.id);
const ids2 = v2.objects.countries.geometries.map(g => g.id);
console.log('v1 ids 前6:', ids1.slice(0, 6).join(','));
console.log('v2 ids 前6:', ids2.slice(0, 6).join(','));
console.log('id 顺序完全一致:', JSON.stringify(ids1) === JSON.stringify(ids2), '(v1', ids1.length, '| v2', ids2.length, ')');
