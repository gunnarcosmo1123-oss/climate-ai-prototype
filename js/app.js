'use strict';
/* ============================================================
   ClimateOS · 气候智脑 — 应用逻辑(双语)
   ============================================================ */

/* ---- 调色板(已通过色盲安全校验 · 暗色主题) ---- */
const CAT = {
  blue:'#3987e5', orange:'#d95926', aqua:'#199e70', yellow:'#c98500',
  magenta:'#d55181', green:'#008300', violet:'#9085e9', red:'#e66767'
};
const ST = { good:'#0ca30c', warning:'#fab219', serious:'#ec835a', critical:'#d03b3b' };
const LV_ICON = { good:'✓', warning:'⚡', serious:'⚠', critical:'⛔' };
const SURFACE = '#141a21';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ============================================================
   基础组件
   ============================================================ */
function card(id, title, sub, tools){
  return `<section class="card" id="${id}">
    <header class="card-head">
      <div><h3>${title}</h3>${sub ? `<p class="card-sub">${sub}</p>` : ''}</div>
      <div class="card-tools">${tools || ''}</div>
    </header>
    <div class="card-body"></div>
  </section>`;
}
function statTile(o){
  const deltaCls = o.deltaGood ? 'good' : (o.deltaLv === 'warn' ? 'warn' : 'bad');
  return `<div class="stat" data-anim>
    <div class="stat-label">${o.label}${o.hint ? ` <span class="stat-hint">${o.hint}</span>` : ''}</div>
    <div class="stat-value">${o.prefix || ''}<span class="count" data-count="${o.value}" data-decimals="${o.decimals ?? 0}">0</span>${o.suffix || ''}</div>
    ${o.delta ? `<div class="stat-delta ${deltaCls}"><b>${o.up === false ? '▼' : '▲'}</b> ${o.delta} <span>${o.deltaNote || ''}</span></div>` : `<div class="stat-delta plain">${o.deltaNote || ''}</div>`}
    <div class="stat-spark">${o.spark ? '<svg>' : ''}</div>
  </div>`;
}
function lvBadge(lv, text){
  return `<span class="lv lv-${lv}">${LV_ICON[lv] || ''} ${text}</span>`;
}
function fmtGt(g){ const v = g * 10; return Math.abs(v) < 0.5 ? '≈0' : v.toFixed(0); }
function fmtNum(v, d){ return v == null ? '—' : v.toLocaleString('zh-CN', { maximumFractionDigits: d ?? 1, minimumFractionDigits: 0 }); }

