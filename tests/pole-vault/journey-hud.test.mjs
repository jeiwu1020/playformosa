import test from 'node:test';import assert from 'node:assert/strict';import{JSDOM}from'jsdom';
import{skyJourney}from'../../public/games/pole-vault/sky-journey.mjs';
const api=await import('../../public/games/pole-vault/journey-hud.mjs').catch(()=>({}));
const j=h=>skyJourney({phase:'air',altitude:h});
test('named journey remains an independent readable noninteractive DOM status on phones',()=>{
 assert.equal(typeof api.createJourneyHud,'function');const dom=new JSDOM('<div id="scene"></div>'),host=dom.window.document.querySelector('div'),hud=api.createJourneyHud(host);
 hud.update(j(4e5),390,600);assert.equal(hud.element.hidden,false);assert.equal(hud.element.getAttribute('role'),'status');assert.equal(hud.element.style.pointerEvents,'none');assert.match(hud.element.textContent,/國際太空站/);assert.match(hud.element.textContent,/05/);assert.equal(hud.element.dataset.stage,'station');assert.ok(!hud.element.querySelector('canvas'));
 hud.update(j(1e9),390,600);assert.match(hud.element.textContent,/火星紅沙地/);assert.match(hud.element.textContent,/幻想/);hud.update(j(200),390,600);assert.equal(hud.element.hidden,true);assert.equal(dom.window.getComputedStyle(hud.element).display,'none');dom.window.close();
});
test('journey card fits portrait and short landscape without using the numeric HUD corners',()=>{
 assert.equal(typeof api.journeyCardLayout,'function');for(const[w,h]of[[320,440],[390,600],[600,480],[814,170],[1000,550]]){const r=api.journeyCardLayout(w,h);assert.ok(r.x>=0&&r.x+r.width<=w);assert.ok(r.y>=0&&r.y+r.height<=h);if(w<=640)assert.ok(r.y>=60);else assert.ok(r.x>100);}
});
test('captured and live journey labels use the same stage record',()=>{
 assert.equal(typeof api.paintJourneyCard,'function');const drawn=[],ctx=new Proxy({measureText:t=>({width:t.length*8}),fillText:t=>drawn.push(t)},{get:(o,k)=>o[k]??(()=>{})});api.paintJourneyCard(ctx,j(1e13),1000,550);assert.ok(drawn.some(t=>t.includes('珍奶星環')));assert.ok(drawn.some(t=>t.includes('幻想')));
});

test('live world names its displayed subject and restores that HUD after capturing another altitude',async()=>{
 const{sceneHost}=await import('./helpers/scene-harness.mjs'),{createWorld}=await import('../../public/games/pole-vault/render.mjs'),{fresh}=await import('../../public/games/pole-vault/physics.mjs');const env=sceneHost(390,600);
 const state=h=>Object.assign(fresh(),{phase:'air',x:18.5,y:h+1,altitude:h,maxHeight:h,barHeight:h,airTime:80,t:80,vy:30,rising:true});
 try{const world=createWorld(env.host);world.render(state(4e5));const hud=env.host.children.find(c=>c.className==='vault-journey-card');assert.ok(hud,'world must mount the independent card');assert.equal(hud.dataset.stage,'station');const before={stage:hud.dataset.stage,style:{...hud.style}};world.capture(state(1e13));assert.equal(hud.dataset.stage,before.stage);assert.deepEqual(hud.style,before.style);}finally{env.restore();}
});

