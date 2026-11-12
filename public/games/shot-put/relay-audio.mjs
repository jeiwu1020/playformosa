// Read-only authoritative contact history. Uses the game's single effects bus.
export function createRelaySound({audio}={}){
 let seen=0;const runtime=()=>typeof audio==='function'?audio():audio;
 const silence=()=>runtime()?.stopEffects();
 return {setEnabled(v){runtime()?.setEffectsEnabled(v);},unlock(){return Promise.resolve(Boolean(runtime()?.context?.state==='running'));},reset(){silence();seen=0;},silence,
 sync(s,audible=true){const count=s.hits?.length||0,newest=count>seen?s.hits[count-1]:null;seen=count;if(s.paused||!audible)return;if(!newest||s.flight-newest.t>.22)return;runtime()?.tone('relay',{frequency:210,endFrequency:85,duration:.18,gain:.045});}};
}
