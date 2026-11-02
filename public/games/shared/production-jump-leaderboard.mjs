import {mountLeaderboard} from './leaderboard.mjs';
import {createGameEntry,suspendHelpPresentation} from './entry-shell.mjs';
// Production Jump keeps its released simulation, score and result controls.
export function mountProductionJumpLeaderboard({document,modal,standalone,pause,clear,cancelRecovery,showPause,isPaused,enabled,onStart,canStart}){
 let board;const shell=createGameEntry({document,gameId:'long-jump',onStart,canStart,forceFallback:standalone,onHelpEnter(){board?.suspend();cancelRecovery();return suspendHelpPresentation(document,{pause(){pause();clear();},controllers:{overlay:modal},dialogs:['overlay'],after({restoredDialog}){if(!restoredDialog&&isPaused())showPause();}});}});
 board=mountLeaderboard({document,enabled,game:'long-jump',entry:shell.dialog,result:document.getElementById('share-actions'),shell});
 return{setResult:r=>board?.setResult(r),reset:()=>board?.reset(),suspend:()=>board?.suspend(),shell,destroy(){board?.destroy();shell.destroy();}};
}
