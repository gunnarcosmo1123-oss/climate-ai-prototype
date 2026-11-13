'use strict';
/* ============================================================
   ClimateOS · SVG 图表引擎(零依赖)
   遵循专业数据可视化规范:细线 2px、2px 表面环/间隙、选择性端标签、
   十字光标 + 悬浮提示、图例必备(多系列)、文字使用文本色。
   ============================================================ */

const INK = {
  primary:   '#f0efec',
  secondary: '#c3c2b7',
  muted:     '#898781',
  grid:      'rgba(255,255,255,0.06)',
  axis:      'rgba(255,255,255,0.14)',
  cross:     'rgba(255,255,255,0.30)',
  surface:   '#141a21'
};
const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  if(parent) parent.appendChild(e);
  return e;
}
function fmt(v, d){
  if(v == null) return '—';
  return v.toLocaleString('zh-CN', { maximumFractionDigits: d ?? 1, minimumFractionDigits: 0 });
}
function fmtK(v){
  const a = Math.abs(v);
  if(a >= 10000) return (v/1000).toFixed(a < 100000 ? 1 : 0) + 'K';
  if(a >= 1000) return (v/1000).toFixed(1) + 'K';
  return fmt(v, 2);
}
function niceTicks(min, max, count){
  if(!isFinite(min) || !isFinite(max)) return [0];
  if(min === max){ min -= 1; max += 1; }
  const span = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(span)));
  const norm = span / mag;
  let step;
  if(norm <= 1) step = 1; else if(norm <= 2) step = 2;
  else if(norm <= 2.5) step = 2.5; else if(norm <= 5) step = 5; else step = 10;
  step *= mag;
  const out = [];
  for(let v = Math.ceil(min/step)*step; v <= max + step*1e-6; v += step) out.push(Math.round(v*1e6)/1e6);
  return out;
}
function mix(c1, c2, t){
  const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const a = p(c1), b = p(c2), x = Math.min(1, Math.max(0, t));
  return '#' + a.map((v,i) => Math.round(v + (b[i]-v)*x).toString(16).padStart(2,'0')).join('');
}
function lum(hex){
  const L = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
    .map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
  return 0.2126*L[0] + 0.7152*L[1] + 0.0722*L[2];
}

/* ---- 全局悬浮提示 ---- */
function tipBox(){
  let t = document.getElementById('chart-tip');
  if(!t){
    t = document.createElement('div');
    t.id = 'chart-tip';
    t.className = 'tip';
    document.body.appendChild(t);
  }
  return t;
}
function showTip(container, ev, rows){
  const t = tipBox();
  t.innerHTML = '';
  rows.forEach(r => {
    if(r.title){
      const d = document.createElement('div');
      d.className = 'tip-title';
      d.textContent = r.title;
      t.appendChild(d);
      return;
    }
    const row = document.createElement('div');
    row.className = 'tip-row';
    const key = document.createElement('span');
    key.className = 'tip-key';
    key.style.background = r.color;
    const name = document.createElement('span');
    name.className = 'tip-name';
    name.textContent = r.name;
    const val = document.createElement('span');
    val.className = 'tip-val';
    val.textContent = r.value;
    row.appendChild(key); row.appendChild(name); row.appendChild(val);
    t.appendChild(row);
  });
  const cr = container.getBoundingClientRect();
  let x = ev.clientX - cr.left + 14;
  let y = ev.clientY - cr.top - 12;
  t.style.display = 'block';
  const tw = t.offsetWidth, th = t.offsetHeight;
  if(x + tw > cr.width - 4) x = ev.clientX - cr.left - tw - 14;
  if(y + th > cr.height - 4) y = ev.clientY - cr.top - th - 10;
  if(x < 4) x = 4; if(y < 4) y = 4;
  t.style.left = x + 'px';
  t.style.top = y + 'px';
}
function hideTip(){ tipBox().style.display = 'none'; }