function addTable(cardEl, chartBody, data){
  const tools = cardEl.querySelector('.card-tools');
  const btn = document.createElement('button');
  btn.className = 'tool-btn';
  btn.textContent = t('chart.table');
  const table = document.createElement('div');
  table.className = 'chart-table';
  table.hidden = true;
  let html = '<table><thead><tr>';
  data.head.forEach(h => { html += `<th>${h}</th>`; });
  html += '</tr></thead><tbody>';
  data.rows.forEach(r => { html += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>'; });
  html += '</tbody></table>';
  table.innerHTML = html;
  chartBody.after(table);
  btn.addEventListener('click', () => {
    const showTable = table.hidden;
    table.hidden = !showTable;
    chartBody.hidden = showTable;
    btn.textContent = showTable ? t('chart.view') : t('chart.table');
  });
  tools.appendChild(btn);
}

function animateNumber(el, target, decimals){
  const dur = 900, t0 = performance.now();
  const step = now => {
    const t1 = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t1, 3);
    const v = target * e;
    el.textContent = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString('zh-CN');
    if(t1 < 1) requestAnimationFrame(step);
    else el.textContent = decimals > 0 ? target.toFixed(decimals) : target.toLocaleString('zh-CN');
  };
  requestAnimationFrame(step);
}
function runCounters(scope){
  (scope || document).querySelectorAll('.count[data-count]').forEach(c => {
    animateNumber(c, parseFloat(c.dataset.count), parseInt(c.dataset.decimals || '0', 10));
  });
}

/* ============================================================
   ① 全球态势总览
   ============================================================ */
function buildOverview(){
  const sec = $('#tab-overview');
  const crossing = tempCrossing();
  const curTemp = DATA.temperature.values[DATA.temperature.values.length - 1];
  sec.innerHTML = `
    <div class="hero-grid">
      <section class="card hero">
        <div class="hero-kicker"><span class="pulse"></span> ${t('hero.kicker')}</div>
        <div class="hero-num">+<span class="count" data-count="${curTemp}" data-decimals="2">0</span>°C</div>
        <div class="hero-label">${t('hero.label')}</div>
        <p class="hero-sub">${t('hero.sub', { t: '2.5' })}</p>
        <div class="hero-badges">
          <span class="badge badge-warn">${t('hero.badge1', { n: crossing.yearsLeft })}</span>
          <span class="badge badge-info">${t('hero.badge2')}</span>
        </div>
      </section>
      <section class="card">
        <header class="card-head"><div><h3>${t('stripes.title')}</h3><p class="card-sub">${t('stripes.sub')}</p></div></header>
        <div class="card-body" id="ov-stripes"></div>
        <p class="stripes-note">${t('stripes.note')}</p>
      </section>
    </div>
    <div class="kpi-grid" id="ov-kpis"></div>
    <div class="grid-2-1">
      ${card('ov-temp', t('ov.temp.title'), t('ov.temp.sub'), '<div class="chip-row" id="ov-scen-chips"></div>')}
      <section class="card" id="ov-insights">
        <header class="card-head"><div><h3>${t('ov.insights.title')}</h3><p class="card-sub">${t('ov.insights.sub')}</p></div><div class="card-tools"><button class="tool-btn" id="insight-regen" type="button">${t('ov.insights.regen')}</button></div></header>
        <div class="card-body" id="ov-insight-list"></div>
      </section>
    </div>
    <div class="grid-3">
      ${card('ov-co2', t('ov.co2.title'), t('ov.co2.sub'))}
      ${card('ov-sea', t('ov.sea.title'), t('ov.sea.sub'))}
      ${card('ov-extreme', t('ov.extreme.title'), t('ov.extreme.sub'))}
    </div>
    <div class="grid-2">
      ${card('ov-loss', t('ov.loss.title'), t('ov.loss.sub'))}
      ${card('ov-renew', t('ov.renew.title'), t('ov.renew.sub'))}
    </div>`;

  stripes($('#ov-stripes'), DATA.temperature);

  /* KPI 行 */
  const c = DATA.co2, s = DATA.sea, ex = DATA.extreme;
  const gr = DATA.globalRenew, ws = DATA.windSolar;
  const kpi = $('#ov-kpis');
  kpi.innerHTML =
    statTile({ label: t('kpi.co2'), value: 430.2, decimals: 1, suffix: t('unit.ppm'), delta: '+2.6 ppm', deltaNote: t('kpi.y2025'), up: false }) +
    statTile({ label: t('kpi.sea'), value: 3.9, decimals: 1, suffix: ' mm/' + (LANG === 'zh' ? '年' : 'yr'), delta: '+0.2', deltaNote: t('kpi.decade'), up: false, deltaLv: 'warn' }) +
    statTile({ label: t('kpi.loss'), value: LANG === 'zh' ? 3160 : 316, suffix: LANG === 'zh' ? ' 亿元' : ' USD B', delta: '+11%', deltaNote: t('kpi.y2025'), up: false }) +
    statTile({ label: t('kpi.renew'), value: 5600, suffix: t('unit.gw'), delta: '+12%', deltaNote: t('kpi.y2025'), deltaGood: true }) +
    statTile({ label: t('kpi.ws'), value: LANG === 'zh' ? 20.5 : 2.05, decimals: LANG === 'zh' ? 1 : 2, suffix: LANG === 'zh' ? ' 亿千瓦' : ' TW', delta: '+20%', deltaNote: t('kpi.y2025'), deltaGood: true });
  const sparks = [ c.values.slice(-20), s.values.slice(-20), ex.values.slice(-20), gr.values, ws.values.slice(-20) ];
  $$('#ov-kpis .stat-spark').forEach((box, i) => sparkline(box, sparks[i], i >= 3 ? ST.good : ST.critical));

  /* 温度推演 */
  const scen = tempScenarios();
  let selKey = 'current';
  const tempBody = $('#ov-temp .card-body');
  addTable($('#ov-temp'), tempBody, {
    head: [t('table.year'), t('table.obs'), t('table.note')],
    rows: DATA.temperature.years.map((y, i) => [y, (DATA.temperature.values[i] > 0 ? '+' : '') + DATA.temperature.values[i].toFixed(2), y >= 2026 ? t('table.obs.ai') : t('table.obs.hist')])
  });
  const buildChips = () => {
    const row = $('#ov-scen-chips');
    row.innerHTML = '';
    [[ 'obs', t('ov.chip.obs'), CAT.blue ], ...Object.keys(scen.defs).map(k => [k, lb(scen.defs[k].name), scen.defs[k].color])]
      .forEach(([k, name, color]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (k === selKey ? ' active' : '');
        b.innerHTML = `<i style="background:${color}"></i>${name}`;
        b.addEventListener('click', () => {
          if(k === 'obs') return;
          selKey = k;
          buildChips();
          renderTempChart();
        });
        row.appendChild(b);
      });
  };
  const renderTempChart = () => {
    tempBody.innerHTML = '';
    const x = [...DATA.temperature.years, ...scen.years];
    const obsVals = [...DATA.temperature.values, ...scen.years.map(() => null)];
    const series = [{ name: t('ov.series.obs'), color: CAT.blue, values: obsVals }];
    const selDef = scen.defs[selKey];
    const selIdx = 1 + Object.keys(scen.defs).indexOf(selKey);
    Object.keys(scen.defs).forEach(k => {
      const d = scen.defs[k];
      series.push({
        name: lb(d.name), color: d.color,
        values: [...DATA.temperature.values.map(() => null), ...scen.proj[k].vals],
        opacity: k === selKey ? 1 : 0.38
      });
    });
    lineChart(tempBody, {
      x, series,
      bands: [{ color: selDef.color, lo: [...DATA.temperature.values.map(() => null), ...scen.proj[selKey].lo], hi: [...DATA.temperature.values.map(() => null), ...scen.proj[selKey].hi] }],
      hlines: [{ y: 1.5, label: t('ov.hline.paris'), color: '#898781' }],
      fmtY: v => (v > 0 ? '+' : '') + v.toFixed(1) + '°',
      endSeries: [0, selIdx],
      projFrom: DATA.temperature.years.length,
      height: 310, xEvery: 25
    });
    legend(tempBody, series);
  };
  buildChips();
  renderTempChart();

  /* 洞察 */
  const pool = [
    { lv:'critical', tag:{zh:'全球温度',en:'Global temperature'},
      text:{zh:'2026 年全球平均温升 +1.52°C,为有记录以来第二热年份(2024 年极值 +1.55°C)。5 年滑动均值距 1.5°C 长期突破仅剩 1 年。',
        en:'2026 warming reached +1.52°C — the second-hottest year on record (2024 peak: +1.55°C). The 5-year running mean is 1 year away from permanently crossing 1.5°C.'} },
    { lv:'serious', tag:{zh:'情景推演',en:'Scenario'},
      text:{zh:'AI 趋势模型推演:现行政策路径下,2050 年全球温升将达 +2.5°C(90% 置信区间 2.1–2.9°C),超出 2°C 目标。',
        en:'AI trend model: under current policies, warming reaches +2.5°C by 2050 (90% CI 2.1–2.9°C), overshooting the 2°C target.'} },
    { lv:'good', tag:{zh:'能源转型',en:'Energy'},
      text:{zh:'中国风光装机 2026 年达 20.5 亿千瓦(同比 +20%),较 2030 年 12 亿千瓦原定目标提前 6 年、超额 70% 完成。',
        en:'China wind & solar reached 2,050 GW in 2026 (+20% YoY) — 70% above the original 2030 target of 1,200 GW, met 6 years early.'} },
    { lv:'warning', tag:{zh:'城市韧性',en:'Cities'},
      text:{zh:'深圳相对海平面上升速率 4.1 mm/年,高于全球均值 11%;现有海岸防护标准需按 50 年一遇风暴潮重新校核。',
        en:'Shenzhen\'s relative sea-level rise of 4.1 mm/yr is 11% above the global mean; coastal defenses need re-checking against 50-year storm surges.'} },
    { lv:'serious', tag:{zh:'生态保护',en:'Ecosystems'},
      text:{zh:'全球红树林面积较 1990 年减少约 21%,蓝碳损失相当于每年多排放约 3.5 亿吨 CO₂。',
        en:'Global mangrove area has fallen ≈21% since 1990; the blue-carbon loss is equivalent to ≈350 Mt CO₂ extra per year.'} },
    { lv:'warning', tag:{zh:'极端天气',en:'Extremes'},
      text:{zh:'2026 年全球极端天气事件约 520 起,较 1980 年增长约 4.3 倍,气候保险缺口持续扩大。',
        en:'≈520 extreme weather events occurred globally in 2026 — 4.3× the 1980 level — while the climate insurance gap keeps widening.'} },
    { lv:'good', tag:{zh:'能源转型',en:'Energy'},
      text:{zh:'全球可再生能源装机 2026 年达 5,600 GW,占新增装机 94%;清洁电力平价时代全面到来。',
        en:'Global renewables hit 5,600 GW in 2026, 94% of new additions — the era of cheap clean power has fully arrived.'} },
    { lv:'serious', tag:{zh:'气候临界点',en:'Tipping points'},
      text:{zh:'模型检测:北极海冰 9 月最小面积每十年减少约 12.8%,按现行政策 2050 年将不足 110 万 km²,北冰洋夏季或将无冰。',
        en:'Model detection: Arctic September sea ice is shrinking ≈12.8% per decade; at current policies it falls below 1.1 M km² by 2050 — a nearly ice-free Arctic summer.'} },
    { lv:'warning', tag:{zh:'城市韧性',en:'Cities'},
      text:{zh:'北京近十年极端高温日数增加 68%,城市热岛强度 2.1°C,需优先推进建筑节能与冷源网络建设。',
        en:'Beijing\'s extreme-heat days rose 68% over the past decade with a 2.1°C heat-island effect; building retrofits and cooling networks are urgent.'} },
    { lv:'good', tag:{zh:'生态保护',en:'Ecosystems'},
      text:{zh:'中国森林面积 2000–2024 年净增 51 Mha,为全球最大人工林贡献者,碳汇能力持续增强。',
        en:'China\'s forests gained a net 51 Mha over 2000–2024 — the world\'s largest planted-forest contributor with a growing carbon sink.'} },
    { lv:'critical', tag:{zh:'适应融资',en:'Adaptation finance'},
      text:{zh:'孟买暴露于气候风险的人口达 1,250 万,适应资金缺口 3,200 亿元,是全球适应正义的关键节点。',
        en:'Mumbai has 12.5 million people exposed to climate risk and a ¥320B adaptation gap — a frontline case for climate justice.'} },
    { lv:'serious', tag:{zh:'气候临界点',en:'Tipping points'},
      text:{zh:'若全球温升长期突破 1.5°C,珊瑚礁将损失 70–90%;海洋生态修复的时间窗口正在关闭。',
        en:'If warming permanently exceeds 1.5°C, 70–90% of coral reefs will be lost — the window for ocean restoration is closing.'} }
  ];
  const renderInsights = () => {
    const list = $('#ov-insight-list');
    list.innerHTML = '';
    pool.slice().sort(() => Math.random() - 0.5).slice(0, 5).forEach(it => {
      const d = document.createElement('div');
      d.className = 'insight';
      d.innerHTML = `<span class="insight-icon" style="color:${ST[it.lv]}">${LV_ICON[it.lv]}</span>
        <p>${lb(it.text)}</p><span class="lv lv-${it.lv}">${lb(it.tag)}</span>`;
      list.appendChild(d);
    });
  };
  renderInsights();
  $('#insight-regen').addEventListener('click', renderInsights);

  /* CO₂ / 海平面 / 极端天气 */
  const pCo2 = projectCO2();
  lineChart($('#ov-co2 .card-body'), {
    x: [...c.years, ...pCo2.years],
    series: [{ name: t('ov.series.co2'), color: CAT.aqua, values: [...c.values, ...pCo2.vals], area: true }],
    bands: [{ color: CAT.aqua, lo: [...c.values.map(() => null), ...pCo2.lo], hi: [...c.values.map(() => null), ...pCo2.hi] }],
    fmtY: v => fmtNum(v, 0) + t('unit.ppm'),
    projFrom: c.years.length, height: 250
  });
  const pSea = projectSea();
  lineChart($('#ov-sea .card-body'), {
    x: [...s.years, ...pSea.years],
    series: [{ name: t('ov.series.sea'), color: CAT.blue, values: [...s.values, ...pSea.vals], area: true }],
    bands: [{ color: CAT.blue, lo: [...s.values.map(() => null), ...pSea.lo], hi: [...s.values.map(() => null), ...pSea.hi] }],
    fmtY: v => fmtNum(v, 0) + t('unit.mm'),
    projFrom: s.years.length, height: 250
  });
  const pEx = projectExtreme();
  lineChart($('#ov-extreme .card-body'), {
    x: [...ex.years, ...pEx.years],
    series: [{ name: t('ov.series.events'), color: CAT.orange, values: [...ex.values, ...pEx.vals], area: true }],
    bands: [{ color: CAT.orange, lo: [...ex.values.map(() => null), ...pEx.lo], hi: [...ex.values.map(() => null), ...pEx.hi] }],
    fmtY: v => fmtNum(v, 0) + t('unit.events'),
    projFrom: ex.years.length, height: 250
  });

  /* 损失排行 + 全球可再生能源 */
  const lossRamp = [0.36, 0.48, 0.60, 0.72, 0.84, 0.95].map(x => mix(SURFACE, CAT.orange, x));
  const lossBox = $('#ov-loss .card-body');
  rankedBars(lossBox, { items: DATA.losses2026.map(i => ({ label: lb(i.label), value: i.value })), ramp: lossRamp, fmtY: v => t('ov.loss.unit') + fmtNum(v * 10, 0) + (LANG === 'zh' ? '亿' : '0M') });
  addTable($('#ov-loss'), lossBox, {
    head: [t('table.type'), t('table.loss')],
    rows: DATA.losses2026.map(i => [lb(i.label), i.value])
  });
  const pGr = projectGlobalRenew();
  lineChart($('#ov-renew .card-body'), {
    x: [...gr.years, ...pGr.years],
    series: [{ name: t('ov.series.renew'), color: CAT.green, values: [...gr.values, ...pGr.vals], area: true }],
    bands: [{ color: CAT.green, lo: [...gr.values.map(() => null), ...pGr.lo], hi: [...gr.values.map(() => null), ...pGr.hi] }],
    fmtY: v => fmtK(v) + t('unit.gw'),
    projFrom: gr.years.length, height: 250
  });
}

/* ============================================================
   ② 全球大屏(世界地图热力)
   ============================================================ */
function buildMap(){
  const sec = $('#tab-map');
  const crossing = tempCrossing();
  sec.innerHTML = `
    <div class="bs-head">
      <div>
        <h2 class="bs-title">🌍 ${t('bs.title')}</h2>
        <p class="bs-sub">${t('bs.sub')}</p>
      </div>
      <div class="bs-controls">
        <div class="chip-row" id="map-metric-chips"></div>
        <button class="tool-btn" id="bs-fullscreen" type="button">⛶ ${t('bs.fullscreen')}</button>
      </div>
      <div class="bs-clock">
        <div id="bs-time">--:--:--</div>
        <div id="bs-date"></div>
      </div>
    </div>
    <div class="bs-main">
      <aside class="bs-left">
        <section class="card"><header class="card-head"><h3>${t('bs.kpi.title')}</h3></header>
          <div class="card-body" id="bs-kpis"></div>
        </section>
        <section class="card"><header class="card-head"><h3>${t('bs.warn.title')}</h3></header>
          <div class="card-body" id="bs-warn"></div>
        </section>
      </aside>
      <section class="card bs-map-card">
        <div class="card-body" id="world-map"></div>
        <div class="bs-map-foot" id="bs-map-foot">${t('bs.map.foot')}</div>
      </section>
      <aside class="bs-right">
        <section class="card"><header class="card-head"><h3>${t('bs.rank.title')}</h3></header>
          <div class="card-body" id="bs-rank"></div>
        </section>
        <section class="card"><header class="card-head"><h3>${t('bs.ticker.title')}</h3></header>
          <div class="card-body" id="bs-ticker"></div>
        </section>
      </aside>
    </div>
    <section class="card bs-fc">
      <header class="card-head"><div><h3>${t('bs.fc.title')}</h3><p class="card-sub">${t('bs.fc.sub')}</p></div></header>
      <div class="card-body fc-grid" id="bs-fc"></div>
    </section>`;

  /* 关键指标 */
  const kpis = [
    { label: t('bs.kpi.temp'), v: '+1.52°C', c: CAT.red },
    { label: t('bs.kpi.co2'), v: '430.2 ppm', c: CAT.aqua },
    { label: t('bs.kpi.sea'), v: '3.9 mm/' + (LANG === 'zh' ? '年' : 'yr'), c: CAT.blue },
    { label: t('bs.kpi.renew'), v: '5,600 GW', c: CAT.green },
    { label: t('bs.kpi.extreme'), v: '520', c: CAT.orange }
  ];
  $('#bs-kpis').innerHTML = kpis.map(k =>
    `<div class="bs-kpi"><span class="bs-kpi-dot" style="background:${k.c}"></span>
      <div><b>${k.v}</b><span>${k.label}</span></div></div>`).join('');

  /* 1.5°C 警戒线 */
  const warnPct = Math.min(100, crossing.curMean5 / 1.5 * 100);
  $('#bs-warn').innerHTML = `
    <div class="warn-row"><span>${t('bs.warn.mean')}</span><b>${crossing.curMean5} / 1.50 °C</b></div>
    <div class="warn-meter"><i style="width:${warnPct}%"></i><em></em></div>
    <div class="warn-row big"><span>${t('bs.warn.left')}</span><b>${crossing.yearsLeft} ${t('bs.warn.yr')}</b></div>
    <p class="summary-note">${t('bs.warn.first')}</p>`;

  /* 地图 */
  const metricDefs = {};
  MAP_DATA.metrics.forEach(m => { metricDefs[m.key] = m; });
  const ramps = {
    temp: v => mix('#241512', '#e66767', 0.25 + 0.75 * v),
    risk: v => mix('#241512', '#ec835a', 0.25 + 0.75 * v),
    extreme: v => mix('#1a1730', '#9085e9', 0.25 + 0.75 * v),
    renew: v => mix('#12203a', '#3987e5', 0.25 + 0.75 * v)
  };
  let metric = 'temp';
  let pinned = null;
  const metricLabel = () => lb({ zh: metricDefs[metric].zh, en: metricDefs[metric].en });
  const fmtVal = (k, v) => {
    if(k === 'temp') return (v > 0 ? '+' : '') + v.toFixed(1) + '°C';
    if(k === 'renew') return v.toLocaleString('zh-CN') + t('unit.gw');
    return fmtNum(v, 0);
  };
  const buildChips = () => {
    const row = $('#map-metric-chips');
    row.innerHTML = '';
    MAP_DATA.metrics.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (m.key === metric ? ' active' : '');
      b.textContent = lb({ zh: m.zh, en: m.en });
      b.addEventListener('click', () => { metric = m.key; buildChips(); renderMap(); });
      row.appendChild(b);
    });
  };
  const renderRanking = () => {
    const box = $('#bs-rank');
    box.innerHTML = '';
    const sorted = MAP_DATA.countries.filter(c => c.data && c.data[metric] != null)
      .sort((a, b) => b.data[metric] - a.data[metric]).slice(0, 10);
    const max = sorted.length ? sorted[0].data[metric] : 1;
    sorted.forEach((c, i) => {
      const v = c.data[metric];
      const row = document.createElement('div');
      row.className = 'bs-rank-row';
      row.innerHTML = `<b class="rk">${i + 1}</b>
        <span class="rk-name">${lb({ zh: c.zh || c.name, en: c.name })}</span>
        <i class="rk-bar"><em style="width:${(v / max * 100).toFixed(0)}%;background:${ramps[metric]((v) / (v))}"></em></i>
        <b class="rk-val">${fmtVal(metric, v)}</b>`;
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        pinned = { name: lb({ zh: c.zh || c.name, en: c.name }), data: c.data };
        renderPinned();
      });
      box.appendChild(row);
    });
  };
  const renderPinned = () => {
    const foot = $('#bs-map-foot');
    if(!pinned){
      foot.textContent = t('bs.map.foot');
      return;
    }
    foot.innerHTML = `<b>${t('bs.map.pinned', { name: pinned.name })}</b>
      <span class="bs-pin-metrics">${MAP_DATA.metrics.map(m => {
        const v = pinned.data && pinned.data[m.key];
        return `<i><em>${lb({ zh: m.zh, en: m.en })}</em>${v == null ? '—' : fmtVal(m.key, v)}</i>`;
      }).join('')}</span>`;
  };
  const renderMap = () => {
    const box = $('#world-map');
    box.innerHTML = '';
    const svg = el('svg', { viewBox: '-190 -95 380 190', class: 'viz bs-map' }, box);
    el('rect', { x: -190, y: -95, width: 380, height: 190, fill: '#0b0f14' }, svg);
    for(let lon = -180; lon <= 180; lon += 30){
      el('line', { x1: lon, y1: -90, x2: lon, y2: 90, stroke: 'rgba(255,255,255,0.045)', 'stroke-width': 0.35 }, svg);
    }
    for(let lat = -60; lat <= 60; lat += 30){
      el('line', { x1: -180, y1: -lat, x2: 180, y2: -lat, stroke: 'rgba(255,255,255,0.045)', 'stroke-width': 0.35 }, svg);
    }
    const vals = MAP_DATA.countries.map(c => c.data && c.data[metric]).filter(v => v != null);
    const min = Math.min(...vals), max = Math.max(...vals);
    const norm = v => (v - min) / (max - min || 1);
    MAP_DATA.countries.forEach(c => {
      const v = c.data && c.data[metric];
      const fill = v == null ? '#161c24' : ramps[metric](norm(v));
      const strokeBase = v == null ? 'rgba(255,255,255,0.05)' : 'rgba(10,14,19,0.55)';
      const path = el('path', { d: c.d, fill, stroke: strokeBase, 'stroke-width': 0.35 }, svg);
      path.addEventListener('mousemove', ev => {
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '0.9');
        svg.appendChild(path); /* 置顶 */
        showTip(box, ev, [
          { title: lb({ zh: c.zh || c.name, en: c.name }) },
          { name: metricLabel(), color: v == null ? '#898781' : ramps[metric](norm(v)), value: v == null ? t('bs.rank.nodata') : fmtVal(metric, v) }
        ]);
      });
      path.addEventListener('mouseleave', () => {
        path.setAttribute('stroke', strokeBase);
        path.setAttribute('stroke-width', '0.35');
        hideTip();
      });
      path.addEventListener('click', () => {
        pinned = { name: lb({ zh: c.zh || c.name, en: c.name }), data: c.data };
        renderPinned();
      });
    });
    /* 图例 */
    let legendBox = box.querySelector('.bs-legend');
    if(!legendBox){
      legendBox = document.createElement('div');
      legendBox.className = 'bs-legend';
      box.appendChild(legendBox);
    }
    legendBox.innerHTML = `<span>${t('bs.legend.min')} ${fmtVal(metric, min)}</span>
      <i style="background:linear-gradient(90deg,${ramps[metric](0)},${ramps[metric](1)})"></i>
      <span>${t('bs.legend.max')} ${fmtVal(metric, max)}</span>`;
    renderRanking();
  };
  buildChips();
  renderMap();

  /* 事件播报 */
  const tickBox = $('#bs-ticker');
  tickBox.innerHTML = DATA.ticker.map((e, i) =>
    `<div class="tick" data-i="${i}"><span class="tick-ic">${e.icon}</span>
      <div class="tick-body"><b>${lb(e.type)}</b><span>${lb(e.loc)}</span></div>
      <span class="lv lv-${e.lv}">${lb(e.time)}</span></div>`).join('');

  /* 预测中心 */
  const ice = arcticIce();
  const iceV = ice.vals[ice.vals.length - 1];
  const icePct = Math.round((1 - iceV / 3.7) * 100);
  const ins = insuranceLoss();
  const insV = ins.vals[ins.vals.length - 1];
  const wsP = projectWindSolar();
  const shP = storageHydrogen();
  const sea21 = seaLevel2100();
  const heat = heatDays();
  const crop = cropImpact();
  const fc = $('#bs-fc');
  fc.innerHTML = `
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.cross')}</b><span class="lv lv-critical">${t('bs.fc.crossSub')}</span></div>
      <div class="fc-hero">${crossing.permanent}<small>${LANG === 'zh' ? '年' : ''}</small></div>
      <p>${t('bs.fc.crossNote', { y: crossing.permanent, m: crossing.curMean5 })}</p>
      <div class="warn-meter slim"><i style="width:${warnPct}%"></i><em></em></div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.ice')}</b><span class="lv lv-serious">${t('bs.fc.iceSub')}</span></div>
      <div class="fc-hero">${iceV.toFixed(2)}<small>${LANG === 'zh' ? '百万 km²' : 'M km²'}</small></div>
      <p>${t('bs.fc.iceNote', { p: icePct })}</p>
      <div class="fc-spark"></div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.sea2100')}</b><span class="lv lv-warning">${t('bs.fc.sea2100Sub')}</span></div>
      <div class="fc-rows">${sea21.map(s => `
        <div class="fc-row"><span>${lb(s.label)}</span><i><em style="width:${(s.v / 1.1 * 100).toFixed(0)}%"></em></i><b>${s.v.toFixed(2)} m</b></div>`).join('')}</div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.ins')}</b><span class="lv lv-serious">${t('bs.fc.insSub')}</span></div>
      <div class="fc-hero">${t('ov.loss.unit')}${(insV / 1000).toFixed(2)}<small>T</small></div>
      <p>${t('bs.fc.insNote')}</p>
      <div class="fc-spark"></div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.ws')}</b><span class="lv lv-good">${t('bs.fc.wsSub')}</span></div>
      <div class="fc-hero">${fmtK(wsP.vals[4])}<small> / ${fmtK(wsP.vals[24])} GW</small></div>
      <p>2030 / 2050</p>
      <div class="fc-spark"></div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.sh')}</b><span class="lv lv-good">${t('bs.fc.shSub')}</span></div>
      <div class="fc-hero">${fmtK(shP.stor[shP.stor.length - 1])}<small> GW</small></div>
      <p>${LANG === 'zh' ? '绿氢' : 'Green H₂'}: ${fmtK(shP.h2[shP.h2.length - 1])} Mt · 2050</p>
      <div class="fc-spark"></div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.heat')}</b><span class="lv lv-warning">${t('bs.fc.heatSub')}</span></div>
      <div class="fc-rows">${heat.map(h => `
        <div class="fc-row"><span>${lb(h.city)}</span><b>${h.now} → ${h.mid}</b></div>`).join('')}</div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>
    <div class="fc-card">
      <div class="fc-head"><b>${t('bs.fc.crop')}</b><span class="lv lv-critical">${t('bs.fc.cropSub')}</span></div>
      <div class="fc-rows">${crop.map(cr => `
        <div class="fc-row"><span>${lb(cr.crop)}</span><i class="neg"><em style="width:${(-cr.v / 25 * 100).toFixed(0)}%"></em></i><b>${cr.v}%</b></div>`).join('')}</div>
      <span class="fc-note">${t('bs.fc.conf')}</span>
    </div>`;
  sparkline($('#bs-fc .fc-card:nth-child(2) .fc-spark'), [...ice.obs.values, ...ice.vals], CAT.violet);
  sparkline($('#bs-fc .fc-card:nth-child(4) .fc-spark'), ins.vals, CAT.orange);
  sparkline($('#bs-fc .fc-card:nth-child(5) .fc-spark'), wsP.vals, CAT.blue);
  sparkline($('#bs-fc .fc-card:nth-child(6) .fc-spark'), shP.stor, CAT.green);

  $('#bs-fullscreen').addEventListener('click', () => {
    if(document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
}

/* ============================================================
   ③ 气候适应 · 城市韧性
   ============================================================ */
let curCity = DATA.cities[0];

function buildCity(){
  const sec = $('#tab-city');
  sec.innerHTML = `
    <div class="filter-row">
      <div class="filter-label">${t('city.filter')}</div>
      <div class="chip-row" id="city-chips"></div>
    </div>
    <div class="kpi-grid" id="city-kpis"></div>
    <div class="grid-2">
      ${card('city-radar', t('city.radar.title'), t('city.radar.sub'))}
      ${card('city-risk', t('city.risk.title'), t('city.risk.sub'))}
    </div>
    <div class="grid-2-1">
      ${card('city-plan', t('city.plan.title'), t('city.plan.sub'))}
      ${card('city-sum', t('city.sum.title'), '')}
    </div>`;

  const renderChips = () => {
    const chips = $('#city-chips');
    chips.innerHTML = '';
    DATA.cities.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (c.id === curCity.id ? ' active' : '');
      b.textContent = lb(c.name);
      b.addEventListener('click', () => { curCity = c; renderChips(); renderCity(); });
      chips.appendChild(b);
    });
  };
  const renderCity = () => {
    const c = curCity;
    const resMean = +(c.resilience.reduce((a, b) => a + b, 0) / c.resilience.length).toFixed(1);
    const avgMean = +(DATA.cityAvg.reduce((a, b) => a + b, 0) / 6).toFixed(1);
    const riskLv = c.risk >= 85 ? 'critical' : c.risk >= 70 ? 'serious' : c.risk >= 55 ? 'warning' : 'good';
    const riskTxt = c.risk >= 85 ? t('city.riskLv.h') : c.risk >= 70 ? t('city.riskLv.mh') : c.risk >= 55 ? t('city.riskLv.m') : t('city.riskLv.l');
    $('#city-kpis').innerHTML =
      statTile({ label: t('city.kpi.res'), value: resMean, decimals: 1, suffix: ' / 100', delta: `+${(resMean - avgMean).toFixed(1)}`, deltaNote: t('city.delta.above'), deltaGood: true }) +
      `<div class="stat" data-anim><div class="stat-label">${t('city.kpi.risk')}</div>
        <div class="stat-value"><span class="count" data-count="${c.risk}">0</span><span class="stat-suffix"> / 100</span></div>
        <div class="stat-delta plain">${lvBadge(riskLv, t('city.riskTag') + riskTxt)}</div>
        <div class="stat-spark"></div></div>` +
      statTile({ label: t('city.kpi.exp'), value: LANG === 'zh' ? c.exposed : +(c.exposed / 100).toFixed(1), decimals: LANG === 'zh' ? 0 : 1, suffix: LANG === 'zh' ? ' 万' : ' M', deltaNote: t('city.pop', { pop: c.pop }) }) +
      statTile({ label: t('city.kpi.gap'), value: LANG === 'zh' ? c.gap : +(c.gap / 10).toFixed(1), decimals: LANG === 'zh' ? 0 : 1, prefix: '¥', suffix: LANG === 'zh' ? ' 亿' : ' B', deltaNote: c.seaRate ? t('city.searate', { r: c.seaRate }) : t('city.inland'), up: false, deltaLv: 'warn' });
    runCounters($('#city-kpis'));
    /* 雷达 */
    const rb = $('#city-radar .card-body');
    rb.innerHTML = '';
    radar(rb, { axes: DATA.cityDims.map(d => lb(d)), max: 100, series: [
      { name: lb(c.name), color: CAT.blue, values: c.resilience },
      { name: t('city.radar.avg'), color: '#8b9098', values: DATA.cityAvg }
    ]});
    legend(rb, [{ name: lb(c.name), color: CAT.blue }, { name: t('city.radar.avg'), color: '#8b9098' }]);
    /* 风险排行 */
    const kb = $('#city-risk .card-body');
    kb.innerHTML = '';
    const riskItems = Object.entries(c.risks).map(([k, v]) => ({ k, v }));
    const riskRamp = [0.36, 0.48, 0.60, 0.72, 0.84].map(x => mix(SURFACE, CAT.orange, x));
    rankedBars(kb, { items: riskItems.map(r => ({ label: lb(RISKS[r.k]), value: r.v })), ramp: riskRamp, fmtY: v => fmtNum(v, 0) + t('city.risk.unit') });
    /* 行动方案(展开式) */
    const pb = $('#city-plan .card-body');
    pb.innerHTML = '';
    const top = riskItems.slice().sort((a, b) => b.v - a.v).slice(0, 3).map(r => r.k);
    const blocks = [...top, 'generic'];
    blocks.forEach(rk => {
      const rv = c.risks[rk] != null ? c.risks[rk] : 70;
      const lv = rv >= 85 ? 'critical' : rv >= 70 ? 'serious' : 'warning';
      const prio = lv === 'critical' ? t('city.plan.p1') : lv === 'serious' ? t('city.plan.p2') : t('city.plan.p3');
      const block = document.createElement('div');
      block.className = 'plan-block';
      block.innerHTML = `
        <div class="plan-block-head">
          <b class="plan-risk">${RISKS[rk].icon} ${lb(RISKS[rk])}</b>
          ${rk !== 'generic' ? `<span class="plan-score">${rv} / 100</span>` : ''}
          ${lvBadge(lv, prio)}
        </div>`;
      ADAPT[rk].measures.forEach(m => {
        const det = document.createElement('details');
        det.className = 'measure';
        det.innerHTML = `
          <summary>
            <span class="cat cat-${m.cat}">${lb(CATS[m.cat])}</span>
            <span class="m-title">${lb(m.title)}</span>
            <span class="m-meta">${m.cost} · ${lb(m.benefit)}</span>
            <span class="m-caret">▾</span>
          </summary>
          <div class="m-detail">
            <p class="m-desc">${lb(m.desc)}</p>
            <div class="m-grid">
              <div class="m-steps"><b>${t('city.steps')}</b><ol>${m.steps[LANG].map(s => `<li>${s}</li>`).join('')}</ol></div>
              <div><b>${t('city.fund')}</b><p>${lb(m.fund)}</p></div>
              <div><b>${t('city.kpi')}</b><p>${lb(m.kpi)}</p></div>
            </div>
            <span class="time-chip">${lb(TIMES[m.time])}</span>
          </div>`;
        block.appendChild(det);
      });
      pb.appendChild(block);
    });
    /* 摘要 */
    const sb = $('#city-sum .card-body');
    sb.innerHTML = `<p class="summary-text">${lb(c.summary)}</p>
      <div class="summary-meta">
        <div><span class="muted">${t('city.meta.region')}</span><b>${lb(c.region)}</b></div>
        <div><span class="muted">${t('city.meta.pop')}</span><b>${c.pop}</b></div>
        <div><span class="muted">${t('city.meta.sea')}</span><b>${c.seaRate ? c.seaRate + ' mm/' + (LANG === 'zh' ? '年' : 'yr') : t('city.meta.na')}</b></div>
        <div><span class="muted">${t('city.meta.top')}</span><b>${top.map(k => lb(RISKS[k])).join(' · ')}</b></div>
      </div>
      <p class="summary-note">${t('city.note')}</p>`;
  };
  renderChips();
  renderCity();
}

