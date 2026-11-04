import {mountResultUploadHost} from './result-upload-host.mjs';
import {NOTE_FLOOR_MS} from './challenge.mjs';

const DEVICE_KEY='pf-leaderboard-device-v1',NICKNAME_KEY='pf-leaderboard-nickname-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validMode=mode=>mode==='mouse'||mode==='touch';
const modeLabel=mode=>mode==='touch'?'觸控':'滑鼠';
const validScore=score=>typeof score==='number'&&Number.isFinite(score)&&score>0&&score<NOTE_FLOOR_MS;
const seconds=ms=>ms>0&&ms<1?'<0.001':(ms/1000).toFixed(3);
export function freezeLeaderboardResult(run,mode,{demo=false}={}){
 if(demo||run?.phase!=='success'||!validMode(mode)||!validScore(run.elapsedMs))return null;
 return Object.freeze({mode,rules:'shuttle-v3-'+mode,score:run.elapsedMs});
}

/** Dedicated QA board. Never derives a submission from UI text or local bests.
 * captureResult is called exactly at the real successful run transition. Closing
 * a view preserves the round's immutable payload, attempt count and final status.
 */
export function mountFastHandsLeaderboard({document,fetcher=(...args)=>document.defaultView.fetch(...args),onOpen=dialog=>dialog.showModal(),onClose=()=>{},inlineUpload}={}){
 const win=document.defaultView,$=id=>document.getElementById(id),dialog=$('rankingDialog');
 const read=key=>{try{return win.localStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{win.localStorage.setItem(key,value)}catch{}};
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el};
 let device=null,round=null,sourceRun=null,payload=null,attempts=0,completed=false,rejected=false,pending=false;
 let boardMode='mouse',origin='entry',view=null,returnOnClose=true,destroyed=false,uploadToken=0,boardToken=0,uploadRequest=null,boardRequest=null;
 let unavailable=false,ineligibleReason='完成有效挑戰後才能上傳本次成績。';
 const inline=mountResultUploadHost({section:$('rankingUpload'),inlineUpload,onClose(){if(view==='result-upload'){stopUpload();view=null;inline.restore()}}});
 $('rankingNickname').value=read(NICKNAME_KEY)||'';
 function deviceId(){
  if(device)return device;
  const stored=read(DEVICE_KEY);if(UUID.test(stored||''))return device=stored;
  try{const candidate=win.crypto.randomUUID();if(!UUID.test(candidate))return null;device=candidate;write(DEVICE_KEY,device);return device}catch{return null}
 }
 function request(url,options={}){
  const controller=new win.AbortController();let timer;
  const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}));
  timer=win.setTimeout(()=>controller.abort(),10000);
  let fetched;try{fetched=fetcher(url,{...options,signal:controller.signal})}catch(error){fetched=Promise.reject(error)}
  const result=Promise.race([Promise.resolve(fetched).then(async response=>({response,data:await response.json()})),aborted]).finally(()=>win.clearTimeout(timer));
  return {result,cancel(){win.clearTimeout(timer);controller.abort()}};
 }
 function syncUpload(){
  $('resultUpload').disabled=!round;
  $('leaderboardStatus').textContent=round?'本次成功成績可自願上傳測試榜；成績由玩家回報。':'完成有效挑戰後，可自願上傳本次成績至測試排行榜。';
  $('rankingNickname').disabled=!!payload;
  $('rankingConsent').disabled=!!payload;
  $('rankingSubmit').disabled=!round||pending||completed||rejected||attempts>=3;
  $('rankingSubmit').textContent=completed?'已提交':pending?'提交中…':payload?'重試同一筆':'提交本次成績';
  if(unavailable)$('rankingSubmit').disabled=true;
  inline?.sync({eligible:!!round,pending,completed,rejected,payload,attempts,reason:ineligibleReason,unavailable});
 }
 function stopBoard(){boardToken++;boardRequest?.cancel();boardRequest=null;}
 function stopUpload(uncertain=true){
  uploadToken++;uploadRequest?.cancel();uploadRequest=null;
  if(pending&&uncertain)$('rankingUploadStatus').textContent='已停止等待；送出的成績可能已收錄。可手動重試同一筆，不會重複入榜。'+(attempts>=3?' 本回合已達3次提交上限。':'');
  pending=false;syncUpload();
 }
 function finishClose(){
  if(dialog.open||view==='result-upload')return; // Ignore a queued close event after a newer view opens.
  stopBoard();stopUpload();view=null;
  if(returnOnClose&&!destroyed)onClose(origin);
 }
 dialog.addEventListener('close',finishClose);
 function dismiss(returnToParent=true){
  returnOnClose=returnToParent;stopBoard();stopUpload();view=null;inline?.restore();
  if(dialog.open)dialog.close();
 }
 function open(nextView,nextOrigin){
  if(destroyed)return false;
  if(view!==nextView){stopBoard();stopUpload();}
  inline?.restore();origin=nextOrigin==='result'?'result':'entry';view=nextView;returnOnClose=true;
  $('rankingBoard').hidden=nextView!=='board';$('rankingUpload').hidden=nextView!=='upload';
  $('rankingTitle').textContent=nextView==='board'?'測試排行榜':'上傳本次成績';
  $('rankingReturn').textContent=origin==='result'?'返回本次成績':'返回遊戲選單';
  if(!dialog.open)onOpen(dialog,origin);
  dialog.querySelector('.ranking-scroll').scrollTop=0;
  return true;
 }
 function drawOwn(row){
  const own=$('rankingOwn');own.replaceChildren(make('h3','本瀏覽器線上最佳'));
  if(!row||!validScore(row.score)||!Number.isInteger(row.rank)||row.rank<1||typeof row.nickname!=='string'){own.append(make('p','還沒有線上成績。成功後可選擇手動上傳。'));return}
  own.append(make('strong',seconds(row.score)+' 秒'),make('p','第 '+row.rank+' 名 · '+row.nickname));
  if(row.gap===null)own.append(make('p','目前領先，繼續挑戰自己。'));
  else if(typeof row.gap==='number'&&Number.isFinite(row.gap)&&row.gap>=0)own.append(make('p','距前方較佳成績 '+seconds(row.gap)+' 秒。'));
 }
 async function refreshBoard(){
  if(destroyed||view!=='board'||!dialog.open)return;
  stopBoard();const token=boardToken,currentMode=boardMode,id=deviceId();
  $('rankingMouse').setAttribute('aria-pressed',String(boardMode==='mouse'));
  $('rankingTouch').setAttribute('aria-pressed',String(boardMode==='touch'));
  $('rankingEntries').replaceChildren();$('rankingOwn').replaceChildren();$('rankingBoardStatus').textContent='讀取'+modeLabel(boardMode)+'榜中…';
  boardRequest=request('/api/leaderboard?game=fast-hands&mode='+currentMode,{headers:id?{'X-Leaderboard-Device':id}:{},cache:'no-store'});
  try{
   const {response,data}=await boardRequest.result;
   if(token!==boardToken||destroyed)return;
   if(!response.ok||!data||data.game!=='fast-hands'||data.rules!=='shuttle-v3-'+currentMode||data.unit!=='ms'||(data.mode!==undefined&&data.mode!==currentMode)||!Array.isArray(data.entries))throw Error('unavailable');
   for(const row of data.entries.slice(0,20)){
    if(typeof row.nickname!=='string'||!validScore(row.score)||!Number.isInteger(row.rank)||row.rank<1)continue;
    const li=make('li',''),place=make('span',String(row.rank)),name=make('span',row.nickname+(row.isMe?' · 我':'')),score=make('strong',seconds(row.score)+' 秒');
    place.className='ranking-place';name.className='ranking-name';if(row.isMe)li.classList.add('is-me');li.append(place,name,score);$('rankingEntries').append(li);
   }
   drawOwn(data.own);$('rankingBoardStatus').textContent=$('rankingEntries').children.length?'前20筆'+modeLabel(boardMode)+'最佳成績':'還沒有'+modeLabel(boardMode)+'成績，第一筆由你開始。';
  }catch{if(token===boardToken&&!destroyed){$('rankingBoardStatus').textContent='排行榜暫時無法讀取，遊戲不受影響。請稍後重新讀取。';$('rankingOwn').replaceChildren(make('p','尚未取得線上最佳。'));}}
  finally{if(token===boardToken)boardRequest=null;}
 }
 function showBoard({origin:from='entry',mode=round?.mode||'mouse'}={}){
  boardMode=validMode(mode)?mode:'mouse';if(open('board',from))void refreshBoard();
 }
 function prepareUpload(){
  $('rankingFrozenScore').textContent='本次固定類別：'+modeLabel(round.mode)+'榜 · '+seconds(round.score)+' 秒';
  if(!deviceId()){unavailable=true;$('rankingUploadStatus').textContent='此瀏覽器無法建立匿名識別，仍可正常遊玩與下載成績圖。';}
  syncUpload();
 }
 function showUpload(){
  if(!round||destroyed)return;
  open('upload','result');prepareUpload();
 }
 function showResultUpload(){
  if(!inline){showUpload();return}
  if(!round||destroyed||!inline.show())return;
  if(view!=='result-upload'){stopBoard();stopUpload();}
  origin='result';view='result-upload';prepareUpload();
  const nickname=$('rankingNickname'),consent=$('rankingConsent'),button=$('rankingSubmit');
  const invalidName=!nickname.value.trim()||[...nickname.value.trim()].length>20||/[<>\p{Cc}\p{Cf}]/u.test(nickname.value.trim());
  inline.reveal(!payload&&invalidName?nickname:!payload&&!consent.checked?consent:!button.disabled?button:$('rankingUploadStatus'));
 }
 function focusUploadTarget(element){if(view==='result-upload')inline?.reveal(element);else element.focus({preventScroll:true})}
 async function submit(){
  if(!round||!((view==='upload'&&dialog.open)||(view==='result-upload'&&inline?.isOpen()))||pending||completed||rejected||attempts>=3)return;
  const id=deviceId();if(!id)return;
  if(!payload){
   const nickname=$('rankingNickname').value.trim();
   if(!nickname||[...nickname].length>20||/[<>\p{Cc}\p{Cf}]/u.test(nickname)){$('rankingUploadStatus').textContent='請輸入1–20字純文字暱稱，不可含控制字元或角括號。';focusUploadTarget($('rankingNickname'));return}
   if(!$('rankingConsent').checked){$('rankingUploadStatus').textContent='請先確認同意公開暱稱與本次成績，再提交。';focusUploadTarget($('rankingConsent'));return}
   let submissionId;try{submissionId=win.crypto.randomUUID()}catch{}
   if(!UUID.test(submissionId||'')){$('rankingUploadStatus').textContent='此瀏覽器無法建立提交編號，仍可正常遊玩。';return}
   payload=Object.freeze({game:'fast-hands',rules:round.rules,unit:'ms',status:'success',score:round.score,nickname,deviceId:id,submissionId});
   write(NICKNAME_KEY,nickname);
  }
  pending=true;attempts++;const token=++uploadToken;syncUpload();$('rankingUploadStatus').textContent='提交中，請稍候…';
  uploadRequest=request('/api/leaderboard/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  try{
   const {response,data}=await uploadRequest.result;
   if(token!==uploadToken||destroyed)return;
   if(response.ok&&data?.accepted===true){completed=true;$('rankingUploadStatus').textContent=data.bestUpdated?'已收錄，刷新本瀏覽器線上最佳！':'已收錄，保留本瀏覽器線上最佳。';const own=data.own;if(own&&validScore(own.score)&&Number.isInteger(own.rank)&&own.rank>0)$('rankingUploadStatus').textContent+=' 第 '+own.rank+' 名，最佳 '+seconds(own.score)+' 秒。';}
   else if([400,403,409,413].includes(response.status)){rejected=true;$('rankingUploadStatus').textContent='本次提交無法接受，請重新挑戰後再試。遊戲與下載不受影響。';}
   else throw Error(response.status===429?'limited':response.status===503?'unavailable':'network');
  }catch(error){if(token===uploadToken&&!destroyed)$('rankingUploadStatus').textContent=error.message==='limited'?'提交暫時達限，請稍後手動重試同一筆；仍可繼續遊玩。':error.message==='unavailable'?'排行榜暫時無法提交，請稍後手動重試同一筆。':'未確認提交完成，成績可能已收錄。可手動重試同一筆，不會重複入榜。';}
  finally{if(token===uploadToken){pending=false;uploadRequest=null;if(!completed&&!rejected&&attempts>=3)$('rankingUploadStatus').textContent+=' 本回合已達3次提交上限，請稍後再挑戰。';syncUpload();}}
 }
 function reset(){
  dismiss(false);stopUpload(false);round=null;sourceRun=null;payload=null;attempts=0;completed=false;rejected=false;unavailable=false;
  $('rankingConsent').checked=false;$('rankingFrozenScore').textContent='';$('rankingUploadStatus').textContent='';syncUpload();
 }
 function captureResult(run,mode,options){
  if(sourceRun===run&&round)return true;
  reset();ineligibleReason=options?.demo?'示範成績不會上傳。':'本次未完成有效挑戰，請再挑戰一次。';const captured=freezeLeaderboardResult(run,mode,options);if(!captured){syncUpload();return false;}
  sourceRun=run;round=captured;syncUpload();return true;
 }
 const listeners=[];
 function listen(el,type,handler){el.addEventListener(type,handler);listeners.push(()=>el.removeEventListener(type,handler))}
 for(const [id,fn] of [['rankingClose',()=>dismiss()],['rankingReturn',()=>dismiss()],['rankingMouse',()=>{boardMode='mouse';void refreshBoard()}],['rankingTouch',()=>{boardMode='touch';void refreshBoard()}],['rankingRefresh',()=>void refreshBoard()],['rankingSubmit',()=>void submit()]])listen($(id),'click',fn);
 for(const type of ['keydown','keyup','keypress'])listen(dialog,type,event=>{if(event.key!=='Tab')event.stopPropagation();if(event.key==='Enter'&&event.target.tagName==='INPUT')event.preventDefault()});
 listen(win,'pagehide',()=>dismiss(false));
 syncUpload();
 return {captureResult,reset,showBoard,showUpload,showResultUpload,dismiss,destroy(){destroyed=true;reset();inline?.destroy();dialog.removeEventListener('close',finishClose);for(const remove of listeners)remove()}};
}
