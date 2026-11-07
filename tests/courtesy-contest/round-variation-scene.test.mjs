import {createEscalatingThreatPlan} from '../../public/games/courtesy-contest/threat-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';

const partners=[
 {id:'aunt',sample:0,seatKey:'hero',seatFrame:4,gripKey:'auntV4',gripFrame:1,fallKey:'auntV4',fallFrame:2},
 {id:'office',sample:.4,seatKey:'office',seatFrame:3,gripKey:'office',gripFrame:4,fallKey:'office',fallFrame:5},
 {id:'stubborn',sample:.8,seatKey:'stubborn',seatFrame:3,gripKey:'stubborn',gripFrame:4,fallKey:'stubborn',fallFrame:5}
];
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,`${label}: ${actual} != ${expected}`);
function completeOffers(h,count){for(let i=0;i<count;i++){h.s.offer();if(h.s.threat)h.s.repel();h.tick(1000);assert.equal(h.s.busy,false);}}
function activeGestures(h){return h.s.spectators.filter(p=>p.chainGesture);}
function assertAudienceSeated(h){
 assert.deepEqual(h.s.spectators.map(p=>p.type),[0,3,1,2,4,5]);
 const expectedTypes=h.s.mobile?[0,3,4,5]:[0,3,1,2,4,5];
 assert.deepEqual(h.s.spectators.filter(p=>p.sprite.visible).map(p=>p.type),expectedTypes);
 const identities=new Set();
 for(const p of h.s.spectators){
  if(!p.sprite.visible)continue;
  const a=p.sprite,newPassenger=p.type>=3,index=newPassenger?p.type-3:p.type*4;
  const key=newPassenger?(p.chainGesture?'seatedGesture':'seatedNew'):'passengers';
  assert.equal(a.texture.key,key);assert.equal(a.frame.name,index);assert.equal(a.angle,0);
  const hip=newPassenger?h.s.variation[p.chainGesture?'gesture':'seated'][index].hip:[265,270,279][p.type];
  const height=newPassenger?724:362;
  near(a.y-(height-hip)*a.scaleY,h.s.seatY,'audience hip');
  assert.ok(a.x>h.s.W*.09&&a.x<h.s.W*.91,'audience seat anchor stays inside the poles');
  identities.add(`${a.texture.key}:${a.frame.name}`);
 }
 assert.equal(identities.size,expectedTypes.length,'every visible seated passenger has a distinct identity');
 for(const tween of h.tweens)assert.ok(!h.s.spectators.some(p=>tween.targets===p.sprite),'passenger bodies must never receive motion tweens');
}
function assertChainCleared(h){
 assert.equal(h.s.chain,null);
 for(const p of h.s.spectators){assert.equal(p.chainGesture,false);assert.equal(p.chainCaption,null);}
 assertAudienceSeated(h);
}

for(const partner of partners){
 test(`${partner.id}: seated, existing-handle grip, and failed-departure frames are correctly mapped`,()=>{
  const h=harness({variation:true,random:()=>partner.sample});assert.equal(h.s.partner,partner.id);
  h.s.pose(h.s.aunt,4);
  assert.equal(h.s.aunt.texture.key,partner.seatKey);assert.equal(h.s.aunt.frame.name,partner.seatFrame);
  const seated=partner.id==='aunt'?h.s.heroFrames[4]:h.s.variation[partner.id][3];
  near(h.s.aunt.y-(seated.height-seated.hip)*h.s.aunt.scaleY,h.s.seatY,'partner hip');
  h.s.thank();h.tick(300);assert.equal(h.s.seated,true);
  assert.equal(h.s.aunt.texture.key,partner.gripKey);assert.equal(h.s.aunt.frame.name,partner.gripFrame);
  const grip=partner.id==='aunt'?h.s.auntFrames[1]:h.s.variation[partner.id][4],a=h.s.aunt;
  assert.equal(a.flipX,true);near(a.originX,1-(grip.anchorX-grip.x)/grip.width,'mirrored partner origin');
  const handLocalX=grip.width-(grip.handX-grip.x);
  near(a.x+(handLocalX-a.originX*grip.width)*a.scaleX,h.s.W*1056/1536,'existing handle X');
  near(a.y-(grip.height-grip.handY)*a.scaleY,h.s.H*211/1024,'existing handle Y');
  const losing=harness({variation:true,random:()=>partner.sample});losing.stall(30000);
  assert.equal(losing.s.seated,false);assert.equal(losing.s.aunt.pose,5);
  assert.equal(losing.s.aunt.texture.key,partner.fallKey);assert.equal(losing.s.aunt.frame.name,partner.fallFrame);
  assertAudienceSeated(losing);
 });
}