/* ---- 折线/面积图(支持 null 断线、置信区间带、参考线、端标签、十字光标) ---- */
function lineChart(container, cfg){
  container.classList.add('chart-box');
  const H = cfg.height || 290, W = 860, L = 60, R = cfg.right || 118, T = 22, B = 32;
  const pw = W - L - R, ph = H - T - B;
  const n = cfg.x.length;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz' }, container);
  let lo = Infinity, hi = -Infinity;
  const scan = v => { if(v != null){ if(v < lo) lo = v; if(v > hi) hi = v; } };
  cfg.series.forEach(s => s.values.forEach(scan));
  (cfg.bands || []).forEach(b => { b.lo.forEach(scan); b.hi.forEach(scan); });
  (cfg.hlines || []).forEach(h => scan(h.y));
  const pad = (hi - lo) * 0.07 || 1;
  lo -= pad; hi += pad;
  const X = i => L + pw * (n === 1 ? 0.5 : i / (n - 1));
  const Y = v => T + ph - (v - lo) / (hi - lo) * ph;

  /* y 轴刻度与网格线 */
  niceTicks(lo, hi, 4).forEach(tk => {
    const y = Y(tk);
    el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: INK.grid, 'stroke-width': 1 }, svg);
    const tx = el('text', { x: L - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: INK.muted }, svg);
    tx.textContent = cfg.fmtY ? cfg.fmtY(tk) : fmtK(tk);
  });
  el('line', { x1: L, y1: Y(lo), x2: W - R, y2: Y(lo), stroke: INK.axis, 'stroke-width': 1 }, svg);

  /* 参考线 */
  (cfg.hlines || []).forEach(h => {
    const y = Y(h.y);
    el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: h.color, opacity: 0.65, 'stroke-width': 1 }, svg);
    const tx = el('text', { x: L + 6, y: y - 6, 'font-size': 11, fill: h.color, opacity: 0.95 }, svg);
    tx.textContent = h.label;
  });

  /* x 轴刻度 */
  const every = cfg.xEvery || Math.max(1, Math.round(n / 8));
  for(let i = 0; i < n; i += every){
    const tx = el('text', { x: X(i), y: H - 9, 'text-anchor': 'middle', 'font-size': 11, fill: INK.muted }, svg);
    tx.textContent = cfg.x[i];
  }

  /* 置信区间带 */
  (cfg.bands || []).forEach(b => {
    const idx = [];
    for(let i = 0; i < n; i++) if(b.lo[i] != null && b.hi[i] != null) idx.push(i);
    if(idx.length > 1){
      const d = `M ${X(idx[0])},${Y(b.lo[idx[0]])}` +
        idx.map(i => ` L ${X(i)},${Y(b.lo[i])}`).join('') +
        idx.slice().reverse().map(i => ` L ${X(i)},${Y(b.hi[i])}`).join('') + ' Z';
      el('path', { d, fill: b.color, opacity: b.opacity || 0.08 }, svg);
    }
  });

  /* 系列(支持 null 断线) */
  cfg.series.forEach((s, si) => {
    let seg = [];
    const flush = () => {
      if(seg.length > 1){
        const d = 'M ' + seg.map(p => p.join(',')).join(' L ');
        el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: s.opacity != null ? s.opacity : 1 }, svg);
        if(s.area){
          el('path', { d: d + ` L ${seg[seg.length-1][0]},${Y(lo)} L ${seg[0][0]},${Y(lo)} Z`, fill: s.color, opacity: 0.09 }, svg);
        }
      }
      seg = [];
    };
    s.values.forEach((v, i) => {
      if(v == null) flush();
      else seg.push([X(i), Y(v)]);
    });
    flush();
    /* 端标签/端点在最后一个非空点(仅 cfg.endSeries 指定的系列,默认全部) */
    if(cfg.endSeries && !cfg.endSeries.includes(si)) return;
    let li = -1;
    for(let i = s.values.length - 1; i >= 0; i--) if(s.values[i] != null){ li = i; break; }
    if(li >= 0){
      const v = s.values[li];
      const x = X(li), y = Y(v);
      const onRight = li === n - 1;
      const tx = el('text', {
        x: onRight ? W - R + 8 : x - 8,
        y: y + 4,
        'text-anchor': onRight ? 'start' : 'end',
        'font-size': 12, 'font-weight': 600, fill: INK.primary
      }, svg);
      tx.textContent = cfg.fmtY ? cfg.fmtY(v) : fmt(v, 2);
      if(!onRight) el('line', { x1: x, y1: y, x2: x - 8, y2: y, stroke: INK.muted, 'stroke-width': 1, opacity: 0.5 }, svg);
      el('circle', { cx: x, cy: y, r: 4, fill: s.color, stroke: INK.surface, 'stroke-width': 2 }, svg);
    }
  });

  /* 标记点(如"碳达峰") */
  (cfg.markers || []).forEach(m => {
    const x = X(m.xi), y = Y(m.y);
    el('circle', { cx: x, cy: y, r: 4.5, fill: m.color, stroke: INK.surface, 'stroke-width': 2 }, svg);
    const tx = el('text', { x: x + 7, y: y - 8, 'font-size': 11.5, 'font-weight': 600, fill: INK.primary }, svg);
    tx.textContent = m.label;
  });

  /* 十字光标 + 悬浮提示 */
  const cross = el('line', { y1: T, y2: T + ph, stroke: INK.cross, 'stroke-width': 1, style: 'display:none' }, svg);
  const hit = el('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * W / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / pw * (n - 1))));
    cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i));
    cross.setAttribute('style', 'display:block');
    const rows = [{ title: String(cfg.x[i]) }];
    cfg.series.forEach(s => {
      if(s.values[i] != null) rows.push({ name: s.name, color: s.color, value: cfg.fmtY ? cfg.fmtY(s.values[i]) : fmt(s.values[i], 2) });
    });
    showTip(container, ev, rows);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('style', 'display:none'); hideTip(); });

  /* AI 预测区域标记 */
  if(cfg.projFrom != null){
    const bx = X(cfg.projFrom);
    const g = el('g', { style: 'pointer-events:none' }, svg);
    el('rect', { x: bx, y: T, width: W - R - bx, height: ph, fill: 'rgba(255,255,255,0.03)' }, g);
    const tx = el('text', { x: bx + 10, y: T + 18, 'font-size': 11, fill: INK.secondary }, g);
    tx.textContent = (typeof TI18N === 'function') ? TI18N('chart.ai') : 'AI 预测';
  }
}

