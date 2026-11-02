import {LEADERBOARD_ENABLED} from './leaderboard-config.mjs';
export const formatLeaderboardScore=n=>n>0&&n<.001?'<0.001':n.toLocaleString(undefined,{maximumFractionDigits:3});
const boards={ 'long-jump':{rules:'journey-km-v1',unit:'km'},hurdles:{rules:'110m-8h-v1',unit:'s'}};
export function eligibleResult(game,r){
 if(!r||r.phase!=='done')return null;
 const score=game==='long-jump'&&r.valid?r.legalAdventureKm:game==='hurdles'?r.t:null;
 return typeof score==='number'&&Number.isFinite(score)&&score>0&&(game!=='hurdles'||score<=180)?{score,status:game==='long-jump'?'valid':'done'}:null;
}
export function mountLeaderboard({document,game,entry,result,shell=null,enabled=LEADERBOARD_ENABLED,fetcher=(...args)=>document.defaultView.fetch(...args)}){
 if(!enabled||!Object.hasOwn(boards,game))return null;
 const win=document.defaultView,b=boards[game],make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 if(!document.querySelector('link[data-leaderboard-style]')){const l=make('link');l.rel='stylesheet';l.href='/games/shared/leaderboard.css';l.dataset.leaderboardStyle='';document.head.append(l);}
 const read=k=>{try{return win.localStorage.getItem(k);}catch{return null;}},write=(k,v)=>{try{win.localStorage.setItem(k,v);}catch{}};
 let device=read('pf-leaderboard-device-v1');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(device||'')){try{device=win.crypto.randomUUID();write('pf-leaderboard-device-v1',device);}catch{device=null;}}
 const note='休閒榜採玩家回報，未驗證防作弊。同名可能是不同人；清除資料或換裝置不會合併。';
 const format=formatLeaderboardScore,gapText=n=>n>0&&n<.001?'<0.001':format(n);
 const ranking=make('details');ranking.className='pf-leaderboard';ranking.append(make('summary','查看榮譽榜'));entry?.append(ranking);
 const content=make('section');content.className='pf-honor-board';const heading=make('header'),icon=make('img');icon.src='/assets/app-icons/'+game+'/apple-touch-icon.png';icon.alt='';icon.width=64;icon.height=64;const titles=make('div');titles.append(make('p','PLAYFORMOSA · 榮譽榜'),make('h2',game==='hurdles'?'110公尺跨欄':'跳遠'));heading.append(icon,titles);
 const rule=make('p',game==='hurdles'?'110 公尺・8 道欄杆｜完賽越快越好':'合法旅程公里｜距離越遠越好');rule.className='pf-rank-rule';const own=make('section');own.dataset.ownBest='';own.className='pf-rank-own';const list=make('ol'),rankStatus=make('p');rankStatus.setAttribute('role','status');list.className='pf-rank-list';
 const foot=make('p','同分併列；前20筆依原始精度排序，畫面最多顯示3位小數。');foot.className='pf-rank-foot';const disclosure=make('details');disclosure.append(make('summary','關於這個休閒榜'),make('p',note));content.append(heading,rule,own,rankStatus,list,foot,disclosure);ranking.append(content);
 let rankingBusy=false,rankTime=0,rankToken=0,rankAbort=null,rankTimer=null,boardOpen=false;
 function stopRanking(){rankToken++;rankAbort?.abort();rankAbort=null;win.clearTimeout(rankTimer);rankingBusy=false;}
 function drawOwn(row){own.replaceChildren(make('h3','我的線上最佳'));if(!row){own.append(make('p','尚未提交。完成有效成績後，可在結算畫面手動上傳。'));return;}own.append(make('strong',format(row.score)+' '+b.unit),make('p','第 '+row.rank+' 名 · '+row.nickname),make('p',row.gap===null?'目前領先，繼續挑戰自己。':'距離上一個較佳成績 '+gapText(row.gap)+' '+b.unit));}
 async function refreshRanking(force=false){if(rankingBusy||(!force&&Date.now()-rankTime<60000))return;rankingBusy=true;const token=++rankToken;rankStatus.textContent='讀取中…';rankAbort=new win.AbortController();rankTimer=win.setTimeout(()=>rankAbort?.abort(),10000);
  try{const response=await fetcher('/api/leaderboard?game='+game,{headers:device?{'X-Leaderboard-Device':device}:{},signal:rankAbort.signal,cache:'no-store'});if(!response.ok)throw Error('network');const data=await response.json();if(token!==rankToken)return;list.replaceChildren();for(const row of (Array.isArray(data.entries)?data.entries:[]).slice(0,20)){if(typeof row.nickname!=='string'||typeof row.score!=='number'||!Number.isFinite(row.score))continue;const li=make('li'),place=make('span',String(row.rank||list.children.length+1)),name=make('span',row.nickname+(row.isMe?' · 我':'')),score=make('strong',format(row.score)),unit=make('small',b.unit);place.className='pf-rank-place';if(row.rank<=3)place.dataset.medal=String(row.rank);name.className='pf-rank-name';score.append(unit);if(row.isMe)li.classList.add('is-me');li.append(place,name,score);list.append(li);}drawOwn(data.own||null);rankStatus.textContent=list.children.length?'前20筆最佳成績':'還沒有成績，第一筆由你開始。';rankTime=Date.now();}catch{if(token===rankToken){rankStatus.textContent='排行榜暫時無法讀取，遊戲不受影響。';own.replaceChildren(make('p','尚未取得線上最佳，請稍後再查看。'));}}finally{if(token===rankToken){win.clearTimeout(rankTimer);rankingBusy=false;}}
 }
 function showRanking(){if(boardOpen&&shell)return;boardOpen=true;if(shell){shell.openView(content,{label:'榮譽榜',onClose(){boardOpen=false;stopRanking();ranking.append(content);ranking.open=false;}});}else ranking.open=true;refreshRanking();}
 ranking.addEventListener('toggle',()=>{if(ranking.open)showRanking();});
 const headerAction=make('button','排行');headerAction.type='button';headerAction.className='pf-rank-action';headerAction.setAttribute('aria-label','查看線上榮譽榜');headerAction.addEventListener('click',showRanking);if(shell){document.querySelector('.pf-header nav')?.insertBefore(headerAction,document.querySelector('.pf-entry-help'));document.body.classList.add('pf-has-ranking');const home=document.querySelector('.pf-header .pf-home');if(home)home.textContent='首頁';}
 const resultAction=make('button','查看榮譽榜');resultAction.type='button';resultAction.className='pf-result-ranking';resultAction.addEventListener('click',showRanking);result?.append(resultAction);
 const panel=make('details');panel.className='pf-leaderboard';panel.hidden=true;panel.append(make('summary','手動上傳本次成績'),make('p',note));const scoreText=make('p'),label=make('label','暱稱（1–20字）'),input=make('input');input.type='text';input.maxLength=40;input.autocomplete='nickname';input.value=read('pf-leaderboard-nickname-v1')||'';label.append(input);const submit=make('button','提交本次成績'),cancel=make('button','關閉'),status=make('p');submit.type=cancel.type='button';submit.dataset.submit='';cancel.dataset.cancel='';status.setAttribute('role','status');panel.append(scoreText,label,submit,cancel,status);result?.append(panel);
 // Do not let nickname typing/IME bubble to game shortcuts. No form/implicit Enter submit.
 for(const event of ['keydown','keyup','keypress'])panel.addEventListener(event,e=>{if(e.key!=='Tab')e.stopPropagation();});
 let snapshot=null,payload=null,generation=0,pending=false,attempts=0,abort=null,timer=null;
 function stop(){generation++;abort?.abort();abort=null;win.clearTimeout(timer);pending=false;submit.disabled=!snapshot||!device||attempts>=3;}
 function reset(){if(boardOpen&&shell)shell.closeView();stop();stopRanking();snapshot=null;payload=null;attempts=0;panel.open=false;panel.hidden=true;status.textContent='';input.disabled=false;submit.textContent='提交本次成績';}
 function setResult(r){reset();snapshot=eligibleResult(game,r);if(!snapshot)return;panel.hidden=false;scoreText.textContent='本次：'+snapshot.score.toLocaleString(undefined,{maximumFractionDigits:3})+' '+b.unit;submit.disabled=!device;if(!device)status.textContent='此瀏覽器無法建立匿名識別，仍可正常遊玩。';}
 cancel.addEventListener('click',()=>{const wasPending=pending;stop();panel.open=false;if(wasPending)status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';});
 panel.addEventListener('toggle',()=>{if(!panel.open&&pending){stop();status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';}});
 submit.addEventListener('click',async()=>{
  if(!snapshot||!device||pending||attempts>=3)return;
  if(!payload){const nickname=input.value.trim();if(!nickname||[...nickname].length>20||/[<>\p{Cc}\p{Cf}]/u.test(nickname)){status.textContent='請輸入1–20字純文字暱稱。';return;}let submissionId;try{submissionId=win.crypto.randomUUID();}catch{status.textContent='此瀏覽器無法建立提交編號。';return;}
   payload=Object.freeze({game,rules:b.rules,unit:b.unit,...snapshot,nickname,deviceId:device,submissionId});write('pf-leaderboard-nickname-v1',nickname);input.disabled=true;
  }
  const token=generation;pending=true;attempts++;submit.disabled=true;status.textContent='提交中…';abort=new win.AbortController();timer=win.setTimeout(()=>abort?.abort(),10000);
  try{const response=await fetcher('/api/leaderboard/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal});const data=await response.json();if(token!==generation)return;if(!response.ok||!data.accepted)throw Error(response.status===429?'limited':'network');status.textContent=(data.bestUpdated?'刷新線上最佳！':'已收錄；保留線上最佳。')+(data.own?' 第 '+data.own.rank+' 名，最佳 '+format(data.own.score)+' '+b.unit+(data.own.gap===null?'，目前領先。':'，距上一個較佳成績 '+gapText(data.own.gap)+' '+b.unit+'。'):'');submit.textContent='已提交';attempts=3;rankTime=0;stopRanking();refreshRanking(true);
  }catch(error){if(token===generation){status.textContent=error.message==='limited'?'提交暫時達限，請稍後再試；仍可繼續遊玩。':'未確認提交完成，可手動重試；不會重複入榜。';submit.textContent='重試同一筆';}}
  finally{if(token===generation){win.clearTimeout(timer);pending=false;submit.disabled=attempts>=3;if(attempts>=3&&submit.textContent!=='已提交')status.textContent+=' 本回合已達重試次數，請稍後再玩一局。';}}
 });
 function suspend(){const wasPending=pending;stop();if(!boardOpen)stopRanking();if(wasPending)status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';}
 const resultDialog=result?.closest('dialog');resultDialog?.addEventListener('close',suspend);
 return {setResult,reset,suspend,showRanking,destroy(){reset();resultDialog?.removeEventListener('close',suspend);stopRanking();ranking.remove();panel.remove();headerAction.remove();resultAction.remove();document.body.classList.remove('pf-has-ranking');}};
}
