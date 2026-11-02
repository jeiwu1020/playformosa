import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as layout from '../../public/games/long-jump/layout.mjs';
test('all-device viewport layout fits scaled desktop, full desktop, safe landscape and portrait',()=>{assert.equal(typeof layout.gameLayout,'function');for(const [width,height,insets]of [[852,393,{}],[844,390,{}],[1280,640,{}],[1280,600,{}],[1920,1080,{}],[667,320,{left:44,right:44,bottom:21}],[390,844,{}],[1024,768,{}]]){const l=layout.gameLayout({width,height,insets});assert.ok(l.arenaHeight>180);assert.ok(l.arenaWidth>=300);assert.ok(l.buttonHeight>=56);assert.ok(l.usedHeight<=height+.01);assert.ok(l.usedWidth<=width+.01);assert.equal(l.mode,width>=640&&width>height?'side':'bottom');}});
test('root dialog is not contained in arena and tips/statistic panels are absent',()=>{const html=fs.readFileSync(new URL('../../public/games/long-jump/index.html',import.meta.url),'utf8');assert.ok(html.indexOf('id="overlay"')>html.indexOf('</main>'));assert.ok(html.includes('<dialog'));assert.equal((html.match(/data-limb=/g)||[]).length,4);assert.deepEqual([...html.matchAll(/<details\b([^>]*)>/g)].map(m=>m[1].match(/class="([^"]+)"/)?.[1]).sort(),['entry-help','music-credits']);assert.match(html,/<details class="entry-help"><summary>空中與落地怎麼配合？<\/summary>/);assert.ok(html.includes('<details class="music-credits">'));assert.ok(!html.includes('id="cue"'));assert.ok(html.includes('id="share-result"'));assert.ok(html.includes('id="save-result"'));});
test('layout css budgets viewport globally and root dialog against viewport not arena',()=>{const css=fs.readFileSync(new URL('../../public/games/long-jump/style.css',import.meta.url),'utf8');assert.ok(css.includes('--visible-height'));assert.ok(css.includes('body{'));assert.ok(css.includes('minmax(0,1fr)'));assert.ok(css.includes('dialog::backdrop'));assert.ok(!css.includes('51vh'));});
test('viewport adapter measures URL-bar resize on desktop too and does not collapse during pinch',()=>{const values=new Map(),attrs=new Map(),events=new Map(),vevents=new Map(),queue=[];const probe={style:{},setAttribute(){},remove(){}};const doc={documentElement:{setAttribute:(k,v)=>attrs.set(k,v),style:{setProperty:(k,v)=>values.set(k,v)}},createElement:()=>probe,body:{appendChild(){}}};const win={innerWidth:1280,innerHeight:600,visualViewport:{width:1280,height:600,scale:1,offsetTop:0,offsetLeft:0,addEventListener:(k,v)=>vevents.set(k,v),removeEventListener:k=>vevents.delete(k)},getComputedStyle:()=>({paddingTop:'0',paddingRight:'0',paddingBottom:'0',paddingLeft:'0'}),addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k),requestAnimationFrame:f=>queue.push(f)};const dispose=layout.installViewportLayout(win,doc);assert.equal(attrs.get('data-layout'),'side');assert.equal(values.get('--visible-height'),'600px');win.visualViewport.height=520;vevents.get('resize')();vevents.get('scroll')();assert.equal(queue.length,1);queue.shift()();assert.equal(values.get('--visible-height'),'520px');Object.assign(win.visualViewport,{scale:2,width:640,height:260});vevents.get('resize')();queue.shift()();assert.equal(values.get('--visible-height'),'600px');events.get('resize')();dispose();queue.shift()();assert.equal(events.size,0);assert.equal(vevents.size,0);});

test('portrait landscape portrait viewport events restore bounds and offsets without duplicate queued updates',()=>{const values=new Map(),attrs=new Map(),events=new Map(),vevents=new Map(),queue=[];const probe={style:{},setAttribute(){},remove(){}};const doc={documentElement:{setAttribute:(k,v)=>attrs.set(k,v),style:{setProperty:(k,v)=>values.set(k,v)}},createElement:()=>probe,body:{appendChild(){}}};const win={innerWidth:390,innerHeight:844,visualViewport:{width:390,height:844,scale:1,offsetTop:0,offsetLeft:0,addEventListener:(k,v)=>vevents.set(k,v),removeEventListener(){}},getComputedStyle:()=>({}),addEventListener:(k,v)=>events.set(k,v),removeEventListener(){},requestAnimationFrame:f=>queue.push(f)};const dispose=layout.installViewportLayout(win,doc);for(const [width,height,top,mode]of [[844,390,8,'side'],[390,844,0,'bottom']]){Object.assign(win.visualViewport,{width,height,offsetTop:top});events.get('orientationchange')();vevents.get('resize')();assert.equal(queue.length,1);queue.shift()();assert.equal(attrs.get('data-layout'),mode);assert.equal(values.get('--visible-height'),height+'px');assert.equal(values.get('--visible-width'),width+'px');assert.equal(values.get('--visible-top'),top+'px');}dispose();});
test('modal is explicitly positioned in visual viewport for rotated touch hit targets',()=>{const css=fs.readFileSync(new URL('../../public/games/long-jump/style.css',import.meta.url),'utf8');assert.ok(css.includes('.card,.card.fallback[open]{position:fixed;inset:auto;'));assert.ok(css.includes('left:calc(var(--visible-left,0px) + var(--visible-width,100vw)/2)'));assert.ok(css.includes('top:calc(var(--visible-top,0px) + var(--visible-height,100dvh)/2)'));});

test('phone portrait control bottom aligns with previous control top at 375, 390 and 430 widths',()=>{
 for(const [width,height,insets] of [[375,667,{}],[375,812,{top:44,bottom:34}],[390,844,{}],[390,844,{top:47,bottom:34}],[430,932,{top:59,bottom:34}]]){
  const l=layout.gameLayout({width,height,insets,coarsePointer:true,standalone:true});
  const oldBottom=height-(insets.bottom||0)-8,oldTop=oldBottom-96;
  assert.equal(l.controlLift,96);assert.equal(oldBottom-l.controlLift,oldTop);
  assert.equal(l.playHeight,height-(insets.top||0)-(insets.bottom||0)-264);
  assert.equal(l.arenaHeight,l.mainHeight);assert.equal(l.sceneExtension,200);
  assert.ok(l.arenaHeight>=300,'reserve usable scene height');assert.equal(l.buttonHeight,96);
 }
});
test('phone landscape, tablets and all desktop pointer layouts keep original control positions',()=>{
 for(const [width,height,coarsePointer] of [[844,390,true],[667,375,true],[639,360,true],[768,1024,true],[1280,800,false],[390,844,false],[430,932,false]]){
  const l=layout.gameLayout({width,height,coarsePointer});assert.equal(l.controlLift,0,[width,height,coarsePointer].join('/'));assert.equal(l.arenaHeight,l.mode==='side'?l.mainHeight:l.mainHeight-104);
 }
});
test('viewport updates lift phone controls in portrait, clear lift in landscape and restore after rotation',()=>{
 const values=new Map(),attrs=new Map(),events=new Map(),queue=[];const probe={style:{},setAttribute(){},remove(){}};
 const doc={documentElement:{setAttribute:(k,v)=>attrs.set(k,v),style:{setProperty:(k,v)=>values.set(k,v)}},createElement:()=>probe,body:{appendChild(){}}};
 const win={innerWidth:390,innerHeight:844,matchMedia:()=>({matches:true}),navigator:{standalone:true},getComputedStyle:()=>({}),addEventListener:(k,v)=>events.set(k,v),removeEventListener(){},requestAnimationFrame:f=>queue.push(f)};
 const dispose=layout.installViewportLayout(win,doc);
 assert.equal(values.get('--controls-lift'),'96px');
 for(const [width,height,lift] of [[844,390,'0px'],[390,844,'96px'],[430,932,'96px']]){Object.assign(win,{innerWidth:width,innerHeight:height});events.get('orientationchange')();queue.shift()();assert.equal(values.get('--controls-lift'),lift);}
 dispose();
});

test('Safari browser with URL bar never lifts controls; only explicit standalone phone portrait does',()=>{
 for(const [width,height]of [[375,667],[390,844],[430,932]]){
  const browser=layout.gameLayout({width,height,coarsePointer:true,standalone:false});assert.equal(browser.controlLift,0);assert.equal(browser.sceneExtension,0);assert.equal(browser.arenaHeight,height-168);
  const app=layout.gameLayout({width,height,coarsePointer:true,standalone:true});assert.equal(app.controlLift,96);assert.equal(app.sceneExtension,200);assert.equal(app.arenaHeight,height-64);assert.equal(app.playHeight,height-264);
 }
});
test('standalone detection uses display-mode or iOS standalone, never viewport or UA guesses',()=>{
 assert.equal(typeof layout.isStandalone,'function');
 for(const [display,ios,want]of [[false,false,false],[true,false,true],[false,true,true],[false,undefined,false]])assert.equal(layout.isStandalone({matchMedia:query=>({matches:query==='(display-mode: standalone)'&&display}),navigator:{standalone:ios,userAgent:'iPhone'}}),want);
 assert.equal(layout.isStandalone({}),false);
});
test('render extension reveals only extra lower field without moving or scaling the existing camera view',()=>{
 assert.equal(typeof layout.renderCameraBounds,'function');const frame={halfW:4.8,halfH:3.3};
 const normal=layout.renderCameraBounds(frame,580,580);assert.deepEqual(normal,{left:-4.8,right:4.8,top:3.3,bottom:-3.3});
 const extended=layout.renderCameraBounds(frame,580,780);assert.equal(extended.left,normal.left);assert.equal(extended.right,normal.right);assert.equal(extended.top,normal.top);assert.ok(extended.bottom<normal.bottom);
 assert.ok(Math.abs(780/(extended.top-extended.bottom)-580/6.6)<1e-10,'same pixels per world unit');
 assert.ok(Math.abs((extended.top-1)*780/(extended.top-extended.bottom)-(normal.top-1)*580/6.6)<1e-10,'same existing world-point pixel y');
});

test('real THREE orthographic projection preserves athlete pixels when the standalone field extends',async()=>{
 const THREE=await import('../../public/games/long-jump/vendor/three.module.min.js');const {fresh,pose,cameraFrame}=await import('../../public/games/long-jump/physics.mjs');
 for(const [width,height]of [[375,667],[390,844],[430,932]])for(const flight of [false,true]){
  const l=layout.gameLayout({width,height,coarsePointer:true,standalone:true}),w=l.arenaWidth-2,oldH=l.playHeight-2,newH=l.arenaHeight-2,s=fresh();if(flight){s.phase='air';s.y=12;s.theta=.7;}
  const view=cameraFrame(s,w,oldH),camera=h=>{const c=new THREE.OrthographicCamera(-1,1,1,-1,.1,140);Object.assign(c,layout.renderCameraBounds(view,oldH,h));c.position.set(view.centerX,view.centerY+4,16);c.lookAt(view.centerX,view.centerY,0);c.updateProjectionMatrix();c.updateMatrixWorld();return c;},before=camera(oldH),after=camera(newH);
  for(const point of Object.values(pose(s))){const p=new THREE.Vector3(point.x,point.y,point.z||0),a=p.clone().project(before),b=p.clone().project(after);assert.ok(Math.abs((a.x+1)*w/2-(b.x+1)*w/2)<1e-7);assert.ok(Math.abs((1-a.y)*oldH/2-(1-b.y)*newH/2)<1e-7,`${width}px athlete point must neither move nor stretch`);}
 }
});

test('explicit shared controls mode uses 900px independent of orientation, retaining legacy default',()=>{
 for(const [width,height,mode]of [[844,390,'bottom'],[899,1000,'bottom'],[900,1366,'side'],[1024,1366,'side']]){
  const l=layout.gameLayout({width,height,sharedControls:true});assert.equal(l.mode,mode);assert.equal(l.playHeight,height-64-(mode==='bottom'?104:0));assert.ok(l.buttonHeight>=96);
 }
 assert.equal(layout.gameLayout({width:844,height:390}).mode,'side');
});
test('shared standalone keeps original 96px lift and actual THREE athlete projection',async()=>{
 const THREE=await import('../../public/games/long-jump/vendor/three.module.min.js');const {fresh,pose,cameraFrame}=await import('../../public/games/long-jump/physics.mjs');
 const l=layout.gameLayout({width:390,height:844,coarsePointer:true,standalone:true,sharedControls:true});assert.equal(l.controlLift,96);assert.equal(l.playHeight,580);assert.equal(l.sceneExtension,200);assert.equal(l.arenaHeight,780);
 const w=l.arenaWidth-2,oldH=578,newH=778,s=fresh(),view=cameraFrame(s,w,oldH);const project=h=>{const c=new THREE.OrthographicCamera(-1,1,1,-1,.1,140);Object.assign(c,layout.renderCameraBounds(view,oldH,h));c.position.set(view.centerX,view.centerY+4,16);c.lookAt(view.centerX,view.centerY,0);c.updateProjectionMatrix();c.updateMatrixWorld();return c;};const before=project(oldH),after=project(newH);
 for(const p of Object.values(pose(s))){const v=new THREE.Vector3(p.x,p.y,p.z||0),a=v.clone().project(before),b=v.clone().project(after);assert.ok(Math.abs((a.x-b.x)*w/2)<1e-7);assert.ok(Math.abs((1-a.y)*oldH/2-(1-b.y)*newH/2)<1e-7);}
});
