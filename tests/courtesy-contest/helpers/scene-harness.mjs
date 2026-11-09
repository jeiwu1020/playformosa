import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real scene methods without a canvas/browser. Only rendering,
// audio, and Phaser scheduling are faked; no gameplay transitions are replaced.
const gameUrl=new URL('../../../public/games/courtesy-contest/game.js',import.meta.url);
const gameSource=fs.readFileSync(gameUrl,'utf8');
const ruleImports={};
// Resolve real pure-rule imports so new gameplay modules share the same VM.
// Rendering/audio modules remain explicit test doubles below.
for(const [,clause,path]of gameSource.matchAll(/^import (.+?) from ['"](.+?)['"];?$/gm)){
 if(['./sfx.js','./music.js'].includes(path))continue;
 const module=await import(new URL(path,gameUrl));
 if(clause.startsWith('* as '))ruleImports[clause.slice(5).trim()]=module;
 else if(clause.startsWith('{'))for(const item of clause.slice(1,-1).split(',')){
  const [source,alias]=item.trim().split(/\s+as\s+/);ruleImports[alias||source]=module[source];
 }
 else ruleImports[clause.trim()]=module.default;
}
const sceneSource=gameSource
 .replace(/^import .*\n/gm,'').split("const parent=$('game');")[0]
 +'\nglobalThis.TestScene=CourtesyScene;';
export function harness({random=()=>.99,variation=false,audience=variation}={}){
 let now=0,sceneTime=0,paused=false,nextId=0;
 const nodes=new Map(),events=[],tweens=[],tweenRecords=new Map();
 const node=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{hidden:false,disabled:false,open:false,textContent:'',style:{},dataset:{},nextElementSibling:{hidden:false},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on??!classes.has(k))classes.add(k);else classes.delete(k);}},setAttribute(){},removeAttribute(){},querySelector(){return node(id+'/span');}});}return nodes.get(id);};
 // Chainable display stub, intentionally separate from scene.pose.
 function sprite(){const a={active:true,pose:0,restY:0,x:0,y:0,width:20,height:20,angle:0,scaleX:1,scaleY:1,originX:.5,originY:.5,flipX:false,alpha:1,visible:true,frame:{name:0},texture:{key:'mock'}};let p;p=new Proxy(a,{get(t,k){if(k in t)return t[k];if(k==='getBounds')return()=>({x:t.x,y:t.y,width:20,height:20});return(...args)=>{if(k==='setPosition'){t.x=args[0];t.y=args[1];}if(k==='setTexture'){t.texture={key:args[0]};t.frame={name:args[1]};}if(k==='setFrame')t.frame={name:args[0]};if(k==='setScale'){t.scaleX=args[0];t.scaleY=args[1]??args[0];}if(k==='setOrigin'){t.originX=args[0];t.originY=args[1]??args[0];}if(k==='setFlipX')t.flipX=args[0];if(k==='setAlpha')t.alpha=args[0];if(k==='setText')t.text=args[0];if(k==='setVisible')t.visible=args[0];if(k==='setAngle')t.angle=args[0];if(k==='destroy')t.active=false;return p;};}});return p;}
 const document={hidden:false,getElementById:node,querySelector:node,addEventListener(){}};
 const audioCalls=[],musicInstances=[];
 class Sounds{constructor(){this.enabled=true;this.context={suspend:()=>audioCalls.push('suspend')};}play(name){audioCalls.push(name);}unlock(){audioCalls.push('unlock');}}
 class Music{constructor(){this.audio={paused:true,playbackRate:1,pause:()=>{this.audio.paused=true;}};this.active=false;musicInstances.push(this);}play(){if(this.active&&!this.pausedByGame&&!document.hidden)this.audio.paused=false;}start(){this.active=true;this.play();}stop(){this.active=false;this.audio.pause();}update(){}setEnabled(){}}
 const context={...ruleImports,document,window:{},performance:{now:()=>now},Math:Object.assign(Object.create(Math),{random}),Phaser:{VERSION:'3.90.0-test',Scene:class{},Math:{Clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),Linear:(a,b,t)=>a+(b-a)*t}},ComicSounds:Sounds,BackgroundMusic:Music};
 vm.runInNewContext(sceneSource,context);
 const s=new context.TestScene();
 const asset=name=>JSON.parse(fs.readFileSync(new URL('../../../public/games/courtesy-contest/assets/'+name,import.meta.url),'utf8'));
 const frames=name=>asset(name).frames;
 const passengers=audience?ruleImports.SEAT_AUDIENCE.map(({type,slot})=>({type,slot,normalizedSlot:true,sprite:sprite(),reaction:null})):[0,1,2,0].map((type,slot)=>({type,slot,sprite:sprite(),reaction:null}));
 Object.assign(s,{ready:true,W:800,H:600,baseScale:1,floorY:540,seatY:400,px:272,ax:552,seatX:400,npcScale:.5,mobile:false,frameData:frames('frames.json'),heroFrames:frames('hero-v3-frames.json'),auntFrames:frames('aunt-v4-frames.json'),...(variation||audience?{variation:asset('variation-v7.json')}:{}),player:sprite(),aunt:sprite().setFlipX(true),intruder:sprite(),seatGlow:sprite(),threatRing:sprite(),banner:sprite(),speedLines:sprite(),shadows:[sprite(),sprite()],spectators:passengers,speech:{box:sprite(),tail:sprite(),text:sprite(),until:0},scale:{width:800,height:600},bg:sprite(),cameras:{main:{shake(){}}},add:{text:sprite},time:{now:0,delayedCall(ms,fn){const e={at:sceneTime+ms,fn,id:nextId++};events.push(e);return e;},removeAllEvents(){events.length=0;}},scene:{pause(){paused=true;},resume(){paused=false;}},tweens:{add(config){
 const targets=Array.isArray(config.targets)?config.targets:[config.targets];
 const props=['x','y','angle','lift','scaleX','scaleY','alpha'].filter(key=>typeof config[key]==='number');
 const tween={config,at:sceneTime,targets,props,from:targets.map(target=>Object.fromEntries(props.map(key=>[key,target[key]??0])))};
 tweens.push(config);tweenRecords.set(config,tween);return config;
 },killAll(){tweens.length=0;tweenRecords.clear();},killTweensOf(target){for(let i=tweens.length-1;i>=0;i--)if(tweenRecords.get(tweens[i]).targets.includes(target)){tweenRecords.delete(tweens[i]);tweens.splice(i,1);}},getDelta(force){assert.equal(force,true);this.baselineResets=(this.baselineResets||0)+1;return 0;}}});
 s.start();
 function runDue(){while(true){events.sort((a,b)=>a.at-b.at||a.id-b.id);const i=events.findIndex(e=>e.at<=sceneTime);if(i<0)break;const [e]=events.splice(i,1);e.fn();}}
 function runTweens(){
  // Real Phaser tweens retain numeric endpoints captured by add(). This narrow
  // endpoint/interpolation simulator exposes resize defects the old no-op stub misses.
  for(const c of [...tweens]){
   if(!tweens.includes(c))continue;
   const tween=tweenRecords.get(c),elapsed=sceneTime-tween.at-(c.delay||0);if(elapsed<0)continue;
   const duration=c.duration||1,legs=c.yoyo?2:1,total=duration*legs*((c.repeat||0)+1),done=elapsed>=total;
   const leg=Math.floor(Math.min(elapsed,total-Number.EPSILON)/duration),raw=Math.min(1,(elapsed%duration)/duration);
   const t=done?(c.yoyo?0:1):(c.yoyo&&leg%2?1-raw:raw);
   tween.targets.forEach((target,i)=>{for(const key of tween.props)target[key]=tween.from[i][key]+(c[key]-tween.from[i][key])*t;});
   if(done){tweens.splice(tweens.indexOf(c),1);tweenRecords.delete(c);c.onComplete?.();}
  }
 }
 function frame(ms,{callbacks=true,update=true}={}){now+=ms;if(!paused){sceneTime+=ms;s.time.now=sceneTime;if(callbacks)runDue();runTweens();if(update)s.update(sceneTime,ms);}}
 function tick(ms,options={}){for(let left=ms;left>0;){const step=Math.min(10,left);left-=step;frame(step,options);}}
 // A stall has no intervening frames: overdue callbacks must see the final deadline.
 function stall(ms,options={}){frame(ms,options);}
 return{s,node,document,window:context.window,performance:context.performance,audioCalls,music:musicInstances[0],events,tweens,tick,stall,runDue,catchUpScene(ms){sceneTime+=ms;s.time.now=sceneTime;runDue();runTweens();},get now(){return now;},set now(v){now=v;},get sceneTime(){return sceneTime;},get paused(){return paused;}};
}

