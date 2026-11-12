// Presentation only; never owns game input, timing or scoring.
const gap=4;
const overlaps=(a,b)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
const defaultChrome=(w,h)=>[{x:8,y:8,width:Math.min(160,w*.46),height:108},{x:w-136,y:8,width:128,height:70},{x:8,y:h-52,width:w-16,height:44}];
export function journeyCardLayout(width,height,{avoid=defaultChrome(width,height),previous=null}={}){
 const narrow=width<=640,preferred=Math.min(narrow?340:310,width-24),clear=r=>r.x>=gap&&r.y>=gap&&r.x+r.width<=width-gap&&r.y+r.height<=height-gap&&!avoid.some(b=>overlaps(r,b));
 // Retain a safe placement while the athlete moves; only relocate on collision.
 if(previous&&!previous.slot&&clear(previous))return previous;
 for(const mode of ['full','compact','micro']){
  const cardHeight=mode==='full'?68:mode==='compact'?44:26;
  for(const cardWidth of [...new Set([preferred,Math.min(preferred,280),Math.min(preferred,240)])]){
   if(cardWidth<240)continue;
   const xs=[(width-cardWidth)/2,gap,width-cardWidth-gap,...avoid.flatMap(b=>[b.x+b.width+gap,b.x-cardWidth-gap])];
   const ys=[narrow?height-60-cardHeight:12,height-cardHeight-gap,gap,...avoid.flatMap(b=>[b.y-cardHeight-gap,b.y+b.height+gap])];
   for(const y of ys)for(const x of xs){const r={x,y,width:cardWidth,height:cardHeight,compact:mode!=='full',micro:mode==='micro',slot:false};if(clear(r))return r;}
  }
 }
 // A genuinely crowded scene gets a separate flow row, never a covering overlay.
 return{x:0,y:0,width:Math.min(340,width),height:68,compact:false,micro:false,slot:true};
}
const copy=j=>({title:j.main.label,kicker:`${String(j.stageNumber).padStart(2,'0')} / ${j.stageCount} · ${j.cycle?'平行宇宙巡遊':j.main.datum}`,short:`${j.stageNumber}/${j.stageCount} · ${j.main.fantasy?'幻想':j.main.id==='lunar'?'地月示意':j.main.id==='karman'?'100 km 慣例':'景觀'}`,note:j.main.note});
export function createJourneyHud(host){
 const doc=host.ownerDocument??document,element=doc.createElement('div'),kicker=doc.createElement('small'),title=doc.createElement('strong'),note=doc.createElement('span');
 element.className='vault-journey-card';element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.setAttribute('aria-atomic','true');element.hidden=true;
 Object.assign(element.style,{position:'absolute',display:'none',zIndex:'3',pointerEvents:'none',boxSizing:'border-box',padding:'7px 10px',borderRadius:'11px',border:'1px solid #adc7b6',background:'rgba(255,249,224,.96)',boxShadow:'0 2px 8px #102e3329',color:'#294d50',textAlign:'center',lineHeight:'1.25',overflow:'hidden'});
 Object.assign(kicker.style,{display:'block',fontSize:'10px',fontWeight:'650',letterSpacing:'.02em',whiteSpace:'nowrap'});Object.assign(title.style,{display:'block',fontSize:'18px',fontWeight:'850',marginTop:'1px',whiteSpace:'nowrap'});Object.assign(note.style,{display:'block',fontSize:'11px',marginTop:'3px',whiteSpace:'nowrap'});
 element.appendChild(kicker);element.appendChild(title);element.appendChild(note);host.appendChild(element);
 const chrome=[...(host.parentElement?.querySelectorAll?.('.hud > .timer,.hud > .race-info,.technique,.arena-bottom')??[])],frame=host.closest?.('.pf-controls-frame'),slotHost=frame?.parentElement??host.parentElement,slotBefore=frame??host;
 let previous='',viewport='',measurementKey='',measured=[],lastLayout=null,inSlot=false;
 function obstacles(width,height,context){
  if(context.capture)return context.athlete?[context.athlete]:[];
  // Measure only when viewport, phase, stage or text wrapping shape can change.
  const key=[width,height,context.phase,context.stage,...chrome.slice(0,2).map(n=>(n.textContent??'').replace(/[0-9]/g,'0'))].join(':');
  if(key!==measurementKey){const origin=host.getBoundingClientRect();measured=chrome.map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>({x:r.left-(origin.left??0),y:r.top-(origin.top??0),width:r.width,height:r.height}));measurementKey=key;}
  return[...(chrome.length?measured:defaultChrome(width,height)),...(context.athlete?[context.athlete]:[])];
 }
 return{element,update(j,width,height,context={}){
  if(j.stageNumber<1){if(!context.capture){element.hidden=true;element.style.display='none';if(inSlot){host.appendChild(element);inSlot=false;}lastLayout=null;}return null;}
  const dimensions=width+':'+height,r=journeyCardLayout(width,height,{avoid:obstacles(width,height,{...context,stage:j.main.id}),previous:!context.capture&&dimensions===viewport?lastLayout:null});
  if(context.capture)return r;
  element.hidden=false;
  if(r.slot&&!inSlot&&slotHost?.insertBefore){slotHost.insertBefore(element,slotBefore.nextSibling??null);inSlot=true;}else if(!r.slot&&inSlot){host.appendChild(element);inSlot=false;}
  const signature=j.main.id+':'+j.cycle+':'+r.micro;if(signature!==previous){const t=copy(j);kicker.textContent=r.micro?t.short:t.kicker;title.textContent=t.title;note.textContent=t.note;element.dataset.stage=j.main.id;element.dataset.category=j.main.fantasy?'fantasy':'reference';previous=signature;}
  const placement=JSON.stringify(r);if(placement!==JSON.stringify(lastLayout)||dimensions!==viewport){Object.assign(element.style,{position:r.slot?'relative':'absolute',left:r.slot?'auto':r.x+'px',top:r.slot?'auto':r.y+'px',width:r.slot?'100%':r.width+'px',maxWidth:r.slot?'340px':'none',height:r.height+'px',margin:r.slot?'0 auto 8px':'0',padding:r.micro?'3px 8px':r.compact?'4px 8px':'7px 10px',display:r.micro?'flex':'block',alignItems:'center',justifyContent:'center',gap:'7px'});title.style.fontSize=r.micro?'13px':r.compact?'15px':width<=640?'17px':'18px';title.style.marginTop=r.micro?'0':'1px';kicker.style.fontSize=r.micro?'9px':'10px';note.hidden=r.compact;note.style.display=r.compact?'none':'block';element.dataset.placement=r.slot?'slot':r.micro?'micro':r.compact?'compact':'full';lastLayout=r;viewport=dimensions;}
  return r;
 }};
}
export function paintJourneyCard(ctx,j,width,height,layout=null){
 if(j.stageNumber<1)return;const r=layout??journeyCardLayout(width,height),t=copy(j);ctx.save();ctx.fillStyle='rgba(255,249,224,.96)';ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,11);ctx.fill();ctx.strokeStyle='#adc7b6';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#294d50';ctx.textAlign='center';const center=r.x+r.width/2;
 if(r.micro){ctx.font='700 13px system-ui';ctx.fillText(`${t.short} · ${t.title}`,center,r.y+18,r.width-16);}else{ctx.font='650 10px system-ui';ctx.fillText(t.kicker,center,r.y+14,r.width-16);ctx.font=`850 ${r.compact?15:18}px system-ui`;ctx.fillText(t.title,center,r.y+(r.compact?31:35),r.width-16);if(!r.compact){ctx.font='500 11px system-ui';ctx.fillText(t.note,center,r.y+54,r.width-16);}}ctx.restore();
}
