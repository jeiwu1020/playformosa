import {mountClub} from './club.mjs';
import {sampleLevelMotion,FALLBACK_FRAME_NAMES} from './levels-motion.mjs';
import {newMatch,beginRound,advance,press,pauseMatch,catchStageSettings,itemArtFrame} from './levels-rules.mjs';
import {createLevelReplayRecorder,recordLevelReplay,finishLevelReplay,sampleLevelReplay} from './levels-replay.mjs';
import {createLevelSound} from './levels-sound.mjs';
import {mountLevelLeaderboard} from './levels-leaderboard.mjs';
import {captureFinaleImage} from './finale-image.mjs';
import {mountLevelSharing} from './levels-sharing.mjs';
const loadStage=async(canvas,options)=>{const {createLevelStage}=await import('./levels-stage.mjs');return createLevelStage(canvas,options);};

export function mountLevel({document,window,clock=()=>window.performance.now(),random=Math.random,requestFrame=fn=>window.requestAnimationFrame(fn),cancelFrame=id=>window.cancelAnimationFrame(id),stageLoader=loadStage,clubFactory=mountClub,soundFactory=createLevelSound,rankingFactory=mountLevelLeaderboard,imageCapture=captureFinaleImage,sharingFactory=mountLevelSharing}={}) {
 const $=id=>document.getElementById(id),mode=document.body.dataset.level;
 if(!['catch','duel'].includes(mode))throw new TypeError('Missing level');
 const catching=mode==='catch',listeners=[];
 let state=newMatch(mode,{practice:true,random}),lastFrame=null,frameId,disposed=false,lastRendered=null,width=window.innerWidth,stageView=null,artError=false,atlasUrl='assets/duel-items-atlas.png',resultPage=0,rendererState='pending',startupTimer=null,pressedAt=null,settledAt=null,lastMotionReady=null,lastPoseFrom='',lastPoseTo='',club=null,summaryPresented=false,summaryDismissed=false;
 let replay=null,replayRecorder=createLevelReplayRecorder({mode}),lastReveal=null,ranking=null,rankingOpen=false,capturedRun=null,imageToken=0,imagePromise=null,imageUrl=null;
 const sound=soundFactory({window,mode}),sharing=sharingFactory({document,mode});
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
 const poseImages=new Map();
 for(const name of FALLBACK_FRAME_NAMES.filter(n=>n.startsWith(`levels-${mode}`))){const img=new window.Image();img.src=`assets/${name}.png`;poseImages.set(name,img);}
 const count=who=>state.results.filter(r=>r.winner===who).length;
 function art(element,item){element.style.backgroundImage=`url("${atlasUrl}")`;const f=itemArtFrame(item.artIndex);element.style.backgroundSize=`${100/f.width}% ${100/f.height}%`;element.style.backgroundPosition=`${100*f.left/(1-f.width)}% ${100*f.top/(1-f.height)}%`;element.setAttribute('aria-label',item.name);}

 function resultText(result){
  if(result.reason==='early')return catching?'太早出手，挑戰結束。':'搶跑！訊號還沒出現。';
  if(result.reason==='late')return '差一點！泡棉彈溜走了。';
  if(result.reason==='miss')return '沒接到！下次再衝更遠。';
  if(result.reason==='caught')return Math.abs(result.offsetMs)<=25?'神準！漂亮接住。':'接住了！下一關更快。';
  if(result.winner==='player')return '你搶到了！快手王慢一步。';
  if(result.winner==='draw')return '同時出手！這回合平手。';
  return '快手王搶到了！下一回扳回來。';
 }
 function details(result){
  if(catching){
   if(result.offsetMs!==null)return `${result.offsetMs<0?'提早':'晚了'} ${Math.round(Math.abs(result.offsetMs))} ms · 本關範圍 ±${Math.round(result.windowMs)} ms`;
   return result.reason==='early'?'泡棉彈還沒到手掌前，先看準再出手。':'通過的關卡就是你的本次紀錄，再挑戰一次吧。';
  }
  const player=result.reason==='early'?'搶跑':result.playerMs===null?'未出手':`${Math.round(result.playerMs)} ms`;
  return `你：${player} ｜ 快手王：${result.aiMs} ms${result.reason==='early'?'（預先抽定）':''}`;
 }
 function summary(){
  const wins=count('player'),opponent=count('ai');
  $('summaryTitle').textContent=catching?`闖到第 ${state.results.length} 關` :wins>opponent?'你贏了快手王！':wins<opponent?'這次快手王贏了！':'十回合，不分高下！';
  $('summaryScore').textContent=catching?`${wins} 關通過`:`${wins} : ${opponent}`;
  $('summaryNote').textContent=catching?`第 ${state.results.length} 關失誤 · 最快挑戰 ${Math.round(state.results.at(-1).flightMs)} ms 飛行速度。每次從第 1 關重新出發。`:`你的勝場 : 快手王勝場 · 搶跑 ${state.results.filter(r=>r.reason==='early').length} 次 · 平手 ${count('draw')} 次`;
  $('roundResults').replaceChildren(...state.results.slice(resultPage*10,resultPage*10+10).map(result=>{
   const li=document.createElement('li'),icon=document.createElement('span');icon.className='result-icon'+(catching?'':' item-art');icon.setAttribute('aria-hidden','true');
   if(catching)icon.textContent=String(result.round).padStart(2,'0');else art(icon,result.item);
   const name=document.createElement('span');name.textContent=catching?`第 ${result.round} 關 · ${Math.round(result.flightMs)} ms`:result.item.name;
   const badge=document.createElement('strong');badge.textContent=result.winner==='player'?(catching?'通過':'你贏'):result.winner==='draw'?'平手':result.reason==='early'?'太早':catching?'失誤':'快手王贏';li.dataset.winner=result.winner;li.append(icon,name,badge);return li;
  }));
  $('resultPages').hidden=state.results.length<=10;$('resultPrev').disabled=resultPage===0;$('resultNext').disabled=(resultPage+1)*10>=state.results.length;$('resultPageLabel').textContent=`${resultPage*10+1}–${Math.min(state.results.length,(resultPage+1)*10)} / ${state.results.length}`;
 }
 function render(now=clock(),actualState=state){
  if(disposed)return;
  const replaySample=replay?sampleLevelReplay(replay.clip,now-replay.startedAt):null;
  const state=replaySample?.state||actualState;
  if(replaySample)now=replaySample.now;
  const active=['waiting','live'].includes(state.phase),feedback=['feedback','done'].includes(state.phase),result=state.results.at(-1),current=replaySample?state.replayRound:state.results.length+(feedback?0:1);
  if(!replay&&feedback&&settledAt===null)settledAt=now;
  const visualState=replaySample?state:{...state,presentation:{pressedAt,settledAt}},motion=sampleLevelMotion({mode,state:visualState,now}),motionReady=motion.complete;
  const summaryReady=!replay&&state.phase==='done'&&!state.practice&&motionReady&&!club?.blocked?.()&&!rankingOpen;
  const practiceChoices=!replay&&state.practice&&state.phase==='done';
  document.body.dataset.practiceChoices=String(practiceChoices);document.body.dataset.replay=String(Boolean(replay));document.body.dataset.phase=state.phase;document.body.dataset.summary=String(summaryReady&&!summaryDismissed);
  if(state!==lastRendered||motionReady!==lastMotionReady||motion.revealStage!==lastReveal){
   lastReveal=motion.revealStage;
   lastMotionReady=motionReady;
   lastRendered=state;
   $('roundLabel').textContent=replaySample?replaySample.label:state.practice?'不計分練習':catching?`第 ${current} 關`:`回合 ${Math.min(current,10)} / 10`;
   $('playerScore').textContent=state.practice?'—':String(count('player'));
   $('opponentScore').textContent=state.practice?'—':catching?String(current):String(count('ai'));
   const timing=state.flightMs??catchStageSettings(1,{practice:state.practice}).flightMs;
   $('speedLabel').textContent=catching?`${Math.round(timing)} ms 飛行 · 每關加速`:'快手王反應 150–280 ms';
   $('actionButton').disabled=artError||rendererState==='pending';$('roundButton').disabled=artError||rendererState==='pending'||!motionReady;$('actionButton').hidden=!active;$('roundButton').hidden=active;$('practiceButton').hidden=active||state.phase==='idle'||practiceChoices;$('practiceAgain').hidden=!practiceChoices;$('practiceAgain').disabled=!motionReady||artError||rendererState==='pending';$('practiceButton').disabled=!motionReady;$('summary').hidden=!(summaryReady&&!summaryDismissed);
   $('roundButton').textContent=state.phase==='idle'?'先練習一次':state.phase==='paused'?'準備好了，重來這一回':state.practice?'正式開始':state.phase==='done'?(catching?'再挑戰一次':'再戰十回合'):(catching?`挑戰第 ${state.results.length+1} 關`:'下一回合');
   $('actionButton').textContent=catching?'接！':'搶！';$('actionButton').setAttribute('aria-label',catching?'伸手接泡棉彈':'出手搶物品');
   let title=catching?'看準掌心，準備接彈。':'手先忍住，看到訊號再搶。';let hint=catching?'泡棉彈到掌心前時，按下大按鈕。':'等「出手！」亮起再按，太早按就輸這回合。';let signal=catching?'看準掌心':'等訊號';
   if(state.phase==='waiting'){title=catching?'眼睛看彈，先別出手。':'準備好了？忍住…';hint='等待長短每次不同，長按不會自動出手。';signal=catching?'準備發射…':'等訊號';}
   if(state.phase==='live'){title=catching?'到掌心就接！':'出手！';hint=catching?'到掌心再按，只有一次機會。':'搶同一件物品，比快手王更快！';signal=catching?'到掌心就接！':'出手！';}
   if(state.phase==='paused'){title='已暫停，這回合不計分。';hint='切換視窗、旋轉或畫面停頓時，準備好再重來。';signal='暫停';}
   if(feedback){title=resultText(result);hint=details(result);signal=result.winner==='player'?(catching?'接住！':'你搶到了！'):result.winner==='draw'?'平手':result.reason==='early'?'太早出手':catching?'挑戰結束':'快手王搶到了';if(state.practice&&result.winner!=='player'&&catching){title='練習不計分，再抓一下時機。';signal='暖身完成';}}
   if(!replay&&!catching&&state.phase==='done'&&!state.practice&&motion.revealStage!=='round'){title=count('player')>count('ai')?'你贏了快手王！':count('player')<count('ai')?'這次快手王贏了！':'十回合，不分高下！';hint=`總成績 ${count('player')} : ${count('ai')} · 末回合：${resultText(result)}`;signal=title;}
   if(replaySample)hint=`${replaySample.label} · 不計分 · ${hint}`;
   $('roundStatus').textContent=title;$('roundHint').textContent=hint;$('signal').textContent=signal;
   if(!catching){const item=state.items[Math.min(feedback?state.results.length-1:state.results.length,9)];art($('itemArt'),item);$('itemName').textContent=item.name;$('itemQuip').textContent=item.quip;}
   else{$('itemName').textContent=state.practice?'先抓到接彈的節奏':feedback&&result.winner==='player'?`下一關 ${Math.round(catchStageSettings(current+1).flightMs)} ms，準備好了嗎？`:'每過一關，手速再快一點';$('itemQuip').textContent='泡棉玩具挑戰 · 一次失誤，本局結束。';}
   $('stage').dataset.winner=feedback?result.winner:'';$('stage').dataset.result=feedback?result.reason:'';$('stage').dataset.launched=String(Number.isFinite(state.liveAt));
   const start=catching?Math.max(0,state.results.length-7):0,end=state.practice?1:catching?state.results.length+(state.phase==='done'?0:1):10;
   $('roundDots').replaceChildren(...Array.from({length:replaySample?1:end-start},(_,j)=>{const i=replaySample?current-1:start+j,dot=document.createElement('span'),r=replaySample?(feedback?result:null):state.results[i];dot.className='round-dot';dot.dataset.outcome=r?r.winner:replaySample||i===state.results.length?'current':'pending';dot.textContent=r?(r.winner==='player'?'✓':r.winner==='draw'?'=':'×'):String(i+1);dot.setAttribute('aria-label',`第 ${i+1} ${catching?'關':'回合'}${r?'：'+(r.winner==='player'?'成功':r.winner==='draw'?'平手':'未成功'):''}`);return dot;}));
   if(!replay&&state.phase==='done'&&!state.practice){resultPage=0;summary();}
  }
  if(catching){const progress=state.phase==='live'?Math.max(0,(now-state.liveAt)/state.flightMs):feedback&&result?.winner==='player'?1:feedback?1.22:0;$('foamBall').style.setProperty('--flight',String(Math.min(1.23,progress)));$('stage').dataset.inWindow=String(state.phase==='live'&&Math.abs(now-state.targetAt)<=state.windowMs);}
  drawFallback(motion,state);
  const painted=stageView?.render(visualState,now);if(painted&&stageView?.artReady&&rendererState==='pending')chooseRenderer('3d');
  $('replayReturn').hidden=!replay;
  if(replay){$('actionButton').hidden=true;$('roundButton').hidden=true;$('practiceButton').hidden=true;}
  if(summaryReady&&!summaryPresented){captureImage(visualState,motion,now);summaryPresented=true;openSummary();}
 }
 function drawFallback(motion,state){
  const {from,to,mix}=motion.fallbackFrame;
  const fromReady=poseImages.get(from)?.complete&&poseImages.get(from)?.naturalWidth,toReady=poseImages.get(to)?.complete&&poseImages.get(to)?.naturalWidth;
  if((fromReady||!lastPoseFrom)&&from!==lastPoseFrom){$('fallbackScene').src=`assets/${from}.png`;lastPoseFrom=from;}
  if(toReady&&to!==lastPoseTo){$('fallbackBlend').src=`assets/${to}.png`;lastPoseTo=to;}
  $('fallbackBlend').style.opacity=String(toReady&&fromReady?mix:0);$('fallbackScene').style.opacity='1';
  const o=motion.overlay;
  if(catching){const show=motion.dartVisible!==false&&(state.phase==='live'||motion.feedback&&Number.isFinite(state.liveAt));$('foamBall').style.visibility=show?'visible':'hidden';$('foamBall').style.left=`${o.dartTip.x*100}%`;$('foamBall').style.top=`${o.dartTip.y*100}%`;}
  else{const xs=o.prizeArtCorners.map(p=>p.x),ys=o.prizeArtCorners.map(p=>p.y);$('itemArt').style.left=`${o.prizeArtCenter.x*100}%`;$('itemArt').style.top=`${o.prizeArtCenter.y*100}%`;$('itemArt').style.width=`${(Math.max(...xs)-Math.min(...xs))*100}%`;$('itemArt').style.height=`${(Math.max(...ys)-Math.min(...ys))*100}%`;}
 }
 function blocked(){return Boolean(replay||rankingOpen||club?.blocked?.()||$('summary').open);}
 function openSummary(){const dialog=$('summary');summaryDismissed=false;dialog.hidden=false;if(!dialog.open){try{dialog.showModal();}catch{dialog.setAttribute('open','');}}}
 function closeSummary(){const dialog=$('summary');summaryDismissed=true;if(dialog.open){try{dialog.close();}catch{dialog.removeAttribute('open');}}dialog.hidden=true;document.body.dataset.summary='false';}
 function sceneVisible(){
  const r=$('stage').getBoundingClientRect();if(!r.width&&!r.height)return true;
  const cue=$('signal').getBoundingClientRect(),scene=$('levelCanvas').getBoundingClientRect(),height=window.visualViewport?.height||window.innerHeight;
  return cue.top>=0&&cue.bottom<=height&&scene.top+scene.height*.5>0&&scene.top+scene.height*.5<height;
 }
 function visualReady(now=clock()){return sampleLevelMotion({mode,state:{...state,presentation:{pressedAt,settledAt}},now}).complete;}
 function observe(previous,now){
  if(state!==previous){
   if(['feedback','done'].includes(state.phase)&&!['feedback','done'].includes(previous.phase))settledAt=now;
   recordLevelReplay(replayRecorder,state,{now,pressedAt,settledAt});
   if(previous.phase==='waiting'&&state.phase==='live')sound.cue();
   if(state.phase==='done'&&!state.practice&&capturedRun!==state){capturedRun=state;ranking?.captureResult(state);$('summaryReplay').disabled=!finishLevelReplay(replayRecorder);}
  }
 }
 function clearResult(){
  replay=null;imageToken++;imagePromise=null;capturedRun=null;rankingOpen=false;ranking?.reset();
  if(imageUrl){window.URL.revokeObjectURL(imageUrl);imageUrl=null;}
  $('summaryImage').hidden=true;$('summaryImage').removeAttribute('src');$('summaryImageStatus').textContent='正在準備本次畫面…';
  sharing.reset();$('summaryReplay').disabled=true;
  replayRecorder=createLevelReplayRecorder({mode});lastRendered=null;lastReveal=null;
 }
 function begin(){
  sound.unlock();const now=clock();if(blocked()||artError||rendererState==='pending'||['waiting','live'].includes(state.phase)||!visualReady(now))return;
  if(!sceneVisible())$('stage').scrollIntoView?.({block:'start',behavior:'instant'});
  if(state.phase==='done'){clearResult();state=newMatch(mode,{practice:false,random});}
  pressedAt=null;settledAt=null;summaryPresented=false;summaryDismissed=false;
  const previous=state;state=beginRound(state,now,random);observe(previous,now);lastFrame=null;render(now);
  if(!sceneVisible())$('stage').scrollIntoView?.({block:'start',behavior:'instant'});$('actionButton').focus({preventScroll:true});
 }
 function act(){
  const now=clock();if(blocked()||artError||rendererState==='pending')return;sound.unlock();
  if(document.hidden||!sceneVisible()||(state.phase==='live'&&lastFrame!==null&&now-lastFrame>250)){pause();return;}
  const previous=state,next=press(state,now);if(next!==state){pressedAt=now;settledAt=now;}state=next;observe(previous,now);render(now);
 }
 function pause(){if(replay){returnFromReplay();return;}const previous=state,next=pauseMatch(state);if(next!==state){pressedAt=null;settledAt=null;}state=next;observe(previous,clock());lastFrame=null;render();}
 function practice(){if(club?.blocked?.()||rankingOpen)return;closeSummary();clearResult();summaryPresented=false;summaryDismissed=false;pressedAt=null;settledAt=null;state=newMatch(mode,{practice:true,random});lastFrame=null;render();$('roundButton').focus({preventScroll:true});}
 function repeatPractice(){
  if(blocked()||artError||rendererState==='pending'||!state.practice||state.phase!=='done'||!visualReady(clock()))return;
  practice();begin();
 }
 function captureImage(visualState,motion,now){
  if(imagePromise)return imagePromise;
  const token=++imageToken,item=state.results.at(-1)?.item;
  $('summaryImageStatus').textContent='正在準備本次畫面…';
  const args=rendererState==='3d'?{canvas:$('levelCanvas'),renderFrame:()=>stageView?.render(visualState,now,{force:true})===true}:{fallback:{mode,motion,from:poseImages.get(motion.fallbackFrame.from),to:poseImages.get(motion.fallbackFrame.to),atlas:$('atlasProbe'),item,showDart:Number.isFinite(visualState.liveAt)}};
  // Invoke synchronously: captureFinaleImage copies WebGL pixels before awaiting encoding.
  try{imagePromise=Promise.resolve(imageCapture({document,...args}));}catch(error){imagePromise=Promise.reject(error);}
  sharing.prepare(state,imagePromise);
  imagePromise=imagePromise.then(({blob})=>{
   if(disposed||token!==imageToken)return;
   imageUrl=window.URL.createObjectURL(blob);$('summaryImage').src=imageUrl;$('summaryImage').hidden=false;$('summaryImageStatus').textContent='本次挑戰的實際結束畫面';
  }).catch(()=>{if(!disposed&&token===imageToken)$('summaryImageStatus').textContent='本次畫面暫時無法產生，仍可重播與複製成績。';});
  return imagePromise;
 }
 function startReplay(){
  const clip=finishLevelReplay(replayRecorder);if(club?.blocked?.()||rankingOpen||!clip||state.phase!=='done'||state.practice)return;
  closeSummary();replay={clip,startedAt:clock()};lastRendered=null;lastReveal=null;render();$('replayReturn').focus({preventScroll:true});
 }
 function returnFromReplay(){if(!replay)return;replay=null;lastRendered=null;lastReveal=null;const defer=club?.blocked?.();if(defer){summaryPresented=false;summaryDismissed=false;}render();if(!defer){openSummary();$('summaryReplay').focus({preventScroll:true});}}
 listen($('summaryReplay'),'click',startReplay);listen($('replayReturn'),'click',returnFromReplay);
 listen($('summaryRanking'),'click',()=>{if(!club?.blocked?.()&&state.phase==='done'&&!state.practice)ranking?.showBoard({origin:'result'});});
 listen($('soundToggle'),'click',()=>{sound.unlock();sound.setMuted(!sound.muted);$('soundToggle').textContent=sound.muted?'音效：關':'音效：開';$('soundToggle').setAttribute('aria-pressed',String(sound.muted));});
 listen($('summaryClose'),'click',()=>{if(!club?.blocked?.())closeSummary();});listen($('summary'),'close',()=>{if($('summary').open||state.phase!=='done'||state.practice)return;summaryDismissed=true;$('summary').hidden=true;document.body.dataset.summary='false';});listen($('summaryAgain'),'click',()=>{if(club?.blocked?.())return;closeSummary();begin();});listen($('summaryPractice'),'click',practice);
 listen($('resultPrev'),'click',()=>{if(resultPage>0){resultPage--;summary();}});listen($('resultNext'),'click',()=>{if((resultPage+1)*10<state.results.length){resultPage++;summary();}});
 listen($('practiceAgain'),'click',repeatPractice);listen($('roundButton'),'click',begin);listen($('practiceButton'),'click',practice);listen($('restartButton'),'click',practice);
 listen($('actionButton'),'pointerdown',event=>{if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;event.preventDefault();act();});
 listen($('actionButton'),'click',event=>{if(event.detail===0)act();});
 listen(document,'keydown',event=>{if(!['Space','Enter'].includes(event.code))return;const target=event.target;if(target?.closest?.('a,input,select,textarea,summary')||target?.closest?.('button')!==$('actionButton')&&target?.closest?.('button'))return;if(!['waiting','live'].includes(state.phase))return;event.preventDefault();if(!event.repeat)act();});
 listen(window,'scroll',()=>{if(['waiting','live'].includes(state.phase)&&!sceneVisible())pause();},{passive:true});listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});listen(window,'resize',()=>{if(Math.abs(window.innerWidth-width)>8){width=window.innerWidth;pause();}});listen(window,'pagehide',event=>{pause();if(!event.persisted)destroy();});
 function frame(now){if(disposed)return;if(replay){if(document.hidden||club?.blocked?.()||sampleLevelReplay(replay.clip,now-replay.startedAt).done)returnFromReplay();else render(now);frameId=requestFrame(frame);return;}const previous=state;if(blocked()||document.hidden||(['waiting','live'].includes(state.phase)&&!sceneVisible()))pause();else if(state.phase==='live'&&lastFrame!==null&&now-lastFrame>250)pause();else state=advance(state,now);observe(previous,now);lastFrame=now;render(now);frameId=requestFrame(frame);}
 function destroy(){if(disposed)return;disposed=true;imageToken++;if(imageUrl)window.URL.revokeObjectURL(imageUrl);sound.destroy();sharing.destroy();ranking?.destroy();window.clearTimeout(startupTimer);cancelFrame(frameId);stageView?.dispose();club?.destroy();for(const remove of listeners)remove();}
 function artFailed(){if(disposed||catching)return;artError=true;$('artStatus').hidden=false;$('artStatus').textContent='道具圖像載入失敗，請重試後再開始。';$('retryArtButton').hidden=false;lastRendered=null;pause();}
 function artLoaded(){if(disposed||catching)return;artError=false;$('artStatus').hidden=true;$('retryArtButton').hidden=true;atlasUrl=$('atlasProbe').getAttribute('src');lastRendered=null;render();}
 listen($('atlasProbe'),'error',artFailed);listen($('atlasProbe'),'load',artLoaded);
 listen($('retryArtButton'),'click',()=>{$('artStatus').textContent='正在重新載入道具圖像…';$('atlasProbe').src=`assets/duel-items-atlas.png?retry=${Date.now()}`;});
 function chooseRenderer(choice){
  if(disposed||rendererState==='fallback'&&choice==='3d')return;
  rendererState=choice;document.body.dataset.renderer=choice;window.clearTimeout(startupTimer);
  $('stage').classList.toggle('has-3d',choice==='3d');$('renderMode').textContent=choice==='3d'?'3D 角色演出':'2D 相容模式 · 同模型畫面';
  $('actionButton').disabled=artError;$('roundButton').disabled=artError;
 }
 const unavailable=message=>{if(disposed)return;chooseRenderer('fallback');if(/atlas/i.test(message||''))artFailed();};
 const ready3d=()=>{if(disposed||rendererState==='fallback')return;render();};
 function stageResolved(stage){if(disposed||rendererState==='fallback'){stage?.dispose();return;}stageView=stage;if(!stage?.available)unavailable();render();}
 startupTimer=window.setTimeout(()=>unavailable('Renderer preparation timed out'),5000);
 try{const stage=stageLoader($('levelCanvas'),{mode,onUnavailable:unavailable,onReady:ready3d});if(stage?.then)stage.then(stageResolved).catch(unavailable);else stageResolved(stage);}catch{unavailable();}
 if(!catching&&$('atlasProbe').complete&&!$('atlasProbe').naturalWidth)artFailed();

 ranking=rankingFactory({document,mode,onOpen(dialog){closeSummary();rankingOpen=true;try{dialog.showModal();}catch{dialog.setAttribute('open','');}},onClose(origin){rankingOpen=false;if(origin==='result'&&state.phase==='done'&&!state.practice&&!disposed)openSummary();}});
 listen(document,'clubchange',()=>{lastRendered=null;render();});
 club=clubFactory({document,window,mode,getNavigationContext:()=>({phase:state.phase,practice:state.practice}),getResumeTarget:()=>$('roundButton'),isActive:()=>['waiting','live','paused'].includes(state.phase)||(!state.practice&&state.results.length>0&&state.phase!=='done'),onInterrupt:()=>pause(),onStart:()=>{}});
 render();frameId=requestFrame(frame);return{get state(){return state;},destroy};
}
if(typeof document!=='undefined'&&document.body?.dataset.level)mountLevel({document,window});
