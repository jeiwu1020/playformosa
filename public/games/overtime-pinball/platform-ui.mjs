import {focusGameplay} from './restart-confirmation.js';
import {observePlatformHeader} from './platform-layout.mjs';
import {mountLeaderboard} from '../shared/leaderboard.mjs';
import {syncPauseButton,createResultDialog} from '../shared/game-ui.mjs';
import {PINBALL_MODES,createSettlementLatch} from './platform-snapshot.mjs';
import {createPinballShare} from './platform-share.mjs';
export function mountPinballPlatform({document,game,mode,pause,resume,restart,clearInput,fetcher}){
 const $=id=>document.getElementById(id),latch=createSettlementLatch(),boards=new Map(),stopLayout=observePlatformHeader(document);
 const result=$('results'),rank=$('rankDialog');let pending=null,current=null,rankClose=null,rankOpener=null;
 const resultModal=createResultDialog(result,{focusTarget:()=>result.querySelector('h2'),returnFocus:()=>$('platformRestart')});
 const sharing=createPinballShare({document,container:$('pinballShares'),status:$('pinballShareStatus')});
 function closeRanking(){if(rank.open)rank.close();else finishRanking();}
 function finishRanking(){const cb=rankClose;rankClose=null;cb?.();if(['playing','cinematic'].includes(mode()))focusGameplay(document);else rankOpener?.focus({preventScroll:true});}
 rank.addEventListener('close',finishRanking);$('rankClose').onclick=closeRanking;
 for(const [limit,id] of Object.entries(PINBALL_MODES)){
  const entry=document.createElement('section');entry.hidden=true;$('pinballBoards').append(entry);
  const upload=document.createElement('section');upload.hidden=true;upload.dataset.mode=limit;$('pinballUpload').append(upload);
  const shell={openView(content,{onClose}){rankClose?.();rankClose=onClose;$('rankContent').replaceChildren(content);if(!rank.open)rank.showModal();for(const b of rank.querySelectorAll('[data-rank-mode]'))b.setAttribute('aria-pressed',String(b.dataset.rankMode===limit));},closeView:closeRanking};
  const controller=mountLeaderboard({document,game:id,entry,result,resultUploadContainer:upload,resultActionContainer:null,headerButton:false,resultButton:false,shell,...(fetcher?{fetcher}:{})});
  boards.set(id,{controller,upload});
 }
 function showRanking(limit,opener){pause();clearInput();if(opener)rankOpener=opener;boards.get(PINBALL_MODES[limit])?.controller?.showRanking();}
 for(const b of rank.querySelectorAll('[data-rank-mode]'))b.onclick=()=>showRanking(Number(b.dataset.rankMode));
 $('pinballRanking').onclick=e=>showRanking(current?.limit??game.round.limit,e.currentTarget);
 $('resultRanking').onclick=e=>showRanking(current?.limit??game.round.limit,e.currentTarget);
 $('platformRestart').onclick=restart;
 result.querySelector('h2').tabIndex=-1;
 return {
  settle(){const snapshot=latch.settle(game);if(snapshot)pending=snapshot;},
  afterRender(canvas){if(!pending)return;const snapshot=pending;pending=null;current=snapshot;sharing.capture(canvas,snapshot);const board=boards.get(snapshot.game);board.upload.hidden=false;board.controller?.setResult(snapshot);resultModal.open();},
  sync(){const m=mode();$('pause').hidden=false;syncPauseButton($('pause'),{paused:m==='paused',available:['playing','cinematic','paused'].includes(m)});},
  reset(){pending=null;current=null;latch.reset();sharing.reset();closeRanking();resultModal.close();for(const {controller,upload}of boards.values()){controller?.reset();upload.hidden=true}},
  unavailable(){for(const id of ['platformRestart','pause','start'])$(id).disabled=true;},
  // Exposed for bounded DOM lifecycle tests, not used to manufacture scores.
  destroy(){stopLayout();sharing.reset();closeRanking();for(const {controller}of boards.values())controller?.destroy();}
 };
}
