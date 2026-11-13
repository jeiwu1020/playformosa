import{stationAnchor,projectedAnchor}from'./station-label-anchor.js';
const names={copier:['▤','影印','交替拉卡紙'],water:['◒','飲水','長按接水，放手噴出'],water2:['♨','便當','長按加熱，亮燈放手'],desk:['⌨','裝忙','左右交替敲鍵盤'],desk2:['▱','咖啡','交替擦地再滑出去'],chair:['↻','轉椅','長按旋轉，放手起飛'],chair2:['▣','寄件','左右交替貼膠帶'],desk3:['◷','打卡','亮燈交替蓋三次章'],shredder:['≋','碎紙','交替拉回薪資單'],server:['▥','機房','長按充電，亮燈放手'],launcher:['↟','公文','亮燈按 L／R 選方向']};
export function createStationLabels(T,stations){
 const root=document.createElement('div');root.id='stationLabels';root.setAttribute('aria-hidden','true');document.body.append(root);
 const hint=document.createElement('div');hint.id='stationHint';hint.textContent='碰設備照常彈跳；按互動／Space 才進入';document.getElementById('playStatus').append(hint);
 const entries=stations.filter(o=>names[o.id]).sort((a,b)=>a.z-b.z||a.x-b.x).map(o=>{const el=document.createElement('div');el.className='station-tag';el.dataset.station=o.id;el.dataset.placement='world';el.textContent=names[o.id][0]+' '+names[o.id][1];root.append(el);const a=stationAnchor(o);return{o,el,name:names[o.id],anchor:new T.Vector3(a.x,a.y,a.z)};});
 const point=new T.Vector3();let lastInteraction=null,near=null,nearSince=-1,wasFocus=false;
 return{root,update({office,camera,game,mode,time,frame,close=0}){
  root.hidden=mode!=='playing'||!!game.round.ending;if(root.hidden)return[];
  if(game.interaction)lastInteraction=game.interaction.stationId;const focusId=game.interaction?.stationId||(close>.001?lastInteraction:null);root.dataset.layout=focusId?'work':'full';
  const project=local=>{point.copy(local);office.localToWorld(point);point.project(camera);return projectedAnchor(point,frame,innerHeight);};
  const placed=[];
  for(const e of entries){
   const p=project(e.anchor);e.el.hidden=!p.inDepth;e.el.classList.toggle('is-current',e.o.id===focusId);
   // Same anchor and the same bottom-center alignment in full view, closeup and return.
   // Offscreen coordinates stay offscreen. The root clips naturally; nothing is clamped.
   if(p.inDepth){e.el.style.left=p.x+'px';e.el.style.top=(p.y-6)+'px';}
   const w=e.el.offsetWidth,h=e.el.offsetHeight,x=p.x-w/2,y=p.y-h-6;
   placed.push({id:e.o.id,x,y,w,h,kind:'world',anchor:{x:p.x,y:p.y},inDepth:p.inDepth,inView:p.inDepth&&x+w>0&&x<innerWidth&&y+h>0&&y<innerHeight});
  }
  if(game.round.reentry){hint.textContent='重返中 · 倒數繼續 · 連擊中斷';wasFocus=true;return placed;}
  if(focusId){wasFocus=true;hint.textContent=(names[focusId]?.[1]||'設備')+' · 互動中';return placed;}
  if(wasFocus){wasFocus=false;near=null;nearSince=-1;hint.textContent='碰設備照常彈跳；按互動／Space 才進入';}
  const nearest=entries.reduce((a,b)=>Math.hypot(game.ball.x-a.o.x,game.ball.z-a.o.z)<Math.hypot(game.ball.x-b.o.x,game.ball.z-b.o.z)?a:b),distance=Math.hypot(game.ball.x-nearest.o.x,game.ball.z-nearest.o.z),next=distance<7?nearest:null;
  if(next!==near&&time-nearSince>.45){near=next;nearSince=time;hint.textContent=near?near.name[1]+' · '+near.name[2]:'碰設備照常彈跳；按互動／Space 才進入';}
  return placed;
 }};
}
