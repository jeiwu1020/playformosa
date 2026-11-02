import {mountControlsFrame} from '../shared/controls-shell.mjs';
mountControlsFrame({document,game:"shot-put",scene:document.querySelector(".arena"),controls:document.querySelector(".controls"),keys:{a:document.querySelector("#stepA"),s:document.querySelector("#stepS"),j:document.querySelector("#charge"),k:document.querySelector("#throw")}});
import {createGameEntry,helpIsOpen,suspendHelpPresentation,ensurePauseHelp} from '../shared/entry-shell.mjs';
import{createRelaySound}from'./relay-audio.mjs';import{createState,tick,press,release,pause as freeze,result,saveBest,cancelHold,replayState}from'./engine.mjs';import{routeChapter,seedFromSearch}from'./sky-route.mjs';import{createInput,LIMBS}from'./controls.mjs';import{createRenderer}from'./render.mjs';import{createEpoch,shareText,shareFile,makeCard}from'./share.mjs';import{syncPauseButton,createResultDialog,createMusicController}from'../shared/game-ui.mjs';
const $=id=>document.getElementById(id),canvas=$('game'),epoch=createEpoch();let initialPresentationReady=false,routeSeed=seedFromSearch(location.search||''),s=createState(routeSeed),running=false,view=null,snapshot=null,card=null,file=null,url=null,previewUrl=null,previewEncoding=false,final=null,replaying=false,original=null,busy=false,last=0,encoding=false,manualInvoker=null,lastPresented=null,presentationEpoch=0,pauseMessage="",centerMode="";
const input=createInput(),buttons={a:$('stepA'),s:$('stepS'),j:$('charge'),k:$('throw')},captures=new Map();
// RAF-only presentation deadline: no hidden body evolution on stalled input.
const VISIBLE_FRAME_LIMIT_MS=200,TIMED_PHASES=new Set(['countdown','body']);
const dialog=createResultDialog($('result'),{focusTarget:()=>$('again'),returnFocus:()=>canvas});
const relaySound=createRelaySound();
function unlockAudio(){relaySound.setEnabled(music.enabled);music.unlock();relaySound.unlock();}
const music=createMusicController({src:'./audio/bgm.mp3',notify:v=>{$('music').setAttribute('aria-pressed',String(v.enabled&&v.ready));$('music').textContent=!v.enabled?'♫ 音樂關':v.pending?'♫ 載入中':v.ready?'♫ 音樂開':'♫ 開啟音樂';$('audioStatus').textContent=!v.enabled?'音樂已關閉':v.pending?'正在開啟音樂…':v.ready?'音樂已開啟（不影響出手判定）':'音樂尚未開啟；按音樂按鈕重試。';}});
try{view=createRenderer(canvas);view.draw(s);initialPresentationReady=true;}catch{$('center').hidden=false;$('center').innerHTML='<b>這台裝置無法啟用 WebGL</b><p>請使用支援 WebGL 的瀏覽器；目前不會開始計分。</p>';$('start')?.remove();$('restart').disabled=true;}
function clearHeld(){const old=[...captures];input.clear();captures.clear();for(const[id,b]of old)try{b.releasePointerCapture(id);}catch{}}
function active(){return running&&!s.paused&&s.phase!=='done';}
function start(){if(!initialPresentationReady)return;epoch.next();clearHeld();relaySound.reset();dialog.close();if($('manual').open)$('manual').close();if(url)URL.revokeObjectURL(url);if(previewUrl)URL.revokeObjectURL(previewUrl);url=null;previewUrl=null;previewEncoding=false;file=null;card=null;snapshot=null;final=null;original=null;busy=false;encoding=false;replaying=false;s=createState(routeSeed);s.phase='body';running=true;last=presentationEpoch=performance.now();lastPresented=null;pauseMessage="";centerMode="";$('resultImage').removeAttribute('src');$('retryPreview').hidden=true;$('manualImage').removeAttribute('src');$('image').disabled=true;music.setPlaying(true);unlockAudio();canvas.focus({preventScroll:true});view.draw(s);lastPresented=performance.now();sync();}
function sync(){syncPauseButton($('pause'),{paused:s.paused,available:running&&s.phase!=='done'});for(const[k,b]of Object.entries(buttons)){b.disabled=!active()||s.phase!=='body';b.hidden=false;b.classList.toggle('active',input.values[LIMBS.indexOf(k)]);b.setAttribute('aria-pressed',String(input.values[LIMBS.indexOf(k)]));}
 const bodyFeedback=active()&&s.phase==='body',arm=s.j[2]||0;buttons.k.style.setProperty('--charge-fill',(bodyFeedback?Math.max(0,Math.min(1,s.power))*100:0)+'%');$('balanceCue').textContent=!bodyFeedback?'按伸 · 放收':s.held[2]?(arm<.8?'伸臂中':'伸臂穩住'):arm>.08?(s.extension>.15&&s.support>.35?'收臂蹬地':'收臂中'):'按伸 · 放收';
 $('distance').innerHTML=`${(['air','impact','done'].includes(s.phase)?s.x:0).toFixed(2)} <em>m</em>`;
 const words={countdown:'準備好了，四肢一起上班。',body:s.feedback,push:'從頸邊推出去！',air:s.routeEvent&&s.flight-(s.hits.at(-1)?.t||0)<1.2?s.routeEvent:(routeChapter(s.maxX||0).name+' · 出手後不用操作。'),impact:'地板收到你的心意了。',done:'重物已送達。'};
 $('hint').textContent=(replaying?'重播 · ':'')+words[s.phase];$('sceneLabel').textContent=s.phase==='air'?`高 ${s.y.toFixed(0)} m ≈ ${Math.round(s.y/3)} 層樓 · ${Math.abs(s.x).toFixed(0)} m 遠`:'路線 '+s.seed+' · 空中接力';
 if(running){$('center').hidden=helpIsOpen(document)||!(s.paused||s.phase==='countdown');if(s.paused){const mode='pause:'+pauseMessage;if(centerMode!==mode){$('center').innerHTML=`<b>${pauseMessage?'畫面更新延遲，已暫停':'先喘口氣。'}</b><p>${pauseMessage||'蓄力已取消，不會偷偷丟球。'}</p><button id="resume" class="primary">繼續遊戲</button>`;centerMode=mode;}}else if(s.phase==='countdown'){$('center').innerHTML=`<b>${Math.max(1,Math.ceil(3-s.clock))}</b><p>按住 K 蓄力，放開推出</p>`;centerMode='countdown';}else centerMode='playing';if(s.paused)ensurePauseHelp(document,$('center'));}
}
function togglePause(){if(!running||s.phase==='done')return;if(s.paused){s.paused=false;last=presentationEpoch=performance.now();lastPresented=null;pauseMessage='';music.setPlaying(true);unlockAudio();}else{if(!advance(performance.now()))return;freeze(s);relaySound.silence();clearHeld();pauseMessage='';music.setPlaying(false);}sync();}
function interrupt(){if(running&&s.phase!=='done'&&!s.paused){freeze(s);relaySound.silence();clearHeld();last=performance.now();pauseMessage='';music.setPlaying(false);sync();}}
function pauseForDelay(now){freeze(s);relaySound.silence();clearHeld();last=now;pauseMessage='身體時間已停住，蓄力已取消；繼續後重新按住 K。';music.setPlaying(false);view.draw(s);sync();}

