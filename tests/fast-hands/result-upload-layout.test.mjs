import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
for(const [file,prefix,dialogId] of [['index.html','result','resultDialog'],['catch.html','summary','summary'],['duel.html','summary','summary']])test(`${file} result has four stable ordered actions and an inline consent-form host`,()=>{
 const dom=new JSDOM(readFileSync(new URL(file,root),'utf8'));try{const d=dom.window.document,dialog=d.getElementById(dialogId),actions=[...dialog.querySelectorAll('.finale-main-actions>button')];assert.deepEqual(actions.map(x=>x.dataset.finaleAction),['again','replay','upload','ranking']);
 const trigger=d.getElementById(prefix==='result'?'resultUploadDirect':'summaryUpload'),host=d.getElementById(prefix+'UploadHost'),hint=d.getElementById(prefix+'UploadHint');assert.ok(trigger);assert.equal(trigger.textContent,'上傳本次成績');assert.equal(trigger.getAttribute('aria-controls'),host.id);assert.equal(trigger.getAttribute('aria-describedby'),hint.id);assert.ok(host.hidden);assert.ok(dialog.contains(host));assert.ok(host.closest('.finale-scroll'));assert.ok(dialog.contains(hint));assert.equal(actions[3].textContent,'查看排行榜');assert.ok(dialog.querySelector('.finale-share'));assert.ok(dialog.querySelector('.finale-details'));assert.equal(dialog.querySelector('.finale-share').open,false);assert.equal(dialog.querySelector('.finale-details').open,false);
 }finally{dom.window.close();}
});
test('result CSS pins the four named controls to two columns and two rows',()=>{const css=readFileSync(new URL('finale.css',root),'utf8');for(const action of ['again','replay','upload','ranking'])assert.match(css,new RegExp('data-finale-action="'+action+'"'));assert.doesNotMatch(css,/\[data-finale-action="again"\][^{]*\{[^}]*grid-column:1\/-1/);assert.match(css,/finale-upload-host/);});