test('replaying selects another real partner and resets prior chain rewards',()=>{
 const h=harness({variation:true,random:()=>0});assert.equal(h.s.partner,'aunt');
 h.s.count=4;h.s.maybeChain();assert.equal(h.s.chainBonus,1);h.s.start();
 assert.equal(h.s.partner,'office');assert.equal(h.s.aunt.texture.key,'office');
 assert.equal(h.s.chainBonus,0);assert.equal(h.s.chainLast,0);assertChainCleared(h);
 h.s.start();assert.equal(h.s.partner,'aunt');
});

for(const [index,count,travelMs]of [[0,3,3000],[1,5,2700],[2,7,2300],[3,9,2000],[4,11,1700],[5,13,1400],[6,15,1100],[7,18,900],[8,21,750],[9,24,650]]){
 const duration=(800+travelMs)/1000;
 test(`progressive threat ${duration}s: warning holds 0.8s and theft occurs at its actual deadline`,()=>{
  const h=harness({variation:true});h.s.startRound({plan:createEscalatingThreatPlan(()=>.99)});h.s.count=count;h.s.threatIndex=index;h.s.maybeThreat();
  near(h.s.threat.duration,duration,'threat duration');assert.equal(h.s.threat.windup,.8);
  const type=h.s.threat.type,warningX=h.s.intruder.x;
  h.tick(799);assert.equal(h.s.intruder.frame.name,type*4+1);near(h.s.intruder.x,warningX,'warning position');
  h.tick(1);assert.equal(h.s.intruder.frame.name,type*4+2);assert.equal(h.s.phase,'play');
  h.tick(1);assert.notEqual(h.s.intruder.x,warningX);
  h.tick(duration*1000-802);assert.equal(h.s.phase,'play');near(h.s.threat.elapsed,duration-.001,'elapsed immediately before theft');
  h.tick(1);assert.equal(h.s.phase,'depart');assert.equal(h.s.reason,'stolen');assert.equal(h.s.seated,false);
  assert.equal(h.s.intruder.frame.name,type*4);assertAudienceSeated(h);
 });
 test(`progressive threat ${duration}s: repel works just before deadline but not at it`,()=>{
  for(const late of [false,true]){
   const h=harness({variation:true});h.s.startRound({plan:createEscalatingThreatPlan(()=>.99)});h.s.count=count;h.s.threatIndex=index;h.s.maybeThreat();
   h.now=duration*1000-(late?0:1);h.s.repel();
   assert.equal(h.s.phase,late?'depart':'play');assert.equal(h.s.reason,late?'stolen':null);
  }
 });
}

test('hidden pause preserves the fastest threat window until explicit Continue',()=>{
 const h=harness({variation:true});h.s.startRound({plan:createEscalatingThreatPlan(()=>.99)});h.s.count=24;h.s.threatIndex=9;h.s.maybeThreat();
 h.tick(799);h.document.hidden=true;h.s.pauseRound();const remaining=h.s.roundClock.remaining(h.now);
 h.tick(30000);assert.equal(h.s.threat.elapsed,.799);assert.equal(h.s.roundClock.remaining(h.now),remaining);
 h.document.hidden=false;h.tick(10000);assert.equal(h.s.tabPaused,true);
 h.s.resumeRound();h.tick(1);assert.equal(h.s.threat.elapsed,.8);assert.equal(h.s.phase,'play');
 h.tick(649);assert.equal(h.s.phase,'play');h.tick(1);assert.equal(h.s.reason,'stolen');
});

test('four and eight completed exchanges each award exactly one chain bonus',()=>{
 const h=harness({variation:true});completeOffers(h,4);
 assert.equal(h.s.chainBonus,1);assert.equal(h.s.chainLast,4);assert.equal(h.s.seatReady,false);assert.equal(h.s.player.pose,2);
 const id=h.s.chain;h.s.maybeChain();h.s.maybeChain();assert.equal(h.s.chainBonus,1);assert.equal(h.s.chain,id);
 h.tick(200);assert.equal(activeGestures(h).length,2);assertAudienceSeated(h);
 completeOffers(h,4);assert.equal(h.s.count,8);assert.equal(h.s.chainBonus,2);assert.equal(h.s.chainLast,8);
 h.s.maybeChain();assert.equal(h.s.chainBonus,2);h.tick(400);assert.equal(activeGestures(h).length,3);assertAudienceSeated(h);
 h.s.thank();h.tick(300);h.tick(1800);
 assert.equal(h.node('result-count').textContent,'8');assert.equal(h.node('result-bonus').textContent,'連鎖 +2');
});