/* ---- 排名横向条形图(顺序色阶、单色渐变) ---- */
function rankedBars(container, cfg){
  const ramp = cfg.ramp || ['#6da7ec','#5598e7','#3987e5','#256abf','#1c5cab','#184f95'];
  const items = cfg.items.slice().sort((a, b) => b.value - a.value);
  const H = items.length * 44 + 16, W = 860;
  const labelW = 180, x0 = labelW + 16, xmax = W - 100;
  const maxV = Math.max(1, ...items.map(i => i.value));
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz' }, container);
  items.forEach((it, i) => {
    const y = i * 44 + 8, h = 24;
    const w = Math.max(2, (xmax - x0) * (it.value / maxV));
    const tx = el('text', { x: labelW - 8, y: y + h - 7, 'text-anchor': 'end', 'font-size': 13, fill: INK.secondary }, svg);
    tx.textContent = it.label;
    const d = `M ${x0},${y} h ${Math.max(0, w - 4)} q 4,0 4,4 v ${h - 8} q 0,4 -4,4 h ${-(Math.max(0, w - 4))} z`;
    const bar = el('path', { d, fill: ramp[Math.min(i, ramp.length - 1)], opacity: 0.92 }, svg);
    const vx = el('text', { x: x0 + w + 8, y: y + h - 7, 'font-size': 13, 'font-weight': 600, fill: INK.primary }, svg);
    vx.textContent = cfg.fmtY ? cfg.fmtY(it.value) : fmt(it.value, 1);
    const hit = el('rect', { x: 0, y: i * 44, width: W, height: 44, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', ev => {
      bar.setAttribute('opacity', 1);
      showTip(container, ev, [{ name: it.label, color: ramp[Math.min(i, ramp.length - 1)], value: (cfg.fmtY ? cfg.fmtY(it.value) : fmt(it.value, 1)) + (cfg.unit || '') }]);
    });
    hit.addEventListener('mouseleave', () => { bar.setAttribute('opacity', 0.92); hideTip(); });
  });
}

