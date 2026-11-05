import {newMatch,itemArtFrame} from '../fast-hands/levels-rules.mjs';
import {sampleLevelMotion,FALLBACK_FRAME_NAMES} from '../fast-hands/levels-motion.mjs';
import {createLevelSound} from '../fast-hands/levels-sound.mjs';
import {testSettings,beginTest,advanceTest,pressTest,pauseTest} from './rules.mjs';
const loadStage=async(canvas,options)=>{const {createLevelStage}=await import('../fast-hands/levels-stage.mjs');return createLevelStage(canvas,options);};
const ms=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const asset=name=>`../fast-hands/assets/${name}.png`;
export function mountTest({document,window,clock=()=>window.performance.now(),random=Math.random,requestFrame=fn=>window.requestAnimationFrame(fn),cancelFrame=id=>window.cancelAnimationFrame(id),stageLoader=loadStage,soundFactory=createLevelSound}={}){
 const $=id=>document.getElementById(id),listeners=[],images=new Map();
 let mode=new URL(window.location.href).searchParams.get('mode')==='duel'?'duel':'catch',state=newMatch(mode,{practice:true,random}),disposed=false,stage=null,renderer='pending',stageToken=0,startupTimer,frameId,lastFrame=null,pressedAt=null,settledAt=null,lastResult=null,width=window.innerWidth;
 let sound=soundFactory({window,mode});
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
 for(const name of [...FALLBACK_FRAME_NAMES,'duel-items-atlas']){const image=new window.Image();images.set(name,image);image.onload=()=>render();image.onerror=()=>render();image.src=asset(name);}
 $('testMode').value=mode;
 const active=()=>['waiting','live'].includes(state.phase);
 function settings(){return testSettings(mode,{catchMode:$('catchMode').value,stage:$('stageNumber').value,flightMs:$('flightMs').value,aiMode:$('aiMode').value,aiMs:$('aiMs').value,waitMode:$('waitMode').value,waitMs:$('waitMs').value});}
 function describe(c){return mode==='catch'?`${c.stage===null?'自訂速度':`第 ${c.stage} 關`} · 飛行 ${ms(c.flightMs)} ms\n接住窗口 ±${ms(c.windowMs)} ms\n發射後 ${ms(c.flightMs-c.windowMs)}–${ms(c.flightMs+c.windowMs)} ms 內出手`:`快手王反應：${c.aiMs===null?'原本隨機':ms(c.aiMs)+' ms'}\n${c.aiMs===null?'每回先抽定，再開始等待。':'固定對手速度，可比較每次手感。'}`;}
 function syncSettings(){
  $('catchSettings').hidden=mode!=='catch';$('duelSettings').hidden=mode!=='duel';
  $('stageField').hidden=$('catchMode').value!=='stage';$('flightField').hidden=$('catchMode').value!=='flight';$('aiField').hidden=$('aiMode').value!=='fixed';$('waitField').hidden=$('waitMode').value!=='fixed';
  $('returnGame').href=`../fast-hands/${mode}.html`;document.body.dataset.level=mode;$('testAction').textContent=mode==='catch'?'接！':'搶！';
  try{const c=settings();$('settingsPreview').textContent=describe(c);$('configError').textContent='';return c;}catch(error){$('settingsPreview').textContent='請先完成有效設定。';$('configError').textContent=error.message;return null;}
 }
 function visible(){const r=$('stage').getBoundingClientRect(),cue=$('signal').getBoundingClientRect(),height=window.visualViewport?.height||window.innerHeight;if(!r.width&&!r.height)return true;return cue.top>=0&&cue.bottom<=height&&r.top+r.height*.5>0&&r.top+r.height*.5<height;}
 function motionAt(now){return sampleLevelMotion({mode,state:{...state,presentation:{pressedAt,settledAt}},now});}
 function requiredImages(){return [...images.entries()].filter(([name])=>name.startsWith(`levels-${mode}`)||mode==='duel'&&name==='duel-items-atlas').map(([,image])=>image);}
 function artReady(){return renderer==='3d'||renderer==='fallback'&&requiredImages().every(image=>image.complete&&image.naturalWidth>0);}
 function imageUrl(name){return images.get(name)?.src||asset(name);}
 function chooseRenderer(next){if(disposed)return;renderer=next;document.body.dataset.renderer=next;$('stage').classList.toggle('has-3d',next==='3d');$('renderMode').textContent=next==='3d'?'原遊戲 3D 模型':'2D 相容模式 · 同模型';window.clearTimeout(startupTimer);render();}
 function prepareStage(){
  const token=++stageToken;stage?.dispose();stage=null;window.clearTimeout(startupTimer);renderer='pending';document.body.dataset.renderer='pending';$('stage').classList.remove('has-3d');
  const fallback=()=>{if(disposed||token!==stageToken)return;if(active())pause();stage?.dispose();stage=null;chooseRenderer('fallback');};
  startupTimer=window.setTimeout(fallback,5000);
  try{const output=stageLoader($('levelCanvas'),{mode,onUnavailable:fallback,onReady:()=>{if(!disposed&&token===stageToken)render();}});
   const resolved=value=>{if(disposed||token!==stageToken||renderer==='fallback'){value?.dispose();return;}stage=value;if(!stage?.available)fallback();else render();};
   if(output?.then)output.then(resolved).catch(fallback);else resolved(output);
  }catch{fallback();}
 }
 function paint(motion,now){
  const {from,to,mix}=motion.fallbackFrame;
  const previous=$('fallbackScene').getAttribute('src');if(previous!==imageUrl(from))$('fallbackScene').src=imageUrl(from);
  if($('fallbackBlend').getAttribute('src')!==imageUrl(to))$('fallbackBlend').src=imageUrl(to);
  $('fallbackBlend').style.opacity=String(images.get(to)?.complete&&images.get(to)?.naturalWidth?mix:0);
  const feedback=state.phase==='done',result=state.results.at(-1),o=motion.overlay;
  $('stage').dataset.winner=result?.winner||'';$('stage').dataset.result=result?.reason||'';
  $('foamBall').style.visibility=mode==='catch'&&(state.phase==='live'||feedback&&Number.isFinite(state.liveAt))?'visible':'hidden';
  if(mode==='catch'){$('foamBall').style.left=`${o.dartTip.x*100}%`;$('foamBall').style.top=`${o.dartTip.y*100}%`;}
  $('itemArt').hidden=mode!=='duel';
  if(mode==='duel'){
   const item=state.items[0],f=itemArtFrame(item.artIndex),el=$('itemArt'),xs=o.prizeArtCorners.map(p=>p.x),ys=o.prizeArtCorners.map(p=>p.y);
   el.style.backgroundImage=`url("${imageUrl('duel-items-atlas')}")`;el.style.backgroundSize=`${100/f.width}% ${100/f.height}%`;el.style.backgroundPosition=`${100*f.left/(1-f.width)}% ${100*f.top/(1-f.height)}%`;
   el.style.left=`${o.prizeArtCenter.x*100}%`;el.style.top=`${o.prizeArtCenter.y*100}%`;el.style.width=`${(Math.max(...xs)-Math.min(...xs))*100}%`;el.style.height=`${(Math.max(...ys)-Math.min(...ys))*100}%`;
  }
  if(stage?.render({...state,presentation:{pressedAt,settledAt}},now)&&stage.artReady&&renderer==='pending'){renderer='3d';document.body.dataset.renderer='3d';$('stage').classList.add('has-3d');$('renderMode').textContent='原遊戲 3D 模型';window.clearTimeout(startupTimer);}
 }
 function showResult(result){
  if(result===lastResult)return;lastResult=result;const host=$('testResult');host.replaceChildren();host.hidden=!result;if(!result)return;
  const title=document.createElement('h3');title.textContent=result.reason==='early'&&result.playerMs===null?'搶跑：訊號前出手':result.winner==='player'?(mode==='catch'?'接住了！':'你比快手王快！'):result.winner==='draw'?'同時出手':mode==='catch'?'這次沒接住':'快手王較快';
  const grid=document.createElement('dl');grid.className='result-metrics';
  const metric=(label,value)=>{const box=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;box.append(dt,dd);grid.append(box);};
  metric('玩家反應',result.playerMs===null?(result.reason==='early'?'訊號前出手':'未出手'):`${ms(result.playerMs)} ms`);
  if(mode==='catch'){metric('目標飛行',`${ms(result.flightMs)} ms`);metric('接彈誤差',result.offsetMs===null?'—':result.offsetMs===0?'正好 0 ms':`${result.offsetMs<0?'早':'晚'} ${ms(Math.abs(result.offsetMs))} ms`);}
  else{metric('快手王反應',`${ms(result.aiMs)} ms`);metric('時間差',result.playerMs===null?'—':result.playerMs===result.aiMs?'相同':`${result.playerMs<result.aiMs?'快':'慢'} ${ms(Math.abs(result.playerMs-result.aiMs))} ms`);}
  const note=document.createElement('p');note.textContent=`準備等待 ${ms(state.readyAt-state.startedAt)} ms${mode==='catch'?` · 接住窗口 ±${ms(state.windowMs)} ms`:result.playerMs===null&&result.reason!=='early'?' · 5 秒內未出手':''}。本回僅供手感比較，不計分、不留存。`;
  host.append(title,grid,note);
 }
 function render(now=clock()){
  if(disposed)return;document.body.dataset.phase=state.phase;const motion=motionAt(now);paint(motion,now);
  const ready=artReady(),failed=renderer==='fallback'&&requiredImages().some(image=>image.complete&&!image.naturalWidth);
  $('retryArt').hidden=!failed;if(renderer==='fallback')$('renderMode').textContent=ready?'2D 相容模式 · 同模型':failed?'測試圖像載入失敗，請重試':'正在準備測試圖像…';
  $('testConfig').disabled=active();$('startTest').hidden=active();$('startTest').disabled=!ready||!motion.complete;$('testAction').hidden=!active();$('testAction').disabled=!ready;$('cancelTest').hidden=!active();
  $('startTest').textContent=state.phase==='done'?'再測一次':state.phase==='paused'?'重新測這一回':'開始測試';
  $('testStatus').textContent=state.phase==='waiting'?'準備好了，先忍住…':state.phase==='live'?(mode==='catch'?'看準到掌心的瞬間。':'出手！比比你的反應。'):state.phase==='paused'?'已暫停，本回未列入結果。':state.phase==='done'?'本回測試完成。':'選好設定，測一回手感。';
  $('signal').textContent=state.phase==='waiting'?(mode==='catch'?'準備發射…':'等訊號'):state.phase==='live'?(mode==='catch'?'到掌心就接！':'出手！'):state.phase==='paused'?'暫停':state.phase==='done'?(state.results[0].winner==='player'?'成功！':'測試完成'):mode==='catch'?'看準掌心':'等訊號';
  if(state.testing)$('runSettings').textContent=mode==='catch'?`飛行 ${ms(state.flightMs)} ms · 容許 ±${ms(state.windowMs)} ms`:`快手王 ${ms(state.aiMs)} ms · 較慢也會測到你的反應`;
  showResult(state.results.at(-1));
 }
 function transition(next,now){if(next===state)return;const before=state;state=next;if(before.phase==='waiting'&&state.phase==='live')sound.cue();if(state.phase==='done')settledAt=now;}
 function start(){
  if(disposed||active()||!artReady()||!motionAt(clock()).complete)return;
  const c=syncSettings();if(!c){$('configPanel').open=true;return;}
  sound.unlock();$('configPanel').open=window.innerWidth>=850;state=beginTest(c,clock(),random);pressedAt=null;settledAt=null;lastFrame=null;render();
  if(!visible())$('stage').scrollIntoView?.({block:'start',behavior:'instant'});$('testAction').focus({preventScroll:true});
 }
 function pause(){if(disposed||!active())return;state=pauseTest(state);pressedAt=null;settledAt=null;lastFrame=null;render();}
 function act(){const now=clock();if(disposed||!active()||!artReady())return;if(document.hidden||!visible()||state.phase==='live'&&lastFrame!==null&&now-lastFrame>250){pause();return;}const next=pressTest(state,now);if(next!==state){pressedAt=now;transition(next,now);render(now);}}
 function change(){if(active())return;const nextMode=$('testMode').value==='duel'?'duel':'catch';if(nextMode!==mode){mode=nextMode;state=newMatch(mode,{practice:true,random});pressedAt=null;settledAt=null;sound.destroy();sound=soundFactory({window,mode});prepareStage();$('runSettings').textContent='測試只用來比較本裝置的操作手感。';}syncSettings();render();}
 listen($('retryArt'),'click',()=>{if(active())pause();for(const [name,image] of images){if(!image.complete||!image.naturalWidth)image.src=asset(name)+`?retry=${Date.now()}`;}render();});
 listen($('testForm'),'submit',event=>event.preventDefault());listen($('testForm'),'input',change);listen($('testForm'),'change',change);listen($('startTest'),'click',start);listen($('cancelTest'),'click',pause);
 listen($('testAction'),'pointerdown',event=>{if(event.isPrimary===false||event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();act();});listen($('testAction'),'click',event=>{if(event.detail===0)act();});
 listen(document,'keydown',event=>{if(!['Space','Enter'].includes(event.code)||event.target?.closest?.('a,input,select,textarea,summary')||event.target?.closest?.('button')&&event.target.closest('button')!==$('testAction'))return;if(!active())return;event.preventDefault();if(!event.repeat)act();});
 listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause()});listen(window,'scroll',()=>{if(active()&&!visible())pause()},{passive:true});listen(window,'resize',()=>{if(Math.abs(window.innerWidth-width)>8){width=window.innerWidth;pause()}});listen(window,'pagehide',event=>{pause();if(!event.persisted)destroy()});
 function frame(now){if(disposed)return;if(active()&&(document.hidden||!visible()||state.phase==='live'&&lastFrame!==null&&now-lastFrame>250))pause();else transition(advanceTest(state,now),now);lastFrame=now;render(now);frameId=requestFrame(frame);}
 function destroy(){if(disposed)return;disposed=true;stageToken++;window.clearTimeout(startupTimer);cancelFrame(frameId);stage?.dispose();sound.destroy();for(const remove of listeners)remove();}
 syncSettings();prepareStage();render();frameId=requestFrame(frame);return{get state(){return state},destroy};
}
if(typeof document!=='undefined'&&document.body?.classList.contains('feel-test'))mountTest({document,window});
