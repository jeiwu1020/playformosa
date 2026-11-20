import {createUploadCooldown} from './upload-cooldown.mjs';
import {LEADERBOARD_ENABLED} from './leaderboard-config.mjs';
import {bindManualUploadScroll} from './leaderboard-scroll.mjs';
export const formatLeaderboardScore=n=>n>0&&n<.001?'<0.001':n.toLocaleString(undefined,{maximumFractionDigits:3});
import {BOARD_METRICS as boards,resultToSubmission} from './leaderboard-metrics.mjs';
export const eligibleResult=resultToSubmission;
const displayUnits={km:'公里',s:'秒',m:'公尺',catches:'根',points:'分',courtesies:'次'};
const boardLabels={
 'courtesy-contest':['客氣大賽','發車前有效按下謝謝才入榜；先比互讓完成次數，同次數以按下時剩餘秒數越接近零越前面。'],
 'long-jump':['跳遠','合法落地，越遠越好。'],hurdles:['110公尺跨欄','越快越好，欄杆不是扶手。'],
 'high-jump':['跳高','成功過桿高度，越高越好。'],'pole-vault':['撐竿跳','最高高度，四肢向天空報到。'],
 'shot-put':['鉛球','有效距離，重物也想去旅行。'],discus:['鐵餅','有效距離，跟著風去兜一圈。'],
 'reaction-rod':['接棒啦！','先比接住根數，再比評分。'],'beer-slide':['別灑啊！','準度與留酒率，一杯決勝負。'],
 'run-400m':['400公尺','固定跑道一圈，秒數越短越前面。'],
 'run-1500m':['1500公尺','以完賽秒數排名。'],
 'sprint-100m':['100公尺','以玩家本人完賽秒數排名，越快越前面。'],
 javelin:['標槍','只收錄有效投擲，距離越遠越前面。'],
 'tower-climb':['上樓不容易','十層完成時間，越短越前面。']
};
export function mountLeaderboard({document,game,entry,result,resultActionContainer=result,resultUploadContainer=result,resultActionLabel='查看榮譽榜',shell=null,enabled=LEADERBOARD_ENABLED,fetcher=(...args)=>document.defaultView.fetch(...args)}){
 if(!enabled||!Object.hasOwn(boards,game))return null;
 const win=document.defaultView,b=boards[game],make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 if(!document.querySelector('link[data-leaderboard-style]')){const l=make('link');l.rel='stylesheet';l.href='/games/shared/leaderboard.css';l.dataset.leaderboardStyle='';document.head.append(l);}
 const read=k=>{try{return win.localStorage.getItem(k);}catch{return null;}},write=(k,v)=>{try{win.localStorage.setItem(k,v);}catch{}};
 let device=read('pf-leaderboard-device-v1');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(device||'')){try{device=win.crypto.randomUUID();write('pf-leaderboard-device-v1',device);}catch{device=null;}}
 const note='提交後，暱稱與成績會公開在這個線上榜。紀錄認這個瀏覽器，不認同名；換裝置或清除資料不會自動連回。';
 const format=formatLeaderboardScore,gapText=n=>n>0&&n<.001?'<0.001':format(n),unitLabel=displayUnits[b.unit]||b.unit;
 const scoreLabel=row=>format(row.score)+' '+unitLabel+(b.secondary&&Number.isFinite(row.secondaryScore)?' · '+format(row.secondaryScore)+' '+(b.secondaryUnit||'分'):'');
 const gapLabel=row=>gapText(row.gap)+' '+(row.gapMetric==='remaining'?'秒':row.gapMetric==='rating'?'分':unitLabel);
 const ranking=make('details');ranking.className='pf-leaderboard';const rankingSummary=make('summary','榮譽榜');rankingSummary.className='pf-menu-row';ranking.append(rankingSummary);entry?.append(ranking);
 const content=make('section');content.className='pf-honor-board';const heading=make('header'),icon=make('img');icon.src=game==='courtesy-contest'?'/assets/courtesy-contest-card.jpg':'/assets/app-icons/'+game+'/apple-touch-icon.png';icon.alt='';icon.width=64;icon.height=64;const titles=make('div');titles.append(make('p','PLAYFORMOSA · 榮譽榜'),make('h2',boardLabels[game][0]));heading.append(icon,titles);
 const rule=make('p',boardLabels[game][1]+'休閒比一比，成績由玩家回報。');rule.className='pf-rank-rule';const own=make('section');own.dataset.ownBest='';own.className='pf-rank-own';const list=make('ol'),rankStatus=make('p');rankStatus.setAttribute('role','status');list.className='pf-rank-list';
 const foot=make('p','同分並肩站。');foot.className='pf-rank-foot';content.append(heading,rule,own,rankStatus,list,foot);ranking.append(content);
 let rankingBusy=false,rankTime=0,rankToken=0,rankAbort=null,rankTimer=null,boardOpen=false;
 function stopRanking(){rankToken++;rankAbort?.abort();rankAbort=null;win.clearTimeout(rankTimer);rankingBusy=false;}
 function drawOwn(row){own.replaceChildren(make('h3','我的線上最佳'));if(!row){own.append(make('p','榜上還缺你。取得有效成績後，到結算畫面提交。'));return;}own.append(make('strong',scoreLabel(row)),make('p','第 '+row.rank+' 名 · '+row.nickname),make('p',row.gap===null?'目前領先，繼續挑戰自己。':'追上前方成績還差 '+gapLabel(row)));}
 async function refreshRanking(force=false){if(rankingBusy||(!force&&Date.now()-rankTime<60000))return;rankingBusy=true;const token=++rankToken;rankStatus.textContent='讀取中…';rankAbort=new win.AbortController();rankTimer=win.setTimeout(()=>rankAbort?.abort(),10000);
  try{const response=await fetcher('/api/leaderboard?game='+game,{headers:device?{'X-Leaderboard-Device':device}:{},signal:rankAbort.signal,cache:'no-store'});if(!response.ok)throw Error('network');const data=await response.json();if(token!==rankToken)return;if((game==='pole-vault'||game==='run-400m'||game==='run-1500m'||game==='sprint-100m'||game==='javelin'||game==='courtesy-contest')&&(data.game!==game||data.rules!==b.rules||data.unit!==b.unit)){list.replaceChildren();throw Error('rules');}list.replaceChildren();for(const row of (Array.isArray(data.entries)?data.entries:[]).slice(0,20)){if(typeof row.nickname!=='string'||typeof row.score!=='number'||!Number.isFinite(row.score))continue;const li=make('li'),place=make('span',String(row.rank||list.children.length+1)),name=make('span',row.nickname+(row.isMe?' · 我':'')),score=make('strong',format(row.score)),unit=make('small',unitLabel);place.className='pf-rank-place';if(row.rank<=3)place.dataset.medal=String(row.rank);name.className='pf-rank-name';score.append(unit);if(b.secondary&&Number.isFinite(row.secondaryScore)){const secondary=make('small',format(row.secondaryScore)+' '+(b.secondaryUnit||'分'));secondary.className='pf-rank-secondary';score.append(secondary);}if(row.isMe)li.classList.add('is-me');li.append(place,name,score);list.append(li);}drawOwn(data.own||null);rankStatus.textContent=list.children.length?'前20筆最佳成績':'還沒有成績，第一筆由你開始。';rankTime=Date.now();}catch{if(token===rankToken){rankStatus.textContent='排行榜暫時無法讀取，遊戲不受影響。';own.replaceChildren(make('p','尚未取得線上最佳，請稍後再查看。'));}}finally{if(token===rankToken){win.clearTimeout(rankTimer);rankingBusy=false;}}
 }
 function showRanking(){if(boardOpen&&shell)return;boardOpen=true;if(shell){shell.openView(content,{label:'榮譽榜',onClose(){boardOpen=false;stopRanking();ranking.append(content);ranking.open=false;}});}else ranking.open=true;refreshRanking();}
 ranking.addEventListener('toggle',()=>{if(ranking.open)showRanking();});shell?.setRankingAction?.(showRanking);
 const headerAction=make('button','排行');headerAction.type='button';headerAction.className='pf-rank-action';headerAction.setAttribute('aria-label','查看線上榮譽榜');headerAction.addEventListener('click',showRanking);if(shell){document.querySelector('.pf-header nav')?.insertBefore(headerAction,document.querySelector('.pf-entry-help'));document.body.classList.add('pf-has-ranking');const home=document.querySelector('.pf-header .pf-home');if(home)home.textContent='首頁';}
 const resultAction=make('button',resultActionLabel);resultAction.type='button';resultAction.className='pf-result-ranking';resultAction.addEventListener('click',showRanking);resultActionContainer?.append(resultAction);
 const panel=make('details');panel.className='pf-leaderboard';panel.hidden=true;panel.append(make('summary','手動上傳本次成績'),make('p',note));const scoreText=make('p'),label=make('label','暱稱（1–20字）'),input=make('input');input.type='text';input.maxLength=40;input.autocomplete='nickname';input.value=read('pf-leaderboard-nickname-v1')||'';label.append(input);const submit=make('button','提交本次成績'),cancel=make('button','關閉'),status=make('p');submit.type=cancel.type='button';submit.dataset.submit='';cancel.dataset.cancel='';status.setAttribute('role','status');panel.append(scoreText,label,submit,cancel,status);resultUploadContainer?.append(panel);
 const uploadScroll=bindManualUploadScroll({panel,result});
 // Do not let nickname typing/IME bubble to game shortcuts. No form/implicit Enter submit.
 for(const event of ['keydown','keyup','keypress'])panel.addEventListener(event,e=>{if(e.key!=='Tab')e.stopPropagation();});
 let snapshot=null,payload=null,generation=0,pending=false,attempts=0,abort=null,timer=null,destroyed=false,showingCooldown=false;
 const cooldown=createUploadCooldown(win,()=>{if(!destroyed)syncUpload()});
 function syncUpload(){
  const seconds=cooldown.remaining();submit.disabled=!snapshot||!device||pending||attempts>=3||seconds>0;
  if(snapshot&&!pending&&attempts<3){
   if(seconds>0){showingCooldown=true;submit.textContent='等待 '+seconds+' 秒';status.textContent=cooldown.message()}
   else {submit.textContent=payload?'重試同一筆':'提交本次成績';if(showingCooldown){status.textContent=payload?'等待已結束，可手動重試同一筆；不會自動上傳。':'等待已結束，可手動提交本次成績；不會自動上傳。';showingCooldown=false}}
  }
 }
 function stop(){uploadScroll.cancel();generation++;abort?.abort();abort=null;win.clearTimeout(timer);pending=false;syncUpload();}
 function reset(){if(boardOpen&&shell)shell.closeView();stop();stopRanking();snapshot=null;payload=null;attempts=0;showingCooldown=false;panel.open=false;panel.hidden=true;status.textContent='';input.disabled=false;submit.textContent='提交本次成績';syncUpload();}
 function setResult(r){reset();snapshot=eligibleResult(game,r);if(!snapshot)return;panel.hidden=false;scoreText.textContent='本次：'+scoreLabel(snapshot);syncUpload();if(!device)status.textContent='此瀏覽器無法建立匿名識別，仍可正常遊玩。';}
 cancel.addEventListener('click',()=>{const wasPending=pending;stop();panel.open=false;if(wasPending)status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';});
 panel.addEventListener('toggle',()=>{if(!panel.open&&pending){stop();status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';}});
 submit.addEventListener('click',async()=>{
  if(destroyed||!snapshot||!device||pending||attempts>=3||cooldown.remaining()>0)return;
  if(!payload){const nickname=input.value.trim();if(!nickname||[...nickname].length>20||/[<>\p{Cc}\p{Cf}]/u.test(nickname)){status.textContent='請輸入1–20字純文字暱稱。';return;}let submissionId;try{submissionId=win.crypto.randomUUID();}catch{status.textContent='此瀏覽器無法建立提交編號。';return;}
   payload=Object.freeze({game,rules:b.rules,unit:b.unit,...snapshot,nickname,deviceId:device,submissionId});write('pf-leaderboard-nickname-v1',nickname);input.disabled=true;
  }
  const token=generation;pending=true;attempts++;submit.disabled=true;status.textContent='提交中…';abort=new win.AbortController();timer=win.setTimeout(()=>abort?.abort(),10000);
  try{const response=await fetcher('/api/leaderboard/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal});const data=await response.json().catch(error=>{if(response.status===429)return null;throw error});if(token!==generation)return;if(response.status===429){attempts--;status.textContent=cooldown.limited(response,data);return;}if(!response.ok||!data?.accepted)throw Error('network');status.textContent=(data.bestUpdated?'刷新線上最佳！':'已收錄；保留線上最佳。')+(data.own?' 第 '+data.own.rank+' 名，最佳 '+scoreLabel(data.own)+(data.own.gap===null?'，目前領先。':'，距上一個較佳成績 '+gapLabel(data.own)+'。'):'');submit.textContent='已提交';attempts=3;cooldown.accepted(data);rankTime=0;stopRanking();refreshRanking(true);
  }catch(error){if(token===generation){status.textContent='未確認提交完成，可手動重試；不會重複入榜。';submit.textContent='重試同一筆';}}
  finally{if(token===generation){win.clearTimeout(timer);pending=false;syncUpload();if(attempts>=3&&submit.textContent!=='已提交')status.textContent+=' 本回合已達重試次數，請稍後再玩一局。';}}
 });
 function suspend(){const wasPending=pending;stop();if(!boardOpen)stopRanking();if(wasPending)status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';}
 const resultDialog=result?.closest('dialog');resultDialog?.addEventListener('close',suspend);
 return {setResult,reset,suspend,showRanking,destroy(){destroyed=true;cooldown.destroy();uploadScroll.destroy();shell?.setRankingAction?.(null);reset();resultDialog?.removeEventListener('close',suspend);stopRanking();ranking.remove();panel.remove();headerAction.remove();resultAction.remove();document.body.classList.remove('pf-has-ranking');}};
}
