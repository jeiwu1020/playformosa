// Layout only: no game state, keyboard, score or sharing changes.
export function landscapeLayout({width,height,touch=false,insets={}}){
 const active=Boolean(touch&&width>height&&width<=1366&&height>=240&&height<=1024);
 if(!active)return{active:false};
 const safe={top:Math.max(0,insets.top||0),right:Math.max(0,insets.right||0),bottom:Math.max(0,insets.bottom||0),left:Math.max(0,insets.left||0)};
 const sideWidth=width<740?88:width<1000?108:120;
 const innerWidth=width-safe.left-safe.right-12,mainHeight=height-safe.top-safe.bottom-42;
 return{active,width,height,safe,sideWidth,mainHeight,arenaWidth:innerWidth-sideWidth*2-16,arenaHeight:mainHeight,buttonHeight:Math.min(120,Math.floor((mainHeight-36)/2))};
}
export function installViewportLayout(win,doc){
 const root=doc.documentElement,probe=doc.createElement('div');probe.setAttribute('aria-hidden','true');probe.dataset.safeAreaProbe='';
 probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';doc.body.appendChild(probe);
 let scheduled=false,disposed=false;
 function update(){
  if(disposed)return;scheduled=false;const vv=win.visualViewport,unzoomed=!vv||Math.abs((vv.scale||1)-1)<.05;
  const width=unzoomed&&vv?vv.width:win.innerWidth,height=unzoomed&&vv?vv.height:win.innerHeight;
  const touch=win.matchMedia('(pointer: coarse)').matches||((win.navigator.maxTouchPoints||0)>0&&!win.matchMedia('(hover: hover)').matches);
  const style=win.getComputedStyle(probe),insets={top:parseFloat(style.paddingTop)||0,right:parseFloat(style.paddingRight)||0,bottom:parseFloat(style.paddingBottom)||0,left:parseFloat(style.paddingLeft)||0};
  const layout=landscapeLayout({width,height,touch,insets});root.classList.toggle('landscape-fit',layout.active);
  if(!layout.active)return;
  const vars={'--visible-width':width,'--visible-height':height,'--visible-left':unzoomed&&vv?vv.offsetLeft||0:0,'--visible-top':unzoomed&&vv?vv.offsetTop||0:0,'--safe-top':insets.top,'--safe-right':insets.right,'--safe-bottom':insets.bottom,'--safe-left':insets.left,'--side-width':layout.sideWidth,'--limb-height':layout.buttonHeight};
  for(const [key,value]of Object.entries(vars))root.style.setProperty(key,value+'px');
 }
 function schedule(){if(scheduled)return;scheduled=true;win.requestAnimationFrame(update);}
 win.addEventListener('resize',schedule);win.addEventListener('orientationchange',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);update();
 return()=>{disposed=true;win.removeEventListener('resize',schedule);win.removeEventListener('orientationchange',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);probe.remove();root.classList.remove('landscape-fit');};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installViewportLayout(window,document);
