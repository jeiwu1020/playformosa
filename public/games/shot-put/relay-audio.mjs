// Optional quiet contact cue. Authoritative hit history is the only trigger;
// no physics writes, queued autoplay, external assets, speech, or random sounds.
export function createRelaySound({createContext=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)()}={}){
 let context=null,enabled=true,seen=0;const voices=new Set();
 function silence(){for(const voice of voices){try{voice.stop(context.currentTime);}catch{}}voices.clear();}
 return{
  setEnabled(value){enabled=Boolean(value);if(!enabled)silence();},
  async unlock(){if(!enabled)return false;try{context??=createContext();await context.resume();return enabled&&context.state==='running';}catch{return false;}},
  reset(){silence();seen=0;},silence,
  sync(s,audible=true){const count=s.hits?.length||0,newest=count>seen?s.hits[count-1]:null;seen=count;
   if(s.paused||!audible){silence();return;}if(!newest||!enabled||context?.state!=='running'||s.flight-newest.t>.22)return;
   try{silence();const tone=context.createOscillator(),gain=context.createGain(),t=context.currentTime;tone.type='sine';tone.frequency.setValueAtTime(210,t);tone.frequency.exponentialRampToValueAtTime(85,t+.16);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.045,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.17);tone.connect(gain);gain.connect(context.destination);voices.add(tone);tone.onended=()=>{voices.delete(tone);tone.disconnect();gain.disconnect();};tone.start(t);tone.stop(t+.18);}catch{/* Audio failure must never stop RAF or change the score. */}
  }
 };
}
