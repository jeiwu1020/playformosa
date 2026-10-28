// Budget actual CSS viewport space on every device, independent of OS scale.
export function gameLayout({width,height,insets={},coarsePointer=false,standalone=false}){
 const safe={top:Math.max(0,insets.top||0),right:Math.max(0,insets.right||0),bottom:Math.max(0,insets.bottom||0),left:Math.max(0,insets.left||0)};
 const innerWidth=width-safe.left-safe.right-16,mainHeight=height-safe.top-safe.bottom-64;
 const mode=width>=640&&width>height?'side':'bottom',sideWidth=width<740?88:Math.max(96,Math.min(128,Math.floor(width*.09)));
 const buttonHeight=mode==='side'?Math.max(56,Math.min(128,Math.floor((mainHeight-12)/2))):96;
 // Lift only phone portrait controls by their full former height: new bottom = old top.
 const controlLift=standalone&&coarsePointer&&width<640&&height>width?buttonHeight:0;
 const playHeight=mode==='side'?mainHeight:mainHeight-104-controlLift,sceneExtension=controlLift?controlLift+buttonHeight+8:0;
 return{mode,safe,sideWidth,mainHeight,buttonHeight,controlLift,playHeight,sceneExtension,arenaWidth:mode==='side'?innerWidth-sideWidth*2-16:innerWidth,arenaHeight:playHeight+sceneExtension,usedWidth:width,usedHeight:height};
}
export function isStandalone(win){return win.navigator?.standalone===true||Boolean(win.matchMedia?.('(display-mode: standalone)').matches);}
// Keep the original top edge and world-to-pixel scale; reveal only extra lower field.
export function renderCameraBounds(frame,playHeight,renderHeight){const extra=Math.max(0,renderHeight-playHeight);return{left:-frame.halfW,right:frame.halfW,top:frame.halfH,bottom:-frame.halfH-2*frame.halfH*extra/Math.max(1,playHeight)};}
export function installViewportLayout(win,doc){
 const root=doc.documentElement,probe=doc.createElement('div');probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';doc.body.appendChild(probe);let queued=false,disposed=false,lastOriginRequest=null;
 function restoreStandaloneOrigin(){
  const vv=win.visualViewport,active=doc.activeElement;
  // This fixed game has no document-scroll content. iOS can nevertheless pan
  // its root after rotation/focus; translating the fixed UI perpetuates that
  // displaced origin. Reset the actual viewport, not touch coordinates.
  // Do not fight pinch navigation, editable focus or a keyboard-sized viewport.
  if(!isStandalone(win)||!vv||Math.abs(vv.scale-1)>.001||Math.abs(vv.width-win.innerWidth)>1||Math.abs(vv.height-win.innerHeight)>1||active?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)||!(win.scrollX||win.scrollY||vv.offsetLeft||vv.offsetTop)){lastOriginRequest=null;return;}
  // A browser may ignore the request, or keep a visual offset after root reset.
  // Retry only when the observed state changes, never on every repeated event.
  const state=[win.scrollX,win.scrollY,vv.offsetLeft,vv.offsetTop,vv.width,vv.height,active];
  if(lastOriginRequest?.every((value,i)=>value===state[i]))return;
  lastOriginRequest=state;win.scrollTo({left:0,top:0,behavior:'instant'});
 }
 function update(){if(disposed)return;queued=false;restoreStandaloneOrigin();const vv=win.visualViewport,unzoomed=!vv||Math.abs((vv.scale||1)-1)<.05,width=unzoomed&&vv?vv.width:win.innerWidth,height=unzoomed&&vv?vv.height:win.innerHeight,css=win.getComputedStyle(probe);const insets={top:parseFloat(css.paddingTop)||0,right:parseFloat(css.paddingRight)||0,bottom:parseFloat(css.paddingBottom)||0,left:parseFloat(css.paddingLeft)||0},l=gameLayout({width,height,insets,coarsePointer:win.matchMedia?.('(pointer: coarse)').matches??false,standalone:isStandalone(win)});root.setAttribute('data-layout',l.mode);root.setAttribute('data-controls-raised',String(l.controlLift>0));for(const [k,v]of Object.entries({'--visible-width':width,'--visible-height':height,'--visible-left':unzoomed&&vv?vv.offsetLeft||0:0,'--visible-top':unzoomed&&vv?vv.offsetTop||0:0,'--safe-top':insets.top,'--safe-right':insets.right,'--safe-bottom':insets.bottom,'--safe-left':insets.left,'--side-width':l.sideWidth,'--limb-height':l.buttonHeight,'--controls-lift':l.controlLift,'--scene-extension':l.sceneExtension}))root.style.setProperty(k,v+'px');}
 function schedule(){if(!queued){queued=true;win.requestAnimationFrame(update);}}
 const events=['resize','orientationchange','scroll','focus','focusin','pageshow'];
 for(const event of events)win.addEventListener(event,schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);update();return()=>{disposed=true;for(const event of events)win.removeEventListener(event,schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);probe.remove();};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installViewportLayout(window,document);
