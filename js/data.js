'use strict';
/* ============================================================
   ClimateOS · 气候智脑 — 内置数据集与 AI 推演模型(双语)
   数据为基于公开资料(IPCC AR6 / NASA GISS / NOAA / IRENA /
   国家能源局等)的近似与推演数据,仅供原型演示,不代表官方口径。
   2025 年为报告值近似,2026 年为全年预估值。
   ============================================================ */

/* ---- 确定性伪随机 ---- */
let _seed = 20261110;
function rand(){ _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }

function seriesBetween(y0, v0, y1, v1, jitter){
  const years = [], values = [];
  for(let y = y0; y <= y1; y++){
    const t = (y - y0) / Math.max(1, y1 - y0);
    const base = v0 + (v1 - v0) * t;
    years.push(y);
    values.push(+(base + (rand() - 0.5) * 2 * jitter).toFixed(3));
  }
  return { years, values };
}
function seriesThrough(anchors, jitter){
  const years = [], values = [];
  const pts = anchors.slice().sort((a, b) => a[0] - b[0]);
  let pa = pts[0];
  for(let k = 1; k < pts.length; k++){
    const pb = pts[k];
    if(pb[0] <= pa[0]) continue;
    const seg = seriesBetween(pa[0], pa[1], pb[0], pb[1], jitter);
    if(k > 1){ seg.years.shift(); seg.values.shift(); }
    years.push(...seg.years); values.push(...seg.values);
    pa = pb;
  }
  return { years, values };
}

