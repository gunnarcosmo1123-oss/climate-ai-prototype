'use strict';
/* 测试脚本:node build/test-data.js */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8')
  + '\nmodule.exports = { DATA, tempScenarios, tempCrossing, arcticIce, insuranceLoss, storageHydrogen, projectWindSolar, simulateChina, ADAPT };';
const tmp = path.join(__dirname, '_data-test.js');
fs.writeFileSync(tmp, src);
const D = require(tmp);

console.log('TEMP 最后3年:', D.DATA.temperature.years.slice(-3).join(','), D.DATA.temperature.values.slice(-3).join(','));
console.log('CO2 2026:', D.DATA.co2.values.at(-1), '| 海平面 2026:', D.DATA.sea.values.at(-1));
const t = D.tempScenarios();
console.log('2050 温升:', Object.entries(t.defs).map(([k, d]) => d.name.zh.split('(')[0] + ':' + t.proj[k].vals[24] + '°C').join(' '));
const c = D.tempCrossing();
console.log('1.5°C: 首次突破', c.firstExceed, '| 5年均值长期突破', c.permanent, '| 剩余年数', c.yearsLeft, '| 当前5年均值', c.curMean5);
const a = D.arcticIce();
console.log('北极海冰 2030/2050:', a.vals[3], a.vals[23], '百万km²');
const i = D.insuranceLoss();
console.log('保险损失 2050:', i.vals[23], '十亿美元');
const sh = D.storageHydrogen();
console.log('储能 2050:', sh.stor[23], 'GW | 绿氢 2050:', sh.h2[23], 'Mt');
const w = D.projectWindSolar();
console.log('风光 2030/2050/2060:', w.vals[4], w.vals[24], w.vals[34], 'GW');
for(const [n, p] of [['无政策', {carbon:0,invest:0,elec:0,eff:0}], ['现行政策', {carbon:10,invest:20,elec:25,eff:20}], ['默认组合', {carbon:80,invest:60,elec:55,eff:50}]]){
  const r = D.simulateChina(p);
  console.log(n, '→ 达峰:', r.peakYear, '| 2060净排放:', r.e2060, '| 非化石:', r.nonFossil2060 + '%');
}
console.log('ADAPT:', Object.keys(D.ADAPT).join(','), '| 热浪措施数:', D.ADAPT.heat.measures.length);
console.log('城市双语:', D.DATA.cities[0].name, D.DATA.cities[0].region.zh);
fs.unlinkSync(tmp);
