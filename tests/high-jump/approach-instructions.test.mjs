import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const game=readFileSync(new URL('../../public/games/high-jump/game.mjs',import.meta.url),'utf8');
function entryOptions(){
 const statement=game.split('\n').find(line=>line.startsWith('const entry=createGameEntry('));
 assert.ok(statement,'the runtime entry must supply its visible instructions');
 let options;
 vm.runInNewContext(statement,{
  document:{},createGameEntry(value){options=value;return{open(){}};},
  helpVisit(){},start(){},interrupt(){},release(){},initialPresentationReady:true
 });
 return options;
}
test('high-jump entry teaches arm balance during the approach before takeoff and clearance',()=>{
 const operations=Array.from(entryOptions().operations);
 assert.deepEqual(operations,[
  '助跑：A／S 交替短按，搭配 J／K 擺動手臂、調整平衡。',
  '起跳：長按 A 或 S 蓄力，在綠區放開起跳。',
  '過桿：先按 J／K 帶頭肩過桿，髖部過桿後按 A／S 收腿。'
 ]);
});
test('updated approach explanation does not claim arms are mandatory or guarantee recovery',()=>{
 const operations=Array.from(entryOptions().operations).join('\n');
 assert.doesNotMatch(operations,/必須|一定|保證|只用.*必/);
 assert.match(operations,/搭配 J／K 擺動手臂、調整平衡/);
});
test('the runtime keeps the existing ground hint and flight order',()=>{
 assert.match(game,/A\/S 控制雙腳，長按 A 或 S 蓄力，放開起跳；J\/K 雙手平衡/);
 assert.match(game,/先按 J\/K 帶頭肩過桿；髖過桿後按 A\/S 收腿。/);
});

