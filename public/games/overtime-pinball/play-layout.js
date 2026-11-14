// HUD and render frame share CSS geometry. Layout never modifies game state.
export function setupPlayLayout(){
 const $=id=>document.getElementById(id),hud=$('hud');
 const make=(id,parent)=>{const el=document.createElement('div');el.id=id;parent.append(el);return el;};
 const frame=make('playFrame',document.body);frame.setAttribute('aria-hidden','true');
 const rail=make('playRail',hud),status=make('playStatus',rail),details=make('playDetails',rail),messages=make('playMessages',details);
 status.append(document.querySelector('.scorecard'),$('lampHud'));
 const zoneLine=make('playZoneLine',messages);zoneLine.append($('zone'),$('combo'));
 messages.append($('joke'),$('doorWarning'));
 details.append($('activityPanel'),$('comic'));
 rail.append(document.querySelector('.mini-board'));
 // Follow actual wrapping and safe-area height; never reserve camera space.
 new ResizeObserver(()=>document.body.style.setProperty('--status-height',`${status.getBoundingClientRect().height}px`)).observe(status);
}
export function playFrame(){const r=document.getElementById('playFrame').getBoundingClientRect();return{x:r.left,y:innerHeight-r.bottom,w:r.width,h:r.height};}
export function blendPlayFrame(start,end,t,w,h){const p=Math.max(0,Math.min(1,t)),e=p*p*p*(p*(p*6-15)+10);return{x:start.x*w+(end.x-start.x*w)*e,y:start.y*h+(end.y-start.y*h)*e,w:start.w*w+(end.w-start.w*w)*e,h:start.h*h+(end.h-start.h*h)*e};}

export function playSafeInsets(){
 const s=getComputedStyle(document.body),safeTop=parseFloat(s.getPropertyValue('--safe-top'))||0,safeBottom=parseFloat(s.getPropertyValue('--safe-bottom'))||0;
 const compact=matchMedia('(max-width:999px), (pointer:coarse)').matches;
 const frame=document.getElementById('playFrame')?.getBoundingClientRect();
 // Reserve the compact status and one persistent prompt line. Event content
 // must not resize this reservation, otherwise each bonus pumps the camera.
 const reserve=parseFloat(s.getPropertyValue('--camera-top-reserve'));
 const cameraTop=compact&&frame?Math.min(Math.max(0,frame.height-80),Number.isFinite(reserve)?Math.max(0,reserve):(innerWidth<innerHeight?108:0)):undefined;
 return{safeTop,safeBottom,compact,cameraTop,desktop:document.body.classList.contains('desktop-layout')};
}