test('a chain neither grants a seat nor blocks Thanks at either threshold',()=>{
 for(const count of [4,8]){
  const h=harness({variation:true});h.s.count=count;
  const pose=h.s.player.pose;h.s.maybeChain();h.tick(210);
  assert.equal(h.s.seatReady,false);assert.equal(h.s.seated,false);assert.equal(h.s.player.pose,pose);
  assert.equal(h.s.busy,false);assert.equal(h.node('offer').disabled,false);assert.equal(h.node('thanks').disabled,false);
  h.s.thank();assert.equal(h.s.phase,'seating');assertChainCleared(h);
  h.tick(300);assert.equal(h.s.seated,true);h.tick(1400);assertChainCleared(h);
 }
});

test('chain rewards do not convert a standing timeout into success',()=>{
 const h=harness({variation:true});h.s.count=4;h.s.maybeChain();h.tick(210);h.stall(30000);
 assert.equal(h.s.seated,false);assert.equal(h.s.reason,'timer');assert.equal(h.s.chainBonus,1);assertChainCleared(h);
 h.tick(1800);assert.equal(h.node('result-status-text').textContent,'屁股落地');
});

test('depart and replay invalidate pending chain gestures and cleanup callbacks',()=>{
 for(const action of ['depart','replay']){
  const h=harness({variation:true});h.s.count=8;h.s.maybeChain();h.tick(10);
  const caption=activeGestures(h)[0].chainCaption,stale=[...h.events];
  if(action==='depart')h.s.depart(false);else h.s.start();
  assert.equal(caption.active,false);assertChainCleared(h);
  for(const event of stale)event.fn();h.tick(1400);assertChainCleared(h);
  assert.equal(h.s.chainBonus,action==='replay'?0:1);
 }
});

test('pause freezes the seated chain and captions; Continue finishes cleanup once',()=>{
 const h=harness({variation:true});h.s.count=8;h.s.maybeChain();h.tick(210);
 const id=h.s.chain,captions=activeGestures(h).map(p=>p.chainCaption),remaining=h.s.roundClock.remaining(h.now);
 assert.equal(captions.length,2);h.document.hidden=true;h.s.pauseRound();h.tick(10000);
 assert.equal(h.s.chain,id);assert.equal(activeGestures(h).length,2);assert.ok(captions.every(c=>c.active));
 assert.equal(h.s.roundClock.remaining(h.now),remaining);assertAudienceSeated(h);
 h.document.hidden=false;h.s.resumeRound();h.tick(190);assert.equal(activeGestures(h).length,3);
 h.tick(1000);assertChainCleared(h);assert.ok(captions.every(c=>!c.active));assert.equal(h.s.chainBonus,1);
});

test('an older chain cleanup cannot erase newer gestures or captions',()=>{
 const h=harness({variation:true});h.s.count=4;h.s.maybeChain();h.tick(210);
 const first=h.s.chain,oldCaptions=activeGestures(h).map(p=>p.chainCaption),oldCleanup=h.events.find(e=>e.at===1400);
 h.tick(290);h.s.count=8;h.s.maybeChain();h.tick(410);
 assert.notEqual(h.s.chain,first);assert.ok(oldCaptions.every(c=>!c.active));
 const current=h.s.chain,newCaptions=activeGestures(h).map(p=>p.chainCaption);assert.equal(newCaptions.length,3);
 oldCleanup.fn();assert.equal(h.s.chain,current);assert.ok(newCaptions.every(c=>c.active));
 h.tick(490);assert.equal(h.s.chain,current);assert.ok(newCaptions.every(c=>c.active));assertAudienceSeated(h);
 h.tick(500);assertChainCleared(h);assert.ok(newCaptions.every(c=>!c.active));
});

for(const reaction of ['courtesy','steal','repel']){
 test(`${reaction} reactions and resize preserve the responsive seated passenger identities`,()=>{
  const h=harness({variation:true});assertAudienceSeated(h);h.s.react(reaction);h.tick(100);assertAudienceSeated(h);
  h.s.count=8;h.s.maybeChain();h.tick(410);assert.equal(activeGestures(h).length,3);
  h.s.react(reaction);h.s.scale.width=390;h.s.scale.height=370;h.s.layout();assertAudienceSeated(h);
  h.tick(1400);assertAudienceSeated(h);assertChainCleared(h);
  for(const tween of h.tweens)assert.ok(!h.s.spectators.some(p=>tween.targets===p.sprite),'passenger bodies must never receive motion tweens');
 });
}


