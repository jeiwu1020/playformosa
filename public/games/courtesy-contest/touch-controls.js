// Safari compatibility guard for repeated taps inside the game UI.
// CSS manipulation is the primary policy. Keep the first tap native and only
// cancel the zoom default of a quick second tap; forward one click only when
// that tap ends on a button. Canvas/empty-space taps do not synthesize actions.
// Never cancel a drag, long press, multi-touch gesture, editable or link interaction.
export function installButtonTapGuard(doc,now=()=>performance.now()){
 const surface='.app, #instructions, #rank-dialog';
 let gesture=null,previous=null,multiTouch=false;
 const targetAt=target=>{
  if(target?.closest?.('input, textarea, select, label, [contenteditable]:not([contenteditable="false"]), [data-selectable], a[href], summary'))return null;
  const root=target?.closest?.(surface),button=target?.closest?.('button');
  if(!root||root.isConnected===false||button?.isConnected===false)return null;
  return {root,button:button||null};
 };
 const clear=()=>{gesture=null;previous=null;};
 doc.addEventListener('touchstart',event=>{
  if(event.touches.length!==1){multiTouch=true;clear();return;}
  if(multiTouch)return;
  const target=targetAt(event.target),touch=event.touches[0];
  if(!target){clear();return;}
  gesture={...target,id:touch.identifier,x:touch.clientX,y:touch.clientY,at:now()};
 },{capture:true,passive:true});
 doc.addEventListener('touchmove',event=>{
  if(event.touches.length!==1){multiTouch=true;clear();return;}
  if(!gesture)return;
  const touch=Array.from(event.touches).find(t=>t.identifier===gesture.id);
  if(!touch||Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y)>10)clear();
 },{capture:true,passive:true});
 doc.addEventListener('touchcancel',event=>{clear();multiTouch=event.touches.length>0;},{capture:true,passive:true});
 doc.addEventListener('touchend',event=>{
  if(multiTouch||event.touches.length){multiTouch=event.touches.length>0;clear();return;}
  const start=gesture;gesture=null;
  const touch=Array.from(event.changedTouches).find(t=>t.identifier===start?.id),at=now();
  const end=touch&&targetAt(doc.elementFromPoint(touch.clientX,touch.clientY));
  // touchend.target is latched to the start element, so hit-test the release.
  if(!start||!touch||event.changedTouches.length!==1||at-start.at>500||
   Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>10||
   !end||end.root!==start.root||end.button!==start.button){previous=null;return;}
  const repeat=previous?.root===start.root&&at-previous.at<=350&&
   Math.hypot(touch.clientX-previous.x,touch.clientY-previous.y)<=40;
  previous={root:start.root,button:start.button,x:touch.clientX,y:touch.clientY,at};
  if(!repeat||!event.cancelable||event.defaultPrevented)return;
  event.preventDefault();
  // Without successful cancellation the browser will still issue a native click.
  if(event.defaultPrevented&&start.button&&!start.button.disabled)start.button.click();
 },{capture:true,passive:false});
}
if(typeof document!=='undefined')installButtonTapGuard(document);