/* ============================================================
   ④ 清洁能源 · 低碳转型
   ============================================================ */
let simState = { carbon: 80, invest: 60, elec: 55, eff: 50 };
const simBase = simulateChina(POLICY_BASE);

function buildEnergy(){
  const sec = $('#tab-energy');
  sec.innerHTML = `
    <div class="kpi-grid" id="en-kpis"></div>
    ${card('en-mix', t('en.mix.title'), t('en.mix.sub'))}
    <section class="card" id="en-sim">
      <header class="card-head"><div>
        <h3>${t('en.sim.title')}</h3>
        <p class="card-sub">${t('en.sim.sub')}</p>
      </div><div class="card-tools"><span class="live"><i></i>${t('en.sim.live')}</span></div></header>
      <div class="card-body sim-body">
        <div class="sim-out" id="sim-out"></div>
        <div class="sim-grid">
          <div class="sim-panel">
            <div class="sim-sliders" id="sim-sliders"></div>
            <div class="sim-advice" id="sim-advice"></div>
          </div>
          <div class="sim-chart" id="sim-chart"></div>
        </div>
      </div>
    </section>
    <div class="grid-2">
      ${card('en-windsolar', t('en.ws.title'), t('en.ws.sub'))}
      ${card('en-cost', t('en.cost.title'), '')}
    </div>`;

  const renderEnKpi = () => {
    const r = simulateChina(simState);
    const peakTxt = r.peakYear === 0 ? t('en.peak.none') : (r.peakYear <= 2024 ? t('en.peak.done') : r.peakYear + (LANG === 'zh' ? ' 年' : ''));
    const peakLv = r.peakYear === 0 ? 'critical' : (r.peakYear <= 2024 ? 'good' : 'warning');
    const peakNote = r.peakYear === 0 ? t('en.peak.hard') : r.peakYear <= 2024 ? t('en.peak.doneSub') : t('en.peak.exp', { x: Math.round(r.peakVal * 10) });
    $('#en-kpis').innerHTML =
      statTile({ label: t('en.kpi.fossil'), value: 18.5, decimals: 1, suffix: ' %', delta: '+4.6 pp', deltaNote: t('en.delta.2015'), deltaGood: true }) +
      statTile({ label: t('en.kpi.ws'), value: LANG === 'zh' ? 20.5 : 2.05, decimals: LANG === 'zh' ? 1 : 2, suffix: LANG === 'zh' ? ' 亿千瓦' : ' TW', delta: '+20%', deltaNote: t('kpi.y2025'), deltaGood: true }) +
      statTile({ label: t('en.kpi.pv'), value: 84, suffix: ' %', prefix: '−', delta: '↓ 84%', deltaNote: t('en.delta.pv'), deltaGood: true, up: false }) +
      `<div class="stat" data-anim><div class="stat-label">${t('en.kpi.peak')} <span class="stat-hint">${t('en.delta.cur')}</span></div>
        <div class="stat-value" style="font-size:30px">${peakTxt}</div>
        <div class="stat-delta plain">${lvBadge(peakLv, peakNote)}</div>
        <div class="stat-spark"></div></div>`;
  };
  renderEnKpi();

  /* 能源结构堆叠图 */
  const mixBox = $('#en-mix .card-body');
  const mixSeries = DATA.energyMix.series.map((s, i) => ({ name: lb(s.name), color: [CAT.blue, CAT.orange, CAT.aqua, CAT.yellow, CAT.magenta][i], values: s.values }));
  stackedBars(mixBox, { categories: DATA.energyMix.years, series: mixSeries, fmtY: v => fmtNum(v, 0) + '%', unit: '%', height: 300 });
  legend(mixBox, mixSeries, { type: 'bar' });
  addTable($('#en-mix'), mixBox, {
    head: [t('table.year'), ...mixSeries.map(s => s.name + '(%)')],
    rows: DATA.energyMix.years.map((y, i) => [y, ...mixSeries.map(s => fmtNum(s.values[i], 1))])
  });

  /* 推演器 */
  const sliders = [
    { key: 'carbon', label: t('en.sl.carbon'), min: 0, max: 300, step: 5, unit: '¥/t', desc: t('en.sl.carbonDesc') },
    { key: 'invest', label: t('en.sl.invest'), min: 0, max: 100, step: 1, unit: '', desc: t('en.sl.investDesc') },
    { key: 'elec', label: t('en.sl.elec'), min: 0, max: 100, step: 1, unit: '%', desc: t('en.sl.elecDesc') },
    { key: 'eff', label: t('en.sl.eff'), min: 0, max: 100, step: 1, unit: '', desc: t('en.sl.effDesc') }
  ];
  const slidersBox = $('#sim-sliders');
  slidersBox.innerHTML = sliders.map(sl => `
    <div class="slider-row">
      <div class="slider-head"><label for="sl-${sl.key}">${sl.label}</label><b id="slv-${sl.key}"></b></div>
      <input type="range" id="sl-${sl.key}" min="${sl.min}" max="${sl.max}" step="${sl.step}" value="${simState[sl.key]}">
      <div class="slider-foot"><span>${sl.desc}</span><span class="muted">${sl.min}${sl.unit} – ${sl.max}${sl.unit}</span></div>
    </div>`).join('');
  let simTimer = null;
  const readParams = () => ({
    carbon: +$('#sl-carbon').value,
    invest: +$('#sl-invest').value,
    elec: +$('#sl-elec').value,
    eff: +$('#sl-eff').value
  });
  sliders.forEach(sl => {
    const inp = $('#sl-' + sl.key);
    const setVal = () => {
      simState[sl.key] = +inp.value;
      $('#slv-' + sl.key).textContent = sl.unit === '¥/t' ? '¥' + inp.value + '/t' : inp.value + (sl.unit || '');
    };
    setVal();
    inp.addEventListener('input', () => {
      setVal();
      clearTimeout(simTimer);
      simTimer = setTimeout(renderSim, 60);
    });
  });
  const simAdvice = (p, r) => {
    const out = [];
    if(p.carbon < 120) out.push({ lv: p.carbon < 50 ? 'critical' : 'serious',
      zh: `碳价信号偏弱(¥${p.carbon}/t):建议逐步提升至 ¥150–300/t,加速煤电退出并为 CCUS 提供市场激励。`,
      en: `Carbon price signal is weak (¥${p.carbon}/t): raise it stepwise to ¥150–300/t to accelerate coal phase-out and fund CCUS.` });
    if(p.invest < 60) out.push({ lv: p.invest < 30 ? 'critical' : 'serious',
      zh: '风光投资强度不足:建议保持年均 4–5 万亿元装机投资,并配套电网与储能建设。',
      en: 'Wind & solar investment is too low: keep annual additions at ¥4–5T with matching grid and storage build-out.' });
    if(p.elec < 60) out.push({ lv: p.elec < 30 ? 'serious' : 'warning',
      zh: '终端电气化率提升有限:交通、工业电气化是达峰后深度脱碳的关键,建议提前布局电炉钢、电动车与氢能。',
      en: 'Electrification is lagging: transport and industry electrification drives post-peak decarbonization — plan ahead for EAF steel, EVs and hydrogen.' });
    if(p.eff < 60) out.push({ lv: p.eff < 30 ? 'serious' : 'warning',
      zh: '能效改进是成本最低的减排手段:建筑节能改造与工业余热回收的减排成本为负,应优先推进。',
      en: 'Efficiency is the cheapest abatement: building retrofits and industrial heat recovery have negative abatement cost — do them first.' });
    if(r.peakYear > 2030) out.push({ lv: 'critical',
      zh: `推演达峰年份为 ${r.peakYear} 年,晚于"2030 年前达峰"承诺,需强化组合政策。`,
      en: `The projected peak of ${r.peakYear} misses the pre-2030 pledge — strengthen the policy mix.` });
    if(r.e2060 > 2) out.push({ lv: 'critical',
      zh: `2060 年净排放仍有 ${(r.e2060 * 10).toFixed(0)} 亿吨,与碳中和目标差距显著:建议 2030 年起部署 CCUS 并扩大自然碳汇。`,
      en: `2060 net emissions still reach ${(r.e2060 * 10).toFixed(0)}0 Mt — deploy CCUS from 2030 and expand natural sinks.` });
    else if(r.e2060 > 0.3) out.push({ lv: 'warning',
      zh: `2060 年净排放约 ${(r.e2060 * 10).toFixed(0)} 亿吨:已接近目标,剩余排放可由森林、海洋碳汇抵消。`,
      en: `2060 net emissions ≈${(r.e2060 * 10).toFixed(0)}0 Mt: close to target — residual emissions can be offset by forest and ocean sinks.` });
    if(out.length === 0) out.push({ lv: 'good',
      zh: '政策组合力度充分:推演显示 2060 年可实现碳中和。建议保持政策连续性,并防范公正转型与能源安全风险。',
      en: 'The policy mix is strong enough: the projection reaches carbon neutrality by 2060. Keep policy continuity and manage just-transition and energy-security risks.' });
    return out;
  };
  const renderSim = () => {
    const p = readParams();
    const r = simulateChina(p);
    const out = $('#sim-out');
    const peakTxt = r.peakYear === 0 ? t('en.peak.none') : (r.peakYear <= 2024 ? t('en.peak.done') : r.peakYear + (LANG === 'zh' ? ' 年' : ''));
    const peakSub = r.peakYear === 0 ? t('en.tile.peakSub3') : (r.peakYear <= 2024 ? t('en.tile.peakSub1') : t('en.tile.peakSub2', { x: Math.round(r.peakVal * 10) }));
    const e2060Lv = r.e2060 <= 0.3 ? 'good' : r.e2060 <= 2 ? 'warning' : 'critical';
    const e2060Txt = r.e2060 <= 0.3 ? t('en.e2060.ok') : r.e2060 <= 2 ? t('en.e2060.mid') : t('en.e2060.bad');
    const eVal = LANG === 'zh' ? fmtGt(r.e2060) + ' ' + t('en.unit.yi') : (Math.abs(r.e2060) < 0.05 ? '≈0' : r.e2060.toFixed(1)) + ' Gt';
    const dTxt = Math.min(100, r.declineFromPeak).toFixed(0);
    out.innerHTML = `
      <div class="sim-tile sim-tile-hero"><span class="muted">${t('en.tile.peak')}</span><b>${peakTxt}</b><small>${peakSub}</small></div>
      <div class="sim-tile"><span class="muted">${t('en.tile.e2060')}</span><b>${eVal}</b><small>${lvBadge(e2060Lv, e2060Txt)}</small></div>
      <div class="sim-tile"><span class="muted">${t('en.tile.nonf')}</span><b>${r.nonFossil2060}<i>%</i></b><small>${t('en.tile.nonfSub')}</small></div>
      <div class="sim-tile"><span class="muted">${t('en.tile.decl')}</span><b>${dTxt}<i>%</i></b><small>${t('en.tile.declSub')}</small></div>`;
    const adv = $('#sim-advice');
    adv.innerHTML = `<div class="adv-title">${t('en.adv.title')}</div>` + simAdvice(p, r).map(a =>
      `<div class="adv-item"><span class="insight-icon" style="color:${ST[a.lv]}">${LV_ICON[a.lv]}</span><p>${a[LANG]}</p></div>`).join('');
    const box = $('#sim-chart');
    box.innerHTML = '';
    const w = i => 0.08 - 0.0012 * i;
    const lo = r.net.map((v, i) => +(v * (1 - Math.max(0.02, w(i)))).toFixed(3));
    const hi = r.net.map((v, i) => +(v * (1 + Math.max(0.02, w(i)))).toFixed(3));
    const markers = [];
    if(r.peakYear > 0){
      markers.push({ xi: r.peakYear - 2020, y: r.gross[r.peakYear - 2020], color: CAT.blue, label: r.peakYear <= 2024 ? t('en.marker.done') : t('en.marker.year', { y: r.peakYear }) });
    }
    lineChart(box, {
      x: r.years,
      series: [
        { name: t('en.series.base'), color: CAT.orange, values: simBase.net, opacity: 0.55 },
        { name: t('en.series.policy'), color: CAT.blue, values: r.net }
      ],
      bands: [{ color: CAT.blue, lo, hi }],
      hlines: [{ y: 0, label: t('en.hline.zero'), color: ST.good }],
      markers,
      fmtY: v => fmtNum(v, 1) + ' Gt',
      height: 320, xEvery: 5
    });
    legend(box, [
      { name: t('en.series.base'), color: CAT.orange },
      { name: t('en.series.policy'), color: CAT.blue }
    ]);
    renderEnKpi();
  };
  renderSim();

  /* 风光装机 */
  const pWs = projectWindSolar();
  lineChart($('#en-windsolar .card-body'), {
    x: [...DATA.windSolar.years, ...pWs.years],
    series: [{ name: t('en.ws.series'), color: CAT.blue, values: [...DATA.windSolar.values, ...pWs.vals], area: true }],
    bands: [{ color: CAT.blue, lo: [...DATA.windSolar.values.map(() => null), ...pWs.lo], hi: [...DATA.windSolar.values.map(() => null), ...pWs.hi] }],
    hlines: [{ y: 1200, label: t('en.ws.hline'), color: '#898781' }],
    fmtY: v => fmtK(v) + t('unit.gw'),
    projFrom: DATA.windSolar.years.length, height: 260
  });

  /* 关键进展 */
  const costBox = $('#en-cost .card-body');
  costBox.innerHTML = `
    <div class="milestones">
      <div class="ms"><b>${t('en.ms.2026.title')}</b><p>${t('en.ms.2026.text')}</p></div>
      <div class="ms"><b>${t('en.ms.2028.title')}</b><p>${t('en.ms.2028.text')}</p></div>
      <div class="ms"><b>${t('en.ms.2030.title')}</b><p>${t('en.ms.2030.text')}</p></div>
      <div class="ms"><b>${t('en.ms.2060.title')}</b><p>${t('en.ms.2060.text')}</p></div>
    </div>
    <p class="summary-note">${t('en.cost.note')}</p>`;
}

