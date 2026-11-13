import * as T from './vendor/three.module.min.js';
export function isDesktopIntro(){return innerWidth>=700&&innerWidth>innerHeight&&matchMedia('(hover: hover) and (pointer: fine)').matches;}
export function setupIntro(){
 const dialog=document.getElementById('introDialog'),content=document.getElementById('introDialogContent'),title=document.getElementById('introDialogTitle');let opener=null;
 const open=()=>{opener=document.activeElement;title.textContent='加班生存指南';content.innerHTML='<div class="help-steps"><p><b>01 · 守住門</b>L／R 救球。電腦也能用 A／D 或方向鍵。</p><p><b>02 · 假裝忙</b>碰到設備會拉近互動，跟著大字提示操作。</p><p><b>03 · 賺一票</b>集燈、跑軌道、串連擊；中央台亮燈時，按 L／R 選方向。</p></div><p>操作設備時限時倒數照走；靠近與出射過場、暫停時不倒數。設備互動不計基本工時，完成另領獎金。老闆巡視撞到會踢人，仍可救回；限時結束則強制下班。</p>';dialog.showModal();};
 document.getElementById('introHelp').onclick=open;document.querySelectorAll('[data-menu-help]').forEach(el=>el.onclick=open);document.getElementById('introDialogClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>opener?.focus());
 const sync=()=>document.body.classList.toggle('desktop-layout',isDesktopIntro());sync();addEventListener('resize',sync);
}
export function introFrame(){if(innerWidth<innerHeight){const top=76,bottom=document.getElementById('intro').getBoundingClientRect().top-8;if(bottom-top>=90)return{x:12,y:innerHeight-bottom,w:innerWidth-24,h:bottom-top};return null;}if(!isDesktopIntro())return null;const r=document.getElementById('desktopSceneFrame').getBoundingClientRect();return {x:r.x,y:innerHeight-r.bottom,w:r.width,h:r.height};}
let cached;
export function fittedIntro(w,h,view){const key=`${w}:${h}:${view}`;if(cached?.key===key)return cached.pose;const sign=view==='reverse'?1:-1,c=new T.PerspectiveCamera(50,w/h,.1,350);let lo=30,hi=180;for(let n=0;n<24;n++){const d=(lo+hi)/2;c.position.set(0,.7*d+1,15+sign*d);c.lookAt(0,1,15);c.updateMatrixWorld();let fits=true;for(const x of [-24,24])for(const z of [-36,52.3])for(const y of [0,7]){const p=new T.Vector3(x,y,z).applyAxisAngle(new T.Vector3(1,0,0),.035).project(c);if(Math.abs(p.x)>.91||Math.abs(p.y)>.91)fits=false;}if(fits)hi=d;else lo=d;}const pose={position:[0,.7*hi+1,15+sign*hi],target:[0,1,15],fov:50};cached={key,pose};return pose;}
// Normalized frame keeps the opening continuous even if the window changes size.
export function transitionFrame(frame,t,w,h){t=Math.max(0,Math.min(1,t));const e=t*t*t*(t*(t*6-15)+10);return {x:frame.x*(1-e)*w,y:frame.y*(1-e)*h,w:(frame.w+(1-frame.w)*e)*w,h:(frame.h+(1-frame.h)*e)*h};}
