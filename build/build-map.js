'use strict';
/* ============================================================
   构建脚本:ne_50m_admin_0_countries.geojson(Natural Earth 50m)
   → js/map-data.js(嵌入式 SVG 路径 + 各国演示指标)
   用法: node build/build-map.js

   为何用 GeoJSON:world-atlas@2 的 TopoJSON 在 CDN 上的版本存在
   弧线索引错位缺陷(多国环引用他国弧线),GeoJSON 每国坐标独立,
   结构上不可能交叉引用。路径经 Douglas-Peucker 简化(tol=0.08°)
   以压缩体积;y 轴取负保证地图北在上。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const gj = JSON.parse(fs.readFileSync(path.join(__dirname, 'ne50m.geojson'), 'utf8'));

/* ---- 中文名 ---- */
const ZH = {
  'China':'中国','United States of America':'美国','India':'印度','Brazil':'巴西','Russia':'俄罗斯',
  'Canada':'加拿大','Australia':'澳大利亚','Japan':'日本','South Korea':'韩国','Germany':'德国',
  'France':'法国','United Kingdom':'英国','Italy':'意大利','Spain':'西班牙','Netherlands':'荷兰',
  'Poland':'波兰','Sweden':'瑞典','Norway':'挪威','Finland':'芬兰','Denmark':'丹麦','Portugal':'葡萄牙',
  'Greece':'希腊','Ireland':'爱尔兰','Ukraine':'乌克兰','Turkey':'土耳其','Saudi Arabia':'沙特阿拉伯',
  'Iran':'伊朗','Iraq':'伊拉克','Egypt':'埃及','South Africa':'南非','Nigeria':'尼日利亚','Ethiopia':'埃塞俄比亚',
  'Kenya':'肯尼亚','Tanzania':'坦桑尼亚','Dem. Rep. Congo':'刚果(金)','Madagascar':'马达加斯加',
  'Mozambique':'莫桑比克','Zimbabwe':'津巴布韦','Sudan':'苏丹','S. Sudan':'南苏丹','Algeria':'阿尔及利亚','Morocco':'摩洛哥',
  'Indonesia':'印度尼西亚','Philippines':'菲律宾','Vietnam':'越南','Thailand':'泰国','Myanmar':'缅甸',
  'Malaysia':'马来西亚','Bangladesh':'孟加拉国','Pakistan':'巴基斯坦','Kazakhstan':'哈萨克斯坦',
  'Mongolia':'蒙古','Uzbekistan':'乌兹别克斯坦','Mexico':'墨西哥','Argentina':'阿根廷','Chile':'智利',
  'Peru':'秘鲁','Colombia':'哥伦比亚','Venezuela':'委内瑞拉','New Zealand':'新西兰','Papua New Guinea':'巴布亚新几内亚',
  'Iceland':'冰岛','Greenland':'格陵兰','United Arab Emirates':'阿联酋','Haiti':'海地','Sri Lanka':'斯里兰卡',
  'Nepal':'尼泊尔','Afghanistan':'阿富汗','Cuba':'古巴','Bolivia':'玻利维亚','Ecuador':'厄瓜多尔',
  'Paraguay':'巴拉圭','Uruguay':'乌拉圭','Switzerland':'瑞士','Austria':'奥地利','Belgium':'比利时',
  'Czechia':'捷克','Hungary':'匈牙利','Romania':'罗马尼亚','Bulgaria':'保加利亚','Slovakia':'斯洛伐克',
  'Belarus':'白俄罗斯','Israel':'以色列','Jordan':'约旦','Syria':'叙利亚','Lebanon':'黎巴嫩',
  'Libya':'利比亚','Tunisia':'突尼斯','Mali':'马里','Niger':'尼日尔','Chad':'乍得','Somalia':'索马里',
  'Uganda':'乌干达','Cameroon':'喀麦隆','Ghana':'加纳','Côte d\'Ivoire':'科特迪瓦','Senegal':'塞内加尔',
  'Angola':'安哥拉','Zambia':'赞比亚','Malawi':'马拉维','Botswana':'博茨瓦纳','Namibia':'纳米比亚',
  'Laos':'老挝','Cambodia':'柬埔寨','Taiwan':'中国台湾','Costa Rica':'哥斯达黎加','Panama':'巴拿马',
  'Guatemala':'危地马拉','Honduras':'洪都拉斯','Nicaragua':'尼加拉瓜','El Salvador':'萨尔瓦多',
  'Dominican Rep.':'多米尼加','Jamaica':'牙买加','Trinidad and Tobago':'特立尼达和多巴哥',
  'Antarctica':'南极洲','Falkland Is.':'福克兰群岛','Somaliland':'索马里兰','W. Sahara':'西撒哈拉',
  'North Korea':'朝鲜','South Sudan':'南苏丹','Timor-Leste':'东帝汶','Bhutan':'不丹','Brunei':'文莱',
  'Solomon Is.':'所罗门群岛','Vanuatu':'瓦努阿图','Fiji':'斐济','New Caledonia':'新喀里多尼亚',
  'Puerto Rico':'波多黎各','Bosnia and Herz.':'波黑','Croatia':'克罗地亚','Serbia':'塞尔维亚',
  'Slovenia':'斯洛文尼亚','North Macedonia':'北马其顿','Albania':'阿尔巴尼亚','Montenegro':'黑山',
  'Kosovo':'科索沃','Georgia':'格鲁吉亚','Armenia':'亚美尼亚','Azerbaijan':'阿塞拜疆',
  'Kyrgyzstan':'吉尔吉斯斯坦','Tajikistan':'塔吉克斯坦','Turkmenistan':'土库曼斯坦',
  'Oman':'阿曼','Yemen':'也门','Qatar':'卡塔尔','Kuwait':'科威特','Bahrain':'巴林',
  'Eritrea':'厄立特里亚','Djibouti':'吉布提','Rwanda':'卢旺达','Burundi':'布隆迪',
  'Eq. Guinea':'赤道几内亚','Gabon':'加蓬','Congo':'刚果(布)','Central African Rep.':'中非',
  'Benin':'贝宁','Togo':'多哥','Burkina Faso':'布基纳法索','Guinea':'几内亚','Sierra Leone':'塞拉利昂',
  'Liberia':'利比里亚','Mauritania':'毛里塔尼亚','Gambia':'冈比亚','Guinea-Bissau':'几内亚比绍',
  'Estonia':'爱沙尼亚','Latvia':'拉脱维亚','Lithuania':'立陶宛','Moldova':'摩尔多瓦',
  'Cuba':'古巴','The Bahamas':'巴哈马','Belize':'伯利兹','Suriname':'苏里南','Guyana':'圭亚那',
  'eSwatini':'斯威士兰','Lesotho':'莱索托','Somaliland':'索马里兰','Cyprus':'塞浦路斯','Maldives':'马尔代夫'
};

