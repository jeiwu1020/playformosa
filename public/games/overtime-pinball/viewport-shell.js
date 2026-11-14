import {RoundOptions} from './round-options.js';
import {installViewportRecovery} from './viewport-recovery.js';
import {shellFrame} from './shell-geometry.js';
const frame=document.getElementById('gameWindow');let storage;try{storage=localStorage;}catch{}
let enabled=new RoundOptions(storage).sideways,lastKey='';
const bootError=document.getElementById('bootError'),bootTimer=setTimeout(()=>{bootError.hidden=false;},10000);
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='overtime:ready'){clearTimeout(bootTimer);bootError.hidden=true;}});
function update(){
 const css=getComputedStyle(document.body),safe=Object.fromEntries(['top','right','bottom','left'].map(k=>[k,parseFloat(css.getPropertyValue('--safe-'+k))||0]));
 const touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
 const f=shellFrame(innerWidth,innerHeight,enabled&&touch,safe),key=JSON.stringify(f);if(key===lastKey)return;lastKey=key;
 frame.contentWindow?.postMessage({type:'overtime:viewport'},location.origin);
 Object.assign(frame.style,{left:f.left+'px',top:f.top+'px',width:f.width+'px',height:f.height+'px',transform:f.rotation?`translateX(${f.screenWidth}px) rotate(90deg)`:'none'});frame.dataset.rotation=String(f.rotation);
}
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.type!=='overtime:sideways'||typeof e.data.enabled!=='boolean')return;enabled=e.data.enabled;update();});
installViewportRecovery(window,document,{onChange:update,onOrientation:()=>frame.contentWindow?.postMessage({type:'overtime:viewport'},location.origin)});
const url=new URL('./game.html',location.href);url.search=location.search;frame.src=url.href;