/* ============================================================
   ⑤ 生态保护
   ============================================================ */
function buildEco(){
  const sec = $('#tab-eco');
  sec.innerHTML = `
    <div class="kpi-grid">
      ${statTile({ label: t('eco.kpi.forest'), value: 12, suffix: ' Mha', prefix: '−', deltaNote: t('eco.kpi.forestNote') })}
      ${statTile({ label: t('eco.kpi.mang'), value: 21, suffix: ' %', prefix: '−', deltaNote: t('eco.kpi.mangNote') })}
      ${statTile({ label: t('eco.kpi.bio'), value: 0.64, decimals: 2, suffix: '', delta: '−36%', deltaNote: t('eco.kpi.bioNote'), up: false })}
      ${statTile({ label: t('eco.kpi.rest'), value: 36.7, decimals: 1, suffix: ' GtCO₂e', deltaNote: t('eco.kpi.restNote'), deltaGood: true })}
    </div>
    <div class="grid-2">
      ${card('eco-forest', t('eco.forest.title'), t('eco.forest.sub'))}
      ${card('eco-mangrove', t('eco.mang.title'), t('eco.mang.sub'))}
    </div>
    <div class="grid-2">
      ${card('eco-bio', t('eco.bio.title'), t('eco.bio.sub'))}
      ${card('eco-restore', t('eco.rest.title'), t('eco.rest.sub'))}
    </div>`;

  const fb = $('#eco-forest .card-body');
  divergingBars(fb, { items: DATA.forestChange.map(i => ({ label: lb(i.label), value: i.value })), unit: ' Mha' });
  addTable($('#eco-forest'), fb, {
    head: [t('table.region'), t('table.change')],
    rows: DATA.forestChange.map(i => [lb(i.label), (i.value > 0 ? '+' : '') + i.value])
  });

  lineChart($('#eco-mangrove .card-body'), {
    x: DATA.mangrove.years,
    series: [{ name: t('eco.series.mang'), color: CAT.aqua, values: DATA.mangrove.values, area: true }],
    fmtY: v => fmtNum(v, 0) + t('eco.unit.10kha'),
    height: 250, xEvery: 5
  });

  lineChart($('#eco-bio .card-body'), {
    x: DATA.biodiversity.years,
    series: [{ name: t('eco.series.bio'), color: CAT.violet, values: DATA.biodiversity.values, area: true }],
    fmtY: v => v.toFixed(2),
    hlines: [{ y: 1.0, label: t('eco.hline.base'), color: '#898781' }],
    height: 250, xEvery: 5
  });

  const rb = $('#eco-restore .card-body');
  rankedBars(rb, { items: DATA.restoration.map(i => ({ label: lb(i.label), value: i.value })), fmtY: v => fmtNum(v, 1) + ' GtCO₂e' });
  addTable($('#eco-restore'), rb, {
    head: [t('table.eco'), t('table.pot')],
    rows: DATA.restoration.map(i => [lb(i.label), i.value])
  });
}

