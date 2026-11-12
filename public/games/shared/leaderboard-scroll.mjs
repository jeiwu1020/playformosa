// Only a deliberate expansion may move a result view. Never focus the nickname
// input or use scrollIntoView: either can pan the page or summon a mobile keyboard.
export function bindManualUploadScroll({panel,result}){
 const win=panel.ownerDocument.defaultView,summary=panel.querySelector('summary');
 const request=typeof win.requestAnimationFrame==='function'?fn=>win.requestAnimationFrame(fn):fn=>win.setTimeout(fn,0);
 const cancelFrame=typeof win.requestAnimationFrame==='function'?id=>win.cancelAnimationFrame(id):id=>win.clearTimeout(id);
 let frame=null,generation=0;
 // A close/hide followed by reopening in the same frame must still invalidate
 // the old request. Observe only while an expansion is waiting for layout.
 const observer=new win.MutationObserver(records=>{
  if(records.some(record=>{
   const {target,attributeName,oldValue}=record;
   if(record.type==='childList')return [...record.removedNodes].some(node=>node===panel||node.contains?.(panel));
   if(attributeName==='open')return oldValue!==null;
   if(attributeName==='hidden'||attributeName==='inert')return oldValue!==null||target.hasAttribute(attributeName);
   if(attributeName==='aria-hidden')return oldValue==='true'||target.getAttribute(attributeName)==='true';
   return true;
  }))cancel();
 });
 function cancel(){generation++;if(frame!==null)cancelFrame(frame);frame=null;observer.disconnect();}
 function visible(){
  if(!result?.isConnected||!panel.isConnected||!panel.open||!panel.getClientRects().length)return false;
  for(let node=panel;node;node=node.parentElement){
   if(node.hidden||node.hasAttribute('inert')||node.getAttribute('aria-hidden')==='true'||(node.tagName==='DIALOG'&&!node.open))return false;
   const style=win.getComputedStyle(node);
   if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;
  }
  return true;
 }
 function reveal(){
  if(!visible())return;
  const boundary=result.closest('dialog')||result,doc=panel.ownerDocument;
  const panelRect=panel.getBoundingClientRect(),labelRect=panel.querySelector('label').getBoundingClientRect(),cancelRect=panel.querySelector('[data-cancel]').getBoundingClientRect();
  const viewportTop=win.visualViewport?.offsetTop||0,viewportBottom=viewportTop+(win.visualViewport?.height||win.innerHeight);
  const roots=[];
  for(let node=panel.parentElement;node&&node!==doc.body&&node!==doc.documentElement;node=node.parentElement){
   const style=win.getComputedStyle(node),overflow=style.overflowY||style.overflow;
   if(/^(auto|scroll|overlay)$/.test(overflow)&&node.clientHeight>0&&node.scrollHeight>node.clientHeight+1)roots.push(node);
   if(node===boundary)break;
  }
  let shifted=0;
  for(const node of roots){
   const box=node.getBoundingClientRect(),outermost=node===roots.at(-1),clientTop=box.top+node.clientTop;
   // An inner scroller may be outside the viewport until the outer one moves.
   // Reveal within its own bounds first; only the outer root uses viewport clips.
   const top=(outermost?Math.max(clientTop,viewportTop):clientTop)+8,bottom=(outermost?Math.min(clientTop+node.clientHeight,viewportBottom):clientTop+node.clientHeight)-8,height=bottom-top;
   if(height<=0)continue;
   // A short landscape viewport cannot show the entire privacy explanation.
   // Prefer the nickname and submission controls in that case.
   const fullPanel=panelRect.height<=height,targetTop=(fullPanel?panelRect.top:labelRect.top)-shifted,targetBottom=(fullPanel?panelRect.bottom:cancelRect.bottom)-shifted;
   const delta=targetBottom-targetTop>height||targetTop<top?targetTop-top:Math.max(0,targetBottom-bottom);
   const next=Math.max(0,Math.min(node.scrollHeight-node.clientHeight,node.scrollTop+delta)),moved=next-node.scrollTop;
   if(Math.abs(moved)>.5){
    // Immediate movement respects reduced motion and cannot leave a native
    // animation running after reset, suspend, close or replay return.
    if(typeof node.scrollTo==='function')node.scrollTo({top:next,left:node.scrollLeft,behavior:'instant'});
    else node.scrollTop=next;
    shifted+=moved;
   }
  }
 }
 function onSummaryClick(event){
  cancel();if(event.defaultPrevented||panel.open)return;
  const token=generation;
  for(let node=panel;node;node=node.parentElement)observer.observe(node,{attributes:true,attributeOldValue:true,attributeFilter:['open','hidden','inert','aria-hidden','style','class'],childList:true});
  frame=request(()=>{
   frame=null;if(token!==generation||!visible()){cancel();return;}
   frame=request(()=>{frame=null;if(token===generation)reveal();observer.disconnect();});
  });
 }
 function onToggle(){if(!panel.open)cancel();}
 summary.addEventListener('click',onSummaryClick);
 panel.addEventListener('toggle',onToggle);
 return {cancel,destroy(){cancel();summary.removeEventListener('click',onSummaryClick);panel.removeEventListener('toggle',onToggle);}};
}
