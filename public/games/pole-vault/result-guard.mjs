// Physical contacts outlive race-input clearing. A result action needs a quiet,
// fully released boundary, then its own complete gesture; a timeout alone is not enough.
export function createResultGuard({now=()=>performance.now()}={}){
 const pointers=new Set(),keys=new Set();let active=false,until=0,candidate=null,permit=null,lastPointer=-Infinity;
 const quiet=()=>{until=Math.max(until,now()+250);};
 const ready=()=>active&&!pointers.size&&!keys.size&&now()>=until;
 const invalidate=()=>{candidate=null;permit=null;};
 return{
  get active(){return active},get ready(){return ready()},get usable(){return ready()||!!candidate||!!permit},
  begin(){active=true;invalidate();until=now()+600;},
  end(){active=false;invalidate();},
  interrupt({clearPhysical=false}={}){invalidate();if(clearPhysical){pointers.clear();keys.clear();}if(active)until=now()+600;},
  pointerDown(id,target){lastPointer=now();const allowed=ready();invalidate();pointers.add(id);if(allowed&&target)candidate={kind:'pointer',id,target};if(active)quiet();},
  pointerMove(id,distance){if(candidate?.kind==='pointer'&&candidate.id===id&&distance>12)candidate=null;},
  pointerUp(id,target,cancelled=false){lastPointer=now();pointers.delete(id);const c=candidate;if(c?.kind==='pointer'&&c.id===id){candidate=null;if(!cancelled&&c.target===target&&!pointers.size&&!keys.size)permit={...c,at:now()};}if(active)quiet();},
  lostCapture(id){if(candidate?.kind==='pointer'&&candidate.id===id)candidate=null;},
  keyDown(code,target,repeat=false){if(!['KeyA','KeyS','KeyJ','KeyK','Enter','Space'].includes(code))return;const allowed=ready();if(!repeat&&!keys.has(code)){invalidate();if(allowed&&target&&['Enter','Space'].includes(code))candidate={kind:'key',id:code,target};}keys.add(code);if(active)quiet();},
  keyUp(code,target){keys.delete(code);const c=candidate;let fire=false;if(c?.kind==='key'&&c.id===code){candidate=null;if(c.target===target&&!pointers.size&&!keys.size){permit={...c,at:now()};fire=true;}}if(active&&['KeyA','KeyS','KeyJ','KeyK','Enter','Space'].includes(code))quiet();return fire;},
  accept(target,{detail=0,pointerId,pointerType='',fromTouch=false,allowAssistive=true}={}){
   if(!active)return false;
   const p=permit;permit=null;const physical=detail>0||!!pointerType||fromTouch;
   const matches=p&&p.target===target&&now()-p.at<800&&!pointers.size&&!keys.size&&(physical?p.kind==='pointer'&&(pointerId===undefined||pointerId===p.id):p.kind==='key');
   const assistive=allowAssistive&&!physical&&!p&&ready()&&now()-lastPointer>=1000;
   if(!matches&&!assistive)return false;
   invalidate();quiet();return true;
  }
 };
}
export function bindResultGuard(doc,guard,resolveAction){
 const starts=new Map(),resolve=e=>resolveAction(e?.target);
 doc.addEventListener('pointerdown',e=>{starts.set(e.pointerId,{x:e.clientX,y:e.clientY});guard.pointerDown(e.pointerId,resolve(e));},true);
 doc.addEventListener('pointermove',e=>{const p=starts.get(e.pointerId);if(p)guard.pointerMove(e.pointerId,Math.hypot(e.clientX-p.x,e.clientY-p.y));},true);
 doc.addEventListener('pointerup',e=>{guard.pointerUp(e.pointerId,resolveAction(doc.elementFromPoint(e.clientX,e.clientY)));starts.delete(e.pointerId);},true);
 doc.addEventListener('pointercancel',e=>{guard.pointerUp(e.pointerId,null,true);starts.delete(e.pointerId);},true);
 doc.addEventListener('lostpointercapture',e=>guard.lostCapture(e.pointerId),true);
 doc.addEventListener('keydown',e=>{const target=resolve(e);guard.keyDown(e.code,target,e.repeat);if(guard.active&&target&&['Enter','Space'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();}},true);
 doc.addEventListener('keyup',e=>{const target=resolve(e),fire=guard.keyUp(e.code,target);if(guard.active&&target&&['Enter','Space'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(fire)target.click();}},true);
 doc.addEventListener('click',e=>{const target=resolve(e);if(guard.active&&target&&!guard.accept(target,{detail:e.detail,pointerId:e.pointerId,pointerType:e.pointerType,fromTouch:e.sourceCapabilities?.firesTouchEvents,allowAssistive:e.isTrusted})){e.preventDefault();e.stopImmediatePropagation();}},true);
}
