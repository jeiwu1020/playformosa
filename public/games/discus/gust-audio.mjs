// Short procedural sweep; shared SFX gate/gain and interruption lifetime.
export function createGustAudio(audio){const runtime=()=>typeof audio==='function'?audio():audio;return {unlock(){return Boolean(runtime()?.context?.state==='running');},play(){return runtime()?.tone('gust',{frequency:700,endFrequency:120,duration:.36,gain:.08,type:'triangle'})??false;},stop(){runtime()?.stopEffects();}};}
