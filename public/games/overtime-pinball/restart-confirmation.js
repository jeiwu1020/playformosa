import {prepareGameDialog} from './game-menus.js';
// Programmatic focus goes to a non-activating surface. Tab order is unchanged.
export function focusGameplay(doc){const canvas=doc.getElementById('world');if(!canvas)return;canvas.tabIndex=-1;canvas.focus({preventScroll:true});}
export function mountRestartConfirmation({document:doc,mode,pause,resume,clearInput,restart}){
 const dialog=doc.createElement('dialog');dialog.id='restartConfirm';dialog.setAttribute('aria-labelledby','restartConfirmTitle');dialog.innerHTML='<h2 id="restartConfirmTitle">重新開始這一局？</h2><p>目前這局會結束，未完成的成績不會保存。</p><div class="restart-actions"><button id="restartCancel" type="button">繼續這一局</button><button id="restartAccept" type="button">確定重新開始</button></div>';doc.body.append(dialog);prepareGameDialog(dialog);
 const held=new Set(),blocked=new Set();let restorePlay=false,committing=false;
 const activation=e=>e.code==='Space'||e.code==='Enter'||e.key===' '||e.key==='Enter';
 doc.addEventListener('keydown',e=>{if(!activation(e))return;const key=e.code||e.key;held.add(key);if(dialog.open&&(blocked.has(key)||e.repeat)){e.preventDefault();e.stopImmediatePropagation();}},true);
 doc.addEventListener('keyup',e=>{const key=e.code||e.key;held.delete(key);if(blocked.delete(key)&&dialog.open){e.preventDefault();e.stopImmediatePropagation();}},true);
 doc.defaultView?.addEventListener('blur',()=>{held.clear();blocked.clear();});
 function request(){if(dialog.open)return;const before=mode();if(!['playing','cinematic','paused'].includes(before)){restart();return;}restorePlay=before!=='paused';committing=false;blocked.clear();for(const key of held)blocked.add(key);pause();clearInput();dialog.showModal();dialog.focus({preventScroll:true});}
 doc.getElementById('restartCancel').onclick=()=>dialog.close();
 doc.getElementById('restartAccept').onclick=()=>{if(!dialog.open||committing||blocked.size)return;committing=true;restorePlay=false;dialog.close();restart();};
 dialog.addEventListener('close',()=>{clearInput();if(!committing&&restorePlay)resume();restorePlay=false;blocked.clear();if(['playing','cinematic'].includes(mode()))focusGameplay(doc);});
 return{request,dialog};
}
