import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {CHARACTER_APPEARANCE_PARENT as parent} from './fast-hands-character-appearance-pins.mjs';

// Only the two archived V2 whole-model eye assertions use this fixture. Current
// eyes, trousers, joints and all gameplay tests continue to import runtime code.
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/three3d/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function historicalSource(name){
 const path=prefix+name,pin=parent.files[path];
 const bytes=readFileSync(new URL('docs/fast-hands/baselines/character-appearance/'+path,root));
 assert.equal(sha(bytes),pin.sha256,'Historical world fixture digest '+name);
 assert.equal(blob(bytes),pin.gitBlob,'Historical world fixture parent Git blob '+name);
 return bytes.toString('utf8');
}
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const timelineURL=new URL(prefix+'timeline.mjs',root),timeline=readFileSync(timelineURL);
assert.equal(sha(timeline),'b9d336ccdf85971483234aabb12ceeab6e369eeacf58ad5b9930a7f01c384d20','Historical timeline dependency digest');
assert.equal(blob(timeline),'18dd04914133e799f8195bfc5dcf6f011e179ef7','Historical timeline dependency Git blob');
let source=historicalSource('world.mjs');
for(const [from,to] of [["'./rig.mjs'",JSON.stringify(moduleURL(historicalSource('rig.mjs')))],["'./timeline.mjs'",JSON.stringify(timelineURL.href)]]){
 assert.equal(source.split(from).length-1,1,'Exact historical import '+from);
 source=source.replace(from,to);
}
export const {createDemoWorld:createHistoricalDemoWorld}=await import(moduleURL(source));