/* ---- 演示指标(近似值) ---- */
const M = {
  temp: { name: 'temperature', zh: '温度距平(2026)', en: 'Temp. anomaly (2026)', unit: '°C',
    data: {
      'China':1.7,'United States of America':1.9,'India':1.5,'Brazil':1.8,'Russia':2.6,'Canada':2.7,
      'Australia':2.0,'Japan':1.6,'South Korea':1.6,'Germany':2.1,'France':2.2,'United Kingdom':1.8,
      'Italy':2.2,'Spain':2.3,'Netherlands':2.0,'Poland':2.2,'Sweden':2.4,'Norway':2.3,'Finland':2.5,
      'Denmark':2.0,'Ukraine':2.2,'Turkey':2.0,'Saudi Arabia':1.9,'Iran':2.0,'Iraq':2.1,'Egypt':1.7,
      'South Africa':1.8,'Nigeria':1.6,'Ethiopia':1.7,'Kenya':1.5,'Tanzania':1.4,'Dem. Rep. Congo':1.3,
      'Madagascar':1.4,'Sudan':1.9,'Algeria':1.9,'Morocco':1.8,'Indonesia':1.4,'Philippines':1.4,
      'Vietnam':1.5,'Thailand':1.6,'Myanmar':1.4,'Malaysia':1.3,'Bangladesh':1.4,'Pakistan':1.7,
      'Kazakhstan':2.2,'Mongolia':2.3,'Uzbekistan':2.0,'Mexico':1.9,'Argentina':1.7,'Chile':1.5,
      'Peru':1.6,'Colombia':1.6,'Venezuela':1.7,'New Zealand':1.2,'Papua New Guinea':1.1,
      'Iceland':2.0,'Greenland':3.0,'United Arab Emirates':2.0,'Haiti':1.3,'Bolivia':1.6,
      'Ecuador':1.4,'Paraguay':1.7,'Uruguay':1.5,'Switzerland':1.9,'Austria':2.0,'Belgium':2.0,
      'Czechia':2.1,'Hungary':2.1,'Romania':2.1,'Bulgaria':2.2,'Belarus':2.1,'Israel':1.9,
      'Jordan':2.0,'Syria':2.1,'Libya':2.1,'Tunisia':1.9,'Mali':2.0,'Niger':2.1,'Chad':2.1,
      'Somalia':1.7,'Uganda':1.5,'Cameroon':1.6,'Ghana':1.6,'Angola':1.7,'Zambia':1.6,
      'Laos':1.5,'Cambodia':1.5,'Taiwan':1.6,'Costa Rica':1.5,'Panama':1.5,'Guatemala':1.6,
      'Honduras':1.6,'Nicaragua':1.6,'Dominican Rep.':1.5,'Jamaica':1.4,'Cuba':1.5,'Nepal':1.6,
      'Afghanistan':2.0,'Sri Lanka':1.4
    } },
  risk: { name: 'climateRisk', zh: '气候风险指数(2026)', en: 'Climate risk index (2026)', unit: '',
    data: {
      'Haiti':89,'Philippines':88,'Madagascar':84,'Bangladesh':86,'Vietnam':82,'Myanmar':80,
      'India':78,'Pakistan':76,'Nigeria':76,'Sudan':79,'Ethiopia':75,'Thailand':75,'Indonesia':74,
      'Iraq':73,'Dem. Rep. Congo':72,'Kenya':71,'Japan':70,'China':66,'Mexico':68,'Mongolia':65,
      'Colombia':66,'Peru':67,'Saudi Arabia':67,'Iran':68,'Egypt':64,'Brazil':64,'Venezuela':63,
      'Turkey':63,'Malaysia':62,'United States of America':62,'Algeria':61,'Morocco':60,'Australia':60,
      'Argentina':58,'South Korea':57,'Kazakhstan':56,'Chile':55,'Netherlands':55,'Russia':54,
      'Spain':52,'Italy':50,'Canada':50,'France':47,'Poland':47,'United Kingdom':46,'Germany':45,
      'Norway':42,'Sweden':40,'South Africa':66,'Mozambique':81,'Zimbabwe':77,'Tanzania':68,
      'Uganda':70,'Somalia':83,'Nepal':71,'Afghanistan':74,'Sri Lanka':69,'Cuba':68,
      'Guatemala':70,'Honduras':72,'Nicaragua':70,'Dominican Rep.':67,'Papua New Guinea':73,
      'Uzbekistan':60,'Bolivia':65,'Ecuador':64,'Paraguay':62,'Angola':69,'Zambia':68,'Malawi':76,
      'Cameroon':70,'Ghana':66,'Mali':73,'Niger':75,'Chad':77,'Libya':58,'Tunisia':59,
      'Syria':71,'Jordan':61,'Israel':55,'Belarus':46,'Bulgaria':48,'Romania':47,'Hungary':44,
      'Czechia':43,'Austria':41,'Switzerland':40,'Belgium':42,'Denmark':38,'Finland':37,
      'Iceland':33,'Greenland':35,'New Zealand':44,'Ukraine':47,'Ireland':40,'Portugal':48,'Greece':50
    } },
  extreme: { name: 'extremeEvents', zh: '极端天气事件(2026 至今)', en: 'Extreme events (2026 YTD)', unit: '',
    data: {
      'United States of America':46,'China':38,'India':34,'Indonesia':20,'Philippines':22,'Vietnam':14,
      'Japan':16,'Bangladesh':12,'Pakistan':10,'Australia':11,'Brazil':15,'Mexico':13,'Nigeria':8,
      'Ethiopia':7,'Sudan':9,'Kenya':6,'South Africa':6,'Dem. Rep. Congo':7,'Mozambique':9,
      'Madagascar':8,'Germany':7,'France':6,'Italy':8,'Spain':7,'United Kingdom':5,'Turkey':6,
      'Russia':9,'Canada':8,'Argentina':6,'Colombia':8,'Peru':7,'Chile':4,'Iran':6,'Iraq':5,
      'Saudi Arabia':4,'Thailand':9,'Myanmar':8,'Kazakhstan':5,'Mongolia':6,'Ukraine':4,'Poland':4,
      'Netherlands':3,'Sweden':3,'Norway':2,'New Zealand':4,'Egypt':3,'Morocco':2,'Algeria':3,
      'Venezuela':5,'Haiti':6,'Nepal':5,'Afghanistan':6,'Sri Lanka':4,'Papua New Guinea':7,
      'Uzbekistan':4,'Bolivia':5,'Ecuador':6,'Angola':4,'Zambia':3,'Malawi':5,'Cameroon':4,
      'Ghana':3,'Mali':4,'Niger':5,'Chad':4,'Somalia':6,'Uganda':4,'Tanzania':4,'Zimbabwe':3,
      'Tunisia':2,'Syria':3,'Jordan':2,'Israel':2,'Cuba':4,'Guatemala':6,'Honduras':6,'Nicaragua':4,
      'Dominican Rep.':3,'Jamaica':2,'Malaysia':6,'Laos':4,'Cambodia':5,'Taiwan':3
    } },
  renew: { name: 'renewableGW', zh: '可再生能源装机(GW)', en: 'Renewable capacity (GW)', unit: ' GW',
    data: {
      'China':2200,'United States of America':520,'India':300,'Germany':200,'Brazil':250,'Japan':145,
      'South Korea':45,'United Kingdom':70,'France':75,'Italy':70,'Spain':90,'Netherlands':40,
      'Poland':35,'Sweden':25,'Norway':12,'Finland':10,'Denmark':15,'Portugal':20,'Greece':12,
      'Ireland':10,'Ukraine':12,'Turkey':30,'Saudi Arabia':8,'United Arab Emirates':10,'Iran':5,
      'Egypt':15,'South Africa':15,'Nigeria':3,'Ethiopia':3,'Kenya':4,'Morocco':8,'Algeria':2,
      'Indonesia':15,'Philippines':12,'Vietnam':60,'Thailand':20,'Myanmar':4,'Malaysia':10,
      'Bangladesh':3,'Pakistan':8,'Kazakhstan':12,'Mongolia':4,'Uzbekistan':3,'Mexico':25,
      'Argentina':10,'Chile':20,'Peru':6,'Colombia':8,'Venezuela':3,'New Zealand':8,
      'Australia':75,'Canada':40,'Russia':10,'Switzerland':8,'Austria':10,'Belgium':11,
      'Czechia':6,'Hungary':5,'Romania':9,'Bulgaria':5,'Belarus':2,'Israel':6,'Jordan':3,
      'Tunisia':2,'Libya':1,'Uganda':2,'Zambia':3,'Tanzania':2,'Angola':2,'Ghana':2,
      'Cameroon':1,'Nepal':2,'Sri Lanka':2,'Cuba':2,'Bolivia':2,'Uruguay':4,'Paraguay':2
    } }
};
const metricKeys = Object.keys(M);

