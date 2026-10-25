// Shared v7 continuous-joint driver; filename retained for existing test imports.
import {fresh,step,DT} from '../../public/games/long-jump/physics.mjs';
export const rhythm=(time,period=.32,arms=true)=>{const n=Math.floor(time/period)%2;return[arms?1-n:0,arms?n:0,n,1-n,0];};
export function simulate({period=.32,charge=.35,startX=4,arms=true,air='coord',fps=120,onStep=()=>{},mapInput=i=>i}={}){
 const s=fresh();let chargeAt=null,airAt=null,acc=0,steps=0;
 while(s.phase!=='done'){
  acc+=1/fps;
  while(acc>=DT&&s.phase!=='done'){
   if(s.phase==='run'&&s.x>startX&&chargeAt===null)chargeAt=s.t;
   let input=[0,0,0,0,0];
   if(s.phase==='run')input=chargeAt===null?rhythm(s.t,period,arms):[0,0,0,0,s.t-chargeAt<charge];
   else if(s.phase==='air'){
    const time=s.t-(airAt??s.t),n=Math.floor(time/period)%2;
    input=typeof air==='function'?air(s,time):air==='coord'?rhythm(time,period,arms):air==='same'?[n,1-n,n,1-n,0]:air==='left'?[1,0,1,0,0]:air==='hold'?[1,1,1,1,0]:air==='legs'?[0,0,n,1-n,0]:[0,0,0,0,0];
   }
   const before=s.phase;step(s,mapInput(input));onStep(s);
   if(before==='run'&&s.phase==='air')airAt=s.t;
   acc-=DT;if(++steps>6000)throw Error('trial did not terminate within 50 simulated seconds');
  }
 }
 return s;
}
export function launch(options={}){let launch;simulate({...options,air:'none',onStep(s){if(!launch&&s.phase==='air')launch=structuredClone(s);options.onStep?.(s);}});if(!launch)throw Error('policy never achieved takeoff');return launch;}
export function fly(initial,policy,onStep=()=>{}){const s=structuredClone(initial),start=s.t;for(let n=0;n<1800&&s.phase!=='done';n++){step(s,policy(s,s.t-start));onStep(s);}if(s.phase!=='done')throw Error('flight did not terminate');return s;}
