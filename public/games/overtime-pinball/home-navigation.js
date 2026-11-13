import {prepareGameDialog} from './game-menus.js';
// Navigation never settles scores or starts a run. The caller owns round reset.
export function mountHomeNavigation({document:doc,mode,pause,resume,clearInput,home}){
 const link=doc.getElementById('gameHome'),dialog=prepareGameDialog(doc.getElementById('homeConfirm'));
 let restorePlay=false,committing=false,lastIntro;
 function sync(){const intro=mode()==='intro';if(lastIntro===intro)return;lastIntro=intro;link.textContent=intro?'返回遊戲平台':'遊戲首頁';link.setAttribute('aria-label',link.textContent);if(intro){link.href='/';link.target='_top';link.removeAttribute('role');}else{link.removeAttribute('href');link.removeAttribute('target');link.setAttribute('role','button');}link.tabIndex=0;}
 function request(){if(dialog.open)return;const before=mode();if(before==='intro')return;if(before==='over'){home();sync();return;}restorePlay=['playing','cinematic'].includes(before);pause();clearInput();dialog.showModal();doc.getElementById('homeCancel').focus({preventScroll:true});}
 link.addEventListener('click',e=>{if(mode()==='intro')return;e.preventDefault();request();});
 link.addEventListener('keydown',e=>{if(mode()!=='intro'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!e.repeat)request();}});
 doc.getElementById('homeCancel').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{clearInput();if(!committing&&restorePlay)resume();restorePlay=false;});
 doc.getElementById('homeAccept').onclick=()=>{committing=true;restorePlay=false;dialog.close();home();sync();committing=false;};
 sync();return {sync,request};
}
