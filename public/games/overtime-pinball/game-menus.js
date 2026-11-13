// Game-owned overlays stay INSIDE the rotated game iframe. Never invokes native
// showModal/top-layer or native select pickers. No shared-game prototypes change.
const managers=new WeakMap(),prepared=new WeakSet();
export function installGameMenus(doc){
 if(managers.has(doc))return managers.get(doc);
 const win=doc.defaultView,stack=[],saved=new Map();
 const visible=el=>!el.disabled&&!el.closest('[hidden],[inert]')&&win.getComputedStyle(el).display!=='none'&&win.getComputedStyle(el).visibility!=='hidden';
 const focusables=d=>[...d.querySelectorAll('button,a[href],input,textarea,select,[tabindex]')].filter(el=>el.tabIndex>=0&&visible(el));
 const top=()=>stack.at(-1);
 function restore(){for(const [el,state] of saved){el.inert=state.inert;if(state.attr===null)el.removeAttribute('inert');else el.setAttribute('inert',state.attr);}saved.clear();}
 function sync(){restore();const active=top();if(!active)return;for(const el of doc.body.children){if(el===active.dialog||el===active.backdrop||['SCRIPT','STYLE','LINK'].includes(el.tagName))continue;saved.set(el,{inert:el.inert,attr:el.getAttribute('inert')});el.inert=true;el.setAttribute('inert','');}}
 function focusTop(){const active=top();if(active)(focusables(active.dialog)[0]||active.dialog).focus({preventScroll:true});}
 function prepare(dialog){
  if(prepared.has(dialog))return dialog;prepared.add(dialog);if(dialog.tagName!=='DIALOG')Object.defineProperty(dialog,'open',{get:()=>dialog.hasAttribute('open')});dialog.dataset.gameMenu='true';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');if(!dialog.hasAttribute('tabindex'))dialog.tabIndex=-1;
  dialog.showModal=function(){
   if(dialog.open)return;if(!dialog.isConnected)return;
   const backdrop=doc.createElement('div');backdrop.className='game-menu-backdrop';backdrop.setAttribute('aria-hidden','true');backdrop.style.zIndex=String(1000+stack.length*2);doc.body.append(backdrop);
   const item={dialog,backdrop,opener:doc.activeElement};stack.push(item);dialog.style.zIndex=String(1001+(stack.length-1)*2);dialog.hidden=false;dialog.setAttribute('open','');sync();focusTop();
  };
  dialog.close=function(value){
   if(!dialog.open)return;const i=stack.findIndex(x=>x.dialog===dialog),item=i>=0?stack.splice(i,1)[0]:null;
   dialog.removeAttribute('open');if(dialog.tagName!=='DIALOG')dialog.hidden=true;if(value!==undefined)dialog.returnValue=String(value);item?.backdrop.remove();sync();
   const active=top(),opener=item?.opener;if(opener?.isConnected&&!opener.closest('[inert],[hidden]')&&(!active||active.dialog.contains(opener)))opener.focus({preventScroll:true});else focusTop();
   dialog.dispatchEvent(new win.Event('close'));
  };
  return dialog;
 }
 doc.addEventListener('keydown',e=>{const active=top();if(!active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();const cancel=new win.Event('cancel',{cancelable:true});if(active.dialog.dispatchEvent(cancel))active.dialog.close();return;}
  if(e.key==='Tab'){const items=focusables(active.dialog),index=items.indexOf(doc.activeElement);if(!items.length){e.preventDefault();active.dialog.focus();}else if(e.shiftKey&&index<=0){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&(index<0||index===items.length-1)){e.preventDefault();items[0].focus();}return;}
  // Stop bubbling into gameplay without cancelling text entry or control keys.
  if(!active.dialog.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();focusTop();}
 },true);
 doc.addEventListener('focusin',e=>{const active=top();if(active&&!active.dialog.contains(e.target))focusTop();});
 const api={prepare,syncChoices:()=>syncMenuChoices(doc)};managers.set(doc,api);
 doc.querySelectorAll('dialog,#pauseScreen').forEach(prepare);
 doc.querySelectorAll('select').forEach(select=>{
  const group=doc.createElement('div');group.className='game-menu-choices';group.dataset.selectId=select.id;group.setAttribute('role','group');const label=doc.querySelector(`label[for="${select.id}"]`);if(label){label.id||=`${select.id}Label`;group.setAttribute('aria-labelledby',label.id);}select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  for(const option of select.options){const button=doc.createElement('button');button.type='button';button.dataset.value=option.value;button.textContent=option.textContent;button.disabled=option.disabled;button.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new win.Event('change',{bubbles:true}));syncMenuChoices(doc);});group.append(button);}select.after(group);
 });syncMenuChoices(doc);return api;
}
export function prepareGameDialog(dialog){return installGameMenus(dialog.ownerDocument).prepare(dialog);}
export function syncMenuChoices(doc){for(const group of doc.querySelectorAll('.game-menu-choices')){const select=doc.getElementById(group.dataset.selectId);for(const b of group.querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.value===select.value));b.disabled=select.disabled||!![...select.options].find(o=>o.value===b.dataset.value)?.disabled;}}}
