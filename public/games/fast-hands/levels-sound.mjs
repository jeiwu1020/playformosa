// Gesture-unlocked, one-shot cues only. Live app owns signal transition detection.
export function createLevelSound({window=globalThis.window,mode='catch'}={}){
 let context=null,muted=false,destroyed=false,unlocked=false;
 const active=new Set();
 function stopAll(){for(const note of active){try{note.osc.stop();}catch{}try{note.osc.disconnect();note.gain.disconnect();}catch{}}active.clear();}
 async function unlock(){
  if(destroyed)return false;
  try{
   const AudioContext=window?.AudioContext||window?.webkitAudioContext;
   if(!AudioContext)return false;
   if(!context)context=new AudioContext();
   if(context.state==='suspended')await context.resume();
   unlocked=!destroyed&&context.state==='running';return unlocked;
  }catch{return false;}
 }
 function cue(){
  if(destroyed||muted||!unlocked||context?.state!=='running')return false;
  let note;
  try{
   const now=context.currentTime,duel=mode==='duel',duration=duel ? .19 : .11;
   const osc=context.createOscillator(),gain=context.createGain();note={osc,gain};active.add(note);
   osc.type=duel?'sine':'triangle';osc.frequency.setValueAtTime(duel?1320:480,now);osc.frequency.exponentialRampToValueAtTime(duel?1080:160,now+duration);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(duel ? .11 : .075,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   osc.connect(gain);gain.connect(context.destination);osc.onended=()=>{active.delete(note);try{osc.disconnect();gain.disconnect();}catch{}};
   osc.start(now);osc.stop(now+duration+.015);return true;
  }catch{if(note){active.delete(note);try{note.osc.stop();note.osc.disconnect();note.gain.disconnect();}catch{}}return false;}
 }
 function setMuted(value){muted=Boolean(value);if(muted)stopAll();}
 function destroy(){if(destroyed)return;destroyed=true;unlocked=false;stopAll();try{const closing=context?.close();closing?.catch?.(()=>{});}catch{}context=null;}
 return Object.freeze({unlock,cue,setMuted,get muted(){return muted;},destroy});
}
