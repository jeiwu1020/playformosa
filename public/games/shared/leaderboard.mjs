import {LEADERBOARD_ENABLED} from './leaderboard-config.mjs';
const boards={ 'long-jump':{rules:'journey-km-v1',unit:'km'},hurdles:{rules:'110m-8h-v1',unit:'s'}};
export function eligibleResult(game,r){
 if(!r||r.phase!=='done')return null;
 const score=game==='long-jump'&&r.valid?r.legalAdventureKm:game==='hurdles'?r.t:null;
 return typeof score==='number'&&Number.isFinite(score)&&score>0&&(game!=='hurdles'||score<=180)?{score,status:game==='long-jump'?'valid':'done'}:null;
}
export function mountLeaderboard({document,game,entry,result,enabled=LEADERBOARD_ENABLED,fetcher=(...args)=>document.defaultView.fetch(...args)}){
 if(!enabled||!Object.hasOwn(boards,game))return null;
 const win=document.defaultView,b=boards[game],make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 if(!document.querySelector('link[data-leaderboard-style]')){const l=make('link');l.rel='stylesheet';l.href='/games/shared/leaderboard.css';l.dataset.leaderboardStyle='';document.head.append(l);}
 const read=k=>{try{return win.localStorage.getItem(k);}catch{return null;}},write=(k,v)=>{try{win.localStorage.setItem(k,v);}catch{}};
 let device=read('pf-leaderboard-device-v1');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(device||'')){try{device=win.crypto.randomUUID();write('pf-leaderboard-device-v1',device);}catch{device=null;}}
 const note='休閒榜採玩家回報，未驗證防作弊。同名可能是不同人；清除資料或換裝置不會合併。';
 const ranking=make('details');ranking.className='pf-leaderboard';ranking.append(make('summary','線上排行榜'),make('p',note));const list=make('ol'),rankStatus=make('p');rankStatus.setAttribute('role','status');ranking.append(rankStatus,list);entry?.append(ranking);
 let rankingBusy=false,rankTime=0,rankToken=0;
 ranking.addEventListener('toggle',async()=>{if(!ranking.open||rankingBusy||Date.now()-rankTime<60000)return;rankingBusy=true;const token=++rankToken;rankStatus.textContent='讀取中…';const controller=new win.AbortController(),timer=win.setTimeout(()=>controller.abort(),10000);
  try{const response=await fetcher('/api/leaderboard?game='+game,{signal:controller.signal});if(!response.ok)throw Error('network');const data=await response.json();if(token!==rankToken)return;list.replaceChildren();for(const row of (Array.isArray(data.entries)?data.entries:[]).slice(0,20)){if(typeof row.nickname!=='string'||typeof row.score!=='number'||!Number.isFinite(row.score))continue;list.append(make('li',row.nickname+' — '+row.score.toLocaleString(undefined,{maximumFractionDigits:3})+' '+b.unit));}rankStatus.textContent=list.children.length?'僅顯示前20名':'目前還沒有成績。';rankTime=Date.now();}catch{if(token===rankToken)rankStatus.textContent='排行榜暫時無法讀取，遊戲不受影響。';}finally{win.clearTimeout(timer);rankingBusy=false;}
 });
 const panel=make('details');panel.className='pf-leaderboard';panel.hidden=true;panel.append(make('summary','手動上傳本次成績'),make('p',note));const scoreText=make('p'),label=make('label','暱稱（1–20字）'),input=make('input');input.type='text';input.maxLength=40;input.autocomplete='nickname';input.value=read('pf-leaderboard-nickname-v1')||'';label.append(input);const submit=make('button','提交本次成績'),cancel=make('button','關閉'),status=make('p');submit.type=cancel.type='button';submit.dataset.submit='';cancel.dataset.cancel='';status.setAttribute('role','status');panel.append(scoreText,label,submit,cancel,status);result?.append(panel);
 // Do not let nickname typing/IME bubble to game shortcuts. No form/implicit Enter submit.
 for(const event of ['keydown','keyup','keypress'])panel.addEventListener(event,e=>{if(e.key!=='Tab')e.stopPropagation();});
 let snapshot=null,payload=null,generation=0,pending=false,attempts=0,abort=null,timer=null;
 function stop(){generation++;abort?.abort();abort=null;win.clearTimeout(timer);pending=false;submit.disabled=!snapshot||!device||attempts>=3;}
 function reset(){stop();snapshot=null;payload=null;attempts=0;panel.open=false;panel.hidden=true;status.textContent='';input.disabled=false;submit.textContent='提交本次成績';}
 function setResult(r){reset();snapshot=eligibleResult(game,r);if(!snapshot)return;panel.hidden=false;scoreText.textContent='本次：'+snapshot.score.toLocaleString(undefined,{maximumFractionDigits:3})+' '+b.unit;submit.disabled=!device;if(!device)status.textContent='此瀏覽器無法建立匿名識別，仍可正常遊玩。';}
 cancel.addEventListener('click',()=>{const wasPending=pending;stop();panel.open=false;if(wasPending)status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';});
 panel.addEventListener('toggle',()=>{if(!panel.open&&pending){stop();status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';}});
 submit.addEventListener('click',async()=>{
  if(!snapshot||!device||pending||attempts>=3)return;
  if(!payload){const nickname=input.value.trim();if(!nickname||[...nickname].length>20||/[<>\p{Cc}\p{Cf}]/u.test(nickname)){status.textContent='請輸入1–20字純文字暱稱。';return;}let submissionId;try{submissionId=win.crypto.randomUUID();}catch{status.textContent='此瀏覽器無法建立提交編號。';return;}
   payload=Object.freeze({game,rules:b.rules,unit:b.unit,...snapshot,nickname,deviceId:device,submissionId});write('pf-leaderboard-nickname-v1',nickname);input.disabled=true;
  }
  const token=generation;pending=true;attempts++;submit.disabled=true;status.textContent='提交中…';abort=new win.AbortController();timer=win.setTimeout(()=>abort?.abort(),10000);
  try{const response=await fetcher('/api/leaderboard/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal});const data=await response.json();if(token!==generation)return;if(!response.ok||!data.accepted)throw Error(response.status===429?'limited':'network');status.textContent='已收錄本次提交；排行榜僅保留此裝置本規則的最佳成績。';submit.textContent='已提交';attempts=3;rankTime=0;
  }catch(error){if(token===generation){status.textContent=error.message==='limited'?'提交暫時達限，請稍後再試；仍可繼續遊玩。':'未確認提交完成，可手動重試；不會重複入榜。';submit.textContent='重試同一筆';}}
  finally{if(token===generation){win.clearTimeout(timer);pending=false;submit.disabled=attempts>=3;if(attempts>=3&&submit.textContent!=='已提交')status.textContent+=' 本回合已達重試次數，請稍後再玩一局。';}}
 });
 function suspend(){const wasPending=pending;stop();if(wasPending)status.textContent='已停止等待；送出的成績可能已收錄，重試不會重複。';}
 const resultDialog=result?.closest('dialog');resultDialog?.addEventListener('close',suspend);
 return {setResult,reset,suspend,destroy(){reset();resultDialog?.removeEventListener('close',suspend);rankToken++;ranking.remove();panel.remove();}};
}
