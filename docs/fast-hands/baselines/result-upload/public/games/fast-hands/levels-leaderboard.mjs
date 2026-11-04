const DEVICE_KEY='pf-leaderboard-device-v1',NICKNAME_KEY='pf-leaderboard-nickname-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LEVEL_RULES=Object.freeze({catch:Object.freeze({game:'fast-hands-catch',rules:'cleared-levels-v1',unit:'levels',max:Number.MAX_SAFE_INTEGER,label:'玩具彈通關'}),duel:Object.freeze({game:'fast-hands-duel',rules:'ten-round-wins-v1',unit:'wins',max:10,label:'十回合對決'})});
export function freezeLevelLeaderboardResult(state,{replay=false}={}){
 if(replay||state?.practice!==false||state?.phase!=='done'||!Object.hasOwn(LEVEL_RULES,state?.mode)||!Array.isArray(state.results))return null;
 const {mode,results}=state;
 if(!results.length||results.some(r=>!r||!['player','ai','draw','none'].includes(r.winner)))return null;
 if(mode==='duel'&&(state.total!==10||results.length!==10))return null;
 if(mode==='catch'&&(state.total!==Infinity||results.at(-1).winner!=='none'||results.slice(0,-1).some(r=>r.winner!=='player')))return null;
 const score=results.filter(r=>r.winner==='player').length;
 if(!Number.isSafeInteger(score)||score<1||score>LEVEL_RULES[mode].max)return null;
 return Object.freeze({mode,rules:LEVEL_RULES[mode].rules,score});
}

/** Dedicated QA board. Never derives a submission from UI text or local bests.
 * captureResult is called exactly at the real successful run transition. Closing
 * a view preserves the round's immutable payload, attempt count and final status.
 */
