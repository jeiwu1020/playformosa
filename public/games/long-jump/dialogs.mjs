export function createDialogController(dialog,onCancel,{forceFallback=false}={}){
 const doc=dialog.ownerDocument,fallback=forceFallback||typeof dialog.showModal!=='function';
 let backdrop=null,previousFocus=null,background=[],modalAttributes=[];
 const isOpen=()=>dialog.open||dialog.hasAttribute?.('open');
 const visibleControl=el=>el&&!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length&&el.tabIndex>=0;
 const focusable=()=>[...dialog.querySelectorAll('button:not([disabled]),a[href],summary,input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]')].filter(visibleControl);
 const focusStart=(preventScroll=true)=>{const preferred=dialog.querySelector('[autofocus]');(visibleControl(preferred)?preferred:focusable()[0]||dialog).focus({preventScroll});};
 const restore=(el,name,value)=>value===null?el.removeAttribute(name):el.setAttribute(name,value);
 function openFallback(){
  if(!backdrop){backdrop=doc.createElement('div');backdrop.className='dialog-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');doc.body.appendChild(backdrop);}
  previousFocus=doc.activeElement;modalAttributes=['aria-modal','tabindex'].map(name=>[name,dialog.getAttribute(name)]);
  background=[...doc.body.children].filter(el=>el!==dialog&&el!==backdrop&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.getAttribute('inert'),el.getAttribute('aria-hidden')]);
  dialog.classList.add('fallback');dialog.setAttribute('aria-modal','true');dialog.setAttribute('tabindex','-1');dialog.setAttribute('open','');backdrop.hidden=false;
  // Focus leaves the background before it becomes hidden from assistive technology.
  focusStart(false);for(const[el]of background){el.setAttribute('inert','');el.setAttribute('aria-hidden','true');}
 }
 if(fallback)doc.addEventListener('focusin',event=>{if(isOpen()&&!dialog.contains(event.target))focusStart();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();onCancel();});
 dialog.addEventListener('keydown',event=>{
  if(!fallback||!isOpen())return;
  // Otherwise Escape bubbles to game keydown after resume and immediately re-pauses.
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel();return;}
  if(event.key!=='Tab')return;
  const items=focusable();
  if(!items.length){event.preventDefault();dialog.focus({preventScroll:true});return;}
  const first=items[0],last=items[items.length-1],active=doc.activeElement;
  if(event.shiftKey&&(active===first||!items.includes(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(active===last||!items.includes(active))){event.preventDefault();first.focus();}
 });
 return{
  open(){if(isOpen())return;if(fallback)openFallback();else{dialog.showModal();dialog.querySelector('[autofocus]')?.focus();}},
  close(){
   if(!isOpen())return;
   if(!fallback){dialog.close();return;}
   dialog.removeAttribute('open');backdrop.hidden=true;for(const[name,value]of modalAttributes)restore(dialog,name,value);
   for(const[el,inert,hidden]of background){restore(el,'inert',inert);restore(el,'aria-hidden',hidden);}background=[];
   const focus=previousFocus;previousFocus=null;if(focus?.isConnected&&!focus.closest?.('[inert]'))focus.focus?.({preventScroll:true});
  },
  refresh(){
   if(!isOpen()||fallback)return false;
   const scrollTop=dialog.scrollTop,active=doc.activeElement,focus=dialog.contains?.(active)?active:dialog.querySelector('[autofocus]');
   // Browser mode keeps the native recovery; standalone never enters the top layer.
   dialog.close();void dialog.offsetWidth;dialog.showModal();dialog.scrollTop=scrollTop;focus?.focus({preventScroll:true});return true;
  }
 };
}

// Debounce the rotation/viewport resize burst, then refresh after layout commits.
// Generation tokens stop a late refresh from reopening a dialog after Resume.
export function createPauseDialogRecovery(win,modal,isPaused){
 let timer=null,generation=0;
 function cancel(){generation++;if(timer!==null){win.clearTimeout(timer);timer=null;}}
 return{cancel,schedule(){cancel();if(!isPaused())return;const token=generation;timer=win.setTimeout(()=>{timer=null;win.requestAnimationFrame(()=>{if(token===generation&&isPaused())modal.refresh();});},120);}};
}
