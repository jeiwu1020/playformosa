/** Shared entry and safe, same-tab navigation. Game rules and records stay with each game. */
const mounted=new WeakMap();
const INTRO_KEY='fast-hands:club-intro:v1';
const HISTORY_KEY='fastHandsClubIntro';
const CONTINUE_PARAM='club';

export function mountClub({document,window=document.defaultView,mode='duck',isActive=()=>false,onInterrupt=()=>{},onStart=()=>{},onNavigate}){
 if(mounted.has(document))return mounted.get(document);
 const entry=document.getElementById('entryDialog'),start=document.getElementById('entryStart'),close=document.getElementById('entryClose'),menu=document.getElementById('openMenu');
 if(!entry||!start)throw new Error('The fast-hands club needs its shared entry dialog.');
 const current=new URL(window.location.href),base=new URL(current),removers=[];
 base.pathname=base.pathname.replace(/\/(?:index|catch|duel)(?:\.html)?\/?$/,'/');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 base.search='';base.hash='';
 let storage=null,seen=false,confirming=false,navigating=false,destroyed=false;
 try{storage=window.sessionStorage;seen=storage.getItem(INTRO_KEY)==='seen';}catch{storage=null;}
 const continuation=current.searchParams.get(CONTINUE_PARAM)==='1';
 seen=seen||continuation||window.history.state?.[HISTORY_KEY]===true;
 function remember(){
  seen=true;
  try{storage?.setItem(INTRO_KEY,'seen');if(storage?.getItem(INTRO_KEY)!=='seen')storage=null;}catch{storage=null;}
  try{window.history.replaceState({...window.history.state,[HISTORY_KEY]:true},'',window.location.href);}catch{}
 }
 if(continuation){
  remember();current.searchParams.delete(CONTINUE_PARAM);
  try{window.history.replaceState(window.history.state,'',current.href);}catch{}
 }
 function listen(target,type,fn,options){target?.addEventListener(type,fn,options);removers.push(()=>target?.removeEventListener(type,fn,options));}
 function notify(){document.dispatchEvent(new window.Event('clubchange'));}
 function ready(){document.body.dataset.clubReady='true';notify();}
 function openIntro(){
  close&&(close.hidden=!seen);
  entry.hidden=false;
  if(!entry.open)entry.showModal();
  notify();
 }
 function closeIntro(){if(entry.open)entry.close();notify();}
 function clubDestination(url){return url.origin===base.origin&&[base.pathname.replace(/\/$/,''),base.pathname,`${base.pathname}index`,`${base.pathname}index.html`,`${base.pathname}catch`,`${base.pathname}catch.html`,`${base.pathname}duel`,`${base.pathname}duel.html`].includes(url.pathname);}
 function navigate(url){
  if(seen&&clubDestination(url)&&!storage)url.searchParams.set(CONTINUE_PARAM,'1');
  navigating=true;
  if(onNavigate)onNavigate(url.href);else window.location.assign(url.href);
 }
 function requestNavigation(href){
  if(destroyed||navigating)return false;
  const target=new URL(href,window.location.href);
  if(!['http:','https:'].includes(target.protocol))return false;
  const active=isActive();
  // Stop first: a cancelled switch starts the next attempt afresh, never resumes a stale clock.
  onInterrupt({reason:'navigation',target:target.href});
  if(active){
   confirming=true;
   let confirmed=false;
   try{confirmed=window.confirm('本回合已暫停。離開會結束這場挑戰，確定要切換嗎？\n取消可留在原關卡，保留已完成回合，重新準備下一回。');}finally{confirming=false;}
   if(!confirmed)return false;
  }
  closeIntro();navigate(target);return true;
 }
 function showIntro(){
  if(destroyed||navigating)return;
  onInterrupt({reason:'intro'});
  for(const dialog of document.querySelectorAll('dialog[open]'))if(dialog!==entry)dialog.close();
  openIntro();
 }
 function begin(){
  if(destroyed||navigating)return;
  remember();closeIntro();
  if(mode==='duck'){onStart();ready();}
  else requestNavigation(new URL('./',base));
 }
 function onClick(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest?.('a[href]');
  if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
  const url=new URL(anchor.href,window.location.href);
  if(url.origin!==current.origin||!['http:','https:'].includes(url.protocol))return;
  if(anchor.dataset.clubMode===mode){event.preventDefault();return;}
  if(url.pathname===current.pathname&&url.search===current.search&&url.hash)return;
  event.preventDefault();requestNavigation(url.href);
 }
 listen(document,'click',onClick);
 listen(start,'click',begin);
 listen(close,'click',()=>{if(seen)closeIntro();});
 listen(menu,'click',showIntro);
 listen(entry,'cancel',event=>{if(!seen)event.preventDefault();});
 listen(entry,'close',notify);
 listen(window,'pagehide',event=>{
  onInterrupt({reason:'pagehide'});
  if(seen)remember();
  if(!event.persisted)destroy();
 });
 listen(window,'pageshow',event=>{
  if(!event.persisted)return;
  navigating=false;
  if(seen)closeIntro();
  ready();
 });
 function destroy(){if(destroyed)return;destroyed=true;for(const remove of removers)remove();mounted.delete(document);}
 const api={showIntro,requestNavigation,destroy,blocked:()=>entry.open||confirming,get seen(){return seen}};
 mounted.set(document,api);
 if(seen){closeIntro();onStart();ready();}else{openIntro();ready();}
 return api;
}
