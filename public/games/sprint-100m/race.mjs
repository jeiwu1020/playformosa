// AI-only pace tiers; personal time and movement use the original player rules.
export const START_X=-1.35;
export const KEYS=['j','k','a','s'];
export function rng(seed=1){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function runner(id,name,color){return{id,name,color,x:START_X,v:0,imbalance:0,fall:0,falls:0,steps:0,lastLeg:-1,lastStep:-9,lastArm:-9,armSide:-1,lean:0,held:[false,false,false,false],started:false,reaction:null,finished:null,pose:0,stumble:0};}
export function createRace(seed=Date.now()){const random=rng(seed);return{seed,random,phase:'ready',time:0,clock:0,wait:1.2+random()*1.4,readyFor:0,paused:false,falseStarts:0,event:'按住 A＋S 兩腳，蹲好等槍響。',runners:[runner(0,'你','#ed782e'),runner(1,'爆衝阿火','#e15759'),runner(2,'穩穩阿青','#299c91'),runner(3,'後追阿紫','#8a73bd')].map((r,i)=>({...r,ai:i?{next:.2+random()*.25,interval:i===1?.18:i===2?.35:.40,error:i===1?.006:i===2?.015:.02,mistakes:0,side:0}:null}))};}
export function input(race,id,limb,down){const r=race.runners[id];if(race.paused||r.held[limb]===down)return;if(r.finished!==null){if(!down)r.held[limb]=false;return;}r.held[limb]=down;
 if(id===0&&race.phase==='ready')return;
 if(id===0&&race.phase==='set'&&!down&&limb>=2){race.phase='ready';race.readyFor=0;race.falseStarts++;r.held.fill(false);race.event='搶跑了！放鬆，重新按住 A＋S。';return;}
 if(race.phase!=='race')return;
 if(!r.started&&limb>=2&&!down){r.started=true;r.reaction=race.time;r.v=1.7;r.lastStep=race.time;race.event=id===0?'出發！A／S 交替，J／K 擺手。':race.event;return;}
 if(!r.started||!down||r.fall>0)return;
 if(limb<2){if(race.time-r.lastArm>.105&&limb!==r.armSide){r.lastArm=race.time;r.armSide=limb;r.imbalance=Math.max(0,r.imbalance-.1);}return;}
 const gap=race.time-r.lastStep,side=limb-2;
 if(gap<.105){r.imbalance+=.16;return;}
 const alternating=side!==r.lastLeg;const armGood=race.time-r.lastArm<.65;
 if(alternating){r.v=Math.min(10.7,r.v+(armGood?1.02:.68));r.imbalance=Math.max(0,r.imbalance-(armGood?.1:.035));}else{r.v*=.91;r.imbalance+=.24;}
 if(gap>.8&&r.steps>2)r.imbalance+=.07;
 r.lastLeg=side;r.lastStep=race.time;r.steps++;r.pose+=Math.PI;
 if(r.imbalance>.55){r.stumble=.3;if(id===0)race.event='身體歪了！交替腳步，擺手找回平衡。';}
 if(r.imbalance>=1){r.fall=1.15;r.falls++;r.v*=.18;r.imbalance=.28;if(id===0)race.event='跌倒！等一下就能爬起來，繼續追。';}
}
export const chest=r=>r.x+.24+r.lean*.48;
export function step(race,dt){if(race.paused||race.phase==='done')return;dt=Math.min(.05,Math.max(0,dt));race.clock+=dt;
 const p=race.runners[0];if(race.phase==='ready'){if(p.held[2]&&p.held[3]){race.readyFor+=dt;if(race.readyFor>.35){race.phase='set';race.readyFor=0;race.event='預備…聽到槍響，再放開一腳！';}}else race.readyFor=0;return;}
 if(race.phase==='set'){race.readyFor+=dt;if(race.readyFor>=race.wait){race.phase='race';race.time=0;race.event='砰！放開一腳，衝出去！';}return;}
 race.time+=dt;
 for(const r of race.runners){if(r.finished!==null)continue;
 if(r.ai){const a=r.ai;if(!r.started&&race.time>=a.next){r.held[2]=true;input(race,r.id,2,false);a.next=race.time+a.interval;}
 if(r.started&&race.time>=a.next){let interval=a.interval;if(r.id===3&&r.x>65)interval*=.88;const error=a.error;const bad=a.mistakes<1&&race.random()<error;if(bad)a.mistakes++;const side=bad&&r.lastLeg>=0?r.lastLeg:a.side;input(race,r.id,1-side,true);input(race,r.id,1-side,false);input(race,r.id,side+2,true);input(race,r.id,side+2,false);a.side=1-side;a.next=race.time+interval+(race.random()-.5)*.045;}
 if(r.x>98.8){r.held[0]=r.held[1]=true;}}
 if(!r.started)continue;const before=chest(r);r.stumble=Math.max(0,r.stumble-dt);r.fall=Math.max(0,r.fall-dt);const leaning=r.held[0]&&r.held[1]&&r.fall===0;r.lean+=(Number(leaning)-r.lean)*Math.min(1,dt*12);
 const drag=1.8+(leaning?2.4:0)+(r.imbalance>.55?1.2:0);r.v=Math.max(0,r.v-drag*dt);if(r.fall>0)r.v*=Math.exp(-7*dt);r.x+=r.v*dt;
 if(chest(r)>=100){const fraction=Math.max(0,Math.min(1,(100-before)/(chest(r)-before||1)));r.finished=race.time-dt+fraction*dt;r.v=0;if(r.id===0)race.event='到終點！讓裁判量一下你的胸口。';}
 }
 if(race.runners.every(r=>r.finished!==null)||p.finished!==null&&race.time>p.finished+8){race.phase='done';race.event='四肢辛苦了，成績出爐。';}
}
export function standings(race){return [...race.runners].sort((a,b)=>(a.finished??Infinity)-(b.finished??Infinity)||b.x-a.x);}
export function recordBest(raw,time){let value;try{value=JSON.parse(raw)||{};}catch{value={};}if(!Number.isFinite(time)||time<=0)return value;return{version:1,best:Math.min(Number.isFinite(value.best)?value.best:Infinity,time),runs:(Number.isInteger(value.runs)?value.runs:0)+1};}