export function mountLevelLeaderboard({document,mode,fetcher=(...args)=>document.defaultView.fetch(...args),onOpen=dialog=>dialog.showModal(),onClose=()=>{}}){
 if(!['catch','duel'].includes(mode))throw new TypeError('Unknown leaderboard mode');
 const win=document.defaultView,$=id=>document.getElementById('level'+id[0].toUpperCase()+id.slice(1));
 const dialog=document.createElement('dialog');dialog.id='levelRankingDialog';dialog.className='level-ranking-dialog';dialog.setAttribute('aria-labelledby','levelRankingTitle');
 dialog.innerHTML=`<div class="ranking-scroll"><header><h2 id="levelRankingTitle">休閒挑戰測試榜</h2><button id="levelRankingClose" type="button" aria-label="關閉排行榜">關閉</button></header><p>按鈕／鍵盤休閒挑戰 · 成績由玩家自行回報，未經競技驗證。${mode==='duel'?'AI 每回合隨機反應，勝場僅供同樂。':''}</p><section id="levelRankingBoard"><p id="levelRankingBoardStatus" role="status"></p><ol id="levelRankingEntries"></ol><section id="levelRankingOwn"></section><button id="levelRankingRefresh" type="button">重新讀取</button><button id="levelRankingUploadButton" type="button">上傳本次成績</button><p id="levelLeaderboardStatus"></p></section><section id="levelRankingUpload" hidden><p id="levelRankingFrozenScore"></p><label for="levelRankingNickname">公開暱稱（1–20字）</label><input id="levelRankingNickname" type="text" maxlength="40" autocomplete="nickname"><label class="level-ranking-consent"><input id="levelRankingConsent" type="checkbox">我同意公開暱稱與本次成績，並在本瀏覽器儲存匿名識別與暱稱。請勿填入個人敏感資料。</label><p>排行榜以匿名瀏覽器識別保留個人最佳；不會自動上傳。</p><button id="levelRankingSubmit" type="button">提交本次成績</button><button id="levelRankingBack" type="button">返回排行榜</button><p id="levelRankingUploadStatus" role="status"></p></section><button id="levelRankingReturn" type="button">返回成績</button></div>`;
 document.body.append(dialog);
 const board=LEVEL_RULES[mode],validScore=score=>Number.isSafeInteger(score)&&score>0&&score<=board.max,format=score=>score+(mode==='catch'?' 關':' 勝');
 const read=key=>{try{return win.localStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{win.localStorage.setItem(key,value)}catch{}};
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el};
 let device=null,round=null,sourceRun=null,payload=null,attempts=0,completed=false,rejected=false,pending=false;
 let origin='result',view=null,returnOnClose=true,destroyed=false,uploadToken=0,boardToken=0,uploadRequest=null,boardRequest=null;
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
  $('rankingUploadButton').disabled=!round;
  $('leaderboardStatus').textContent=round?'本次完整挑戰可自願上傳測試榜；成績由玩家回報。':'完整挑戰且至少取得1關／1勝後，可自願上傳；0分與練習成績仍可查看，但不入榜。';
  $('rankingNickname').disabled=!!payload;
  $('rankingConsent').disabled=!!payload;
  $('rankingSubmit').disabled=!round||pending||completed||rejected||attempts>=3;
  $('rankingSubmit').textContent=completed?'已提交':pending?'提交中…':payload?'重試同一筆':'提交本次成績';
 }
 function stopBoard(){boardToken++;boardRequest?.cancel();boardRequest=null;}
 function stopUpload(uncertain=true){
  uploadToken++;uploadRequest?.cancel();uploadRequest=null;
  if(pending&&uncertain)$('rankingUploadStatus').textContent='已停止等待；送出的成績可能已收錄。可手動重試同一筆，不會重複入榜。'+(attempts>=3?' 本回合已達3次提交上限。':'');
  pending=false;syncUpload();
 }
 function finishClose(){
  if(dialog.open)return; // Ignore a queued close event after a newer view opens.
  stopBoard();stopUpload();view=null;
  if(returnOnClose&&!destroyed)onClose(origin);
 }
 dialog.addEventListener('close',finishClose);
 function dismiss(returnToParent=true){
  returnOnClose=returnToParent;stopBoard();stopUpload();view=null;
  if(dialog.open)dialog.close();
 }
 function open(nextView,nextOrigin){
  if(destroyed)return false;
  if(view!==nextView){stopBoard();stopUpload();}
  origin=nextOrigin==='result'?'result':'entry';view=nextView;returnOnClose=true;
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
  own.append(make('strong',format(row.score)),make('p','第 '+row.rank+' 名 · '+row.nickname));
  if(row.gap===null)own.append(make('p','目前領先，繼續挑戰自己。'));
  else if(typeof row.gap==='number'&&Number.isFinite(row.gap)&&row.gap>=0)own.append(make('p','距前方較佳成績 '+format(row.gap)+'。'));
 }
 async function refreshBoard(){
  if(destroyed||view!=='board'||!dialog.open)return;
  stopBoard();const token=boardToken,id=deviceId();
  $('rankingEntries').replaceChildren();$('rankingOwn').replaceChildren();$('rankingBoardStatus').textContent='讀取'+board.label+'榜中…';
  boardRequest=request('/api/leaderboard?game='+board.game,{headers:id?{'X-Leaderboard-Device':id}:{},cache:'no-store'});
  try{
   const {response,data}=await boardRequest.result;
   if(token!==boardToken||destroyed)return;
   if(!response.ok||!data||data.game!==board.game||data.rules!==board.rules||data.unit!==board.unit||!Array.isArray(data.entries))throw Error('unavailable');
   for(const row of data.entries.slice(0,20)){
    if(typeof row.nickname!=='string'||!validScore(row.score)||!Number.isInteger(row.rank)||row.rank<1)continue;
    const li=make('li',''),place=make('span',String(row.rank)),name=make('span',row.nickname+(row.isMe?' · 我':'')),score=make('strong',format(row.score));
    place.className='ranking-place';name.className='ranking-name';if(row.isMe)li.classList.add('is-me');li.append(place,name,score);$('rankingEntries').append(li);
   }
   drawOwn(data.own);$('rankingBoardStatus').textContent=$('rankingEntries').children.length?'前20筆'+board.label+'最佳成績':'還沒有'+board.label+'成績，第一筆由你開始。';
  }catch{if(token===boardToken&&!destroyed){$('rankingBoardStatus').textContent='排行榜暫時無法讀取，遊戲不受影響。請稍後重新讀取。';$('rankingOwn').replaceChildren(make('p','尚未取得線上最佳。'));}}
  finally{if(token===boardToken)boardRequest=null;}
 }
 function showBoard({origin:from='result'}={}){if(open('board',from))void refreshBoard();}
 function showUpload(){
  if(!round||destroyed)return;
  $('rankingFrozenScore').textContent='本次固定類別：'+board.label+'榜 · '+format(round.score);
  open('upload','result');syncUpload();
  if(!deviceId()){$('rankingSubmit').disabled=true;$('rankingUploadStatus').textContent='此瀏覽器無法建立匿名識別，仍可正常遊玩與下載成績圖。';}
 }
 async function submit(){
  if(!round||view!=='upload'||!dialog.open||pending||completed||rejected||attempts>=3)return;
  const id=deviceId();if(!id)return;
  if(!payload){
   const nickname=$('rankingNickname').value.trim();
   if(!nickname||[...nickname].length>20||/[<>\p{Cc}\p{Cf}]/u.test(nickname)){$('rankingUploadStatus').textContent='請輸入1–20字純文字暱稱，不可含控制字元或角括號。';return}
   if(!$('rankingConsent').checked){$('rankingUploadStatus').textContent='請先確認同意公開暱稱與本次成績，再提交。';return}
   let submissionId;try{submissionId=win.crypto.randomUUID()}catch{}
   if(!UUID.test(submissionId||'')){$('rankingUploadStatus').textContent='此瀏覽器無法建立提交編號，仍可正常遊玩。';return}
   payload=Object.freeze({game:board.game,rules:round.rules,unit:board.unit,status:'done',score:round.score,nickname,deviceId:id,submissionId});
   write(NICKNAME_KEY,nickname);
  }
  pending=true;attempts++;const token=++uploadToken;syncUpload();$('rankingUploadStatus').textContent='提交中，請稍候…';
  uploadRequest=request('/api/leaderboard/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  try{
   const {response,data}=await uploadRequest.result;
   if(token!==uploadToken||destroyed)return;
   if(response.ok&&data?.accepted===true){completed=true;$('rankingUploadStatus').textContent=data.bestUpdated?'已收錄，刷新本瀏覽器線上最佳！':'已收錄，保留本瀏覽器線上最佳。';const own=data.own;if(own&&validScore(own.score)&&Number.isInteger(own.rank)&&own.rank>0)$('rankingUploadStatus').textContent+=' 第 '+own.rank+' 名，最佳 '+format(own.score)+'。';}
   else if([400,403,409,413].includes(response.status)){rejected=true;$('rankingUploadStatus').textContent='本次提交無法接受，請重新挑戰後再試。遊戲與下載不受影響。';}
   else throw Error(response.status===429?'limited':response.status===503?'unavailable':'network');
  }catch(error){if(token===uploadToken&&!destroyed)$('rankingUploadStatus').textContent=error.message==='limited'?'提交暫時達限，請稍後手動重試同一筆；仍可繼續遊玩。':error.message==='unavailable'?'排行榜暫時無法提交，請稍後手動重試同一筆。':'未確認提交完成，成績可能已收錄。可手動重試同一筆，不會重複入榜。';}
  finally{if(token===uploadToken){pending=false;uploadRequest=null;if(!completed&&!rejected&&attempts>=3)$('rankingUploadStatus').textContent+=' 本回合已達3次提交上限，請稍後再挑戰。';syncUpload();}}
 }
 function reset(){
  dismiss(false);stopUpload(false);round=null;sourceRun=null;payload=null;attempts=0;completed=false;rejected=false;
  $('rankingConsent').checked=false;$('rankingFrozenScore').textContent='';$('rankingUploadStatus').textContent='';syncUpload();
 }
 function captureResult(run,options={}){
  if(options.replay)return false;
  if(sourceRun===run&&round)return true;
  reset();const captured=freezeLevelLeaderboardResult(run,options);if(!captured||captured.mode!==mode)return false;
  sourceRun=run;round=captured;syncUpload();return true;
 }
 const listeners=[];
 function listen(el,type,handler){el.addEventListener(type,handler);listeners.push(()=>el.removeEventListener(type,handler))}
 for(const [id,fn] of [['rankingClose',()=>dismiss()],['rankingReturn',()=>dismiss()],['rankingUploadButton',()=>showUpload()],['rankingBack',()=>showBoard()],['rankingRefresh',()=>void refreshBoard()],['rankingSubmit',()=>void submit()]])listen($(id),'click',fn);
 for(const type of ['keydown','keyup','keypress'])listen(dialog,type,event=>{if(event.key!=='Tab')event.stopPropagation();if(event.key==='Enter'&&event.target.tagName==='INPUT')event.preventDefault()});
 syncUpload();
 return {captureResult,reset,showBoard,showUpload,dismiss,destroy(){destroyed=true;reset();dialog.removeEventListener('close',finishClose);for(const remove of listeners)remove();dialog.remove()}};
}
