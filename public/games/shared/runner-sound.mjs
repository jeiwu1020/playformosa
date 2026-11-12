// Transport/playback adapter only. Shared licensed samples, with genuine failure/retry status.
export function createRunnerSound({baseURL,contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),fetcher=globalThis.fetch}={}){
 const files={music:'bgm.mp3',step:'step.mp3',land:'land.mp3',result:'result.mp3'},buffers={},voices=new Set();let ctx,musicGain,effectGain,music=null,pending=null,blocked=true,enabled=true,musicVolume=.18,effects=.35,lastPhase=null,lastSteps=0,lastFalls=0,cheered=false;
 const volume=v=>Math.max(0,Math.min(1,Number(v)||0));
 function stop(n){try{n.stop();}catch{}try{n.disconnect();}catch{}voices.delete(n);if(n===music)music=null;}
 function play(name,gain=1,loop=false){if(blocked||ctx?.state!=='running'||!buffers[name]||(name==='music'?!enabled:effects<=0))return;const n=ctx.createBufferSource();n.buffer=buffers[name];n.loop=loop;const g=ctx.createGain();g.gain.value=gain;n.connect(g);g.connect(name==='music'?musicGain:effectGain);voices.add(n);n.onended=()=>{voices.delete(n);g.disconnect();n.disconnect();if(n===music)music=null;};n.start();if(loop)music=n;}
 function startMusic(){if(!music)play('music',1,true);}
 function configure(v={}){enabled=v.enabled??enabled;musicVolume=volume(v.music??musicVolume);effects=volume(v.effects??effects);if(ctx){musicGain.gain.setTargetAtTime(enabled?musicVolume:0,ctx.currentTime,.03);effectGain.gain.setTargetAtTime(effects,ctx.currentTime,.03);if(!enabled&&music)stop(music);startMusic();}}
 async function unlock(){try{if(!ctx){ctx=contextFactory();musicGain=ctx.createGain();effectGain=ctx.createGain();musicGain.connect(ctx.destination);effectGain.connect(ctx.destination);configure();}const resume=ctx.resume();await resume;if(!pending)pending=Promise.all(Object.entries(files).filter(([name])=>!buffers[name]).map(async([name,file])=>{try{const response=await fetcher(new URL('audio/'+file,baseURL));if(!response.ok)throw Error('audio unavailable');buffers[name]=await ctx.decodeAudioData(await response.arrayBuffer());}catch{buffers[name]=null;}})).finally(()=>{pending=null;});await pending;startMusic();return ctx.state==='running'&&(!enabled||!!buffers.music)&&(effects<=0||['step','land','result'].every(k=>!!buffers[k]));}catch{return false;}}
 function suspend(){blocked=true;for(const n of [...voices])stop(n);}
 function resume(){blocked=false;startMusic();}
 function reset(){for(const n of [...voices])stop(n);lastPhase=null;lastSteps=lastFalls=0;cheered=false;}
 function sync(r){if(r.paused||blocked)return;const p=r.runners[0];if(r.phase==='race'&&lastPhase!=='race')play('land',.22);lastPhase=r.phase;if(p.steps>lastSteps)play('step',.45);lastSteps=p.steps;if((p.falls||0)>lastFalls)play('land',.5);lastFalls=p.falls||0;if(p.finished!==null&&!cheered){cheered=true;play('result');}}
 return{configure,unlock,suspend,resume,reset,sync};
}