/* ---- Douglas-Peucker 简化 ---- */
function distToSeg(p, a, b){
  const dx = b[0]-a[0], dy = b[1]-a[1];
  const len2 = dx*dx + dy*dy;
  if(len2 === 0) return Math.hypot(p[0]-a[0], p[1]-a[1]);
  let t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
}
function simplify(pts, tol){
  if(pts.length < 4) return pts;
  const tol2 = tol * tol;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length-1] = true;
  const stack = [[0, pts.length-1]];
  while(stack.length){
    const [a, b] = stack.pop();
    let maxD = 0, maxI = -1;
    for(let i = a+1; i < b; i++){
      const d = distToSeg(pts[i], pts[a], pts[b]);
      if(d > maxD){ maxD = d; maxI = i; }
    }
    if(maxD > tol2){ keep[maxI] = true; stack.push([a, maxI], [maxI, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
/* 环 → 路径段(lon→x, -lat→y) */
function ringToPath(ring){
  const s = simplify(ring, 0.08);
  let d = 'M';
  for(let i = 0; i < s.length; i++){
    d += (i ? 'L' : '') + (+s[i][0]).toFixed(2) + ' ' + (+(-s[i][1])).toFixed(2);
  }
  return d + 'Z';
}
function geomToPath(g){
  let d = '';
  if(g.type === 'Polygon'){ g.coordinates.forEach(r => { d += ringToPath(r); }); }
  else if(g.type === 'MultiPolygon'){ g.coordinates.forEach(poly => poly.forEach(r => { d += ringToPath(r); })); }
  return d;
}

const countries = [];
gj.features.forEach(f => {
  const name = f.properties.NAME;
  const rec = { name, d: geomToPath(f.geometry) };
  if(ZH[name]) rec.zh = ZH[name];
  metricKeys.forEach(k => {
    if(M[k].data[name] != null) (rec.data = rec.data || {})[k] = M[k].data[name];
  });
  countries.push(rec);
});
/* 大面积先绘制(在下层),小面积后绘制(便于点击) */
countries.sort((a, b) => b.d.length - a.d.length);

let totalPts = 0;
gj.features.forEach(f => { const c = f.geometry.coordinates; const flat = f.geometry.type === 'Polygon' ? c : c.flat(1); flat.forEach(r => { totalPts += r.length; }); });
const out = '/* 由 build/build-map.js 自动生成,数据源:Natural Earth 50m(公共领域),勿手改 */\n'
  + 'const MAP_DATA = ' + JSON.stringify({ countries, metrics: metricKeys.map(k => ({
      key: k, name: M[k].name, zh: M[k].zh, en: M[k].en, unit: M[k].unit
    })) })
  + ';\n';

fs.writeFileSync(path.join(__dirname, '..', 'js', 'map-data.js'), out);
console.log('OK: js/map-data.js', (out.length / 1024).toFixed(1) + ' KB,', countries.length, 'countries,',
  countries.filter(c => c.data).length, 'with data');
/* 指标匹配报告 */
const missing = {};
metricKeys.forEach(k => {
  const notFound = Object.keys(M[k].data).filter(n => !gj.features.some(f => f.properties.NAME === n));
  if(notFound.length) missing[k] = notFound;
});
if(Object.keys(missing).length){
  console.log('⚠ 未匹配到国家的指标项:', JSON.stringify(missing, null, 1));
} else {
  console.log('✓ 全部指标国家均匹配');
}
