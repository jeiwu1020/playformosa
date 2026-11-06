import * as e from './race.mjs';
import{createView,drawMinimap}from'./render.mjs';
import{storeRecord}from'./records.mjs';
import{createRunnerSound}from'../shared/runner-sound.mjs';
import{createRunnerPlatform}from'../shared/runner-platform.mjs';
const $=id=>document.getElementById(id),{standings,displayDistance,nextSupply}=e;
const time=t=>{const n=Math.max(0,t||0);return Math.floor(n/60)+':'+(n%60).toFixed(2).padStart(5,'0')};
const view=createView($('arena'),$('world'));$('render-note').textContent=view.mode==='3d'?'後方跟隨 · 3D立體畫面':'此裝置使用2D相容畫面';
const backend=createRunnerSound({baseURL:new URL('./',import.meta.url)}),sound={...backend,sync(r){backend.sync({...r,phase:r.phase==='countdown'?'set':r.phase,runners:r.runners.map(p=>({...p,distance:p.s,falls:0,fall:0}))});}};let stored=true;
function hud(race){const p=race.runners[0]; const nearby=race.runners.filter(q=>q.id&&q.finished===null&&q.s>p.s&&q.s-p.s<12).sort((a,b)=>a.s-b.s)[0];
 $('time').textContent=time(p.finished??race.time+p.penalty);$('remaining').textContent='還有 '+Math.ceil(1500-displayDistance(p))+'m';$('progress').textContent=Math.floor(displayDistance(p))+' / 1500 m';$('lap').textContent=p.finished!==null?'完賽':p.s>=1200?'最後300m':'第 '+(Math.floor(p.s/400)+1)+' 圈';$('place').textContent=race.phase==='ready'||race.phase==='countdown'?'四人就位':'第 '+(standings(race).findIndex(q=>q.id===0)+1)+' 名';$('energy').style.width=p.energy+'%';$('energy').style.background=p.energy<20?'#db7951':p.energy<50?'#d8a347':'#459475';$('energy-number').textContent=Math.round(p.energy)+'%';$('speed').textContent='街機 '+(p.v*3.6).toFixed(1)+' km/h';$('pace').textContent=!p.started?'站姿就位':race.time-p.lastStep>1.1?'休息回氣':p.cadence>=.51?'慢跑回氣':p.energy<20?'放慢可回氣':p.cadence<.30?'透支衝刺':p.cadence<.38?'進攻節奏':p.cadence>.51?'回氣節奏':'穩定巡航';$('draft').textContent=p.slip>.1?'〰 跟跑省力 · 仍要踩步':p.blocked>0?'前方有人 · 找側邊空位':(nearby?nearby.name+' · '+nearby.tactic:'找一個值得跟的對手');$('draft').className=p.slip>.1?'on':'';
 $('signal').textContent=race.phase==='countdown'?Math.min(3,Math.max(1,Math.ceil(race.countdown))):race.phase==='race'&&race.time<.7?'砰！':p.finished!==null?'完賽！':'';
 const hasHand=(p.held.j||p.held.k)&&!p.handChord;$('lane-preview').hidden=!hasHand;$('lane-preview').textContent=p.held.j?'← 放開，往內線':'放開，往外線 →';
 $('cue').textContent=p.finished!==null?'成績已鎖定，慢慢把四肢收回來。':p.tucking?(p.s>=1490?'挺胸壓線！':'挺胸太早會減速，先放開雙手。'):race.time<race.eventUntil||race.phase!=='race'?race.event:p.s>1490?'最後10m！J＋K 挺胸壓線。':p.s>1100?'最後一圈！現在的力氣，還夠衝多久？':p.energy<20?'放慢到每0.6秒一步，邊跑邊回體力。':p.slip>.1?'風帶有效！想超車，就拉出去自己跑。':'巡航省體力，別讓對手加速甩開。';
 const can=nextSupply(race,p);$('supply').textContent=p.splash>0?'補給 +22！滿臉都是能量。':can?'補給 '+Math.ceil(can.s-p.s)+'m · 第'+(can.lane+1)+'道 +22%':'補給已過 · 留力衝線';
drawMinimap($('minimap'),race);}

export const game=createRunnerPlatform({document,adapter:{gameId:'run-1500m',title:'四肢各有想法｜1500公尺戰術賽',rules:e.RULES,goal:'留一點力氣，給最後一圈。街機版約2–2.5分鐘。',operations:['A／S 左右腳交替短按配速；按住不會自動跑。','J 往內線、K 往外線，短按放開才換道。','跟跑省力，換道搶補給；最後10公尺 J＋K 挺胸壓線。'],advanced:'<p>400m 跑道逆時針繞3圈＋300m。實際遊戲用時，不是真實田徑秒數。保留街機速度縮放與固定對手策略。</p><p>約每0.4–0.5秒換腳巡航，每0.55–0.7秒可回氣。每0.3秒進攻會耗力，亂點不會無限加速。</p><p>跟在前人身後約1–5m，仍須踩步。340／740／1140m 固定補給罐，走到對應跑道補22格體力，上限100。最後10m才挺胸，太早會減速。</p><p>本站只手動提交本次完賽成績，不自動搬入舊紀錄，不計十項積分。</p><p><a href="audio/CREDITS.md" target="_blank" rel="noopener">音樂素材授權</a> · <a href="vendor/THREE-LICENSE.txt" target="_blank" rel="noopener">Three.js MIT</a></p>',create:e.createRace,start:e.startRace,clear:e.cancelInput,input:e.input,held:(r,k)=>r.runners[0].held[k],step:e.step,render:r=>view.render(r),canvas:()=>view.mode==='3d'?$('world3d'):$('world'),ready:()=>true,hud,sound,save:s=>{stored=storeRecord(e.resultOf({runners:[s.metrics]})).saved;},storageStatus:()=>stored?'本機紀錄已保存':'瀏覽器拒絕儲存，本機紀錄未保存'}});

$('world3d')?.addEventListener('webglcontextlost',()=>game.interrupt());
