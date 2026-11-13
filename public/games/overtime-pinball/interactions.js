import {clockCue} from './clock-cue.js';
import {comboTarget} from './combo-routes.js';
import {LAYOUT} from './route-layout.js';
// Interaction clock is independent of paid play time. L/R are physical sides.
import {exitFor} from './activities.js';
import {SOLID_PROPS} from './board-features.js';
import {stationShapes,sweepCircle,sweepRect} from './contact.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const successfulInteraction=i=>['perfect','complete'].includes(i.result?.kind);
// Failed work must leave beyond the downstream face, in either camera direction.
// Both the launch animation and physical release use this same destination.
export function releasePosition(i,station,view,radius=.65,obstacles=[station,...SOLID_PROPS]){
 // Chair uses the outer aisle: the direct ray to water crosses the coffee desk.
 // One unit of clearance includes the ball radius before aiming back toward water.
 const sign=i.side==='left'?-1:1,success=successfulInteraction(i),target=success?comboTarget(i,station):null,d=target?Math.hypot(target.x-station.x,target.z-station.z):1,base=success&&i.activity==='chair'?{x:LAYOUT.desk2.x-LAYOUT.desk2.r-radius-1,z:station.z-2.5}:target?{x:station.x+(target.x-station.x)/d*(station.r+radius+1.2),z:station.z+(target.z-station.z)/d*(station.r+radius+1.2)}:success?exitFor(station,i.side,view,radius):{x:clamp(station.x+sign*.9,-17.15,17.15),z:station.z+station.r+radius+1.1};
 const clear=p=>Math.abs(p.x)<=17.15&&p.z>=-19.2&&p.z<=48&&(!success?p.z>=station.z+station.r+radius+.7:true)&&obstacles.every(o=>stationShapes(o,view).every(s=>!(s.hx?sweepRect(p,p,s,radius+.03):sweepCircle(p,p,s,radius+.03))));
 if(clear(base))return base;
 const candidates=[];for(const dx of [0,-1.5,1.5,-3,3,-5,5,-7,7,-9,9])for(const dz of [0,-1.5,1.5,-3,3,-5,5])candidates.push({x:base.x+dx,z:base.z+dz});
 return candidates.filter(clear).sort((a,b)=>Math.hypot(a.x-base.x,a.z-base.z)-Math.hypot(b.x-base.x,b.z-base.z))[0]||base;
}
export function setupInteraction(i){Object.assign(i,{stage:'docking',inputReady:false,charge:0,spinAngle:0,pulls:0,nextSide:i.side,lastPull:-1,wasHolding:false,launchElapsed:0,result:null,pullPulse:0,perfectStamps:0});}
export function cancelInteractionInput(i){if(i){i.inputReady=false;i.wasHolding=false;}}
function resolve(i,result){if(i.stage==='launch')return;i.stage='launch';i.launchElapsed=0;i.result=result;}
function chairResult(i){const c=i.charge,dizzy=c>2.7,perfect=c>=1.2&&c<=2.3,quality=perfect?1:dizzy?.4:clamp(c/1.2,.12,.85);return {kind:c===0?'timeout':dizzy?'dizzy':perfect?'perfect':'partial',quality,points:c===0?0:Math.round(200+800*quality),charge:c};}
function waterResult(i){const q=i.charge===0?0:i.charge>=1&&i.charge<=1.8?1:i.charge>2.4?.25:.6;return {kind:q===0?'timeout':q===1?'perfect':'partial',quality:q,points:Math.round(750*q),charge:i.charge};}
function copierResult(i){const perfect=i.pulls===4;return {kind:perfect?'perfect':i.pulls?'partial':'timeout',quality:i.pulls/4,points:perfect?900+(i.elapsed-(i.workOffset||0)<=3.5?200:0):i.pulls*150,pulls:i.pulls};}
export function advanceInteraction(i,dt,input,taps,activity){
 i.elapsed+=dt;const workTime=i.elapsed-(i.workOffset||0);i.pullPulse=Math.max(0,i.pullPulse-dt);
 if(i.stage==='launch'){i.launchElapsed+=dt;return i.launchElapsed>=.55;}
 if(i.elapsed<(i.dockDuration||.3))return false;
 if(!input.left&&!input.right&&(i.activity!=='launcher'||i.elapsed>=1.2))i.inputReady=true;
 i.stage='work';
 if(i.activity==='launcher'&&i.selected){if(i.elapsed>=.5)resolve(i,{kind:'perfect',quality:1,points:160});
 }else if(i.activity==='launcher'){const sides=[...new Set(taps.map(t=>t.side))];if(i.inputReady&&i.elapsed>=1.2&&sides.length===1&&!(input.left&&input.right)){i.side=sides[0];resolve(i,{kind:'perfect',quality:1,points:160});}else if(i.elapsed>=2.6)resolve(i,{kind:'timeout',quality:0,points:0});
 }else if(i.activity==='clock'){
  const cue=clockCue(i),sides=[...new Set(taps.map(t=>t.side))];
  if(cue.time>cue.end){resolve(i,{kind:i.pulls?'partial':'timeout',quality:i.pulls/3,points:i.pulls*100});}
  else if(i.inputReady&&cue.lit&&sides.length){
   if(sides.length!==1||sides[0]!==i.nextSide||input.left&&input.right)resolve(i,{kind:i.pulls?'partial':'miss',quality:i.pulls/3,points:i.pulls*100});
   else{i.pulls++;i.perfectStamps+=cue.perfect?1:0;i.lastPull=i.elapsed;i.pullPulse=.3;i.nextSide=i.nextSide==='left'?'right':'left';if(i.pulls===3)resolve(i,{kind:i.perfectStamps===3?'perfect':'complete',quality:1,points:i.perfectStamps===3?1100:900,perfectStamps:i.perfectStamps});}
  }
 }else if(i.activity==='microwave'){
  if(i.inputReady&&(!!input.left!==!!input.right)){i.side=input.left?'left':'right';i.charge+=dt;i.wasHolding=true;}
  const released=i.wasHolding&&!input.left&&!input.right;
  if(released||i.charge>=2.8||workTime>=6){const perfect=released&&i.charge>=1.2&&i.charge<=2;resolve(i,{kind:perfect?'perfect':i.charge>=2.8?'overheat':i.charge?'partial':'timeout',quality:perfect?1:.2,points:perfect?1250:i.charge?150:0,charge:i.charge});}
 }else if(i.activity==='server'){
  const single=!!input.left!==!!input.right;
  if(i.inputReady&&single){i.side=input.left?'left':'right';i.charge+=dt;i.wasHolding=true;}
  const released=i.wasHolding&&!input.left&&!input.right;
  if(released||i.charge>=2.8||workTime>=5){const perfect=released&&i.charge>=1.2&&i.charge<=2,overheat=i.charge>=2.8;resolve(i,{kind:perfect?'perfect':overheat?'overheat':i.charge>0?'partial':'timeout',quality:perfect?1:0,points:perfect?3000:overheat?300:i.charge>0?500:0,charge:i.charge});}
 }else if(i.activity==='shredder'){
  const sides=[...new Set(taps.map(t=>t.side))];if(i.inputReady&&sides.length===1&&!(input.left&&input.right)&&i.elapsed-i.lastPull>=.13&&sides[0]===i.nextSide){i.pulls++;i.lastPull=i.elapsed;i.pullPulse=.25;i.nextSide=i.nextSide==='left'?'right':'left';}
  if(i.pulls>=5||workTime>=5)resolve(i,{kind:i.pulls===5?'perfect':i.pulls?'partial':'timeout',quality:i.pulls/5,points:i.pulls===5?2600:i.pulls*200,pulls:i.pulls});
 }else if(i.activity==='chair'||i.activity==='water'){
  const single=!!input.left!==!!input.right;
  if(i.inputReady&&single){i.side=input.left?'left':'right';i.charge+=dt;i.wasHolding=true;}
  else if(i.wasHolding&&!input.left&&!input.right){resolve(i,i.activity==='water'?waterResult(i):chairResult(i));}
  i.spinAngle+=(3+i.charge*10)*dt;
  if(i.charge>=4||workTime>=6)resolve(i,i.activity==='water'?waterResult(i):chairResult(i));
 }else if(['copier','busy','coffee','parcel'].includes(i.activity)){
  const sides=[...new Set(taps.map(t=>t.side))];
  if(i.inputReady&&sides.length===1&&!(input.left&&input.right)&&i.elapsed-i.lastPull>=.13&&sides[0]===i.nextSide){i.pulls++;i.lastPull=i.elapsed;i.pullPulse=.25;i.nextSide=i.nextSide==='left'?'right':'left';}
  const needed=['busy','parcel'].includes(i.activity)?6:i.activity==='coffee'?5:4;if(i.pulls>=needed||workTime>=6)resolve(i,i.activity==='copier'?copierResult(i):{kind:i.pulls===needed?'perfect':i.pulls?'partial':'timeout',quality:i.pulls/needed,points:i.pulls===needed?activity.reward+(i.activity==='parcel'?0:200):i.pulls*100});
 }else if(i.activity==='boss'){const sides=[...new Set(taps.map(t=>t.side))];if(i.inputReady&&sides.length===1&&sides[0]===i.nextSide&&!(input.left&&input.right)&&workTime>=.8&&workTime<=2.4)resolve(i,{kind:'perfect',quality:1,points:activity.reward});else if(workTime>=6)resolve(i,{kind:'timeout',quality:0,points:0});}
 return false;
}
export function launchVelocity(i,activity,station,stations,exit){
 const sign=i.side==='left'?-1:1;
 // Ordinary results rejoin play; failed attempts leave a rescue window, not a high-speed drain shot.
 if(['chair','copier','water'].includes(i.activity)&&!successfulInteraction(i)){
  if(i.result?.kind==='partial')return {vx:(exit.x===0?sign:-Math.sign(exit.x))*14,vz:-6};
  return {vx:-Math.sign(exit.x)*4,vz:10};
 }
 // Spin controls momentum independently of the timing-window score. Overheat still risks the door.
 const charge=i.result?.charge??i.charge??0,chairSpeed=i.activity==='chair'&&charge>0?Math.min(54,14+14*charge):0;
 if(!successfulInteraction(i)){const vx=sign*(i.result?.kind==='dizzy'?6:3),vz=8,scale=chairSpeed?chairSpeed/Math.hypot(vx,vz):1;return {vx:vx*scale,vz:vz*scale};}
 const targetRoute=comboTarget(i,station);if(targetRoute){const dx=targetRoute.x-exit.x,dz=targetRoute.z-exit.z,len=Math.hypot(dx,dz)||1,speed=({copier:40,chair:34,water:36,coffee:38,launcher:42,clock:34})[i.activity]||40;return{vx:dx/len*speed,vz:dz/len*speed};}
 if(!['chair','copier'].includes(i.activity)){const q=i.result?.quality||0;return {vx:sign*activity.exitX*(.65+q*.35)*1.15,vz:activity.exitVz*(.65+q*.35)*1.15};}
 const quality=i.result?.quality||0,speed=chairSpeed||(14+quality*14)*1.15;
 const target=stations.filter(o=>o.id!==station.id&&o.z<station.z-5&&o.z>station.z-28).sort((a,b)=>Math.hypot(a.x-exit.x,a.z-exit.z)-Math.hypot(b.x-exit.x,b.z-exit.z))[0];
 let dx=sign*.5,dz=-1;
 if(target&&quality>=.7){dx=target.x-exit.x;dz=target.z-exit.z;}
 const length=Math.hypot(dx,dz);dx/=length;dz/=length;
 if(i.result?.kind==='dizzy'){const angle=sign*.52,x=dx*Math.cos(angle)-dz*Math.sin(angle);dz=dx*Math.sin(angle)+dz*Math.cos(angle);dx=x;}
 return {vx:dx*speed,vz:dz*speed};
}

