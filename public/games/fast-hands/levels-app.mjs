import {newMatch,beginRound,advance,press,pauseMatch,CATCH_WINDOW_MS} from './levels-rules.mjs';

export function mountLevel({document,window,clock=()=>window.performance.now(),random=Math.random,requestFrame=fn=>window.requestAnimationFrame(fn),cancelFrame=id=>window.cancelAnimationFrame(id)}={}) {
  const $=id=>document.getElementById(id),mode=document.body.dataset.level;
  if(!['catch','duel'].includes(mode))throw new TypeError('Missing level');
  const catching=mode==='catch',listeners=[];
  let state=newMatch(mode,{practice:true,random}),lastFrame=null,frameId,disposed=false,lastRendered=null,width=window.innerWidth;
  const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
  const count=who=>state.results.filter(r=>r.winner===who).length;
  function resultText(result) {
    if(result.reason==='early')return catching?'太早了，手比球先到！':'搶跑！訊號還沒出現。';
    if(result.reason==='late')return '晚了一點，泡棉球溜走了。';
    if(result.reason==='miss')return '沒接到，下顆再來！';
    if(result.reason==='caught')return Math.abs(result.offsetMs)<=35?'神準！漂亮接住。':'接到了！這手有練過。';
    if(result.winner==='player')return '你搶到了！快手王慢了一步。';
    if(result.winner==='draw')return '同時出手！這回合平手。';
    return '快手王搶到了！下回合扳回來。';
  }
  function details(result) {
    if(catching){
      if(result.offsetMs!==null)return `${result.offsetMs<0?'提早':'晚了'} ${Math.round(Math.abs(result.offsetMs))} ms · 接球範圍 ±${CATCH_WINDOW_MS} ms`;
      return result.reason==='early'?'要等泡棉球飛進右側接球圈，才按下「接！」。':'盯著球的落點，不是看發射器一動就按。';
    }
    const player=result.reason==='early'?'搶跑':result.playerMs===null?'未出手':`${Math.round(result.playerMs)} ms`;
    return `你：${player} ｜ AI：${result.aiMs} ms${result.reason==='early'?'（本回合預設）':''}`;
  }
  function summary() {
    const wins=count('player'),opponent=count('ai');
    $('summaryTitle').textContent=catching?`接住 ${wins} / 10 發！`:wins>opponent?'你贏了快手王！':wins<opponent?'這次快手王贏了！':'十回合，不分高下！';
    $('summaryScore').textContent=catching?`${wins} / 10`:`${wins} : ${opponent}`;
    $('summaryNote').textContent=catching?(wins>=8?'手眼默契上線，下次挑戰十發全接！':'快慢球都有，抓準抵達的時機再試一局。'):`你的勝場 : AI 勝場 · 搶跑 ${state.results.filter(r=>r.reason==='early').length} 次 · 平手 ${count('draw')} 次`;
    $('roundResults').replaceChildren(...state.results.map(result=>{
      const li=document.createElement('li');
      const icon=document.createElement('span');icon.className='result-icon';icon.textContent=catching?'🟠':result.item.emoji;icon.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.textContent=catching?`第 ${result.round} 發`:result.item.name;
      const badge=document.createElement('strong');badge.textContent=result.winner==='player'?(catching?'接住':'你贏'):result.winner==='draw'?'平手':result.reason==='early'?'太早':catching?'漏接':'AI 贏';
      li.dataset.winner=result.winner;li.append(icon,name,badge);return li;
    }));
  }
  function render(now=clock()) {
    if(disposed)return;
    const active=['waiting','live'].includes(state.phase),feedback=['feedback','done'].includes(state.phase),result=state.results.at(-1);
    document.body.dataset.phase=state.phase;
    if(state!==lastRendered){
      lastRendered=state;
      $('roundLabel').textContent=state.practice?'不計分練習':`${catching?'第':'回合'} ${Math.min(state.results.length+(feedback?0:1),10)} / 10 ${catching?'發':''}`;
      $('playerScore').textContent=state.practice?'—':String(count('player'));
      $('opponentScore').textContent=state.practice?'—':catching?String(state.results.length-count('player')):String(count('ai'));
      $('actionButton').hidden=!active;
      $('roundButton').hidden=active;
      $('practiceButton').hidden=active||state.phase==='idle';
      $('summary').hidden=!(state.phase==='done'&&!state.practice);
      $('roundButton').textContent=state.phase==='idle'?'先練習一次':state.phase==='paused'?'準備好了，重來這一回':state.practice?(catching?'開始十發挑戰':'開始十回合對決'):state.phase==='done'?(catching?'再玩十發':'再戰十回合'):(catching?'準備下一發':'下一回合');
      $('actionButton').textContent=catching?'接！':'搶！';
      $('actionButton').setAttribute('aria-label',catching?'伸手接泡棉球':'出手搶物品');
      let title=catching?'讓球先飛一會兒':'手先忍住，看到訊號再搶';
      let hint=catching?'泡棉球進入右側接球圈時，按下大按鈕。':'等「出手！」亮起再按，太早按就輸這回合。';
      let signal=state.phase==='waiting'?(catching?'準備發射…':'忍住，等訊號'):catching?'接球區':'等訊號';
      if(state.phase==='waiting'){title=catching?'眼睛看球，先別出手':'這個也要搶？等一下…';hint='每回等待長短不同，長按不會自動出手。';}
      if(state.phase==='live'){title=catching?'進圈就接！':'出手！';hint=catching?'球到右邊圈內才按。':'現在搶同一件物品，比 AI 更快！';signal=catching?'進圈就接！':'出手！';}
      if(state.phase==='paused'){title='已暫停，這回合不計分';hint='切換視窗、旋轉或畫面停頓時，準備好再重來。';signal='暫停';}
      if(feedback){title=resultText(result);hint=details(result);signal=result.winner==='player'?'你接住了！':result.winner==='draw'?'平手':catching?'再接再厲':'AI 搶到了';if(!catching&&result.winner==='player')signal='你搶到了！';if(!catching&&result.reason==='early')signal='搶跑！';}
      $('roundStatus').textContent=title;$('roundHint').textContent=hint;$('signal').textContent=signal;
      const item=state.items[Math.min(feedback?state.results.length-1:state.results.length,9)];
      $('itemEmoji').textContent=item.emoji;$('itemName').textContent=item.name;$('itemQuip').textContent=item.quip;
      $('stage').dataset.winner=feedback?result.winner:'';
      $('stage').dataset.result=feedback?result.reason:'';
      $('roundDots').replaceChildren(...Array.from({length:state.practice?1:10},(_,i)=>{const dot=document.createElement('span'),r=state.results[i];dot.className='round-dot';dot.dataset.outcome=r?r.winner:i===state.results.length?'current':'pending';dot.textContent=r?(r.winner==='player'?'✓':r.winner==='draw'?'=':'×'):String(i+1);dot.setAttribute('aria-label',`第 ${i+1} ${catching?'發':'回合'}${r?'：'+(r.winner==='player'?'成功':r.winner==='draw'?'平手':'未成功'):''}`);return dot;}));
      if(state.phase==='done'&&!state.practice)summary();
    }
    if(catching){
      const progress=state.phase==='live'?Math.max(0,(now-state.liveAt)/state.flightMs):feedback&&result?.offsetMs!==null?Math.max(0,1+result.offsetMs/state.flightMs):feedback?1.17:0;
      $('foamBall').style.setProperty('--flight',String(Math.min(1.23,progress)));
      $('stage').dataset.inWindow=String(state.phase==='live'&&Math.abs(now-state.targetAt)<=CATCH_WINDOW_MS);
    }
  }
  function begin() {
    if(['waiting','live'].includes(state.phase))return;
    if(state.phase==='done')state=newMatch(mode,{practice:false,random});
    state=beginRound(state,clock(),random);lastFrame=null;render();$('actionButton').focus({preventScroll:true});
  }
  function act(){
    const now=clock();
    if(document.hidden||(state.phase==='live'&&lastFrame!==null&&now-lastFrame>250)){pause();return;}
    state=press(state,now);render(now);
  }
  function pause(){state=pauseMatch(state);lastFrame=null;render();}
  function practice(){state=newMatch(mode,{practice:true,random});lastFrame=null;render();$('roundButton').focus({preventScroll:true});}
  listen($('roundButton'),'click',begin);
  listen($('practiceButton'),'click',practice);
  listen($('restartButton'),'click',practice);
  listen($('actionButton'),'pointerdown',event=>{
    if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();act();
  });
  // Keyboard and assistive technology clicks have no pointerdown. Physical
  // pointer clicks are ignored here to avoid counting down/up twice.
  listen($('actionButton'),'click',event=>{if(event.detail===0)act();});
  listen(document,'keydown',event=>{
    if(!['Space','Enter'].includes(event.code))return;
    const target=event.target;
    if(target?.closest?.('a,input,select,textarea,summary')||target?.closest?.('button')!==$('actionButton')&&target?.closest?.('button'))return;
    if(!['waiting','live'].includes(state.phase))return;
    event.preventDefault();if(!event.repeat)act();
  });
  listen(window,'blur',pause);
  listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
  listen(window,'resize',()=>{if(Math.abs(window.innerWidth-width)>8){width=window.innerWidth;pause();}});
  listen(window,'pagehide',event=>{pause();if(!event.persisted)destroy();});
  function frame(now){
    if(disposed)return;
    if(document.hidden)pause();
    else if(state.phase==='live'&&lastFrame!==null&&now-lastFrame>250)pause();
    else state=advance(state,now);
    lastFrame=now;render(now);frameId=requestFrame(frame);
  }
  function destroy(){if(disposed)return;disposed=true;cancelFrame(frameId);for(const remove of listeners)remove();}
  render();frameId=requestFrame(frame);
  return {get state(){return state;},destroy};
}
if(typeof document!=='undefined'&&document.body?.dataset.level)mountLevel({document,window});
