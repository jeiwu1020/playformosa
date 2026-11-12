// Deterministic 2D wall constraints. Rendered holds and physics use the SAME world points.
export const RULES=Object.freeze({outdoor:Object.freeze({name:'外牆攀爬',code:'UP-06-O',total:9,floors:6,sectionHeight:1.5,timeLimit:90})});
export const WALL=Object.freeze({handReach:.64,legReach:1.08,contactRadius:.105,dt:1/240});
const keys={j:0,k:1,a:2,s:3},clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),hypot=Math.hypot;
// Unequal rises and lateral offsets remain inside the verified reachable corridor.
export function createWall(){const rows=[0];for(let n=1;rows.at(-1)<11;n++)rows.push(rows.at(-1)+[.39,.46,.41,.44,.37][n%5]);return rows.flatMap((y,row)=>[-1,1].map((side,col)=>({id:row*2+col,x:side*(.40+[0,.12,-.08,.06,-.10][(row+col)%5])+.055*Math.sin(row*.7),y,kind:['ledge','brick','recess'][(row+col*2)%3],width:[.32,.24,.28][row%3]})));}
export function joint(s,i){return{x:s.body.x+(i%2===0?-.16:.16),y:s.body.y+(i<2?.58:0)};}
export const reach=i=>i<2?WALL.handReach:WALL.legReach;
export function canReach(s,i,p,extra=0){const j=joint(s,i);return hypot(p.x-j.x,p.y+(i>=2?.099:0)-j.y)<=reach(i)+extra;}
const contactHold=(s,l)=>l.hold===null?null:s.holds[l.hold];
export function createState(mode='outdoor',now=0){const holds=createWall(),limbs=[holds[6],holds[7],holds[0],holds[1]].map(h=>({x:h.x,y:h.y,hold:h.id,contact:true,target:null,gripping:true,reach:0,missed:false}));return{mode:'outdoor',physicsVersion:6,phase:'countdown',paused:false,lastNow:now,countdown:3,time:0,pending:0,body:{x:0,y:.95,vx:0,vy:0},holds,limbs,held:[false,false,false,false],holdAge:[0,0,0,0],progress:0,maxHeight:0,stamina:100,lean:0,spin:0,coordination:0,coordWork:0,effort:0,slip:0,mistakes:0,transfers:0,rescues:0,falling:false,fallDistance:0,hangTime:0,supports:4,supportLabel:'四點支撐',score:0,finished:false,reason:null,hazard:null,dodged:0,lockUntil:0,brace:false,message:'A／S 踩點，J／K 抓點；到位放開，留下支撐。'};}
export function findTarget(s,i){const l=s.limbs[i],side=i%2===0?-1:1;return s.holds.filter(h=>h.y>l.y+.16&&h.y<l.y+.69&&h.x*side>.08&&canReach(s,i,h,-.025)).sort((a,b)=>(a.y-l.y)+Math.abs(a.x-l.x)*.5-((b.y-l.y)+Math.abs(b.x-l.x)*.5))[0]??null;}
function latch(s,i){const l=s.limbs[i];if(!l.gripping||l.contact)return false;const candidates=s.holds.filter(h=>hypot(l.x-h.x,l.y-h.y)<=WALL.contactRadius&&canReach(s,i,h));if(!candidates.length)return false;const h=candidates.sort((a,b)=>hypot(l.x-a.x,l.y-a.y)-hypot(l.x-b.x,l.y-b.y))[0];l.x=h.x;l.y=h.y;l.hold=h.id;l.contact=true;l.target=null;l.missed=false;s.transfers++;if(s.falling){s.rescues++;s.falling=false;s.body.vy=Math.max(s.body.vy,-.5);}return true;}
// Cancellation drops intent, not a magical return to the previous world anchor.
export function cancelOutdoor(s,limb=null){for(const i of limb===null?[0,1,2,3]:[limb]){s.held[i]=false;s.holdAge[i]=0;const l=s.limbs[i];l.gripping=false;l.target=null;} }
function finish(s,reason){s.phase='done';s.reason=reason;s.finished=reason==='summit';s.score=s.finished?Math.max(0,Math.round(10000-s.time*55-s.mistakes*180+s.stamina*12)):0;s.held.fill(false);s.holdAge.fill(0);}
function moveEndpoint(s,i,dt){const l=s.limbs[i];if(l.contact){const h=contactHold(s,l);l.x=h.x;l.y=h.y;return;}const j=joint(s,i),side=i%2===0?-1:1;
let target=l.target===null?null:s.holds[l.target];if(s.held[i]&&!target){target=findTarget(s,i);if(target)l.target=target.id;}
const goal=s.held[i]?(target??{x:j.x+side*.22,y:j.y+(i<2?.8:.2)}):{x:s.body.x+side*.38,y:s.body.y+(i<2?.8:-.88)};
const dx=goal.x-l.x,dy=goal.y-l.y,d=hypot(dx,dy),speed=s.held[i]?1.65:1.1,travel=Math.min(d,dt*speed);if(d>1e-9){l.x+=dx/d*travel;l.y+=dy/d*travel;}
const ox=l.x-j.x,oy=l.y+(i>=2?.099:0)-j.y,dist=hypot(ox,oy);if(dist>reach(i)){l.x=j.x+ox/dist*reach(i);l.y=j.y+oy/dist*reach(i)-(i>=2?.099:0);}
l.reach=target?clamp(1-hypot(l.x-target.x,l.y-target.y)/.5,0,1):0;if(!s.held[i])latch(s,i);
}
function tick(s,dt){s.time+=dt;for(let i=0;i<4;i++){s.holdAge[i]=s.held[i]?s.holdAge[i]+dt:0;moveEndpoint(s,i,dt);}
const contacts=s.limbs.map(l=>l.contact),count=contacts.filter(Boolean).length,handCount=Number(contacts[0])+Number(contacts[1]),footCount=Number(contacts[2])+Number(contacts[3]),diagonal=count===2&&((contacts[0]&&contacts[3])||(contacts[1]&&contacts[2]));s.supports=count;s.coordination=diagonal?1:0;s.coordWork+=s.coordination*dt;s.supportLabel=count>=3?'三點以上 · 穩定':diagonal?'對角兩點 · 晃動':count===1&&handCount?'單手懸掛':count?'支撐偏側':'失去支撐';
const sideLoad=contacts.reduce((v,c,i)=>v+(c?(i%2===0?-1:1):0),0),wobble=diagonal?Math.sin(s.time*5.7)*.65:0;s.spin+=(sideLoad*.45+wobble-s.lean*5-s.spin*3)*dt;s.lean=clamp(s.lean+s.spin*dt,-.4,.4);
let goalX=s.body.x,goalY=s.body.y;const planted=s.limbs.filter(l=>l.contact);
if(count){goalX=planted.reduce((v,l)=>v+l.x,0)/count+(diagonal?Math.sin(s.time*5.7)*.035:0);const feet=s.limbs.slice(2).filter(l=>l.contact);if(feet.length){goalY=feet.reduce((v,l)=>v+l.y,0)/feet.length+.95; // Grounded legs extend: the primary source of upward work.
}else{const hands=s.limbs.slice(0,2).filter(l=>l.contact);goalY=Math.min(s.body.y,Math.max(...hands.map(l=>l.y))-.58-.61);}
const speed=count>=3?1.25:diagonal?1.8:.55;s.body.vy=clamp((goalY-s.body.y)*7,-2.8,speed);s.body.vx=clamp((goalX-s.body.x)*3+s.lean*.18,-.7,.7);
}else{s.body.vy=Math.max(-4.5,s.body.vy-6*dt);s.body.vx+=s.spin*.15*dt;if(!s.falling){s.falling=true;s.mistakes++;s.fallDistance=0;}}
const beforeY=s.body.y;s.body.x+=s.body.vx*dt;s.body.y+=s.body.vy*dt;
// Project pelvis onto all planted limbs' reachable circles. Endpoints stay fixed.
for(let pass=0;pass<5;pass++)for(let i=0;i<4;i++){if(!contacts[i])continue;const l=s.limbs[i],j=joint(s,i),dx=j.x-l.x,dy=j.y-l.y-(i>=2?.099:0),d=hypot(dx,dy),max=reach(i)-.012;if(d>max){s.body.x-=dx/d*(d-max);s.body.y-=dy/d*(d-max);}}
// A one-hand hang is possible, but it cannot power a climb and quickly tires.
s.hangTime=count===1&&handCount?s.hangTime+dt:Math.max(0,s.hangTime-dt*2);
s.slip=Math.max(0,s.slip+dt*(count===1?1:count===2&&!diagonal?.8:-1.5));if(s.slip>1.3){const i=contacts.findIndex(Boolean);if(i>=0){s.limbs[i].contact=false;s.limbs[i].hold=null;s.limbs[i].gripping=false;}s.slip=0;s.mistakes++;}
// Contacts that become geometrically impossible must detach, never stretch limbs.
for(let i=0;i<4;i++)if(s.limbs[i].contact&&!canReach(s,i,s.limbs[i],.015)){s.limbs[i].contact=false;s.limbs[i].hold=null;s.limbs[i].gripping=false;}
for(let i=0;i<4;i++)if(!s.limbs[i].contact){const l=s.limbs[i],j=joint(s,i),dx=l.x-j.x,dy=l.y+(i>=2?.099:0)-j.y,d=hypot(dx,dy);if(d>reach(i)){l.x=j.x+dx/d*reach(i);l.y=j.y+dy/d*reach(i)-(i>=2?.099:0);}if(!s.held[i])latch(s,i);}
s.fallDistance+=Math.max(0,beforeY-s.body.y);s.progress=Math.max(0,s.body.y-.95);s.maxHeight=Math.max(s.maxHeight,s.progress);
const overhold=Math.max(0,...s.holdAge.map(x=>x-1)),cost=dt*(.13+s.held.filter(Boolean).length*.12+(count===1?3.5:count===2&&!diagonal?1.2:diagonal?.28:0)+overhold*.35)+Math.max(0,s.body.y-beforeY)*.7;s.effort+=cost;s.stamina=Math.max(0,s.stamina-cost);
if(s.body.y<.25)finish(s,'caught');else if(s.progress>=RULES.outdoor.total-.03&&footCount&&handCount)finish(s,'summit');else if(s.stamina<=1e-8)finish(s,'exhausted');else if(s.time>=RULES.outdoor.timeLimit-1e-8){s.time=RULES.outdoor.timeLimit;finish(s,'timeout');}}
export function advance(s,now){now=Number.isFinite(now)?Math.max(s.lastNow,now):s.lastNow;let dt=(now-s.lastNow)/1000;s.lastNow=now;if(s.paused||s.phase==='done')return s;if(s.phase==='countdown'){const used=Math.min(dt,s.countdown);s.countdown-=used;dt-=used;if(s.countdown>1e-9)return s;s.phase='play';s.countdown=0;}s.pending+=dt;while(s.pending>=WALL.dt-1e-10&&s.phase==='play'){s.pending=Math.max(0,s.pending-WALL.dt);tick(s,WALL.dt);}return s;}
export function action(s,type,now){advance(s,now);if(s.phase!=='play'||s.paused)return false;const m=/^([asjk])-(down|up|cancel)$/.exec(type);if(!m)return false;const i=keys[m[1]],l=s.limbs[i];if(m[2]==='cancel'){cancelOutdoor(s,i);return true;}const down=m[2]==='down';if(down&&!s.held[i]){const target=findTarget(s,i);l.contact=false;l.hold=null;l.target=target?.id??null;l.gripping=false;l.missed=false;}s.held[i]=down;if(!down){s.holdAge[i]=0;l.gripping=true;l.missed=!latch(s,i);}return true;}
export function setPaused(s,value,now){advance(s,now);if(value)cancelOutdoor(s);s.paused=Boolean(value)&&s.phase!=='done';return s;}
export function verdict(s){return s.finished?'不是空氣有扶手，是手腳真的有抓穩。':s.reason==='caught'?'安全繩接住了，四肢下次再開會。':s.rescues?'抓回來了！下次記得讓腳也出力。':'先踩穩，再換手；外牆不接受隔空抓。';}
