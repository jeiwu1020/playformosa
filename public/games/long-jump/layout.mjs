// Budget actual CSS viewport space on every device, independent of OS scale or pointer type.
export function gameLayout({width,height,insets={}}){
 const safe={top:Math.max(0,insets.top||0),right:Math.max(0,insets.right||0),bottom:Math.max(0,insets.bottom||0),left:Math.max(0,insets.left||0)};
 const innerWidth=width-safe.left-safe.right-16,mainHeight=height-safe.top-safe.bottom-64;
 const mode=width>=640&&width>height?'side':'bottom',sideWidth=width<740?88:Math.max(96,Math.min(128,Math.floor(width*.09)));
 const buttonHeight=mode==='side'?Math.max(56,Math.min(128,Math.floor((mainHeight-12)/2))):96;
 return{mode,safe,sideWidth,mainHeight,buttonHeight,arenaWidth:mode==='side'?innerWidth-sideWidth*2-16:innerWidth,arenaHeight:mode==='side'?mainHeight:mainHeight-104,usedWidth:width,usedHeight:height};
}
export function installViewportLayout(win,doc){
 const root=doc.documentElement,probe=doc.createElement('div');probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';doc.body.appendChild(probe);let queued=false,disposed=false;
 function update(){if(disposed)return;queued=false;const vv=win.visualViewport,unzoomed=!vv||Math.abs((vv.scale||1)-1)<.05,width=unzoomed&&vv?vv.width:win.innerWidth,height=unzoomed&&vv?vv.height:win.innerHeight,css=win.getComputedStyle(probe);const insets={top:parseFloat(css.paddingTop)||0,right:parseFloat(css.paddingRight)||0,bottom:parseFloat(css.paddingBottom)||0,left:parseFloat(css.paddingLeft)||0},l=gameLayout({width,height,insets});root.setAttribute('data-layout',l.mode);for(const [k,v]of Object.entries({'--visible-width':width,'--visible-height':height,'--visible-left':unzoomed&&vv?vv.offsetLeft||0:0,'--visible-top':unzoomed&&vv?vv.offsetTop||0:0,'--safe-top':insets.top,'--safe-right':insets.right,'--safe-bottom':insets.bottom,'--safe-left':insets.left,'--side-width':l.sideWidth,'--limb-height':l.buttonHeight}))root.style.setProperty(k,v+'px');}
 function schedule(){if(!queued){queued=true;win.requestAnimationFrame(update);}}
 win.addEventListener('resize',schedule);win.addEventListener('orientationchange',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);update();return()=>{disposed=true;win.removeEventListener('resize',schedule);win.removeEventListener('orientationchange',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);probe.remove();};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installViewportLayout(window,document);
