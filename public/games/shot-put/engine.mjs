import{bodyPose}from'./pose.mjs';import{createRoute,resetFlight,advanceFlight}from'./sky-route.mjs';
export const RULES_VERSION='shot-put-v5',BEST_KEY='pf-shot-put-best-v5',DT=1/120;
const keys=['a','s','j','k'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createState(seed=1){seed=seed>>>0;return{seed,route:createRoute(seed),spent:[],hits:[],phase:'countdown',bodyAccumulator:0,clock:0,paused:false,held:[false,false,false,false],j:[0,0,0,0],lean:0,spin:0,bodyX:0,bodyV:0,extension:0,support:1,power:0,chargeProgress:0,angle:0,distance:0,x:0,y:0,flight:0,impact:0,speed:0,feedback:'按住 K 蓄力，放開推出。',recoveries:0,wobbling:false};}
export function press(s,key){const i=keys.indexOf(key);if(s.paused||s.phase!=='body'||i<0)return;if(s.held[i])return;flushBody(s);s.held[i]=true;}
export function release(s,key){const i=keys.indexOf(key);if(i<0||s.paused||s.phase!=='body')return;if(!s.held[i])return;flushBody(s);const was=s.held[i];s.held[i]=false;if(i===3&&was)launch(s);}
// Focus/ownership cancellation is not an intentional release and must never launch.
export function cancelHold(s,key,stillHeld=false){const i=keys.indexOf(key);if(i<0||s.phase!=='body')return;if(s.held[i]!==stillHeld)flushBody(s);s.held[i]=stillHeld;if(stillHeld)return;s.j[i]=0;if(i===3){s.power=0;s.chargeProgress=0;}}
// Cancellation/rebase preserves the presented body; never consume unseen remainder.
export function pause(s){if(s.phase==='body')s.bodyAccumulator=0;s.held.fill(false);if(s.phase==='body'){s.power=0;s.chargeProgress=0;s.j[3]=0;s.extension=0;}s.paused=true;}
// RAF only commits complete fixed steps. Intentional input boundaries commit the
// remainder once under the old holds, so identical timestamped input is identical.
function flushBody(s){const dt=s.bodyAccumulator||0;s.bodyAccumulator=0;if(dt>1e-10)bodyStep(s,dt);}
function bodyStep(s,dt){const old=s.j.slice();for(let i=0;i<4;i++)s.j[i]+=(Number(s.held[i])-s.j[i])*(1-Math.exp(-dt*9));s.power=s.held[3]?Math.min(1,s.power+dt/1.15):0;s.chargeProgress=s.power;
 const p=bodyPose(s),contacts=[0,1].map(i=>clamp(1-(p['foot'+i].y-.12)/.18,0,1));
 s.support=(contacts[0]*(1-.8*s.j[0])+contacts[1]*(1-.8*s.j[1]))/2;
 const supportX=(p.foot0.x*contacts[0]+p.foot1.x*contacts[1])/Math.max(.01,contacts[0]+contacts[1]);
 const com=.65*p.hip.x+.25*p.shoulder.x+.05*(p.hand0.x+p.hand1.x);
 const inertia=1+.8*s.j[2],help=6*Math.max(.15,1-(s.lean/.7)**2)+10*s.j[2];
 const torque=(s.j[1]-s.j[0])*3.5+2*(com-supportX)-.65*s.j[3]+2*Math.sin(s.lean)-help*s.lean-(2.7+2*s.j[2])*s.spin;
 s.spin+=torque/inertia*dt;s.lean=clamp(s.lean+s.spin*dt,-1.35,1.1);if(Math.abs(s.lean)>=1.1)s.spin*=.96;
 const work=contacts.reduce((v,c,i)=>v+Math.max(0,old[i]-s.j[i])*c,0);
 s.extension=s.extension*Math.exp(-dt*3)+work*2.4; // finite joint travel, never key-repeat bonuses
 s.bodyV=(s.bodyV+work*1.8*Math.cos(s.lean))*Math.exp(-dt*5);s.bodyX+=s.bodyV*dt;
 if(Math.abs(s.lean)>.4)s.wobbling=true;if(s.wobbling&&Math.abs(s.lean)<.18){s.recoveries++;s.wobbling=false;}
 s.feedback=Math.abs(s.lean)>.55?'身體歪了！伸 J 平衡，試著放腳踩穩。':s.held[3]?(s.support<.35?'腳還縮著，放腳蹬地再放 K。':'身體繃緊了；放 K 推出。'):'按住 K 蓄力，放開推出。';
}
function launch(s){s.throwPose=bodyPose(s);s.releaseSupport=s.support;s.releaseExtension=s.extension;s.releaseLean=s.lean;s.angle=clamp(38-s.lean*65+Math.min(1,s.extension)*8,8,135);s.radians=s.angle*Math.PI/180;
 s.speed=(3+8*s.power+26*Math.min(1.25,s.extension))*(.22+.78*s.support);const shoulder=s.throwPose.shoulder;s.launchX=shoulder.x+.659999*Math.cos(s.radians)+.02;s.releaseHeight=Math.max(.01,shoulder.y+.659999*Math.sin(s.radians)-.04);s.y=s.releaseHeight;s.vx=s.speed*Math.cos(s.radians)+s.bodyV;s.vy=s.speed*Math.sin(s.radians);s.duration=(s.vy+Math.sqrt(s.vy*s.vy+19.62*s.releaseHeight))/9.81;s.distance=s.vx*s.duration;s.ballisticDistance=s.distance;s.launchVelocity={x:s.vx,y:s.vy,spin:s.spin*2+s.j[3]*4};resetFlight(s);s.backward=s.vx<0;s.foul=Math.max(s.throwPose.foot0.x,s.throwPose.foot1.x)>1.1;s.cause=s.backward?'後仰把推力送往身後，自己也坐倒了。':s.support<.35?'兩腳還縮著，沒有站穩傳力，球掉在腳邊。':s.extension<.15?'手臂有出力，但少了蹬地接力。':s.foul?'腳已踩出圈；娛樂航程完整保留，這球不列有效紀錄。':'腳掌蹬地接上身體伸展，把球從頸側送了出去。';s.phase='push';s.clock=0;s.held.fill(false);}
export function tick(s,dt){if(s.paused||!Number.isFinite(dt)||dt<=0)return;let left=dt;while(left>1e-9){if(s.phase==='done')break;if(s.phase==='air'){const outcome=advanceFlight(s,left);left=outcome.left;if(outcome.landed){s.phase='impact';s.clock=0;}else break;continue;}if(s.phase==='body'){s.bodyAccumulator=(s.bodyAccumulator||0)+left;s.clock+=left;left=0;while(s.bodyAccumulator+1e-10>=DT){bodyStep(s,DT);s.bodyAccumulator=Math.max(0,s.bodyAccumulator-DT);}continue;}const limit=s.phase==='countdown'?3:s.phase==='push'?.28:1.1;const step=Math.min(left,Math.max(0,limit-s.clock));s.clock+=step;left-=step;if(s.phase==='impact')s.impact=s.clock;if(s.clock+1e-9<limit)break;s.clock=0;if(s.phase==='countdown')s.phase='body';else if(s.phase==='push')s.phase='air';else s.phase='done';}}
export function result(s){if(s.phase!=='done')return null;const valid=!s.backward&&!s.foul&&s.distance>=0,d=Math.max(0,s.distance);return Object.freeze({rulesVersion:RULES_VERSION,seed:s.seed,contacts:s.hits.length,bonusDistance:s.distance-s.ballisticDistance,ballisticDistance:s.ballisticDistance,flightSeconds:s.flight,valid,distance:valid?d:0,rawDistance:s.distance,power:s.power,angle:s.angle,backward:s.backward,foul:s.foul,cause:s.backward?'後仰把推力送往身後，自己也坐倒了。':s.foul?'腳已踩出圈；娛樂航程完整保留，這球不列有效紀錄。':s.distance<0?'接力反彈回到出手點後方，娛樂落點保留，這球不列有效紀錄。':s.cause,support:s.releaseSupport,extension:s.releaseExtension,recoveries:s.recoveries,verdict:s.backward?'球：你家在後面對吧？':s.foul?'已出圈：娛樂航程照飛，這球不列有效紀錄。':s.distance<0?'反彈送回後方，這次是回頭件。':s.hits.length>=3?'轉運三次，鉛球已經有物流單號。':s.hits.length?'空中快遞隊：這件我幫你轉寄。':s.backward?'球：你家在後面對吧？':s.releaseSupport<.35?'腳：你先走，我們還沒上班。':d>=60?'里長：這顆要跨里申請。':d>=20?'不是鉛球，是便當外送。':'地板：今天的按摩師是你。',badge:s.backward?'反向外送員':s.foul?'出圈觀光客':s.distance<0?'反彈回頭件':s.hits.length>=3?'宇宙轉運王':s.hits.length?'空中轉寄員':s.backward?'反向外送員':s.foul?'出圈觀光客':d>=60?'鄰里級隕石':d>=20?'重力外送員':'地板按摩師',comparison:`路線 ${s.seed} · ${s.hits.length} 次接力｜原投 ${s.ballisticDistance.toFixed(2)} m｜事件 ${s.distance-s.ballisticDistance>=-.005?'+':''}${(Math.abs(s.distance-s.ballisticDistance)<.005?0:s.distance-s.ballisticDistance).toFixed(2)} m｜落點 ${s.distance.toFixed(2)} m`});}
export function saveBest(storage,r){if(!r?.valid)return;try{const old=Number(storage.getItem(BEST_KEY))||0;if(r.distance>old)storage.setItem(BEST_KEY,String(r.distance));}catch{}}

export function replayState(s){const copy=structuredClone(s);copy.phase='push';copy.clock=0;copy.impact=0;copy.paused=false;resetFlight(copy);return copy;}