const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
test('named card clears the actual athlete and wrapped numeric HUD on short scenes',async()=>{
 const{sceneHost}=await import('./helpers/scene-harness.mjs'),{createWorld}=await import('../../public/games/pole-vault/render.mjs'),{fresh}=await import('../../public/games/pole-vault/physics.mjs'),THREE=await import('../../public/games/pole-vault/vendor/three.module.min.js');
 for(const[width,height]of[[320,280],[320,440],[390,600],[600,170],[632,480],[814,170]]){
  const env=sceneHost(width,height),chrome=[{x:10,y:12,width:width<=640?154:160,height:108},{x:width-136,y:12,width:126,height:60},{x:10,y:height-52,width:width-20,height:42}];
  env.host.parentElement={querySelectorAll:()=>chrome.map(r=>({getBoundingClientRect:()=>({left:r.x,top:r.y,width:r.width,height:r.height})}))};
  env.host.getBoundingClientRect=()=>({left:0,top:0,width,height});
  try{const world=createWorld(env.host);for(const[altitude,extra]of[[45000,{}],[4e5,{}],[1e8,{}],[1e13,{}],[4e5,{lean:1.2}],[4e5,{phase:'finish',finishAltitude:4e5,finishX:18.5,finishAttempted:true,finishHipHeight:1.5,finishArc:.5,finishTime:.8}]]){
   world.render(Object.assign(fresh(),{phase:'air',x:18.5,y:altitude+1,altitude,maxHeight:altitude,barHeight:altitude,airTime:80,t:80,vy:30,rising:true},extra));
   const hud=env.host.children.find(c=>c.className==='vault-journey-card'),r={x:parseFloat(hud.style.left),y:parseFloat(hud.style.top),width:parseFloat(hud.style.width),height:parseFloat(hud.style.height)};
   assert.notEqual(hud.dataset.placement,'slot',`${width}×${height} has enough safe scene space`);
   const points=[];world.character.group.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(world.camera);points.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2});}});
   const hero={x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y))};hero.width=Math.max(...points.map(p=>p.x))-hero.x;hero.height=Math.max(...points.map(p=>p.y))-hero.y;
   assert.ok(!overlaps(r,hero),`${width}×${height} at ${altitude}: stage card must not cover athlete`);
   for(const box of chrome)assert.ok(!overlaps(r,box),`${width}×${height} at ${altitude}: stage card must not cover wrapped height, energy or bottom cue`);
  }}finally{env.restore();}
 }
});
test('a scene with no safe rectangle requests a separate layout slot',()=>{
 const r=api.journeyCardLayout(320,140,{avoid:[{x:0,y:0,width:320,height:140}]});assert.equal(r.slot,true);
});
test('crowded-scene slot stays after the controls frame and restores without moving controls',()=>{
 const dom=new JSDOM('<main><div class="pf-controls-frame"><section><div id="scene"></div><div class="hud"><div class="timer">45,000</div></div></section><button>A</button></div></main>'),host=dom.window.document.querySelector('#scene'),frame=host.closest('.pf-controls-frame'),button=frame.querySelector('button'),timer=frame.querySelector('.timer');
 host.getBoundingClientRect=()=>({left:0,top:0,width:320,height:140});timer.getBoundingClientRect=()=>({left:0,top:0,width:320,height:140});const hud=api.createJourneyHud(host);
 hud.update(j(4e5),320,140);assert.equal(hud.element.dataset.placement,'slot');assert.equal(frame.nextElementSibling,hud.element);assert.equal(button.parentElement,frame);assert.equal(button.getAttribute('style'),null);
 timer.getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});hud.update(j(4e5),390,600);assert.equal(hud.element.parentElement,host);assert.equal(frame.nextElementSibling,null);
 hud.update(j(4e5),320,140,{athlete:{x:0,y:0,width:320,height:140}});assert.equal(frame.nextElementSibling,hud.element);hud.update(j(0),320,140);assert.equal(hud.element.hidden,true);assert.equal(hud.element.parentElement,host);assert.equal(frame.nextElementSibling,null);dom.window.close();
});
test('HUD measurements cache numeric wrapping shape and captures do not touch the live card',()=>{
 const dom=new JSDOM('<section><div id="scene"></div><div class="hud"><div class="timer">45000.00 m</div></div></section>'),host=dom.window.document.querySelector('#scene'),timer=dom.window.document.querySelector('.timer');let reads=0;
 host.getBoundingClientRect=()=>({left:0,top:0,width:320,height:440});timer.getBoundingClientRect=()=>{reads++;return{left:10,top:12,width:154,height:108};};const hud=api.createJourneyHud(host);
 hud.update(j(45000),320,440,{phase:'air'});const before=hud.element.outerHTML;timer.textContent='45001.00 m';hud.update(j(45001),320,440,{phase:'air'});assert.equal(reads,1);assert.equal(hud.element.outerHTML,before);
 hud.update(j(1e13),1000,550,{capture:true});assert.equal(reads,1);assert.equal(hud.element.outerHTML,before);
 timer.textContent='1,000,000 km';hud.update(j(45002),320,440,{phase:'air'});assert.equal(reads,2);dom.window.close();
});
