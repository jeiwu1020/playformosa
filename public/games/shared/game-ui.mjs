// Platform chrome reflects game-owned state; it never advances or scores a game.
export function syncPauseButton(button,{paused=false,available=false}={}){
 const label=paused?'繼續遊戲':'暫停遊戲',text=paused?'▶ 繼續':'Ⅱ 暫停';
 button.disabled=!available;
 button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',label);button.title=label;
 if(button.textContent!==text)button.textContent=text;
}
// Results stay in the viewport top layer, outside any clipped game stage.
// Escape intentionally does not discard a score; restart/replay are explicit exits.
export function createResultDialog(dialog,{focusTarget=()=>dialog,returnFocus=()=>null}={}){
 dialog.addEventListener('cancel',event=>event.preventDefault());
 return {
  open(){if(dialog.open)return;dialog.hidden=false;dialog.showModal();dialog.scrollTop=0;focusTarget()?.focus({preventScroll:true});},
  close(){if(dialog.open)dialog.close();dialog.hidden=true;returnFocus()?.focus({preventScroll:true});}
 };
}
// Reuses a licensed local track. No fetch/play before a user-triggered unlock.
export function createMusicController({src,createAudio=url=>new Audio(url),notify=()=>{}}){
 let audio=null,enabled=true,playing=false,ready=false,epoch=0,pending=false;
 const report=()=>notify({enabled,playing,ready,pending});
 return {
  get enabled(){return enabled;},get ready(){return enabled&&ready;},get pending(){return pending;},
  setEnabled(value){enabled=Boolean(value);epoch++;pending=false;if(!enabled){audio?.pause();ready=false;}report();},
  setPlaying(value){playing=Boolean(value);if(!playing){epoch++;pending=false;audio?.pause();}report();},
  async unlock(){if(!enabled)return false;const token=++epoch;pending=true;report();
   try{audio??=createAudio(src);audio.loop=true;audio.volume=.3;
    // play() is invoked synchronously, before the first await, preserving activation.
    const play=audio.play();await play;if(token!==epoch||!enabled)return false;ready=true;if(!playing)audio.pause();report();return true;
   }catch{if(token===epoch){ready=false;report();}return false;}finally{if(token===epoch){pending=false;report();}}
  }
 };
}