/* ---- 增减对比条形图(蓝=增加 / 红=减少,中线为零) ---- */
function divergingBars(container, cfg){
  const items = cfg.items.slice().sort((a, b) => b.value - a.value);
  const H = items.length * 44 + 16, W = 860;
  const cx = W * 0.44, xmax = W - 120, xmin = 64;
  const maxAbs = Math.max(1, ...items.map(i => Math.abs(i.value)));
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz' }, container);
  el('line', { x1: cx, y1: 8, x2: cx, y2: H - 28, stroke: INK.axis, 'stroke-width': 1 }, svg);
  items.forEach((it, i) => {
    const y = i * 44 + 8, h = 24;
    const w = (it.value >= 0 ? xmax - cx : cx - xmin) * (Math.abs(it.value) / maxAbs);
    const x0 = it.value >= 0 ? cx : cx - w;
    const tx = el('text', {
      x: it.value >= 0 ? cx - 8 : cx + 8,
      y: y + h - 7,
      'text-anchor': it.value >= 0 ? 'end' : 'start',
      'font-size': 13, fill: INK.secondary
    }, svg);
    tx.textContent = it.label;
    const d = `M ${x0},${y} h ${Math.max(0, w - 4)} q 4,0 4,4 v ${h - 8} q 0,4 -4,4 h ${-(Math.max(0, w - 4))} z`;
    const color = it.value >= 0 ? '#3987e5' : '#e66767';
    const bar = el('path', { d, fill: color, opacity: 0.92 }, svg);
    const vx = el('text', {
      x: it.value >= 0 ? x0 + w + 8 : x0 - 8,
      y: y + h - 7,
      'text-anchor': it.value >= 0 ? 'start' : 'end',
      'font-size': 13, 'font-weight': 600, fill: INK.primary
    }, svg);
    vx.textContent = (it.value > 0 ? '+' : '') + fmt(it.value, 0) + (cfg.unit || '');
    const hit = el('rect', { x: 0, y: i * 44, width: W, height: 44, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', ev => {
      bar.setAttribute('opacity', 1);
      showTip(container, ev, [{ name: it.label, color, value: (it.value > 0 ? '+' : '') + fmt(it.value, 0) + (cfg.unit || '') }]);
    });
    hit.addEventListener('mouseleave', () => { bar.setAttribute('opacity', 0.92); hideTip(); });
  });
}

