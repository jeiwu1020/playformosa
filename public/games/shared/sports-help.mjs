// Player-facing copy only. Inputs, scoring and simulation remain game-owned.
export const SPORTS_HELP=Object.freeze({
 'long-jump':['空中配合手腳延續飛行，落地前再準備踩穩。','冒險里程是遊戲分數，場景與距離不按真實比例。'],
 hurdles:['看準欄杆再起跳，空中可收腿；跌撞時用手臂找回平衡。','跑完 110 公尺比較秒數；八道欄杆是街機賽道設定。'],
 'high-jump':['起跳後用手腳調整姿態，完整越過橫桿才算成功。','高度取決於起跳；空中操作用來過桿，不會無限增高。'],
 'pole-vault':['看到提示後放開雙手起飛；空中配合手腳，留意平衡與體力。','失去升力或持續失衡會自動收工，過桿後落墊結算。'],
 'shot-put':['踩穩後配合蹬地、伸臂出手；先熟悉 K 的蓄力與放開即可。','出手後不用操作，接力設施帶來的額外距離也計分。'],
 discus:['換腳帶動旋轉，放開 K 甩出鐵餅。','出手後不用操作，順風與熱風會影響飛行。'],
 'sprint-100m':['看到起跑訊號後交替踩步，留意身體平衡。','接近終點可同按 J＋K 壓線；以完賽秒數記錄成績。'],
 'run-400m':['固定跑道跑完一圈，依提示調整節奏，留意腿力與平衡。','接近終點可同按 J＋K 壓線；以完賽秒數記錄成績。'],
 'run-1500m':['穩定踩步配速，留意體力；可換道、跟跑與取得補給。','最後10公尺可同按 J＋K 壓線。'],
 javelin:['助跑後蓄力出手，槍尖先落在扇形區才有效。','出手後記得煞停；站穩前踩線，這投就不計分。']
});
export function createSportsHelp(document,gameId){
 if(!Object.hasOwn(SPORTS_HELP,gameId))return null;
 if(!document.querySelector('link[data-sports-help-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/games/shared/sports-help.css';style.dataset.sportsHelpStyle='';document.head.append(style);}
 const root=document.createElement('div');root.className='pf-sports-help';root.dataset.sportsHelp=gameId;
 const play=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ul');heading.textContent='玩法重點';
 for(const text of SPORTS_HELP[gameId]){const item=document.createElement('li');item.textContent=text;list.append(item);}play.append(heading,list);
 const credits=document.createElement('section'),title=document.createElement('h3'),note=document.createElement('p'),link=document.createElement('a');title.textContent='素材與授權';
 note.textContent='背景音樂：Funin and Sunin — Kevin MacLeod（incompetech.com），CC BY 4.0。音效來源與加工註記詳見完整授權頁。';
 link.href='../shared/sports-credits.html#'+gameId;link.target='_blank';link.rel='noopener';link.textContent='查看完整素材與授權';credits.append(title,note,link);root.append(play,credits);return root;
}
