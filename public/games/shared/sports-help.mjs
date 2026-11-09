// Player-facing copy only. Inputs, scoring and simulation remain game-owned.
export const SPORTS_HELP=Object.freeze({
 'long-jump':['空中配合手腳延續飛行，落地前再準備踩穩。','冒險里程是遊戲分數，場景與距離不按真實比例。'],
 hurdles:['看準欄杆再起跳，空中可收腿；跌撞時用手臂找回平衡。','跑完 110 公尺比較秒數；八道欄杆是街機賽道設定。'],
 'high-jump':['起跳後用手腳調整姿態，完整越過橫桿才算成功。','高度取決於起跳；空中操作用來過桿，不會無限增高。'],
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
