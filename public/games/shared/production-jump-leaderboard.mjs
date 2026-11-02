import {mountLeaderboard} from './leaderboard.mjs';
import {createEntryShell,suspendHelpPresentation} from './entry-shell.mjs';
// Adapter for the released Jump controller, without importing preview replay or controls layout.
export function mountProductionJumpLeaderboard({document,modal,standalone,pause,clear,cancelRecovery,showPause,isPaused,enabled}){
 const overlay=document.getElementById('overlay'),instructions=document.createElement('section');instructions.append(document.getElementById('card-text').cloneNode(true),document.querySelector('.music-credits').cloneNode(true));for(const node of instructions.querySelectorAll('[id]'))node.removeAttribute('id');
 let board;const shell=createEntryShell({document,title:'四肢各有想法｜跳遠',goal:'從台北出發，你能跳多遠？',operations:[],advanced:instructions,onStart:()=>{},forceFallback:standalone,onHelpEnter(){board?.suspend();cancelRecovery();return suspendHelpPresentation(document,{pause(){pause();clear();},controllers:{overlay:modal},dialogs:['overlay'],after({restoredDialog}){if(!restoredDialog&&isPaused())showPause();}});}});
 const help=document.createElement('button');help.type='button';help.className='pf-entry-help';help.textContent='說明';help.setAttribute('aria-label','操作說明與素材授權');const openHelp=()=>shell.open({help:true});help.addEventListener('click',openHelp);document.querySelector('.pf-header nav').append(help);document.addEventListener('pf-help-request',openHelp);
 board=mountLeaderboard({document,enabled,game:'long-jump',entry:overlay,result:document.getElementById('share-actions'),shell});const entryRanking=overlay.querySelector(':scope > .pf-leaderboard');
 return{setResult:r=>board?.setResult(r),reset(){board?.reset();if(entryRanking)entryRanking.hidden=true;const pauseHelp=overlay.querySelector('.pf-pause-help');if(pauseHelp)pauseHelp.hidden=true;},suspend:()=>board?.suspend(),shell,destroy(){board?.destroy();shell.destroy();help.remove();document.removeEventListener('pf-help-request',openHelp);}};
}