function change(source,key){if(!advance(performance.now())||!active()||s.phase!=='body')return;for(const[k,down]of input.set(source,key))down?press(s,k):release(s,k);if(s.phase!=='body')clearHeld();view.draw(s);sync();}
$('start')?.addEventListener('click',start);$('restart').onclick=start;$('again').onclick=start;$('newRoute').onclick=()=>{routeSeed=(routeSeed+2654435769)>>>0;start();};$('pause').onclick=togglePause;$('center').onclick=e=>{if(e.target.id==='resume')togglePause();};$('music').onclick=()=>{if(music.enabled&&music.ready){music.setEnabled(false);relaySound.setEnabled(false);}else{music.setEnabled(true);music.setPlaying(running&&!s.paused);unlockAudio();}};
for(const[k,b]of Object.entries(buttons)){
 // Space and Enter can overlap on one focused button: each owns its own hold.
 const nativeSource=key=>'button:'+k+':'+(key===' '?'Space':'Enter');
 const cancelNativeHold=()=>{const sources=[' ','Enter'].map(nativeSource);if(!sources.some(source=>input.sources.has(source)))return;if(!advance(performance.now()))return;for(const source of sources)input.set(source,null);cancelHold(s,k,input.values[LIMBS.indexOf(k)]);view.draw(s);sync();};
 b.addEventListener('blur',cancelNativeHold);b.addEventListener('focusout',cancelNativeHold);
 b.addEventListener('pointerdown',e=>{if(e.button!==0||b.disabled)return;e.preventDefault();change('pointer:'+e.pointerId,k);if(!input.sources.has('pointer:'+e.pointerId))return;captures.set(e.pointerId,b);b.setPointerCapture(e.pointerId);});
 b.addEventListener('lostpointercapture',e=>{if(captures.has(e.pointerId))interrupt();});
 b.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat){e.preventDefault();change(nativeSource(e.key),k);}});
 b.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();change(nativeSource(e.key),null);}});
}
// Native long-press menus belong to sharing/reading, not the live play surface.
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('.arena,.controls,.hint'))e.preventDefault();});
window.addEventListener('pointermove',e=>{if(!captures.has(e.pointerId))return;const target=document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('button'),entry=Object.entries(buttons).find(([,b])=>b===target);if(entry)change('pointer:'+e.pointerId,entry[0]);});
window.addEventListener('pointerup',e=>{if(!captures.has(e.pointerId))return;const b=captures.get(e.pointerId);captures.delete(e.pointerId);change('pointer:'+e.pointerId,null);try{b.releasePointerCapture(e.pointerId);}catch{}});
window.addEventListener('pointercancel',e=>{if(captures.has(e.pointerId))interrupt();});
window.addEventListener('keydown',e=>{if(e.repeat||$('result').open||$('manual').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='p'||k==='escape'){e.preventDefault();togglePause();return;}if(LIMBS.includes(k)&&active()){e.preventDefault();change('key:'+k,k);}});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(LIMBS.includes(k)&&input.sources.has('key:'+k))change('key:'+k,null);});
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});window.addEventListener('orientationchange',interrupt);
// Scene preview and share card own separate immutable images and URL lifetimes.
function encodePreview(){if(!snapshot||previewEncoding||previewUrl)return;previewEncoding=true;$('retryPreview').hidden=true;const token=epoch.current();try{snapshot.toBlob(blob=>{if(!epoch.valid(token))return;previewEncoding=false;if(!blob){$('retryPreview').hidden=false;return;}previewUrl=URL.createObjectURL(blob);$('resultImage').src=previewUrl;},'image/png');}catch{if(epoch.valid(token)){previewEncoding=false;$('retryPreview').hidden=false;}}}
$('retryPreview').onclick=encodePreview;
function encode(){if(!card||encoding)return;encoding=true;const token=epoch.current();$('shareStatus').textContent='正在準備本次圖片…';try{card.toBlob(blob=>{if(!epoch.valid(token))return;encoding=false;if(!blob){$('shareStatus').textContent='圖片準備失敗，按圖片按鈕重試。';$('image').disabled=false;return;}file=new File([blob],'playformosa-shot-put.png',{type:'image/png'});url=URL.createObjectURL(blob);$('image').disabled=false;$('shareStatus').textContent='本次落地畫面已固定；旋轉螢幕與重播不會換圖。';},'image/png');}catch{if(epoch.valid(token)){encoding=false;$('image').disabled=false;$('shareStatus').textContent='圖片準備失敗，按圖片按鈕重試。';}}}
function showResult(){if(replaying){s=original;replaying=false;original=null;music.setPlaying(false);view.draw(s);dialog.open();sync();return;}final=result(s);try{saveBest(localStorage,final);}catch{}snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.getContext('2d').drawImage(canvas,0,0);card=makeCard(snapshot,final);$('resultScore').textContent=final.distance.toFixed(2)+' m';$('resultTitle').textContent=final.badge;$('verdict').textContent=final.verdict;$('comparison').textContent=final.cause+' '+final.comparison;;const text=shareText(final,location.origin+'/games/shot-put/?route='+final.seed);$('threads').href='https://www.threads.net/intent/post?text='+encodeURIComponent(text);$('image').textContent=matchMedia('(pointer:coarse)').matches?'分享成績圖片':'下載成績圖片';dialog.open();music.setPlaying(false);encodePreview();encode();}
function manual(kind){manualInvoker=kind==='copy'?$('copy'):$('image');$('manualHint').textContent=kind==='image'?'可長按圖片儲存，或使用瀏覽器圖片選單。':'自動複製未成功；請選取下方文字手動複製。';$('copyText').hidden=kind==='image';$('manualImage').hidden=kind!=='image';$('copyText').value=shareText(final,location.origin+'/games/shot-put/?route='+final.seed);if(url)$('manualImage').src=url;$('manual').showModal();$('manualTitle').focus();}
$('manual').addEventListener('close',()=>manualInvoker?.focus());$('manualClose').onclick=()=>{$('manual').close();};$('copy').onclick=async()=>{if(!final||busy)return;busy=true;let t=epoch.current();try{await navigator.clipboard.writeText(shareText(final,location.origin+'/games/shot-put/?route='+final.seed));if(epoch.valid(t))$('shareStatus').textContent='已複製成績與網址。';}catch{if(epoch.valid(t))manual('copy');}finally{if(epoch.valid(t))busy=false;}};
$('image').onclick=()=>{if(busy)return;if(!file){encode();return;}busy=true;const t=epoch.current();const promise=shareFile(file,navigator,matchMedia('(pointer:coarse)').matches);promise.then(status=>{if(!epoch.valid(t))return;if(status==='download'){let a=document.createElement('a');a.href=url;a.download=file.name;a.click();$('shareStatus').textContent='已送出 PNG 下載；請查看瀏覽器下載項目。';}else if(status==='fallback'){manual('image');$('shareStatus').textContent='未完成原生分享，可手動儲存圖片。';}else $('shareStatus').textContent=status==='cancelled'?'已取消分享；成績仍保留。':'分享完成。';}).finally(()=>{if(epoch.valid(t))busy=false;});};
$('replay').onclick=()=>{if(!final)return;dialog.close();relaySound.reset();music.setPlaying(true);unlockAudio();original=s;s=replayState(s);replaying=true;last=performance.now();sync();};
function advance(now,fromFrame=false){
 now=Math.max(now,last); // RAF timestamps can predate an input handled in the same event-loop turn.
 const elapsedMs=Math.max(0,now-last);
 if(view&&running&&!s.paused&&TIMED_PHASES.has(s.phase)){
  const visibleAge=Math.max(0,now-(lastPresented??presentationEpoch));
  // A slow renderer may have just completed yet left a large unconsumed simulation gap: protect that too.
  if(visibleAge>VISIBLE_FRAME_LIMIT_MS||elapsedMs>VISIBLE_FRAME_LIMIT_MS){pauseForDelay(now);return false;}
  // A new/resumed clock epoch must get one real RAF submission before accepting stage input.
  if(!fromFrame&&lastPresented===null)return false;
 }
 last=now;if(view){const prev=s.phase;if(running){tick(s,elapsedMs/1000);relaySound.sync(s,music.ready);}view.draw(s);if(running&&prev!=='done'&&s.phase==='done')showResult();}return true;
}
function frame(now){advance(now,true);if(running)sync();lastPresented=performance.now();requestAnimationFrame(frame);}syncPauseButton($('pause'),{available:false});requestAnimationFrame(frame);

function helpVisit(){return suspendHelpPresentation(document,{pause:()=>{interrupt();clearHeld();},controllers:{result:dialog},dialogs:['result'],panels:[$('center')],after:()=>sync()});}
const entry=createGameEntry({document,gameId:'shot-put',onHelpEnter:helpVisit,onStart:()=>start(),onEnter:()=>{interrupt();clearHeld();},canStart:()=>initialPresentationReady});if(initialPresentationReady)$('center').hidden=true;entry.open();
