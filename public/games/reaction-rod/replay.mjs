// Read-only presentation recording: never retain or advance the live simulation.
const freeze=Object.freeze,COUNT=10,MAX_EFFECTS=100;
const number=value=>{if(!Number.isFinite(value))throw Error('Invalid replay number');return value;};
const integer=(value,min,max)=>{if(!Number.isInteger(value)||value<min||value>max)throw Error('Invalid replay index');return value;};
function copyVisual(visual){
 if(visual==null)return null;
 if(!Array.isArray(visual.effects)||visual.effects.length>MAX_EFFECTS)throw Error('Invalid replay effects');
 return freeze({effects:freeze(visual.effects.map(e=>{
  const age=number(e.age),scale=number(e.scale);if(age<0||age>.45||scale<0||scale>1)throw Error('Invalid replay effect age');
  return freeze({x:number(e.x),y:number(e.y),z:number(e.z),scale,age,vx:number(e.vx),vy:number(e.vy),color:integer(e.color,0,4)});
 }))});
}
function snapshot(w,p={}){
 if(!['ready','playing','paused','done'].includes(w.state)||!['upright','sitting','rising'].includes(w.body.phase))throw Error('Invalid replay state');
 if(!Array.isArray(w.hands)||w.hands.length!==2||!Array.isArray(w.body.feet)||w.body.feet.length!==2)throw Error('Invalid replay pose');
 const index=integer(w.index,0,COUNT),caught=integer(w.caught,0,COUNT),missed=integer(w.missed,0,COUNT);
 if(caught+missed!==index)throw Error('Invalid replay progress');
 const b=w.body,input=w.input,held=p.held??[0,0],history=p.history??[];
 if(!Array.isArray(held)||held.length!==2||!Array.isArray(history)||history.length>COUNT||history.some(x=>x!=='caught'&&x!=='missed'))throw Error('Invalid replay presentation');
 if(p.noticeText!=null&&(typeof p.noticeText!=='string'||p.noticeText.length>1000))throw Error('Invalid replay notice');
 return freeze({world:freeze({
  state:w.state,time:number(w.time),index,caught,missed,streak:integer(w.streak,0,COUNT),activeHand:integer(w.activeHand,0,1),
  body:freeze({crouch:number(b.crouch),x:number(b.x),feet:freeze(b.feet.map(number)),phase:b.phase,angle:number(b.angle),strain:number(b.strain),fallTime:number(b.fallTime)}),
  hands:freeze(w.hands.map((h,i)=>{if(h.side!==(i?1:-1))throw Error('Invalid replay hand');return freeze({side:h.side,x:number(h.x),y:number(h.y),vx:number(h.vx)});})),
  input:freeze({x:number(input.x),y:number(input.y),engaged:Boolean(input.engaged)}),
  rod:w.rod?freeze({lane:integer(w.rod.lane,0,4),y:number(w.rod.y)}):null
 }),presentation:freeze({held:freeze(held.map(number)),history:freeze(history.slice()),noticeTime:number(p.noticeTime??0),noticeText:p.noticeText??'',visual:copyVisual(p.visual)})});
}
function changed(a,b){
 const x=a.world,y=b.world;
 return x.state!==y.state||x.index!==y.index||x.caught!==y.caught||x.missed!==y.missed||x.streak!==y.streak||x.body.phase!==y.body.phase||x.activeHand!==y.activeHand||x.input.engaged!==y.input.engaged||x.rod?.lane!==y.rod?.lane||a.presentation.noticeText!==b.presentation.noticeText||a.presentation.held.some((n,i)=>(n>0)!==(b.presentation.held[i]>0));
}
export function createRoundReplay({fps=30,maxFrames=3600}={}){
 const validOptions=Number.isFinite(fps)&&fps>0&&Number.isSafeInteger(maxFrames)&&maxFrames>=2;
 let samples=[],latest=null,interval=1/(validOptions?fps:30),finished=false,failed=!validOptions,ready=false,active=false,paused=false,time=0,cursor=0,current=null;
 const size=()=>samples.length+(latest?1:0),duration=()=>latest?latest.frame.world.time:0;
 function fail(){failed=true;ready=active=paused=false;samples=[];latest=null;current=null;time=cursor=0;}
 function compact(){
  if(size()<=maxFrames)return;
  if(samples.filter(s=>s.key).length+1>maxFrames){fail();return;}
  do{
   interval*=2;
   let last=-Infinity;
   samples=samples.filter(s=>{if(s.key||s.frame.world.time-last>=interval){last=s.frame.world.time;return true;}return false;});
  }while(size()>maxFrames);
 }
 function record(world,presentation={}, {force=false}={}){
  if(failed||finished)return false;
  try{
   const frame=snapshot(world,presentation),w=frame.world,previous=latest?.frame.world;
   if(w.time<0||(!latest&&(w.time!==0||w.index!==0||w.rod!==null))||(previous&&(w.time<previous.time||w.index<previous.index||w.index>previous.index+1||w.caught<previous.caught||w.missed<previous.missed)))throw Error('Incomplete replay timeline');
   if(w.rod&&w.index>=COUNT)throw Error('Unexpected final rod');
   const key=!latest||Boolean(force)||changed(latest.frame,frame);
   if(latest&&w.time===previous.time){latest={frame,key:latest.key||key};return true;}
   if(latest&&(latest.key||!samples.length||previous.time-samples.at(-1).frame.world.time>=interval))samples.push(latest);
   latest={frame,key};compact();return !failed;
  }catch{fail();return false;}
 }
 function finish(){
  if(finished)return ready;finished=true;
  if(failed||!latest)return false;
  const w=latest.frame.world;
  ready=w.state==='done'&&w.index===COUNT&&w.caught+w.missed===COUNT&&samples.length>0&&duration()>0;
  return ready;
 }
 function start(){if(!ready)return false;active=true;paused=false;time=cursor=0;current=samples[0].frame;return true;}
 function stop(){active=paused=false;}
 function reset(){samples=[];latest=null;interval=1/(validOptions?fps:30);finished=ready=active=paused=false;failed=!validOptions;time=cursor=0;current=null;}
 function setPaused(value){paused=active&&Boolean(value);}
 function advance(seconds){
  if(!active||paused||!Number.isFinite(seconds)||seconds<=0)return;
  time=Math.min(duration(),time+seconds);
  while(cursor+1<samples.length&&samples[cursor+1].frame.world.time<=time)cursor++;
  current=time>=duration()?latest.frame:samples[cursor].frame;
  if(time>=duration()){active=false;paused=false;}
 }
 return{record,finish,start,stop,reset,setPaused,advance,get ready(){return ready;},get active(){return active;},get paused(){return paused;},get current(){return current;},get time(){return time;},get duration(){return duration();},get size(){return size();},get failed(){return failed;}};
}
