// Passive, game-local evidence only. Nothing is uploaded, stored, or used to adjust input.
import {isStandalone} from './layout.mjs';
const IDS=new Set(['overlay','start','pause','reset','sound','scene','viewport-diagnostics-copy','viewport-diagnostics-header']);
const number=value=>Number.isFinite(value)?Math.round(value*100)/100:null;
const identify=el=>!el?null:IDS.has(el.id)?'#'+el.id:el.closest?.('#start')?'#start':String(el.tagName||'unknown');
const nativeModal=el=>{try{return el.matches(':modal');}catch{return null;}};
const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return[r.x,r.y,r.width,r.height].map(number);};
const cssFields=(win,el,fields)=>{const css=win.getComputedStyle(el);return Object.fromEntries(fields.map(key=>[key,css[key]]));};
export function captureViewportSnapshot(win,doc,event={type:'sample'}){
 const root=doc.documentElement,body=doc.body,dialog=doc.querySelector('#overlay'),start=doc.querySelector('#start'),vv=win.visualViewport,rootCss=win.getComputedStyle(root),r=rect(start),cx=r?r[0]+r[2]/2:0,cy=r?r[1]+r[3]/2:0;
 const data={event:event.type,viewport:{standalone:isStandalone(win),hidden:Boolean(doc.hidden),orientationMedia:{portrait:Boolean(win.matchMedia?.('(orientation: portrait)').matches),landscape:Boolean(win.matchMedia?.('(orientation: landscape)').matches)},inner:[win.innerWidth,win.innerHeight].map(number),screen:[win.screen?.width,win.screen?.height].map(number),orientation:win.screen?.orientation?.angle??win.orientation??null,dpr:number(win.devicePixelRatio),scrollX:number(win.scrollX),scrollY:number(win.scrollY),visual:vv?Object.fromEntries(['width','height','offsetLeft','offsetTop','pageLeft','pageTop','scale'].map(k=>[k,number(vv[k])])):null},cssViewport:Object.fromEntries(['--visible-width','--visible-height','--visible-left','--visible-top','--safe-top','--safe-right','--safe-bottom','--safe-left'].map(k=>[k,rootCss.getPropertyValue(k)])),root:{rect:rect(root),scroll:[root.scrollLeft,root.scrollTop,root.scrollWidth,root.scrollHeight,root.clientWidth,root.clientHeight].map(number),css:cssFields(win,root,['position','transform','filter','contain','willChange'])},body:{rect:rect(body),scroll:[body.scrollLeft,body.scrollTop].map(number),css:cssFields(win,body,['position','left','top','paddingTop','paddingBottom','transform','filter','contain','willChange'])},dialog:dialog?{rect:rect(dialog),open:dialog.hasAttribute('open'),nativeModal:nativeModal(dialog),fallback:dialog.classList?.contains('fallback')??false,scrollTop:number(dialog.scrollTop),css:cssFields(win,dialog,['position','left','top','transform'])}:null,start:{rect:r},focus:identify(doc.activeElement),centerHit:r?identify(doc.elementFromPoint(cx,cy)):null,hitY:r&&r[3]>0?[-2,-1,-.5,0,.5,1,2].map(d=>[number(cy+d*r[3]),identify(doc.elementFromPoint(cx,cy+d*r[3]))]):[]};
 const p=event.changedTouches?.[0]||event;
 if(Number.isFinite(p.clientX)&&Number.isFinite(p.clientY))data.tap={trusted:Boolean(event.isTrusted),defaultPrevented:Boolean(event.defaultPrevented),pointerId:number(event.pointerId),kind:event.pointerType|| (event.changedTouches?'touch':event.type),client:[p.clientX,p.clientY].map(number),page:[p.pageX,p.pageY].map(number),screen:[p.screenX,p.screenY].map(number),target:identify(event.target),atClient:identify(doc.elementFromPoint(p.clientX,p.clientY)),deltaFromStartCenter:[p.clientX-cx,p.clientY-cy].map(number)};
 return data;
}
export function createViewportTrace(limit=32,tapLimit=24){
 const samples=[],taps=[];let frozen=null;
 const append=(list,sample,max)=>{list.push(sample);if(list.length>max)list.splice(0,list.length-max);};
 return{push(sample){append(samples,sample,limit);if(sample.tap&&sample.dialog?.open)append(taps,sample,tapLimit);},freeze(){frozen={samples:[...samples],taps:[...taps]};},unfreeze(){frozen=null;},serialize(){return JSON.stringify({schema:'pf-viewport-20261028-v1',frozen:frozen!==null,...(frozen||{samples,taps})});}};
}
export function installViewportDiagnostics(win,doc){
 if(!isStandalone(win))return()=>{};
 const credits=doc.querySelector('.music-credits');if(!credits)return()=>{};
 const trace=createViewportTrace(),started=win.performance.now(),listeners=[],timers=new Set(),frames=new Set();let stopped=false,pending=false,rotated=false;
 const record=(event)=>{if(stopped)return;if(event.type.endsWith('orientationchange')){rotated=true;trace.unfreeze();}const value=captureViewportSnapshot(win,doc,event);value.ms=number(win.performance.now()-started);trace.push(value);if(rotated&&event.type==='click'&&identify(event.target)==='#start'&&value.dialog?.open){trace.freeze();rotated=false;}};
 const frame=fn=>{const id=win.requestAnimationFrame(()=>{frames.delete(id);fn();});frames.add(id);};
 function settled(){if(pending)return;pending=true;frame(()=>{record({type:'burst:raf1'});frame(()=>{record({type:'burst:raf2'});pending=false;});});const id=win.setTimeout(()=>{timers.delete(id);record({type:'burst:settled'});},250);timers.add(id);}
 function listen(target,type,fn){const options={capture:true,passive:true};target?.addEventListener(type,fn,options);listeners.push([target,type,fn,options]);}
 for(const type of ['orientationchange','resize','pageshow','pagehide'])listen(win,type,event=>{record(event);settled();});
 for(const type of ['resize','scroll'])listen(win.visualViewport,type,event=>{record({type:'visualViewport:'+type});settled();});
 listen(win,'scroll',event=>{if(event.target===doc||event.target===win){record({type:'window:scroll'});settled();}});
 for(const type of ['focus','blur'])listen(win,type,event=>{if(event.target===win){record({type:'window:'+type});settled();}});
 listen(doc,'visibilitychange',event=>{record(event);settled();});
 listen(doc,'focusin',event=>{record(event);settled();});
 for(const type of ['pointerdown','pointerup','touchstart','touchend','click'])listen(doc,type,record);
 const box=doc.createElement('div'),button=doc.createElement('button'),status=doc.createElement('p'),output=doc.createElement('pre');
 button.type='button';button.id='viewport-diagnostics-copy';button.textContent='複製轉向診斷';status.textContent='只複製此遊戲的畫面座標，不含網址、帳號或遊戲文字；不會自動上傳。';output.hidden=true;output.style.cssText='max-height:160px;overflow:auto;white-space:pre-wrap;word-break:break-all;user-select:text;-webkit-user-select:text;';
 function copy(targetButton,targetStatus,targetOutput){record({type:'export'});const text=trace.serialize();const manual=()=>{targetOutput.textContent=text;targetOutput.hidden=false;targetStatus.textContent='請選取下方診斷文字複製。';targetStatus.parentElement?.removeAttribute('hidden');};if(!win.navigator.clipboard?.writeText){manual();return;}try{win.navigator.clipboard.writeText(text).then(()=>{targetStatus.textContent='已複製轉向診斷，請貼回對話。';if(targetButton.id==='viewport-diagnostics-header')targetButton.textContent='已複製';},manual);}catch{manual();}}
 button.addEventListener('click',()=>copy(button,status,output));
 const nav=doc.querySelector('header nav');let headerButton=null,panel=null;
 if(nav){headerButton=doc.createElement('button');headerButton.type='button';headerButton.id='viewport-diagnostics-header';headerButton.textContent='診斷';headerButton.setAttribute('aria-label','複製轉向診斷');headerButton.style.fontSize='12px';panel=doc.createElement('div');panel.hidden=true;panel.style.cssText='position:absolute;top:48px;left:8px;right:8px;z-index:30;padding:12px;background:#fffdf4;border:1px solid #8a9c90;border-radius:10px;';const message=doc.createElement('p'),text=doc.createElement('pre'),close=doc.createElement('button');text.hidden=true;text.style.cssText=output.style.cssText;close.type='button';close.textContent='收起診斷文字';close.addEventListener('click',()=>{panel.hidden=true;});panel.append(message,text,close);headerButton.addEventListener('click',()=>copy(headerButton,message,text));nav.appendChild(headerButton);nav.parentElement.appendChild(panel);}
 box.append(button,status,output);credits.appendChild(box);record({type:'installed'});
 return()=>{stopped=true;for(const[target,type,fn,options]of listeners)target?.removeEventListener(type,fn,options);for(const id of timers)win.clearTimeout(id);for(const id of frames)win.cancelAnimationFrame(id);box.remove();headerButton?.remove();panel?.remove();};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')installViewportDiagnostics(window,document);
