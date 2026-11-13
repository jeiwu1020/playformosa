// Transparent HUD wrappers are not obstacles: use the actual visible card/button bounds.
export function lotteryHUDObstacles(doc){
 const result=[];
 for(const el of doc.querySelectorAll('.scorecard,#lampHud,#left,#right,#activityPanel,#interactionOffer,#mailStatus,#centralPrompt,#bossStatus,#routeChoice,#joke,#lotteryStatus,#doorWarning,#stationHint,header,#comic.pop')){
  let visible=true;for(let n=el;n&&n!==doc.documentElement;n=n.parentElement){const style=doc.defaultView.getComputedStyle(n);if(n.hidden||style.display==='none'||style.visibility==='hidden'){visible=false;break;}}
  if(!visible)continue;
  // stationHint spans the grid but paints only text: measure its rendered glyph-line
  // rectangles, not the transparent 820px layout box. Solid cards retain full bounds.
  let rects;
  if(el.id==='stationHint'){
   if(!el.textContent.trim())continue;
   const range=doc.createRange();range.selectNodeContents(el);
   rects=typeof range.getClientRects==='function'?[...range.getClientRects()]:[el.getBoundingClientRect()];
   range.detach?.();
  }else rects=[el.getBoundingClientRect()];
  for(const r of rects)if(r.width&&r.height)result.push({id:el.id,x:r.left,y:r.top,w:r.width,h:r.height});
 }
 return result;
}
// Only the small lottery label may move; established equipment labels stay anchored.
export function placeLotteryLabel(anchor,size,bounds,obstacles,previous=null){
 const clear=r=>r.x>=bounds.x&&r.y>=bounds.y&&r.x+r.w<=bounds.x+bounds.w&&r.y+r.h<=bounds.y+bounds.h&&!obstacles.some(o=>r.x<o.x+o.w+4&&r.x+r.w>o.x-4&&r.y<o.y+o.h+4&&r.y+r.h>o.y-4);
 const candidates=[{dx:0,dy:-28},{dx:0,dy:28},{dx:-44,dy:0},{dx:44,dy:0},{dx:-44,dy:-28},{dx:44,dy:-28},{dx:-44,dy:28},{dx:44,dy:28},{dx:0,dy:-55},{dx:0,dy:55}];
 if(previous)candidates.unshift(previous);
 for(const {dx,dy} of candidates){const r={x:anchor.x+dx-size.w/2,y:anchor.y+dy-size.h/2,...size};if(clear(r))return {...r,dx,dy};}return null;
}
export function createLotteryLabel(T,root){
 const label=document.createElement('div');label.className='station-tag lottery-station-tag';label.dataset.station='lottery';label.textContent='摸彩';label.hidden=true;Object.assign(label.style,{transform:'none',fontSize:'14px',padding:'3px 5px',background:'#742c32',borderColor:'#ffdf72'});root.append(label);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','100%');svg.setAttribute('height','100%');Object.assign(svg.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('stroke','#ffdf72');line.setAttribute('stroke-width','2');svg.append(line);root.prepend(svg);svg.style.display='none';let previous=null;const point=new T.Vector3();
 return {label,update({office,camera,frame,placed,shape,enabled}){
  label.hidden=!enabled;svg.style.display='none';if(!enabled){previous=null;return null;}
  point.set(-shape.x,1.85,shape.z);office.localToWorld(point);point.project(camera);
  const anchor={x:frame.x+(point.x+1)*frame.w/2,y:innerHeight-frame.y-(point.y+1)*frame.h/2};
  if(point.z < -1||point.z>1||anchor.x<frame.x||anchor.x>frame.x+frame.w||anchor.y<innerHeight-frame.y-frame.h||anchor.y>innerHeight-frame.y){label.hidden=true;previous=null;return null;}
  const obstacles=placed.filter(p=>p.inView).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}));
  obstacles.push(...lotteryHUDObstacles(document));
  const r=placeLotteryLabel(anchor,{w:label.offsetWidth,h:label.offsetHeight},{x:Math.max(4,frame.x),y:Math.max(4,innerHeight-frame.y-frame.h),w:Math.min(innerWidth-8,frame.w),h:Math.min(innerHeight-8,frame.h)},obstacles,previous);
  if(!r){label.hidden=true;previous=null;return null;}previous={dx:r.dx,dy:r.dy};label.style.left=r.x+'px';label.style.top=r.y+'px';
  // Endpoint uses the actual DOM edge, so zoom never leaves a disconnected leader.
  const end={x:Math.max(r.x,Math.min(r.x+r.w,anchor.x)),y:Math.max(r.y,Math.min(r.y+r.h,anchor.y))};
  line.setAttribute('x1',anchor.x);line.setAttribute('y1',anchor.y);line.setAttribute('x2',end.x);line.setAttribute('y2',end.y);svg.style.display='block';
  return {id:'lottery',...r,anchor,kind:'world',inDepth:true,inView:true};
 }};
}