/* ============================================================
   ⑥ AI 气候助手
   ============================================================ */
function buildChat(){
  const sec = $('#tab-chat');
  sec.innerHTML = `
    <div class="chat-grid">
      <section class="card chat-panel">
        <header class="card-head"><div><h3>${t('chat.title')}</h3><p class="card-sub">${t('chat.sub')}</p></div>
        <div class="card-tools"><span class="live"><i></i>${t('chat.online')}</span></div></header>
        <div class="chat-log" id="chat-log"></div>
        <div class="chat-chips" id="chat-chips"></div>
        <div class="chat-input">
          <input id="chat-in" type="text" placeholder="${t('chat.placeholder')}" maxlength="200">
          <button id="chat-send" type="button">${t('chat.send')}</button>
        </div>
      </section>
      <div class="chat-side">
        <section class="card"><header class="card-head"><h3>${t('chat.cap.title')}</h3></header>
          <div class="card-body">
            <ul class="cap-list">
              <li><b>${t('chat.cap.1t')}</b>${t('chat.cap.1d')}</li>
              <li><b>${t('chat.cap.2t')}</b>${t('chat.cap.2d')}</li>
              <li><b>${t('chat.cap.3t')}</b>${t('chat.cap.3d')}</li>
              <li><b>${t('chat.cap.4t')}</b>${t('chat.cap.4d')}</li>
            </ul>
          </div>
        </section>
        <section class="card"><header class="card-head"><h3>${t('chat.snap.title')}</h3></header>
          <div class="card-body" id="chat-snapshot"></div>
        </section>
        <section class="card"><header class="card-head"><h3>${t('chat.quick.title')}</h3></header>
          <div class="card-body" id="chat-quick"></div>
        </section>
      </div>
    </div>`;
  renderSnapshot();

  const quickQs = [t('chat.q1'), t('chat.q2'), t('chat.q3'), t('chat.q4'), t('chat.q5')];
  const quickBox = $('#chat-quick');
  quickBox.innerHTML = quickQs.map(q => `<button class="quick-btn" type="button">${q}</button>`).join('');
  $$('#chat-quick .quick-btn').forEach(b => b.addEventListener('click', () => send(b.textContent)));

  const log = $('#chat-log');
  const addMsg = (role, text) => {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'msg-user' : 'msg-ai');
    if(role === 'ai'){
      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = 'AI';
      wrap.appendChild(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const body = document.createElement('div');
    body.className = 'bubble-body';
    body.textContent = text;
    bubble.appendChild(body);
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return bubble;
  };
  const addTyping = () => {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg-ai';
    wrap.id = 'typing';
    wrap.innerHTML = '<div class="msg-avatar">AI</div><div class="bubble typing"><i></i><i></i><i></i></div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  };
  const stream = (body, text) => new Promise(res => {
    let i = 0;
    const tick = () => {
      i += 2;
      body.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      if(i < text.length) setTimeout(tick, 14);
      else res();
    };
    tick();
  });

  const simNow = () => simulateChina(readSimState());
  const KB = [
    { re: /碳达峰|达峰|carbon peak|peaking|peak year/i, fn: () => {
        const r = simNow(), p = readSimState();
        const peak = r.peakYear === 0 ? (LANG === 'zh' ? '按当前政策强度,2060 年前难以达峰' : 'under the current policy strength a peak before 2060 is unlikely')
          : r.peakYear <= 2024 ? (LANG === 'zh' ? '中国碳排放已在 2020–2024 年间实现碳达峰(与现行政策评估一致)' : 'China\'s emissions already peaked during 2020–2024 (consistent with current-policy assessments)')
          : (LANG === 'zh' ? `预计 ${r.peakYear} 年实现碳达峰,峰值约 ${(r.peakVal * 10).toFixed(0)} 亿吨` : `the peak is projected in ${r.peakYear} at about ${(r.peakVal * 10).toFixed(0)}0 Mt`);
        const e = LANG === 'zh' ? `2060 年净排放推演为 ${fmtGt(r.e2060)} 亿吨` : `2060 net emissions are projected at ${(Math.abs(r.e2060) < 0.05 ? '≈0' : r.e2060.toFixed(1))} Gt`;
        return (LANG === 'zh'
          ? `当前政策组合(碳价 ¥${p.carbon}/t、风光投资强度 ${p.invest}、电气化率 ${p.elec}%、能效力度 ${p.eff}):${peak}。\n\n${e}。达峰只是第一步,深度减排取决于达峰后的下降斜率——建议到"能源转型"页拖动滑块,观察政策如何改变曲线。`
          : `Under the current policy mix (carbon ¥${p.carbon}/t, investment ${p.invest}, electrification ${p.elec}%, efficiency ${p.eff}): ${peak}.\n\n${e}. Peaking is only step one — deep cuts depend on the post-peak slope. Head to the Energy tab and drag the sliders to watch the curve change.`);
      }, src:{zh:['中国碳排放推演模型','AI 实时计算'],en:['China emission model','computed live']} },
    { re: /碳中和|净零|net zero|neutrality/i, fn: () => {
        const r = simNow();
        const e = LANG === 'zh' ? fmtGt(r.e2060) + ' 亿吨' : (Math.abs(r.e2060) < 0.05 ? '≈0' : r.e2060.toFixed(1)) + ' Gt';
        const st = r.e2060 <= 0.3 ? (LANG === 'zh' ? '已基本实现碳中和' : 'near carbon neutrality')
          : r.e2060 <= 2 ? (LANG === 'zh' ? '接近目标,剩余排放需碳汇抵消' : 'close to target, residuals need sinks')
          : (LANG === 'zh' ? '距目标仍有明显差距' : 'a significant gap remains');
        return (LANG === 'zh'
          ? `碳中和指人为排放与碳汇/CCUS 移除相平衡(净零)。中国承诺 2060 年前实现。\n\n按当前政策组合推演,2060 年净排放 ${e}:${st},非化石能源占比约 ${r.nonFossil2060}%。`
          : `Carbon neutrality means human emissions balanced by sinks/CCUS removals (net zero). China has pledged to reach it before 2060.\n\nAt the current policy mix, 2060 net emissions project to ${e}: ${st}, with a non-fossil share of ≈${r.nonFossil2060}%.`);
      }, src:{zh:['中国碳排放推演模型','IPCC AR6'],en:['China emission model','IPCC AR6']} },
    { re: /温升|温度|变暖|巴黎|1\.5|2度|warming|temperature|paris/i, fn: () => {
        const sc = tempScenarios();
        const cross = tempCrossing();
        const slope = (sc.fit.slope * 10).toFixed(2);
        const cur = sc.proj.current.vals[24], paris = sc.proj.paris.vals[24];
        return (LANG === 'zh'
          ? `2026 年全球温升 +1.52°C(相对工业化前),2024 年曾达 +1.55°C 极值。\n\nAI 模型对 1970–2026 年拟合的升温速率为 ${slope}°C/十年。2050 年推演:巴黎路径 +${paris}°C、现行政策 +${cur}°C(90% 置信区间 ${(cur - 0.36).toFixed(1)}–${(cur + 0.36).toFixed(1)}°C)。\n\n5 年滑动均值距 1.5°C 长期突破仅剩 ${cross.yearsLeft} 年。每 0.1°C 都意味着更多极端高温、海平面上升与生态损失,越早减排,转型成本越低。`
          : `2026 warming is +1.52°C vs pre-industrial, after the 2024 record of +1.55°C.\n\nThe AI model fits a warming rate of ${slope}°C/decade over 1970–2026. For 2050: Paris path +${paris}°C, current policies +${cur}°C (90% CI ${(cur - 0.36).toFixed(1)}–${(cur + 0.36).toFixed(1)}°C).\n\nThe 5-yr mean is ${cross.yearsLeft} year(s) from permanently crossing 1.5°C. Every 0.1°C means more extreme heat, sea-level rise and ecosystem loss — the earlier we cut, the cheaper the transition.`);
      }, src:{zh:['NASA GISS 近似数据','AI 情景推演模型'],en:['NASA GISS approx.','AI scenario model']} },
    { re: /能源|光伏|风电|风光|煤电|转型|energy|solar|wind|coal/i, fn: () => {
        const p = projectWindSolar();
        return (LANG === 'zh'
          ? `中国能源转型正在加速:2026 年风光装机 20.5 亿千瓦(同比 +20%),较 2030 年原定目标(12 亿千瓦)提前 6 年超额完成;光伏度电成本较 2010 年下降 84%。\n\nAI 预测:2030 年风光装机约 ${fmtK(p.vals[4])} GW,2050 年约 ${fmtK(p.vals[24])} GW,2060 年风光发电在一次能源中占比约 57%。\n\n挑战在于电网灵活性、储能配套与煤电有序退出——建议到"能源转型"页用推演器验证政策组合。`
          : `China\'s transition is accelerating: wind & solar reached 2,050 GW in 2026 (+20% YoY) — 70% above the original 2030 target of 1,200 GW, met 6 years early; solar costs fell 84% vs 2010.\n\nAI forecast: ≈${fmtK(p.vals[4])} GW by 2030 and ≈${fmtK(p.vals[24])} GW by 2050; wind & solar reach ≈57% of primary energy by 2060.\n\nThe challenges are grid flexibility, storage build-out and an orderly coal exit — test policy mixes with the simulator in the Energy tab.`);
      }, src:{zh:['国家能源局近似数据','AI 预测模型'],en:['NEA approx.','AI forecast model']} },
    { re: /城市|韧性|适应|洪涝|热浪|海平面|风暴|深圳|上海|北京|广州|孟买|雅加达|伦敦|新加坡|鹿特丹|city|resilien|adapt|flood|heatwave|sea.level|storm|shenzhen|shanghai|beijing|guangzhou|mumbai|jakarta|london|singapore|rotterdam/i, fn: () => {
        const c = curCity;
        const top = Object.entries(c.risks).sort((a, b) => b[1] - a[1]).slice(0, 2);
        return (LANG === 'zh'
          ? `${lb(c.name)}(${lb(c.region)})气候风险评分 ${c.risk}/100,综合韧性指数 ${(c.resilience.reduce((a, b) => a + b, 0) / 6).toFixed(1)}/100。\n\n主导风险:${top.map(x => lb(RISKS[x[0]]) + '(' + x[1] + '/100)').join('、')}。暴露人口约 ${c.exposed} 万,年适应投资缺口 ¥${c.gap} 亿。\n\nAI 建议优先推进:${lb(ADAPT[top[0][0]].measures[0].title)} 与 ${lb(ADAPT[top[1][0]].measures[0].title)}。可在"城市韧性"页切换城市查看完整行动方案。`
          : `${lb(c.name)} (${lb(c.region)}) scores ${c.risk}/100 on climate risk with a resilience index of ${(c.resilience.reduce((a, b) => a + b, 0) / 6).toFixed(1)}/100.\n\nDominant risks: ${top.map(x => lb(RISKS[x[0]]) + ' (' + x[1] + '/100)').join(', ')}. Exposed population ≈${(c.exposed / 100).toFixed(1)}M, annual adaptation gap ¥${(c.gap / 10).toFixed(1)}B.\n\nAI priorities: ${lb(ADAPT[top[0][0]].measures[0].title)} and ${lb(ADAPT[top[1][0]].measures[0].title)}. Switch cities in the Urban Resilience tab for full action plans.`);
      }, src:{zh:['城市韧性 AI 模型','当前选中城市数据'],en:['City resilience model','selected city data']} },
    { re: /生态|森林|红树林|生物多样|碳汇|修复|eco|forest|mangrove|biodivers|sink|restor/i, fn: () => {
        return (LANG === 'zh'
          ? '生态保护是气候行动的另一半:\n\n• 全球森林 2000–2024 年净减少 12 Mha,但中国净增 51 Mha,贡献全球最大人工林增量;\n• 红树林较 1990 年减少约 21%,但其固碳效率是热带雨林的 3–5 倍(蓝碳);\n• 生物多样性指数较 1970 年下降 36%,逼近地球安全边界;\n• 修复红树林、泥炭地等生态系统的总碳汇潜力约 36.7 GtCO₂e,且具有防洪、渔业等多重协同效益。'
          : 'Ecosystems are the other half of climate action:\n\n• Global forests lost a net 12 Mha over 2000–2024, while China gained 51 Mha — the largest planted-forest contribution;\n• Mangroves fell ≈21% vs 1990, yet they sequester carbon 3–5× faster than rainforests (blue carbon);\n• The biodiversity index is down 36% since 1970, nearing planetary boundaries;\n• Restoring mangroves, peatlands and others offers ≈36.7 GtCO₂e of sink potential, plus flood-protection and fisheries co-benefits.');
      }, src:{zh:['FAO / 生态近似数据','IPCC AR6'],en:['FAO approx.','IPCC AR6']} },
    { re: /极端|灾害|损失|干旱|野火|extreme|disaster|drought|wildfire/i, fn: () => {
        return (LANG === 'zh'
          ? `2026 年全球极端天气事件约 520 起,较 1980 年(约 120 起)增长约 4.3 倍,年经济损失约 3,160 亿元(通胀调整后近似)。\n\nAI 预测 2050 年事件数将达 ${projectExtreme().vals[24]} 起/年,气候保险损失将增至约 $1.2 万亿。气候归因研究显示,极端高温与暴雨强度与温升直接相关——减排是降低长期灾害风险的根本手段,适应是当务之急。`
          : `≈520 extreme weather events hit globally in 2026 — 4.3× the 1980 level — with ≈$316B in losses (inflation-adjusted).\n\nAI projects ≈${projectExtreme().vals[24]} events/yr by 2050 and insured losses near $1.2T. Attribution science ties heat and rainfall intensity directly to warming — mitigation cuts long-term risk, adaptation is urgent now.`);
      }, src:{zh:['EM-DAT 近似数据','AI 预测模型'],en:['EM-DAT approx.','AI forecast model']} },
    { re: /你好|您好|hi|hello|hey/i, fn: () => t('chat.welcome'), src:{zh:[],en:[]} },
    { re: /你是谁|介绍|who are you|about you/i, fn: () => (LANG === 'zh'
        ? '我是 ClimateOS 气候智脑的 AI 助手,一款面向气候决策的演示型智能体。\n\n我的三个核心能力:① 数据联动分析——答案实时引用平台推演器与城市模型;② 情景推演——基于历史趋势拟合输出预测与置信区间;③ 行动建议——按风险画像生成适应与减排方案。\n\n本原型为 AI for Climate 高保真演示,数据为近似公开数据。'
        : 'I\'m the AI assistant of ClimateOS, a demonstrative agent for climate decisions.\n\nThree core abilities: ① data-linked analysis — answers quote the simulator and city model in real time; ② scenario projection — trend-fitted forecasts with confidence intervals; ③ action plans — adaptation and mitigation packages generated from risk profiles.\n\nThis is a high-fidelity AI-for-Climate prototype with approximate public data.'),
      src:{zh:[],en:[]} },
    { re: /谢谢|感谢|厉害|不错|thanks|thank you|great/i, fn: () => (LANG === 'zh'
        ? '不客气!气候行动需要每一个决策者——你可以继续问我,或到"能源转型"页体验政策推演器,看看不同政策组合如何改变 2060 年的排放曲线。🌍'
        : 'You\'re welcome! Climate action needs every decision-maker — keep asking, or try the policy simulator in the Energy tab to see how different mixes reshape the 2060 emission curve. 🌍'),
      src:{zh:[],en:[]} },
    { re: /帮我|建议|怎么办|怎么做|help|suggest|what should/i, fn: () => (LANG === 'zh'
        ? '给你三条行动路径:\n\n1️⃣ 打开"能源转型"页,先拖低碳价与投资滑块看排放曲线恶化,再拉高它们——直观理解政策杠杆;\n2️⃣ 在"城市韧性"页切换到你的城市,查看 AI 生成的适应行动方案(含成本收益与实施路径);\n3️⃣ 问我具体问题,例如"当前政策何时碳达峰?""红树林为什么重要?"。'
        : 'Three paths to action:\n\n1️⃣ In the Energy tab, first drag the carbon-price and investment sliders down to watch the curve worsen, then raise them — the policy levers become intuitive;\n2️⃣ Switch to your city in Urban Resilience for AI-generated adaptation plans (cost, benefit, pathways);\n3️⃣ Ask me specifics, e.g. "When will carbon peak under current policies?" or "Why do mangroves matter?".'),
      src:{zh:[],en:[]} }
  ];
  const answer = q => {
    for(const k of KB){ if(k.re.test(q)) return { text: k.fn(), src: k.src }; }
    return {
      text: LANG === 'zh'
        ? '这个问题我还在学习中。我可以回答:\n\n• 碳达峰/碳中和推演(实时联动当前政策滑块)\n• 温升情景与气候科学问题\n• 城市适应方案与生态保护数据\n\n你也可以点击下方快捷提问试试。'
        : 'I\'m still learning that one. I can answer:\n\n• carbon peak & neutrality projections (live-linked to the policy sliders)\n• warming scenarios and climate science\n• urban adaptation plans and ecosystem data\n\nTry one of the quick questions below.',
      src: { zh: [], en: [] }
    };
  };
  const send = q => {
    q = (q || '').trim();
    if(!q || $('#typing')) return;
    $('#chat-in').value = '';
    addMsg('user', q);
    addTyping();
    setTimeout(() => {
      const tp = $('#typing');
      if(tp) tp.remove();
      const a = answer(q);
      const bubble = addMsg('ai', '');
      const body = bubble.querySelector('.bubble-body');
      stream(body, a.text);
      if(a.src[LANG] && a.src[LANG].length){
        const foot = document.createElement('div');
        foot.className = 'bubble-src';
        a.src[LANG].forEach(s => {
          const c = document.createElement('span');
          c.textContent = s;
          foot.appendChild(c);
        });
        bubble.appendChild(foot);
      }
    }, 500 + Math.random() * 500);
  };
  $('#chat-send').addEventListener('click', () => send($('#chat-in').value));
  $('#chat-in').addEventListener('keydown', e => { if(e.key === 'Enter') send($('#chat-in').value); });
  addMsg('ai', t('chat.welcome'));
  const chips = [t('chat.q1'), t('chat.q2'), t('chat.q3')];
  $('#chat-chips').innerHTML = chips.map(c => `<button type="button">${c}</button>`).join('');
  $$('#chat-chips button').forEach(b => b.addEventListener('click', () => send(b.textContent)));
}
function readSimState(){
  const p = { carbon: simState.carbon, invest: simState.invest, elec: simState.elec, eff: simState.eff };
  const sl = $('#sl-carbon');
  if(sl) return { carbon: +sl.value, invest: +$('#sl-invest').value, elec: +$('#sl-elec').value, eff: +$('#sl-eff').value };
  return p;
}
function renderSnapshot(){
  const box = $('#chat-snapshot');
  if(!box) return;
  const r = simulateChina(readSimState());
  const c = curCity;
  const eVal = LANG === 'zh' ? fmtGt(r.e2060) + ' ' + t('en.unit.yi') : (Math.abs(r.e2060) < 0.05 ? '≈0' : r.e2060.toFixed(1)) + ' Gt';
  box.innerHTML = `
    <div class="snap-row"><span>${t('chat.snap.peak')}</span><b>${r.peakYear <= 2024 ? t('en.peak.done') : r.peakYear === 0 ? t('en.peak.none') : r.peakYear}</b></div>
    <div class="snap-row"><span>${t('chat.snap.e2060')}</span><b>${eVal}</b></div>
    <div class="snap-row"><span>${t('chat.snap.nonf')}</span><b>${r.nonFossil2060}%</b></div>
    <div class="snap-row"><span>${t('chat.snap.city')}</span><b>${lb(c.name)} · ${c.risk}/100</b></div>
    <p class="summary-note">${t('chat.snap.note')}</p>`;
}

/* ============================================================
   导航 / 启动 / 全局
   ============================================================ */
let curTab = 'overview';
function switchTab(id, instant){
  const sec = $('#tab-' + id);
  if(!sec) return;
  curTab = id;
  $$('.tab').forEach(s => s.classList.remove('active'));
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  sec.classList.add('active');
  if(!sec.dataset.seen){ sec.dataset.seen = '1'; runCounters(sec); }
  try { window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' }); } catch(e) { window.scrollTo(0, 0); }
}
function bindTabs(){
  $$('#tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('#fab').addEventListener('click', () => { switchTab('chat'); setTimeout(() => $('#chat-in').focus(), 350); });
}
function setStaticTexts(){
  const isub = $('#intro-sub'); if(isub) isub.textContent = t('intro.sub');
  const ihint = $('#intro-hint'); if(ihint) ihint.textContent = t('intro.hint');
  const tver = $('#top-ver'); if(tver) tver.textContent = t('top.ver');
  const tai = $('#top-ai'); if(tai) tai.innerHTML = `<i class="pulse" style="width:7px;height:7px;"></i>${t('top.ai')}`;
  const f1 = $('#footer-1'); if(f1) f1.textContent = t('footer.1');
  const f2 = $('#footer-2'); if(f2) f2.textContent = t('footer.2');
  const f3 = $('#footer-3'); if(f3) f3.textContent = t('footer.3');
  const fab = $('#fab'); if(fab) fab.title = t('fab');
  const lg = $('#lang-toggle'); if(lg) lg.textContent = LANG === 'zh' ? 'EN' : '中文';
}
function intro(){
  const box = $('#intro');
  const bar = $('#intro-bar');
  let p = 0;
  const iv = setInterval(() => {
    p += 2;
    bar.style.width = Math.min(100, p) + '%';
    if(p >= 100){
      clearInterval(iv);
      setTimeout(() => { box.classList.add('done'); setTimeout(() => box.remove(), 500); }, 250);
    }
  }, 26);
  box.addEventListener('click', () => { clearInterval(iv); box.remove(); });
}
function bindGlobal(){
  $('#lang-toggle').addEventListener('click', () => {
    LANG = LANG === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('ccos-lang', LANG); } catch(e) {}
    init();
  });
  /* 时钟 */
  const tickClock = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const tEl = $('#bs-time');
    if(tEl) tEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    const dEl = $('#bs-date');
    if(dEl) dEl.textContent = LANG === 'zh' ? `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日` : now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  tickClock();
  setInterval(tickClock, 1000);
  /* 播报轮播 */
  setInterval(() => {
    const ticks = $$('#bs-ticker .tick');
    if(!ticks.length) return;
    const cur = ticks.findIndex(x => x.classList.contains('hot'));
    ticks.forEach(x => x.classList.remove('hot'));
    const nx = (cur + 1) % ticks.length;
    ticks[nx].classList.add('hot');
    ticks[nx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 2600);
}

/* 单模块容错构建:一个模块出错不影响其他模块与导航 */
function safeBuild(name, fn){
  try { fn(); return true; }
  catch(e){
    console.error('[ClimateOS] 模块构建失败:', name, e);
    if(window.__fatal){
      window.__fatal('模块「' + name + '」加载失败:' + (e && e.message || e) +
        '\n若刚更新过原型,请按 Ctrl+F5 强制刷新以清除旧缓存;若持续出现,请将错误信息反馈给开发者。');
    }
    return false;
  }
}
function init(){
  try { setStaticTexts(); } catch(e) { console.error(e); }
  ['overview', 'map', 'city', 'energy', 'eco', 'chat'].forEach(id => {
    const s = $('#tab-' + id);
    if(!s) return;
    s.innerHTML = '';
    s.classList.remove('active');
    delete s.dataset.seen;
  });
  const ok = [];
  ok.push(safeBuild('全球态势 Overview', buildOverview));
  ok.push(safeBuild('全球大屏 Global Screen', buildMap));
  ok.push(safeBuild('城市韧性 Urban Resilience', buildCity));
  ok.push(safeBuild('能源转型 Energy Transition', buildEnergy));
  ok.push(safeBuild('生态保护 Ecosystems', buildEco));
  ok.push(safeBuild('AI 助手 AI Assistant', buildChat));
  /* 若默认标签页构建失败,自动跳到第一个可用标签页 */
  if(!$('#tab-' + curTab).classList.contains('active') || !$('#tab-' + curTab).innerHTML.trim()){
    const firstOk = ['overview', 'map', 'city', 'energy', 'eco', 'chat'][ok.indexOf(true)];
    if(firstOk) curTab = firstOk;
  }
  try { switchTab(curTab, true); } catch(e) { console.error(e); }
  window.__bootOK = true;
}
document.addEventListener('DOMContentLoaded', () => {
  bindTabs();   /* 导航优先绑定:即使某模块出错,导航也可用 */
  bindGlobal();
  intro();
  init();
});