const DATA = {
  /* 全球地表温度距平 °C(vs 1850–1900) */
  temperature: seriesThrough([
    [1850,-0.24],[1870,-0.16],[1890,-0.11],[1910,-0.36],[1930,-0.12],
    [1950,-0.03],[1970, 0.03],[1980, 0.26],[1990, 0.45],[2000, 0.44],
    [2010, 0.73],[2016, 1.02],[2020, 1.01],[2023, 1.28],[2024, 1.55],
    [2025, 1.60],[2026, 1.52]
  ], 0.07),

  /* 大气 CO₂ 浓度 ppm */
  co2: seriesThrough([
    [1958,315.3],[1970,325.7],[1980,338.7],[1990,354.4],
    [2000,369.5],[2010,389.9],[2020,414.2],[2024,424.6],[2025,427.6],[2026,430.2]
  ], 0.5),

  /* 全球海平面 mm(相对 1993) */
  sea: seriesThrough([
    [1993,0],[2000,25],[2010,54],[2020,91],[2024,110],[2025,114],[2026,118]
  ], 1.4),

  /* 全球极端天气事件次数 */
  extreme: seriesThrough([
    [1980,120],[1990,180],[2000,250],[2010,330],[2020,420],[2024,485],[2025,512],[2026,520]
  ], 9),

  /* 2026 年分灾种损失(十亿美元) */
  losses2026: [
    { label:{zh:'风暴',en:'Storm'}, value:105 },
    { label:{zh:'洪涝',en:'Flooding'}, value:82 },
    { label:{zh:'干旱',en:'Drought'}, value:46 },
    { label:{zh:'热浪',en:'Heatwave'}, value:38 },
    { label:{zh:'野火',en:'Wildfire'}, value:32 },
    { label:{zh:'寒潮',en:'Cold snap'}, value:13 }
  ],

  /* 中国一次能源结构 % */
  energyMix: {
    years: [2000, 2010, 2020, 2025, 2030, 2040, 2050, 2060],
    series: [
      { name:{zh:'煤炭',en:'Coal'},       values:[68.5, 69.2, 56.8, 54.5, 45.0, 35.0, 26.0, 10.0] },
      { name:{zh:'石油',en:'Oil'},         values:[22.0, 17.4, 18.9, 18.3, 17.5, 15.5, 13.0,  9.0] },
      { name:{zh:'天然气',en:'Natural gas'}, values:[ 2.2,  4.4,  8.4,  8.7, 10.5, 11.0, 10.5,  8.0] },
      { name:{zh:'水电核电',en:'Hydro & nuclear'}, values:[ 6.9,  7.5, 11.9, 11.9, 14.0, 15.0, 15.5, 16.0] },
      { name:{zh:'风光发电',en:'Wind & solar'},   values:[ 0.4,  1.5,  4.0,  6.6, 13.0, 23.5, 35.0, 57.0] }
    ]
  },

  /* 中国风光装机 GW */
  windSolar: seriesThrough([
    [2005,1.3],[2010,31],[2015,174],[2020,535],[2023,1050],[2024,1412],[2025,1700],[2026,2050]
  ], 4),

  /* 全球可再生能源装机 GW */
  globalRenew: seriesThrough([
    [2010,1227],[2015,1985],[2020,2799],[2024,4448],[2025,5000],[2026,5600]
  ], 12),

  /* ---- 城市韧性 ---- */
  cityDims: [
    {zh:'基础设施',en:'Infrastructure'},
    {zh:'水资源',en:'Water security'},
    {zh:'能源系统',en:'Energy system'},
    {zh:'生态屏障',en:'Ecological buffer'},
    {zh:'应急响应',en:'Emergency response'},
    {zh:'治理能力',en:'Governance'}
  ],
  cityAvg: [62, 63, 64, 58, 64, 62],
  cities: [
    { id:'shenzhen', name:{zh:'深圳',en:'Shenzhen'}, region:{zh:'中国 · 粤港澳大湾区',en:'China · GBA'}, pop:'1,779万',
      resilience:[82,76,88,71,85,83], risk:72, exposed:380, gap:120, seaRate:4.1,
      risks:{ heat:78, flood:74, sea:82, drought:45, storm:91 },
      summary:{zh:'深圳气候风险以风暴潮与海平面上升为主导,叠加城市热岛效应。韧性基础较好,但海岸防护标准与应急联动仍需提升。',
        en:'Shenzhen\'s risk profile is dominated by storm surge and sea-level rise, compounded by urban heat island effects. Resilience foundations are strong, yet coastal defense standards and emergency coordination need upgrading.'} },
    { id:'shanghai', name:{zh:'上海',en:'Shanghai'}, region:{zh:'中国 · 长三角',en:'China · Yangtze Delta'}, pop:'2,487万',
      resilience:[85,72,84,68,82,86], risk:78, exposed:890, gap:240, seaRate:4.6,
      risks:{ heat:81, flood:86, sea:88, drought:40, storm:79 },
      summary:{zh:'上海面临洪涝与海平面上升的双重压力,地面沉降加剧风险。作为金融中心,适应投资缺口大但资金动员能力强。',
        en:'Shanghai faces twin pressures from flooding and sea-level rise, with land subsidence amplifying risk. As a financial hub, its adaptation financing gap is large but its capital-mobilization capacity is strong.'} },
    { id:'guangzhou', name:{zh:'广州',en:'Guangzhou'}, region:{zh:'中国 · 珠三角',en:'China · Pearl River Delta'}, pop:'1,883万',
      resilience:[78,74,80,75,79,80], risk:75, exposed:460, gap:150, seaRate:4.0,
      risks:{ heat:83, flood:79, sea:74, drought:52, storm:84 },
      summary:{zh:'广州高温热浪与台风暴雨风险突出,老城区排水系统与建筑降温改造是适应重点。',
        en:'Guangzhou faces pronounced heatwave and typhoon-rain risks; upgrading old-town drainage and building cooling retrofits are adaptation priorities.'} },
    { id:'beijing', name:{zh:'北京',en:'Beijing'}, region:{zh:'中国 · 京津冀',en:'China · Jing-Jin-Ji'}, pop:'2,185万',
      resilience:[86,58,85,62,84,87], risk:66, exposed:520, gap:180, seaRate:0,
      risks:{ heat:88, flood:64, sea:5, drought:79, storm:25 },
      summary:{zh:'北京核心风险是极端高温与水资源短缺。南水北调缓解供水压力,但地下水位与用水效率仍需持续改善。',
        en:'Beijing\'s core risks are extreme heat and water scarcity. The South-to-North Water Diversion relieves supply pressure, but groundwater levels and water-use efficiency still need sustained improvement.'} },
    { id:'london', name:{zh:'伦敦',en:'London'}, region:{zh:'英国 · 泰晤士河',en:'UK · Thames'}, pop:'890万',
      resilience:[83,85,79,82,88,90], risk:49, exposed:180, gap:60, seaRate:2.8,
      risks:{ heat:55, flood:58, sea:48, drought:38, storm:44 },
      summary:{zh:'伦敦拥有全球领先的泰晤士河防洪体系,适应治理成熟。主要增量风险来自极端高温与地表洪水。',
        en:'London has a world-leading Thames flood defense system and mature adaptation governance. Incremental risks come mainly from extreme heat and surface-water flooding.'} },
    { id:'rotterdam', name:{zh:'鹿特丹',en:'Rotterdam'}, region:{zh:'荷兰 · 莱茵河口',en:'Netherlands · Rhine delta'}, pop:'65万',
      resilience:[88,80,77,70,90,92], risk:54, exposed:45, gap:25, seaRate:3.2,
      risks:{ heat:32, flood:62, sea:78, drought:35, storm:60 },
      summary:{zh:'鹿特丹是气候适应的全球标杆:Maeslant 防风暴闸与海绵城市实践领先,但海平面加速上升挑战现有工程标准。',
        en:'Rotterdam is a global benchmark for adaptation: the Maeslant storm surge barrier and sponge-city practices lead the world, though accelerating sea-level rise challenges existing engineering standards.'} },
    { id:'singapore', name:{zh:'新加坡',en:'Singapore'}, region:{zh:'东南亚 · 岛国',en:'Southeast Asia · island state'}, pop:'592万',
      resilience:[90,68,86,74,91,89], risk:58, exposed:120, gap:45, seaRate:3.5,
      risks:{ heat:70, flood:64, sea:72, drought:55, storm:38 },
      summary:{zh:'新加坡以"花园城市"与海岸防护见长,水资源高度循环利用。海平面上升与城市热岛是未来主风险。',
        en:'Singapore excels in "garden city" design and coastal protection, with highly circular water use. Sea-level rise and urban heat are its main future risks.'} },
    { id:'mumbai', name:{zh:'孟买',en:'Mumbai'}, region:{zh:'印度 · 西海岸',en:'India · west coast'}, pop:'2,165万',
      resilience:[52,61,55,48,58,55], risk:89, exposed:1250, gap:320, seaRate:3.9,
      risks:{ heat:84, flood:93, sea:76, drought:62, storm:88 },
      summary:{zh:'孟买暴露人口规模全球前列,季风洪涝与风暴潮频繁,非正规住区脆弱性极高,适应融资缺口巨大。',
        en:'Mumbai has one of the world\'s largest exposed populations, frequent monsoon flooding and storm surges, extremely vulnerable informal settlements, and a huge adaptation finance gap.'} },
    { id:'jakarta', name:{zh:'雅加达',en:'Jakarta'}, region:{zh:'印度尼西亚 · 爪哇岛',en:'Indonesia · Java'}, pop:'1,090万',
      resilience:[55,60,58,52,60,57], risk:91, exposed:780, gap:260, seaRate:5.2,
      risks:{ heat:68, flood:95, sea:92, drought:58, storm:42 },
      summary:{zh:'雅加达是全球下沉最快的超大城市,叠加海平面上升,"迁都"计划凸显适应成本之巨。',
        en:'Jakarta is the world\'s fastest-sinking megacity; combined with sea-level rise, its capital-relocation plan shows the scale of adaptation costs.'} }
  ],

  /* ---- 生态 ---- */
  forestChange: [
    { label:{zh:'中国',en:'China'}, value:51 },
    { label:{zh:'印度',en:'India'}, value:26 },
    { label:{zh:'欧盟',en:'EU'}, value:11 },
    { label:{zh:'加拿大',en:'Canada'}, value:-5 },
    { label:{zh:'俄罗斯',en:'Russia'}, value:-8 },
    { label:{zh:'印度尼西亚',en:'Indonesia'}, value:-15 },
    { label:{zh:'刚果盆地',en:'Congo Basin'}, value:-20 },
    { label:{zh:'巴西',en:'Brazil'}, value:-52 }
  ],
  mangrove: seriesThrough([
    [1990,1720],[2000,1580],[2010,1480],[2020,1390],[2024,1360],[2025,1345],[2026,1332]
  ], 4),
  biodiversity: seriesThrough([
    [1970,1.0],[1980,0.88],[1990,0.80],[2000,0.74],[2010,0.71],[2020,0.67],[2024,0.65],[2025,0.645],[2026,0.640]
  ], 0.01),
  restoration: [
    { label:{zh:'红树林',en:'Mangroves'}, value:8.5 },
    { label:{zh:'泥炭地',en:'Peatlands'}, value:7.2 },
    { label:{zh:'珊瑚礁',en:'Coral reefs'}, value:6.1 },
    { label:{zh:'海草床',en:'Seagrass'}, value:5.8 },
    { label:{zh:'盐沼',en:'Salt marshes'}, value:4.9 },
    { label:{zh:'内陆湿地',en:'Inland wetlands'}, value:4.2 }
  ],

  /* ---- 极端事件播报(演示用) ---- */
  ticker: [
    { icon:'🌀', loc:{zh:'菲律宾 · 吕宋岛',en:'Luzon, Philippines'}, type:{zh:'超强台风',en:'Super typhoon'}, lv:'critical', time:{zh:'11-08 03:40',en:'Nov 08 03:40'} },
    { icon:'🌊', loc:{zh:'孟加拉国 · 恒河三角洲',en:'Ganges Delta, Bangladesh'}, type:{zh:'风暴潮洪水',en:'Storm-surge flood'}, lv:'critical', time:{zh:'11-07 21:15',en:'Nov 07 21:15'} },
    { icon:'🔥', loc:{zh:'美国 · 加利福尼亚',en:'California, USA'}, type:{zh:'极端山火',en:'Extreme wildfire'}, lv:'serious', time:{zh:'11-07 12:02',en:'Nov 07 12:02'} },
    { icon:'🌡', loc:{zh:'澳大利亚 · 昆士兰',en:'Queensland, Australia'}, type:{zh:'破纪录热浪',en:'Record heatwave'}, lv:'serious', time:{zh:'11-06 18:30',en:'Nov 06 18:30'} },
    { icon:'💧', loc:{zh:'肯尼亚 · 图尔卡纳',en:'Turkana, Kenya'}, type:{zh:'严重干旱',en:'Severe drought'}, lv:'serious', time:{zh:'11-06 09:12',en:'Nov 06 09:12'} },
    { icon:'🌊', loc:{zh:'意大利 · 热那亚',en:'Genoa, Italy'}, type:{zh:'山洪暴发',en:'Flash flood'}, lv:'warning', time:{zh:'11-05 23:44',en:'Nov 05 23:44'} },
    { icon:'❄', loc:{zh:'美国 · 得克萨斯',en:'Texas, USA'}, type:{zh:'极端寒潮',en:'Extreme cold snap'}, lv:'warning', time:{zh:'11-05 14:20',en:'Nov 05 14:20'} },
    { icon:'🌀', loc:{zh:'越南 · 岘港',en:'Da Nang, Vietnam'}, type:{zh:'台风登陆',en:'Typhoon landfall'}, lv:'critical', time:{zh:'11-04 07:55',en:'Nov 04 07:55'} },
    { icon:'🔥', loc:{zh:'巴西 · 亚马逊州',en:'Amazonas, Brazil'}, type:{zh:'雨林火灾',en:'Rainforest fire'}, lv:'serious', time:{zh:'11-03 20:08',en:'Nov 03 20:08'} },
    { icon:'🌡', loc:{zh:'印度 · 新德里',en:'New Delhi, India'}, type:{zh:'极端高温',en:'Extreme heat'}, lv:'warning', time:{zh:'11-03 11:26',en:'Nov 03 11:26'} }
  ]
};

