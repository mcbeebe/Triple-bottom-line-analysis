import { scoreOptions, optionsFor, WEIGHT_PRESETS, breakEvenGasPrice } from '../src/engine';
import { DEFAULT_CRITERIA, DEFAULT_GLOBALS, DEFAULT_VEHICLES } from '../src/data';
const sc = { mode: 'hybrid' as const, aggregation: 'average' as const, scale: 'anchored' as const, pillarWeights: WEIGHT_PRESETS.balanced, criteria: DEFAULT_CRITERIA };
const ids = DEFAULT_VEHICLES.filter(v=>!v.owned).map(v=>v.id);
const opts = optionsFor(DEFAULT_VEHICLES, ids);
const lx = DEFAULT_VEHICLES[0];
for (const [label, g] of [['default', DEFAULT_GLOBALS], ['cc4a on', {...DEFAULT_GLOBALS, cc4a:true}]] as const) {
  console.log('==', label);
  const s = scoreOptions(g, DEFAULT_VEHICLES, opts, sc);
  for (const x of s.sort((a,b)=>a.rank-b.rank)) {
    const be = x.spec.financing==='none'?null:breakEvenGasPrice(g, x.vehicle, x.spec.financing, lx);
    const i = x.result.incentives;
    console.log(String(x.rank).padStart(2), x.spec.id.padEnd(14), 'ov', x.overall.toFixed(1).padStart(5), 'P', x.pillars.planet.toFixed(0).padStart(3),'H', x.pillars.people.toFixed(0).padStart(3),'$', x.pillars.profit.toFixed(0).padStart(3), '| NPV', String(Math.round(x.result.netCostNPV)).padStart(7), '| tCO2e', x.result.co2.total.toFixed(1).padStart(5), '| BE gas', be===null?'none':be.toFixed(2), '| inc zev', i.zevRebate, 'cc4a', i.cc4aGrant, 'ded', Math.round(i.loanDeduction));
  }
}
