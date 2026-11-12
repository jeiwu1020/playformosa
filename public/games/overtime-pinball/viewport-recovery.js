// Adapted from the existing Long Jump standalone-origin recovery (4edce14).
// Fixed UI uses native pointer hit testing: repair the root viewport, never clientY.
export function installViewportRecovery(win,doc,{onChange=()=>{},onOrientation=()=>{}}={}){
 let queued=false,disposed=false,lastRequest=null;
 function update(){
  if(disposed)return;queued=false;
  const vv=win.visualViewport,active=doc.activeElement;
  const standalone=win.navigator?.standalone===true||Boolean(win.matchMedia?.('(display-mode: standalone)').matches);
  const recover=standalone&&vv&&Math.abs(vv.scale-1)<=.001&&Math.abs(vv.width-win.innerWidth)<=1&&Math.abs(vv.height-win.innerHeight)<=1&&!active?.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)&&(win.scrollX||win.scrollY||vv.offsetLeft||vv.offsetTop);
  if(recover){
   const state=[win.scrollX,win.scrollY,vv.offsetLeft,vv.offsetTop,vv.width,vv.height,active];
   if(!lastRequest?.every((value,i)=>value===state[i])){lastRequest=state;win.scrollTo({left:0,top:0,behavior:'instant'});}
  }else lastRequest=null;
  // The acknowledgement can arrive later; its scroll event remeasures geometry.
  onChange();
 }
 function schedule(){if(!disposed&&!queued){queued=true;win.requestAnimationFrame(update);}}
 function rotate(){if(disposed)return;onOrientation();schedule();}
 const events=['resize','scroll','focus','focusin','pageshow'];
 for(const event of events)win.addEventListener(event,schedule);
 win.addEventListener('orientationchange',rotate);win.screen?.orientation?.addEventListener('change',rotate);
 win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
 update();
 return()=>{disposed=true;for(const event of events)win.removeEventListener(event,schedule);win.removeEventListener('orientationchange',rotate);win.screen?.orientation?.removeEventListener('change',rotate);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);};
}