/* ---- 堆叠柱状图(2px 段间隙、顶部圆角、段内占比标签) ---- */
function stackedBars(container, cfg){
  const H = cfg.height || 320, W = 860, L = 56, R = 110, T = 22, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const n = cfg.categories.length;
  const totals = cfg.categories.map((_, i) => cfg.series.reduce((a, s) => a + s.values[i], 0));
  const maxT = Math.max(1, ...totals);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz' }, container);
  const Y = v => T + ph - (v / maxT) * ph;
  const X = i => L + pw * (n === 1 ? 0.5 : i / (n - 1));
  const bw = Math.min(26, pw / n * 0.5);
  niceTicks(0, maxT, 4).forEach(tk => {
    const y = Y(tk);
    el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: INK.grid, 'stroke-width': 1 }, svg);
    const tx = el('text', { x: L - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: INK.muted }, svg);
    tx.textContent = cfg.fmtY ? cfg.fmtY(tk) : fmtK(tk);
  });
  el('line', { x1: L, y1: Y(0), x2: W - R, y2: Y(0), stroke: INK.axis, 'stroke-width': 1 }, svg);
  cfg.categories.forEach((c, i) => {
    const tx = el('text', { x: X(i), y: H - 9, 'text-anchor': 'middle', 'font-size': 11, fill: INK.muted }, svg);
    tx.textContent = c;
    let cum = 0;
    const x0 = X(i) - bw / 2, x1 = X(i) + bw / 2;
    cfg.series.forEach((s, si) => {
      const v = s.values[i];
      const yTop = Y(cum + v), yBot = Y(cum);
      const first = si === 0, last = si === cfg.series.length - 1;
      const a = yTop + (last ? 0 : 1);   /* 2px 表面间隙 */
      const b = yBot - (first ? 0 : 1);
      const d = `M ${x0},${b} L ${x0},${a + 4} Q ${x0},${a} ${x0 + 4},${a} L ${x1 - 4},${a} Q ${x1},${a} ${x1},${a + 4} L ${x1},${b} Z`;
      el('path', { d, fill: s.color }, svg);
      const share = v / totals[i];
      if(share >= 0.1 && (b - a) >= 16){
        const tx2 = el('text', {
          x: (x0 + x1) / 2, y: (a + b) / 2 + 4,
          'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600,
          fill: lum(s.color) > 0.5 ? '#0b0b0b' : '#ffffff'
        }, svg);
        tx2.textContent = Math.round(share * 100) + '%';
      }
      cum += v;
    });
  });
  const cross = el('line', { y1: T, y2: T + ph, stroke: INK.cross, 'stroke-width': 1, style: 'display:none' }, svg);
  const hit = el('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * W / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / pw * (n - 1))));
    cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i));
    cross.setAttribute('style', 'display:block');
    const rows = [{ title: String(cfg.categories[i]) }];
    cfg.series.slice().reverse().forEach(s => {
      rows.push({ name: s.name, color: s.color, value: fmt(s.values[i], 1) + (cfg.unit || '') + ' · ' + Math.round(s.values[i] / totals[i] * 100) + '%' });
    });
    showTip(container, ev, rows);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('style', 'display:none'); hideTip(); });
}

