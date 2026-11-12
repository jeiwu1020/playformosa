import {sweepCircle} from './contact.js';
export const CENTRAL={x:0,z:21,r:2.3,proximity:9,armTime:.8};
export const freshCentral=()=>({available:false,armed:null,remaining:0,litBefore:false});
export function updateCentral(g,dt,pressed,input={}){
 const c=g.central,o=CENTRAL;c.remaining=Math.max(0,c.remaining-dt);if(!c.remaining)c.armed=null;
 c.available=!g.mailRun&&g.time>=(g.stationReady.launcher||0)&&Math.hypot(g.ball.x-o.x,g.ball.z-o.z)<=o.proximity;
 if(c.available&&!c.litBefore)g.emit('centralReady');c.litBefore=c.available;
 if(!c.available){c.armed=null;c.remaining=0;return;}
 if(pressed.left&&pressed.right||input.left&&input.right){c.armed=null;c.remaining=0;return;}
 if(pressed.left!==pressed.right){c.armed=pressed.left?'left':'right';c.remaining=o.armTime;g.emit('centralArmed',{side:c.armed});}
}
export function centralContact(g,from,to){if(!g.central.armed)return null;const h=sweepCircle(from,to,CENTRAL,g.ball.r);return h?{...h,station:{...CENTRAL,id:'launcher',type:'launcher',central:true}}:null;}
