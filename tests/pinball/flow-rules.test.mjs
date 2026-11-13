import test from 'node:test';
import assert from 'node:assert/strict';
import {RoundOptions} from '../../public/games/overtime-pinball/round-options.js';
import {PINBALL_RULESETS} from '../../public/games/overtime-pinball/ruleset.mjs';
for(const legacy of ['shadow-v2','flow-v3','flow-v4'])test('flow-v5 local records preserve '+legacy+' records and preferences',()=>{
 const oldKeys=['overtime-pinball-best-timed-60-'+legacy,'overtime-pinball-best-timed-180-'+legacy,'overtime-pinball-best-'+legacy];
 const data=new Map(oldKeys.map(k=>[k,'99999']));data.set('overtime-pinball-round-options-v1',JSON.stringify({limit:180,orientation:'portrait'}));
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};const options=new RoundOptions(storage);
 assert.equal(options.limit,180);assert.equal(options.orientation,'portrait');
 for(const [i,limit] of [60,180,0].entries()){assert.match(PINBALL_RULESETS[limit],/^office-overtime-flow-.*-v5$/);assert.match(options.key(limit),/flow-v5$/);assert.equal(options.best(limit),0);options.record(100+i,limit);assert.equal(options.best(limit),100+i);assert.equal(data.get(oldKeys[i]),'99999');}
});
