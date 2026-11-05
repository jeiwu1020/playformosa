import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createState,step} from '../../public/games/javelin/physics.mjs';
import {resultAdvice} from '../../public/games/javelin/presentation.mjs';

const app=fs.readFileSync(new URL('../../public/games/javelin/app.mjs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../../public/games/javelin/index.html',import.meta.url),'utf8');
const joke='標槍先下班，你的腳還要記得煞車。';
const launch={speed:30,angle:.72,draw:1.2,braceDelay:.27,stability:.9,runSpeed:8,balanceHits:8};
// Controlled completed throws pass through real scoring and the production result
// template. Audio, sharing and persistence are unrelated external boundaries.
function result(distance,overrides={}){
 const state={...createState(),phase:'flight',launch:{...launch},projectile:{landed:true},distance,...overrides};
 step(state,1/120);
 const dom=new JSDOM(html),d=dom.window.document,modal=d.getElementById('modal');
 const context={state,record(){},presentation:{photo:null},open(text){d.getElementById('modalBody').innerHTML=text;modal.open=true;},modal,$:id=>d.getElementById(id),fresh(){},close(){},startReplay(){},share:{bind(){}},syncPauseButton(){},resultAdvice,audio:{unlock(){}},resultShown:true};
 vm.createContext(context);vm.runInContext(app.slice(app.indexOf('function bindResultRetry(){'),app.indexOf("$('viewResult').onclick"))+';showResult();',context);
 return{dom,d,state};
}
for(const [distance,grade] of [[20,'C'],[49.99,'C'],[50,'B'],[69.99,'B'],[70,'A'],[89.99,'A'],[90,'S'],[98.48,'S'],[101.25,'S']]){
 test(`valid ${distance}m ${grade} result keeps its original humor alongside one short tip`,()=>{
  const {dom,d,state}=result(distance);
  try{
   assert.equal(state.grade,grade);assert.equal(d.getElementById('resultTitle').textContent,grade+' 級投擲');
   const copy=d.querySelector('.result-summary').textContent;
   assert.equal(copy.split(joke).length-1,1,'original humor appears once for every valid grade');
   assert.equal(d.querySelectorAll('.result-tip').length,1);assert.equal(d.querySelector('.result-tip').textContent,'保持節奏，再挑戰更遠的一投！');
   assert.equal(d.querySelectorAll('.pf-result-details,.feedback,.box').length,0);
   assert.equal(d.activeElement.id,'again');assert.equal(d.getElementById('resultTitle').hasAttribute('tabindex'),false);
  }finally{dom.window.close();}
 });
}
for(const [name,changes,tip] of [
 ['low balance',{stability:.5},'A／S 落腳後點 J，穩住身體。'],
 ['short draw',{draw:.6},'提早按住 K，充分引槍。'],
 ['no brace',{braceDelay:null},'接近起擲線前按住 A 支撐，再放開 K。'],
 ['early release',{braceDelay:.1},'按住 A 後稍等一拍，再放開 K。'],
 ['late release',{braceDelay:.6},'支撐後早一點放開 K，別讓槍尖抬得太高。']
])test(`${name} retains humor without replacing its actionable advice`,()=>{
 const {dom,d}=result(60,{launch:{...launch,...changes}});
 try{assert.ok(d.querySelector('.result-summary').textContent.includes(joke));assert.equal(d.querySelector('.result-tip').textContent,tip);}finally{dom.window.close();}
});
for(const [reason,noThrow] of [['越線：接地鞋底踩到起擲線或線外，這一投不計成績。',false],['標槍落在扇形有效區之外。',false],['未在時限內完成出手。',true]]){
 test(`foul keeps the actual reason instead of a valid-throw joke: ${reason}`,()=>{
  const {dom,d}=result(60,{foul:true,reason,...(noThrow?{launch:null}:{})});
  try{assert.equal(d.getElementById('resultTitle').textContent,'這一投，不算數');assert.equal(d.querySelector('.bigtime').textContent,'FOUL');const copy=d.querySelector('.result-summary').textContent;assert.ok(copy.includes(reason));assert.ok(!copy.includes(joke));assert.equal(d.querySelectorAll('.result-tip').length,1);assert.equal(d.activeElement.id,'again');}finally{dom.window.close();}
 });
}
