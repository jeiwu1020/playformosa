export function createDialogController(dialog,onCancel){
 dialog.addEventListener('cancel',event=>{event.preventDefault();onCancel();});
 dialog.addEventListener('keydown',event=>{
  if(!dialog.classList.contains('fallback'))return;
  if(event.key==='Escape'){event.preventDefault();onCancel();return;}
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>!el.closest('[hidden]'));
  if(!items.length){event.preventDefault();return;}
  const first=items[0],last=items[items.length-1],active=dialog.ownerDocument.activeElement;
  if(event.shiftKey&&active===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
 });
 return{open(){if(dialog.open)return;if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.classList.add('fallback');dialog.setAttribute('open','');}dialog.querySelector('[autofocus]')?.focus();},close(){if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');}};
}