for(const width of [320,375,414]){
 test(`${width}px portrait keeps four readable adult passengers and a distinct hero seat`,()=>{
  const h=harness({variation:true});h.s.scale.width=width;h.s.scale.height=width+40;h.s.layout();
  assertAudienceSeated(h);
  const visible=h.s.spectators.filter(p=>p.sprite.visible);
  assert.deepEqual(visible.map(p=>p.type),[0,3,4,5]);
  for(const p of visible){
   // Five separate bodies must fit within the 83% bench span. The old
   // 19%-per-neighbour minimum required overlaps and stole the hero seat.
   // v14 deliberately reduces the oversized crowd by about 3.5%.
   const opaqueHeight=p.type===0?323:675,renderedHeight=opaqueHeight*p.sprite.scaleY;
   assert.ok(renderedHeight>=width*.27,`type ${p.type} is too short at ${renderedHeight}px`);
   const adultRatio=renderedHeight/(350*h.s.baseScale);
   assert.ok(adultRatio>=.88&&adultRatio<=1.12,`type ${p.type} differs from the calibrated seated artwork scale`);
  }
  h.s.count=8;h.s.maybeChain();h.tick(410);assert.equal(activeGestures(h).length,3);assertAudienceSeated(h);
  h.s.scale.width=900;h.s.scale.height=600;h.s.layout();assertAudienceSeated(h);
  assert.equal(h.s.spectators.filter(p=>p.sprite.visible).length,6,'desktop restores six different passengers');
 });
}

// Independent world transform of opaque frame bounds. Do not use silhouetteX()
// to compute its own expected result, and do not treat transparent frame pixels as body.
function opaqueWorldBounds(actor){
 const m=actor.paintMeta;assert.ok(m?.bounds,'the visible frame must provide opaque bounds');
 const [left,top,right,bottom]=m.bounds,angle=actor.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),points=[];
 for(const sourceX of [left,right])for(const sourceY of [top,bottom]){
  const displayX=actor.flipX?m.width-sourceX:sourceX;
  const localX=(displayX-actor.originX*m.width)*actor.scaleX,localY=(sourceY-actor.originY*m.height)*actor.scaleY;
  points.push({x:actor.x+c*localX-s*localY,y:actor.y+s*localX+c*localY});
 }
 return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
function assertBodiesVisible(h,label){
 for(const [name,actor]of [['player',h.s.player],['partner',h.s.aunt]]){
  const b=opaqueWorldBounds(actor);
  assert.ok(b.left>=-1e-8&&b.right<=h.s.W+1e-8,`${label}: ${name} horizontal body ${b.left}..${b.right} escapes 0..${h.s.W}`);
  assert.ok(b.top>=-1e-8&&b.bottom<=h.s.H+1e-8,`${label}: ${name} vertical body ${b.top}..${b.bottom} escapes 0..${h.s.H}`);
 }
}

for(const partner of partners)for(const width of [320,375]){
 test(`${partner.id} at ${width}px keeps both opaque bodies visible throughout the fall`,()=>{
  const h=harness({variation:true,random:()=>partner.sample});h.s.scale.width=width;h.s.scale.height=width+40;h.s.layout();
  h.s.depart(false);assertBodiesVisible(h,'first fall frame');
  for(let ms=10;ms<=600;ms+=10){h.tick(10);assertBodiesVisible(h,`fall ${ms}ms`);}
  assert.equal(h.s.player.angle,-8);assert.equal(h.s.aunt.angle,8);
  for(const actor of [h.s.player,h.s.aunt]){const b=opaqueWorldBounds(actor);assert.ok(b.left>=7-1e-8&&b.right<=width-7+1e-8,'settled fall keeps its seven-pixel side margins');}
  h.s.scale.width=width===320?375:320;h.s.scale.height=h.s.scale.width+40;h.s.layout();
  assert.equal(h.s.player.angle,-8);assert.equal(h.s.aunt.angle,8);assertBodiesVisible(h,'resized settled fall');
 });
}

test('desktop-to-phone resize removes reaction labels belonging to now-hidden passengers',()=>{
 const h=harness({variation:true});h.s.react('courtesy');h.tick(100);
 assert.ok(h.s.spectators.every(p=>p.reaction?.active));
 h.s.scale.width=375;h.s.scale.height=415;h.s.layout();assertAudienceSeated(h);
 for(const p of h.s.spectators.filter(p=>!p.sprite.visible)){
  assert.ok(!p.reaction||!p.reaction.active||p.reaction.visible===false,`hidden passenger ${p.type} retained its reaction label`);
 }
});