/* ============================================================
   AI 推演模型(纯函数)
   ============================================================ */
function linReg(xs, ys, fromIdx){
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
  for(let i = fromIdx; i < xs.length; i++){
    const x = xs[i], y = ys[i];
    sx += x; sy += y; sxx += x * x; sxy += x * y; n++;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/* ---- 全球温升多情景推演(2026–2050) ---- */
function tempScenarios(){
  const t = DATA.temperature;
  const fit = linReg(t.years, t.values, 120);
  const anchor = t.values[t.values.length - 1]; /* 2026: 1.52 */
  const defs = {
    paris:  { name:{zh:'巴黎路径(2050 ≈1.4°C)',en:'Paris path (2050 ≈1.4°C)'}, color:'#199e70', rate:-0.004 },
    balance:{ name:{zh:'平衡路径(2050 ≈1.7°C)',en:'Balanced path (2050 ≈1.7°C)'}, color:'#c98500', rate: 0.008 },
    current:{ name:{zh:'现行政策(2050 ≈2.5°C)',en:'Current policies (2050 ≈2.5°C)'}, color:'#d95926', rate: 0.040 },
    none:   { name:{zh:'高排放情景(2050 ≈3.0°C)',en:'High emissions (2050 ≈3.0°C)'}, color:'#e66767', rate: 0.062 }
  };
  const years = [], proj = {};
  for(let y = 2026; y <= 2050; y++) years.push(y);
  for(const k in defs){
    const sc = defs[k];
    const vals = [], lo = [], hi = [];
    years.forEach((y, i) => {
      const d = y - 2026;
      const v = anchor + sc.rate * d;
      const w = 0.05 + 0.012 * i;
      vals.push(+v.toFixed(2));
      lo.push(+(v - w).toFixed(2));
      hi.push(+(v + w).toFixed(2));
    });
    proj[k] = { vals, lo, hi };
  }
  return { years, defs, proj, fit, anchor };
}

/* ---- 1.5°C 警戒线突破推演 ---- */
function tempCrossing(){
  const t = DATA.temperature;
  const sc = tempScenarios();
  const full = [...t.values, ...sc.proj.current.vals];
  const fullYears = [...t.years, ...sc.years];
  let perm = 0; /* 5 年均值长期突破年份 */
  for(let i = 4; i < full.length; i++){
    const m = (full[i-4] + full[i-3] + full[i-2] + full[i-1] + full[i]) / 5;
    if(m >= 1.5){ perm = fullYears[i]; break; }
  }
  return {
    firstExceed: 2024,           /* 单年首次突破 */
    permanent: perm,             /* 5 年均值长期突破 */
    yearsLeft: Math.max(0, perm - 2026),
    curMean5: +((t.values.slice(-5).reduce((a, b) => a + b, 0)) / 5).toFixed(2)
  };
}

/* ---- 北极海冰 9 月最小面积(百万 km²) ---- */
function arcticIce(){
  const obs = seriesThrough([[1979,7.2],[1990,6.2],[2000,6.0],[2010,4.9],[2020,3.9],[2026,3.7]], 0.15);
  const years = [], vals = [], lo = [], hi = [];
  let v = 3.7;
  for(let y = 2027; y <= 2050; y++){
    const k = y - 2026;
    const g = Math.max(0.02, 0.055 - 0.0004 * k); /* 流失率递减 */
    v *= (1 - g);
    const w = 0.12 + 0.02 * k;
    years.push(y);
    vals.push(+v.toFixed(2));
    lo.push(+(v - w).toFixed(2));
    hi.push(+(v + w).toFixed(2));
  }
  return { obs, years, vals, lo, hi };
}

/* ---- 全球气候灾害保险损失(十亿美元) ---- */
function insuranceLoss(){
  const years = [], vals = [], lo = [], hi = [];
  let v = 380;
  for(let y = 2027; y <= 2050; y++){
    const k = y - 2026;
    v *= 1 + Math.max(0.02, 0.055 - 0.0004 * k);
    const w = 0.08 + 0.02 * k;
    years.push(y);
    vals.push(+v.toFixed(0));
    lo.push(+(v * (1 - w)).toFixed(0));
    hi.push(+(v * (1 + w)).toFixed(0));
  }
  return { years, vals, lo, hi };
}

/* ---- 2100 年海平面情景(m,相对 2000) ---- */
function seaLevel2100(){
  return [
    { k:'paris',   label:{zh:'巴黎路径',en:'Paris path'},   v:0.45 },
    { k:'balance', label:{zh:'平衡路径',en:'Balanced path'}, v:0.60 },
    { k:'current', label:{zh:'现行政策',en:'Current policies'}, v:0.85 },
    { k:'high',    label:{zh:'高排放',en:'High emissions'}, v:1.10 }
  ];
}

/* ---- 主要城市极端高温日数(天/年) ---- */
function heatDays(){
  return [
    { city:{zh:'孟买',en:'Mumbai'}, now:62, mid:95 },
    { city:{zh:'广州',en:'Guangzhou'}, now:45, mid:72 },
    { city:{zh:'北京',en:'Beijing'}, now:38, mid:65 },
    { city:{zh:'上海',en:'Shanghai'}, now:32, mid:58 },
    { city:{zh:'新加坡',en:'Singapore'}, now:55, mid:88 },
    { city:{zh:'伦敦',en:'London'}, now:8, mid:18 }
  ];
}

/* ---- 2°C 情景 2050 年作物减产风险 ---- */
function cropImpact(){
  return [
    { crop:{zh:'咖啡',en:'Coffee'}, v:-25 },
    { crop:{zh:'玉米',en:'Maize'}, v:-12 },
    { crop:{zh:'大豆',en:'Soybean'}, v:-10 },
    { crop:{zh:'小麦',en:'Wheat'}, v:-8 },
    { crop:{zh:'水稻',en:'Rice'}, v:-6 }
  ];
}

/* ---- 储能与绿氢 ---- */
function storageHydrogen(){
  const years = [], stor = [], h2 = [];
  let s = 380, h = 8;
  for(let y = 2027; y <= 2050; y++){
    const k = y - 2026;
    s *= 1 + Math.max(0.04, 0.10 - 0.0022 * k);
    h *= 1 + Math.max(0.06, 0.14 - 0.003 * k);
    years.push(y);
    stor.push(+s.toFixed(0));
    h2.push(+h.toFixed(1));
  }
  return { years, stor, h2 };
}

/* ---- 锚定最近年份为精确值(避免插值抖动影响展示) ---- */
(function snap(){
  const fix = (s, anchors) => anchors.forEach(([y, v]) => {
    const i = s.years.indexOf(y);
    if(i >= 0) s.values[i] = v;
  });
  fix(DATA.temperature, [[2024,1.55],[2025,1.60],[2026,1.52]]);
  fix(DATA.co2, [[2024,424.6],[2025,427.6],[2026,430.2]]);
  fix(DATA.sea, [[2024,110],[2025,114],[2026,118]]);
  fix(DATA.extreme, [[2024,485],[2025,512],[2026,520]]);
  fix(DATA.windSolar, [[2024,1412],[2025,1700],[2026,2050]]);
  fix(DATA.globalRenew, [[2024,4448],[2025,5000],[2026,5600]]);
  fix(DATA.mangrove, [[2024,1360],[2025,1345],[2026,1332]]);
  fix(DATA.biodiversity, [[2024,0.65],[2025,0.645],[2026,0.640]]);
})();

/* ---- 其他指标推演 ---- */
function projectCO2(){
  const d = DATA.co2;
  const fit = linReg(d.years, d.values, 32);
  const years = [], vals = [], lo = [], hi = [];
  const last = d.values[d.values.length - 1];
  for(let y = 2026; y <= 2050; y++){
    const k = y - 2026;
    const v = last + fit.slope * k;
    const w = 1.5 + 0.22 * k;
    years.push(y);
    vals.push(+v.toFixed(1)); lo.push(+(v - w).toFixed(1)); hi.push(+(v + w).toFixed(1));
  }
  return { years, vals, lo, hi };
}
function projectSea(){
  const years = [], vals = [], lo = [], hi = [];
  for(let y = 2026; y <= 2050; y++){
    const k = y - 2026;
    const v = 118 + 3.7 * k + 0.014 * k * k;
    const w = 2 + 0.12 * k;
    years.push(y);
    vals.push(+v.toFixed(1)); lo.push(+(v - w).toFixed(1)); hi.push(+(v + w).toFixed(1));
  }
  return { years, vals, lo, hi };
}
function projectExtreme(){
  const d = DATA.extreme;
  const fit = linReg(d.years, d.values, 0);
  const years = [], vals = [], lo = [], hi = [];
  const last = d.values[d.values.length - 1];
  for(let y = 2026; y <= 2050; y++){
    const k = y - 2026;
    const v = last + fit.slope * k - 0.04 * k * k;
    const w = 4 + 0.5 * k;
    years.push(y);
    vals.push(+v.toFixed(0)); lo.push(+(v - w).toFixed(0)); hi.push(+(v + w).toFixed(0));
  }
  return { years, vals, lo, hi };
}
function projectWindSolar(){
  const years = [], vals = [], lo = [], hi = [];
  let v = 2050;
  for(let y = 2026; y <= 2060; y++){
    const k = y - 2026;
    const g = Math.max(0.025, 0.075 - 0.0015 * k);
    v = v * (1 + g);
    const w = 0.06 + 0.002 * k;
    years.push(y);
    vals.push(+v.toFixed(0)); lo.push(+(v * (1 - w)).toFixed(0)); hi.push(+(v * (1 + w)).toFixed(0));
  }
  return { years, vals, lo, hi };
}
function projectGlobalRenew(){
  const years = [], vals = [], lo = [], hi = [];
  let v = 5600;
  for(let y = 2026; y <= 2040; y++){
    const k = y - 2026;
    const g = Math.max(0.06, 0.11 - 0.004 * k);
    v = v * (1 + g);
    const w = 0.05 + 0.003 * k;
    years.push(y);
    vals.push(+v.toFixed(0)); lo.push(+(v * (1 - w)).toFixed(0)); hi.push(+(v * (1 + w)).toFixed(0));
  }
  return { years, vals, lo, hi };
}

/* ---- 中国碳排放政策推演模型 ---- */
function simulateChina(p){
  const s = p.carbon/100 + p.invest/100 + p.elec/100 + p.eff/100;
  const A = 0.005 - (p.carbon/100*0.008 + p.invest/100*0.006 + p.elec/100*0.005 + p.eff/100*0.005);
  const B = 0.0002 * (1 + s);
  const C = 0.000028 * (1 + s * 0.7);
  const capture = t => t <= 2030 ? 0 :
    Math.min(1.0, (p.carbon/100*0.5 + p.invest/100*0.35) * Math.min(1, (t-2030)/20) * 1.2);
  const years = [], gross = [], net = [];
  let E = 11.5, peakYear = 2020, peakVal = 11.5, peaked = false;
  years.push(2020); gross.push(11.5); net.push(11.5);
  for(let t = 2021; t <= 2060; t++){
    const d = t - 2020;
    const rho = A - B * d - C * d * d;
    E *= (1 + rho);
    years.push(t);
    gross.push(+E.toFixed(3));
    net.push(+Math.max(-0.2, E - capture(t)).toFixed(3));
    if(!peaked){
      if(gross[gross.length-1] <= gross[gross.length-2]){ peakYear = t - 1; peakVal = gross[gross.length-2]; peaked = true; }
    }
  }
  if(!peaked) peakYear = 0;
  return {
    years, gross, net,
    peakYear, peakVal,
    e2060: net[net.length-1],
    g2060: gross[gross.length-1],
    nonFossil2060: +(100 * (1 - gross[gross.length-1] / 11.5)).toFixed(1),
    declineFromPeak: +((1 - net[net.length-1] / peakVal) * 100).toFixed(1)
  };
}
const POLICY_BASE = { carbon: 10, invest: 20, elec: 25, eff: 20 };
const POLICY_DEFAULT = { carbon: 80, invest: 60, elec: 55, eff: 50 };

/* ============================================================
   风险类型与应对措施库(工程 / 自然基 / 数字,双语,含实施路径)
   ============================================================ */
const RISKS = {
  heat:   { zh:'热浪', en:'Heatwave', icon:'🌡' },
  flood:  { zh:'洪涝', en:'Flooding', icon:'🌊' },
  sea:    { zh:'海平面上升', en:'Sea-level rise', icon:'🏖' },
  drought:{ zh:'干旱', en:'Drought', icon:'💧' },
  storm:  { zh:'风暴', en:'Storm', icon:'🌀' },
  generic:{ zh:'基础韧性建设', en:'Foundational resilience', icon:'🧭' }
};
const CATS = {
  eng: { zh:'工程措施', en:'Engineering' },
  eco: { zh:'自然基措施', en:'Nature-based' },
  dig: { zh:'数字 / AI 措施', en:'Digital / AI' }
};
const TIMES = {
  near: { zh:'近期 2026–2030', en:'Near-term 2026–2030' },
  mid:  { zh:'中期 2031–2040', en:'Mid-term 2031–2040' },
  far:  { zh:'长期 2041–2060', en:'Long-term 2041–2060' }
};
const ADAPT = {
  heat: { measures: [
    { cat:'eng', time:'near', cost:'¥85 亿', benefit:{zh:'热相关死亡 ↓32%',en:'Heat deaths −32%'},
      title:{zh:'城市冷源网络',en:'Urban cooling network'},
      desc:{zh:'社区冷源中心、高反照率路面与屋顶、立体绿化,优先覆盖老旧住区与城中村。',en:'Community cooling centers, high-albedo pavements and roofs, vertical greening — prioritizing old neighborhoods and urban villages.'},
      kpi:{zh:'冷源中心覆盖率 → 85%',en:'Cooling-center coverage → 85%'},
      fund:{zh:'绿色债券 + 财政专项',en:'Green bonds + fiscal special funds'},
      steps:{zh:['2026: 完成热脆弱地图与站点选址','2028: 建成 120 个社区冷源中心','2030: 冷源网络覆盖 85% 高风险人口'],
             en:['2026: heat-vulnerability mapping and site selection','2028: 120 community cooling centers built','2030: network covers 85% of at-risk population']} },
    { cat:'eco', time:'mid', cost:'¥35 亿', benefit:{zh:'热岛强度 ↓1.2°C',en:'Heat island −1.2°C'},
      title:{zh:'生态遮阳廊道',en:'Ecological shade corridors'},
      desc:{zh:'行道树网、城市通风廊道与湿地冷岛,利用自然过程降低街区温度。',en:'Street-tree networks, urban ventilation corridors and wetland cool islands that cool blocks through natural processes.'},
      kpi:{zh:'林荫覆盖率 → 45%',en:'Canopy coverage → 45%'},
      fund:{zh:'城市更新基金',en:'Urban renewal fund'},
      steps:{zh:['2027: 划定通风廊道保护线','2032: 新增遮阳廊道 400 km','2040: 林荫覆盖率提升至 45%'],
             en:['2027: ventilation corridors protected','2032: 400 km of new shade corridors','2040: canopy coverage at 45%']} },
    { cat:'dig', time:'near', cost:'¥12 亿', benefit:{zh:'预警提前量 +48 小时',en:'Lead time +48h'},
      title:{zh:'AI 热浪健康预警',en:'AI heat-health early warning'},
      desc:{zh:'融合气象、就诊与用电数据的 AI 预警,向高危人群(老人、户外劳动者)定向推送防护指引。',en:'AI warnings fusing weather, hospital-visit and power-load data, pushing targeted protection guidance to at-risk groups.'},
      kpi:{zh:'高危人群触达率 → 90%',en:'At-risk reach → 90%'},
      fund:{zh:'城市大脑专项',en:'City-brain special fund'},
      steps:{zh:['2026: 多源数据接入与模型训练','2027: 预警系统上线,分级响应预案','2029: 与 120/社区网格联动闭环'],
             en:['2026: multi-source data integration & training','2027: warning system live with tiered response','2029: closed loop with EMS & community grids']} }
  ]},
  flood: { measures: [
    { cat:'eng', time:'near', cost:'¥160 亿', benefit:{zh:'内涝损失 ↓45%',en:'Waterlogging loss −45%'},
      title:{zh:'海绵城市升级 + 深层排水隧道',en:'Sponge city upgrade + deep drainage tunnel'},
      desc:{zh:'透水铺装、雨水花园、调蓄池与深层隧道结合,应对 50–100 年一遇暴雨。',en:'Permeable paving, rain gardens, retention ponds and deep tunnels for 50–100-year storms.'},
      kpi:{zh:'50 年一遇暴雨应对能力',en:'50-year-storm resilience'},
      fund:{zh:'专项债 + 政策性金融',en:'Special bonds + policy finance'},
      steps:{zh:['2026: 内涝点普查与管网体检','2029: 完成重点片区海绵化改造','2033: 深层隧道一期投运'],
             en:['2026: flood-point survey & pipe inspection','2029: key districts spongified','2033: deep tunnel phase 1 online']} },
    { cat:'eco', time:'mid', cost:'¥28 亿', benefit:{zh:'洪水峰值削减 20%',en:'Peak flow −20%'},
      title:{zh:'河流湿地缓冲带',en:'Riverine wetland buffers'},
      desc:{zh:'恢复河漫滩与滨水湿地,以自然滞蓄削减洪水峰值,同时净化水质、提升生物多样性。',en:'Restore floodplains and riparian wetlands to buffer peak flows naturally while purifying water and boosting biodiversity.'},
      kpi:{zh:'河岸自然化率 → 60%',en:'Naturalized riverbanks → 60%'},
      fund:{zh:'水生态补偿机制',en:'Water eco-compensation'},
      steps:{zh:['2027: 完成流域水文评估','2031: 建成 8 处示范湿地','2040: 全流域缓冲带成网'],
             en:['2027: watershed hydrology assessment','2031: 8 demonstration wetlands','2040: basin-wide buffer network']} },
    { cat:'dig', time:'near', cost:'¥18 亿', benefit:{zh:'调度响应时间 ↓70%',en:'Dispatch time −70%'},
      title:{zh:'数字孪生排水调度',en:'Digital-twin drainage dispatch'},
      desc:{zh:'基于降雨临近预报与管网数字孪生,分钟级优化泵站与闸门调度,暴雨前预降水位。',en:'Nowcasting plus a pipe-network digital twin for minute-level pump/gate optimization and pre-storm drawdown.'},
      kpi:{zh:'预报准确率 → 92%',en:'Forecast accuracy → 92%'},
      fund:{zh:'城市大脑专项',en:'City-brain special fund'},
      steps:{zh:['2026: 管网与传感器数字建模','2027: 预报-调度联动上线','2028: 全市泵站纳入智能调度'],
             en:['2026: network & sensor digital model','2027: forecast-dispatch integration live','2028: all pumping stations smart-dispatched']} }
  ]},
  sea: { measures: [
    { cat:'eng', time:'mid', cost:'¥220 亿', benefit:{zh:'风暴潮风险 ↓60%',en:'Storm-surge risk −60%'},
      title:{zh:'海岸防护工程体系',en:'Coastal defense system'},
      desc:{zh:'按 2100 年海平面情景校核的防潮闸、海堤加高与可升降防洪墙,分级设防、留有余量。',en:'Storm-surge barriers, raised seawalls and deployable flood walls checked against 2100 sea-level scenarios, with defense-in-depth margins.'},
      kpi:{zh:'防护标准 → 200 年一遇',en:'Standard → 200-year event'},
      fund:{zh:'政府投资 + 蓝色债券',en:'Public investment + blue bonds'},
      steps:{zh:['2026: 情景校核与设防标准修订','2032: 重点岸段海堤加高完成','2045: 防潮闸体系全面投运'],
             en:['2026: scenario check & standard revision','2032: key seawalls raised','2045: barrier system fully operational']} },
    { cat:'eco', time:'near', cost:'¥45 亿', benefit:{zh:'岸线侵蚀 ↓50%',en:'Erosion −50%'},
      title:{zh:'红树林与盐沼生态缓冲带',en:'Mangrove & salt-marsh buffers'},
      desc:{zh:'恢复潮间带红树林与盐沼,以自然海岸线消浪固滩,兼具蓝碳固存与渔业增益。',en:'Restore intertidal mangroves and salt marshes — living shorelines that attenuate waves, sequester blue carbon and boost fisheries.'},
      kpi:{zh:'生态岸线占比 → 40%',en:'Living shorelines → 40%'},
      fund:{zh:'蓝碳交易 + 生态补偿',en:'Blue-carbon credits + compensation'},
      steps:{zh:['2026: 宜林滩涂普查','2028: 种植红树林 800 公顷','2035: 生态岸线成带成网'],
             en:['2026: suitable-mudflat survey','2028: 800 ha mangroves planted','2035: living-shoreline network formed']} },
    { cat:'dig', time:'near', cost:'¥9 亿', benefit:{zh:'预警提前 72 小时',en:'Lead time 72h'},
      title:{zh:'风暴潮 AI 集合预报',en:'AI storm-surge ensemble forecast'},
      desc:{zh:'大模型驱动的台风路径与增水集合预报,驱动分级撤离与闸门预启动预案。',en:'LLM-driven ensemble forecasts of typhoon tracks and surge height, driving tiered evacuation and pre-emptive barrier operation.'},
      kpi:{zh:'增水预报误差 ↓40%',en:'Surge error −40%'},
      fund:{zh:'气象+应急专项',en:'Meteorology & emergency fund'},
      steps:{zh:['2026: 历史风暴潮数据重分析','2027: 集合预报系统业务化','2028: 撤离-闸门联动预案数字化'],
             en:['2026: historical surge reanalysis','2027: ensemble system operational','2028: evacuation-barrier plans digitized']} }
  ]},
  drought: { measures: [
    { cat:'eng', time:'near', cost:'¥65 亿', benefit:{zh:'用水缺口 ↓38%',en:'Water gap −38%'},
      title:{zh:'再生水回用 + 应急水源',en:'Water reuse + emergency sources'},
      desc:{zh:'再生水回用率提升至 45%,建设备用水源地与区域调水网络,提升供水冗余。',en:'Raise reclaimed-water reuse to 45%, build backup sources and regional transfer networks for supply redundancy.'},
      kpi:{zh:'再生水回用率 → 45%',en:'Reuse rate → 45%'},
      fund:{zh:'水价改革 + 专项债',en:'Water tariff reform + bonds'},
      steps:{zh:['2026: 再生水厂扩建与管网铺设','2029: 重点工业大户切换再生水','2032: 应急水源体系建成'],
             en:['2026: reuse plants expanded','2029: key industries switch to reclaimed water','2032: emergency source system complete']} },
    { cat:'eco', time:'mid', cost:'¥20 亿', benefit:{zh:'水源涵养能力 +25%',en:'Watershed yield +25%'},
      title:{zh:'水源地生态涵养',en:'Headwater ecological conservation'},
      desc:{zh:'上游退耕还林还草、湿地恢复与水土保持,增强流域蓄水与净化能力。',en:'Upstream cropland-to-forest/grass conversion, wetland restoration and soil conservation to strengthen watershed storage and purification.'},
      kpi:{zh:'水源地林草覆盖率 → 70%',en:'Headwater green cover → 70%'},
      fund:{zh:'横向生态补偿',en:'Horizontal eco-compensation'},
      steps:{zh:['2027: 水源地生态红线划定','2033: 退耕还林还草 5 万公顷','2040: 流域蓄水能力明显提升'],
             en:['2027: red lines for headwaters','2033: 50,000 ha converted','2040: watershed storage visibly improved']} },
    { cat:'dig', time:'near', cost:'¥8 亿', benefit:{zh:'管网漏损 ↓25%',en:'Leakage −25%'},
      title:{zh:'AI 管网漏损检测与智能水表',en:'AI leak detection & smart metering'},
      desc:{zh:'声学+水力模型 AI 定位漏点,智能水表实时监测用水异常,降低非收益水。',en:'Acoustic-hydraulic AI pinpoints leaks; smart meters flag abnormal use in real time, cutting non-revenue water.'},
      kpi:{zh:'漏损率 → 8% 以下',en:'Leakage below 8%'},
      fund:{zh:'节水奖励基金',en:'Water-saving incentive fund'},
      steps:{zh:['2026: 全网智能水表覆盖','2027: AI 漏损平台上线','2029: 漏损率降至 8% 以下'],
             en:['2026: full smart-meter coverage','2027: AI leak platform live','2029: leakage below 8%']} }
  ]},
  storm: { measures: [
    { cat:'eng', time:'near', cost:'¥140 亿', benefit:{zh:'断电时长 ↓55%',en:'Outage hours −55%'},
      title:{zh:'弹性电网与微网应急电源',en:'Resilient grid & microgrid backup'},
      desc:{zh:'配电网地埋化改造、杆塔防风加固、社区微网与移动储能车,保障关键设施不断电。',en:'Undergrounding distribution lines, typhoon-proofing towers, community microgrids and mobile storage to keep critical facilities powered.'},
      kpi:{zh:'关键用户供电可靠率 → 99.99%',en:'Critical reliability → 99.99%'},
      fund:{zh:'电网投资 + 保险联动',en:'Grid investment + insurance'},
      steps:{zh:['2026: 关键线路地埋化改造启动','2028: 重点医院/基站配微网','2030: 防风加固覆盖高风险区域'],
             en:['2026: undergrounding key lines begins','2028: microgrids for hospitals & base stations','2030: windproofing covers high-risk zones']} },
    { cat:'eco', time:'mid', cost:'¥30 亿', benefit:{zh:'风暴潮波高削减 30%',en:'Wave height −30%'},
      title:{zh:'海岸防风林与湿地屏障',en:'Coastal shelterbelts & wetlands'},
      desc:{zh:'多层防风林带与滨海湿地,削减风暴风浪,保护腹地城镇与农田。',en:'Multi-layer shelterbelts and coastal wetlands that damp storm waves and shield inland towns and farmland.'},
      kpi:{zh:'防护林带闭合率 → 90%',en:'Belt closure → 90%'},
      fund:{zh:'林业碳汇 + 生态补偿',en:'Forest carbon credits + compensation'},
      steps:{zh:['2027: 断带缺口普查','2030: 补植防风林 3,000 公顷','2040: 林带-湿地复合屏障成型'],
             en:['2027: gap survey of belts','2030: 3,000 ha planted','2040: forest-wetland composite barrier formed']} },
    { cat:'dig', time:'near', cost:'¥10 亿', benefit:{zh:'预警提前 72 小时',en:'Lead time 72h'},
      title:{zh:'台风路径 AI 集合预报',en:'AI typhoon-track ensemble forecast'},
      desc:{zh:'AI 大模型台风路径与强度集合预报,支撑"五停"决策与物资预置。',en:'AI ensemble forecasts of typhoon track and intensity support work/school/transport shutdown decisions and pre-positioned relief supplies.'},
      kpi:{zh:'24h 路径误差 ↓30%',en:'24h track error −30%'},
      fund:{zh:'气象专项',en:'Meteorology fund'},
      steps:{zh:['2026: 区域台风大模型训练','2027: 集合预报业务化','2028: 与应急指挥系统直连'],
             en:['2026: regional typhoon model trained','2027: ensemble operational','2028: linked to emergency command system']} }
  ]},
  generic: { measures: [
    { cat:'dig', time:'near', cost:'¥50 亿', benefit:{zh:'适应投资效率 ↑30%',en:'Adaptation ROI +30%'},
      title:{zh:'城市气候数字孪生平台',en:'City climate digital twin'},
      desc:{zh:'整合气象、水文、基础设施与人口数据的数字孪生,支撑适应投资优先级排序与效果评估。',en:'A digital twin integrating weather, hydrology, infrastructure and population data to prioritize adaptation investment and evaluate outcomes.'},
      kpi:{zh:'投资决策支撑覆盖率 → 100%',en:'Decision support → 100%'},
      fund:{zh:'数字政府专项',en:'Digital-government fund'},
      steps:{zh:['2026: 多源数据底座建设','2028: 风险情景模拟上线','2030: 投资决策全面接入'],
             en:['2026: multi-source data foundation','2028: risk-scenario simulation live','2030: all investment decisions onboarded']} },
    { cat:'eng', time:'mid', cost:'¥40 亿', benefit:{zh:'应急能力 +50%',en:'Response capacity +50%'},
      title:{zh:'韧性物资储备与避难体系',en:'Resilience stockpiles & shelters'},
      desc:{zh:'分布式应急物资库、平急两用避难场所与生命线冗余,提升极端事件下的城市承载力。',en:'Distributed stockpiles, dual-use shelters and lifeline redundancy to raise city carrying capacity under extreme events.'},
      kpi:{zh:'避难场所 15 分钟可达',en:'Shelters within 15 min'},
      fund:{zh:'应急专项 + 社会资本',en:'Emergency fund + private capital'},
      steps:{zh:['2027: 避难场所体检达标','2032: 平急两用设施全覆盖','2040: 生命线冗余改造完成'],
             en:['2027: shelter audit & upgrades','2032: dual-use facilities citywide','2040: lifeline redundancy complete']} },
    { cat:'eco', time:'far', cost:'¥25 亿', benefit:{zh:'碳汇 +8 万吨/年',en:'Carbon sink +80kt/yr'},
      title:{zh:'城市生态网络织补',en:'Urban ecological network repair'},
      desc:{zh:'连接破碎绿地斑块的生态廊道,提升栖息地连通性与城市整体气候韧性。',en:'Ecological corridors stitching fragmented green patches, improving habitat connectivity and overall climate resilience.'},
      kpi:{zh:'绿地连通度 → 0.75',en:'Green connectivity → 0.75'},
      fund:{zh:'城市更新 + 生态补偿',en:'Urban renewal + compensation'},
      steps:{zh:['2030: 生态网络规划落地','2040: 建成 12 条生态廊道','2060: 城市生态网络成型'],
             en:['2030: ecological network plan adopted','2040: 12 corridors built','2060: urban ecological network formed']} }
  ]}
};
