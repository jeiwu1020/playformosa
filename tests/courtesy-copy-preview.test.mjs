import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {readBeforeAirBalance as readFileSync} from './helpers/vault-air-balance-provenance.mjs';
import {JSDOM} from 'jsdom';
import {harness} from './courtesy-contest/helpers/scene-harness.mjs';
import {countdownVisible,countdownWarningVisible} from '../public/games/courtesy-contest/rules.js';
import {catalog} from '../src/catalog.mjs';
import {resultText} from '../public/games/sprint-100m/share.mjs';
import * as p from './helpers/courtesy-copy-preview-provenance.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));

test('countdown warning covers displayed 22, 21 and 20, then both disappear at 19',()=>{
 const h=harness();
 for(const [remaining,visible,warning] of [[30,true,false],[22.001,true,false],[22,true,true],[21.001,true,true],[21,true,true],[20,true,true],[19.001,true,true],[19,false,false],[18.999,false,false],[1,false,false]]){
  h.now=(30-remaining)*1000;h.s.update(h.now,16);
  assert.equal(countdownVisible(remaining),visible,String(remaining));
  assert.equal(countdownWarningVisible(remaining),warning,String(remaining));
  assert.equal(h.node('.time').classList.contains('timer-hidden'),!visible);
  assert.equal(h.node('countdown-warning').textContent,warning?'倒數即將隱藏，請自己默數。':'');
 }
 for(const remaining of [NaN,Infinity,-1])assert.equal(countdownWarningVisible(remaining),false);
});
test('pause preserves warning timing, restart clears it, and departure clears it',()=>{
 const h=harness();h.tick(8000);assert.ok(h.node('countdown-warning').textContent);
 h.s.pauseRound();h.tick(5000);assert.ok(h.node('countdown-warning').textContent);
 h.s.resumeRound();h.tick(1000);assert.equal(h.s.remaining,21);assert.ok(h.node('countdown-warning').textContent);
 h.s.start();assert.equal(h.node('countdown-warning').textContent,'');
 h.tick(8000);assert.ok(h.node('countdown-warning').textContent);h.s.depart(false);
 assert.equal(h.node('countdown-warning').textContent,'');
});
test('entry and compact help explain countdown and retain music attribution',()=>{
 const doc=new JSDOM(read('public/games/courtesy-contest/index.html').toString('utf8')).window.document;
 assert.equal(doc.querySelectorAll('#countdown-warning').length,1);
 assert.equal(doc.querySelector('#countdown-warning').getAttribute('role'),'status');
 const help=doc.querySelector('#instructions .help-body');assert.equal(help.querySelectorAll('li').length,5);
 assert.match(help.textContent,/顯示完 20 秒就隱藏/);assert.match(help.textContent,/有效按下即確認成功/);
 assert.ok(help.querySelector('a[href*="creativecommons.org/licenses/by/4.0/"]'));
 assert.doesNotMatch(read('public/games/courtesy-contest/platform.mjs').toString(),/30→20/);
});
test('100m and 1500m use the distance alone throughout visible titles and share defaults',()=>{
 for(const [id,distance] of [['sprint-100m','100'],['run-1500m','1500']]){
  const game=catalog.games.find(g=>g.id===id);assert.equal(game.title,`四肢各有想法｜${distance}公尺`);
  const html=read(`public/games/${id}/index.html`).toString(),doc=new JSDOM(html).window.document;
  assert.match(doc.title,new RegExp(`${distance}\\s*公尺$`));
  assert.doesNotMatch(doc.querySelector('h1').textContent,/衝刺|戰術賽/);
 }
 assert.match(resultText({seconds:12.34,verdict:'完成'}),/^四肢各有想法｜100公尺\n/);
 for(const path of ['public/games/sprint-100m/share.mjs','public/games/shared/runner-platform.mjs','public/games/shared/leaderboard.mjs'])assert.doesNotMatch(read(path).toString(),/(?:100\s*公尺衝刺|1500\s*公尺戰術賽)/);
});
test('copy delta reconstructs the exact latest preview tree without repinning published manifests',()=>{
 assert.equal(p.verifyBase(p.baseline),true);const m=p.validate(p.manifest());
 const paths=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else paths.push(path);}}walk();
 assert.deepEqual(p.inventoryBeforeCopy(paths).sort(),p.baseline.files.map(f=>f.path).sort());
 for(const f of p.baseline.files)assert.equal(p.gitBlob(p.readBeforeCopy(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of [...m.files,...m.addedFiles])assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
 for(const f of m.files){assert.deepEqual(p.reverseCopy(f.path,read(f.path)),Buffer.from(f.beforeText));assert.throws(()=>p.reverseCopy(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));}
 for(const path of m.addedPaths)assert.throws(()=>p.inventoryBeforeCopy(paths.filter(x=>x!==path)));
 assert.throws(()=>p.inventoryBeforeCopy([...paths,paths[0]]));
 for(const mutate of [b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40),b=>b.baseTree='0'.repeat(40)]){const b=structuredClone(p.baseline);mutate(b);assert.throws(()=>p.verifyBase(b));}
 for(const mutate of [m=>m.files.pop(),m=>m.files[0].beforeText+='tamper',m=>m.addedPaths.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validate(bad));}
});