/* ---- 雷达图 ---- */
function radar(container, cfg){
  const W = 780, H = 340, cx = 215, cy = H / 2 + 6, r = 108;
  const n = cfg.axes.length;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz' }, container);
  const P = (i, v) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    const rr = r * (v / (cfg.max || 100));
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  for(let ring = 1; ring <= 5; ring++){
    const pts = [];
    for(let i = 0; i < n; i++) pts.push(P(i, cfg.max * ring / 5).join(','));
    el('polygon', { points: pts.join(' '), fill: 'none', stroke: ring === 5 ? INK.axis : INK.grid, 'stroke-width': 1 }, svg);
  }
  cfg.axes.forEach((ax, i) => {
    const p = P(i, cfg.max);
    el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: INK.grid, 'stroke-width': 1 }, svg);
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    const lx = cx + (r + 30) * Math.cos(a);
    const ly = cy + (r + 30) * Math.sin(a);
    const tx = el('text', {
      x: lx, y: ly + 4,
      'text-anchor': Math.abs(Math.cos(a)) > 0.4 ? (Math.cos(a) > 0 ? 'start' : 'end') : 'middle',
      'font-size': 12.5, fill: INK.secondary
    }, svg);
    tx.textContent = ax;
    if(i === 0){
      const t1 = el('text', { x: cx + 5, y: cy - r - 8, 'font-size': 11, fill: INK.muted }, svg);
      t1.textContent = cfg.max;
      const t0 = el('text', { x: cx + 5, y: cy + 8, 'font-size': 11, fill: INK.muted }, svg);
      t0.textContent = '0';
    }
  });
  cfg.series.forEach(s => {
    const pts = [], dots = [];
    for(let i = 0; i < n; i++){
      const p = P(i, s.values[i]);
      pts.push(p.join(','));
      dots.push(p);
    }
    el('polygon', { points: pts.join(' '), fill: s.color, opacity: 0.09, stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    dots.forEach((p, i) => {
      el('circle', { cx: p[0], cy: p[1], r: 3.5, fill: s.color, stroke: INK.surface, 'stroke-width': 2 }, svg);
      const hitc = el('circle', { cx: p[0], cy: p[1], r: 13, fill: 'transparent' }, svg);
      hitc.addEventListener('mousemove', ev => {
        showTip(container, ev, [{ name: s.name, color: s.color, value: cfg.axes[i] + ' · ' + fmt(s.values[i], 0) + ' / ' + (cfg.max || 100) }]);
      });
      hitc.addEventListener('mouseleave', hideTip);
    });
  });
}

/* ---- 变暖条纹(1850–2024,蓝色=偏冷 红色=偏暖) ---- */
function stripes(container, cfg){
  const W = 860, H = 172, x0 = 14, x1 = 846;
  const n = cfg.years.length, w = (x1 - x0) / n;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz' }, container);
  const col = v => v < 0 ? mix('#256abf', '#383835', 1 + v / 0.6) : mix('#383835', '#e66767', Math.min(1, v / 1.6));
  cfg.values.forEach((v, i) => {
    el('rect', { x: x0 + i * w, y: 24, width: w + 0.5, height: H - 62, fill: col(v) }, svg);
  });
  cfg.years.forEach((y, i) => {
    if(y === cfg.years[0] || y === cfg.years[n - 1] || y % 50 === 0){
      const tx = el('text', { x: x0 + i * w, y: H - 12, 'text-anchor': 'middle', 'font-size': 11, fill: INK.muted }, svg);
      tx.textContent = y;
    }
  });
  const hl = el('rect', { y: 22, height: H - 58, fill: 'none', stroke: '#ffffff', 'stroke-width': 1, opacity: 0, style: 'pointer-events:none' }, svg);
  const hit = el('rect', { x: x0, y: 8, width: x1 - x0, height: H - 24, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * W / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.floor((px - x0) / w)));
    hl.setAttribute('x', x0 + i * w - 0.5);
    hl.setAttribute('width', w + 1);
    hl.setAttribute('opacity', 0.55);
    const v = cfg.values[i];
    showTip(container, ev, [{ title: String(cfg.years[i]) }, { name: '温度距平', color: col(v), value: (v > 0 ? '+' : '') + v.toFixed(2) + '°C' }]);
  });
  hit.addEventListener('mouseleave', () => { hl.setAttribute('opacity', 0); hideTip(); });
}

/* ---- 迷你趋势线(KPI 卡片) ---- */
function sparkline(container, values, color){
  const W = 110, H = 30;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark' }, container);
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = (hi - lo) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * (W - 6) + 3).toFixed(1)},${(H - 5 - (v - lo) / span * (H - 10)).toFixed(1)}`);
  el('polyline', { points: pts.join(' '), fill: 'none', stroke: INK.secondary, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  const lx = W - 3, ly = H - 5 - (values[values.length - 1] - lo) / span * (H - 10);
  el('circle', { cx: lx, cy: ly, r: 2.6, fill: color, stroke: INK.surface, 'stroke-width': 1.5 }, svg);
}

/* ---- 图例(多系列必备) ---- */
function legend(container, series, opts){
  opts = opts || {};
  const box = document.createElement('div');
  box.className = 'legend';
  series.forEach(s => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    const key = document.createElement('i');
    if(opts.type === 'bar'){ key.className = 'legend-swatch'; key.style.background = s.color; }
    else { key.className = 'legend-key'; key.style.background = s.color; }
    const nm = document.createElement('span');
    nm.className = 'legend-name';
    nm.textContent = s.name;
    item.appendChild(key); item.appendChild(nm);
    box.appendChild(item);
  });
  container.appendChild(box);
  return box;
}
