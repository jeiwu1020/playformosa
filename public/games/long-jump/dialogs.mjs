export function createDialogController(dialog,onCancel){
 dialog.addEventListener('cancel',event=>{event.preventDefault();onCancel();});
 dialog.addEventListener('keydown',event=>{
  if(!dialog.classList.contains('fallback'))return;
  if(event.key==='Escape'){event.preventDefault();onCancel();return;}
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],summary')].filter(el=>!el.closest('[hidden]'));
  if(!items.length){event.preventDefault();return;}
  const first=items[0],last=items[items.length-1],active=dialog.ownerDocument.activeElement;
  if(event.shiftKey&&active===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
 });
 return{open(){if(dialog.open)return;if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.classList.add('fallback');dialog.setAttribute('open','');}dialog.querySelector('[autofocus]')?.focus();},close(){if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');},refresh(){
  if(!dialog.open||dialog.classList.contains('fallback')||typeof dialog.showModal!=='function')return false;
  const scrollTop=dialog.scrollTop,active=dialog.ownerDocument.activeElement,focus=dialog.contains?.(active)?active:dialog.querySelector('[autofocus]');
  // Rebuild the native top-layer hit region after rotation, without resuming.
  dialog.close();void dialog.offsetWidth;dialog.showModal();dialog.scrollTop=scrollTop;focus?.focus({preventScroll:true});return true;
 }};
}


// Debounce the rotation/viewport resize burst, then refresh after layout commits.
// Generation tokens stop a late refresh from reopening a dialog after Resume.
export function createPauseDialogRecovery(win,modal,isPaused){
 let timer=null,generation=0;
 function cancel(){generation++;if(timer!==null){win.clearTimeout(timer);timer=null;}}
 return{cancel,schedule(){cancel();if(!isPaused())return;const token=generation;timer=win.setTimeout(()=>{timer=null;win.requestAnimationFrame(()=>{if(token===generation&&isPaused())modal.refresh();});},120);}};
}
