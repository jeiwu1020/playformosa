/** Shared entry and safe, same-tab navigation. Game rules and records stay with each game. */
const mounted=new WeakMap();
const INTRO_KEY='fast-hands:club-intro:v1';
const HISTORY_KEY='fastHandsClubIntro';
const CONTINUE_PARAM='club';

export function mountClub({document,window=document.defaultView,mode='duck',isActive=()=>false,getNavigationContext=()=>({}),getResumeTarget,onInterrupt=()=>{},onReturn=()=>{},onStart=()=>{},onNavigate}){
 if(mounted.has(document))return mounted.get(document);
 const entry=document.getElementById('entryDialog'),start=document.getElementById('entryStart'),close=document.getElementById('entryClose'),menu=document.getElementById('openMenu');
 if(!entry||!start)throw new Error('The fast-hands club needs its shared entry dialog.');
 const current=new URL(window.location.href),base=new URL(current),removers=[];
 base.pathname=base.pathname.replace(/\/(?:index|catch|duel)(?:\.html)?\/?$/,'/');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 base.search='';base.hash='';
 let storage=null,seen=false,navigating=false,destroyed=false,pending=null,interrupting=false,draining=false,drainTimer=null,suppressReleaseClick=false,overlay=null,returningOverlay=null;
 const heldKeys=new Set(),heldPointers=new Set(),openingKeys=new Set(),openingPointers=new Set();
 const dialog=document.createElement('dialog');
 dialog.id='clubNavigationDialog';dialog.className='club-navigation-dialog';dialog.hidden=true;
 dialog.setAttribute('aria-labelledby','clubNavigationTitle');dialog.setAttribute('aria-describedby','clubNavigationDescription');dialog.setAttribute('aria-modal','true');
 const heading=document.createElement('h2');heading.id='clubNavigationTitle';heading.textContent='要離開這關嗎？';
 const description=document.createElement('p');description.id='clubNavigationDescription';
 const actions=document.createElement('div');actions.className='club-navigation-actions';
 const stay=document.createElement('button');stay.id='clubNavigationStay';stay.type='button';stay.className='club-navigation-stay';stay.textContent='留在這關';stay.autofocus=true;
 const leave=document.createElement('button');leave.id='clubNavigationLeave';leave.type='button';leave.textContent='離開並切換';
 actions.append(stay,leave);dialog.append(heading,description,actions);document.body.append(dialog);
 try{storage=window.sessionStorage;seen=storage.getItem(INTRO_KEY)==='seen';}catch{storage=null;}
 const forcedIntro=current.searchParams.get('intro')==='1';
 const continuation=!forcedIntro&&current.searchParams.get(CONTINUE_PARAM)==='1';
 if(forcedIntro){current.searchParams.delete('intro');current.searchParams.delete(CONTINUE_PARAM);try{window.history.replaceState(window.history.state,'',current.href);}catch{}}
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
 function blocked(){return !destroyed&&(!seen||entry.open||Boolean(pending)||navigating||interrupting||draining||Boolean(overlay));}
 function navigationCopy(context){
  if(mode==='duck')return '這次操作已中止，不留成績。留在這關可從起點重試。';
  if(context.phase==='feedback')return '已完成回合的成績會保留。留在這關可繼續下一回合；離開會結束這場挑戰。';
  if(context.practice)return '這次練習已暫停、不計分。留在這關後，請重新準備這一回。';
  return '這回合已暫停、不計分，已完成回合的成績會保留。留在這關後，請重新準備這一回；離開會結束這場挑戰。';
 }
 function usable(element){
  return Boolean(element?.isConnected&&!element.disabled&&!element.closest('[hidden],[inert],dialog:not([open])')&&window.getComputedStyle(element).display!=='none'&&window.getComputedStyle(element).visibility!=='hidden');
 }
 function restoreFocus(origin){
  const preferred=getResumeTarget?.(),fallback=document.getElementById(mode==='duck'?'retry':'roundButton');
  const target=[preferred,fallback,origin,menu].find(usable);target?.focus({preventScroll:true});
 }
 function finishDrain(){
  window.clearTimeout(drainTimer);drainTimer=null;
  if(!draining||heldKeys.size||heldPointers.size)return;
  // Keep the closing activation blocked through keyup/pointerup default actions.
  drainTimer=window.setTimeout(()=>{drainTimer=null;if(destroyed||heldKeys.size||heldPointers.size)return;draining=false;if(returningOverlay){const closed=returningOverlay;returningOverlay=null;onReturn({reason:closed.reason});notify();restoreFocus(closed.origin);}else notify();},0);
 }
 function closeNavigation(){if(dialog.open)dialog.close();dialog.hidden=true;}
 function chooseNavigation(confirmed){
  if(!pending||destroyed)return;
  const choice=pending;pending=null;openingKeys.clear();openingPointers.clear();
  if(confirmed){navigating=true;closeNavigation();notify();closeIntro();navigate(choice.target);return;}
  draining=true;suppressReleaseClick=true;closeNavigation();notify();restoreFocus(choice.origin);finishDrain();
 }
 function requestNavigation(href){
  if(destroyed||navigating||pending||draining)return false;
  let target;try{target=new URL(href,window.location.href);}catch{return false;}
  if(!['http:','https:'].includes(target.protocol))return false;
  const active=isActive(),context=getNavigationContext()||{};
  // Lock first, including idle/replay departures. Interruption cannot reopen a score modal.
  pending={target,origin:document.activeElement};
  for(const key of heldKeys)openingKeys.add(key);
  for(const id of heldPointers)openingPointers.add(id);
  onInterrupt({reason:'navigation',target:target.href});
  closeIntro();
  if(!active){chooseNavigation(true);return true;}
  description.textContent=navigationCopy(context);dialog.hidden=false;
  try{dialog.showModal();}catch{dialog.setAttribute('open','');}
  stay.focus({preventScroll:true});notify();return false;
 }
 function consume(event){event.preventDefault();event.stopImmediatePropagation();}
 function activationKey(event){const key=event.code||event.key;return ['Enter','Space','Escape',' '].includes(key)?key:null;}
 function keydown(event){
  const key=activationKey(event);if(key)heldKeys.add(key);
  if(draining){consume(event);return;}
  if(!pending)return;
  if(key&&openingKeys.has(key)){consume(event);return;}
  if(event.key==='Escape'||event.code==='Escape'){consume(event);chooseNavigation(false);return;}
  if(event.key==='Tab'||event.code==='Tab'){
   consume(event);const first=stay,last=leave;
   (event.shiftKey?(document.activeElement===first?last:first):(document.activeElement===last?first:last)).focus({preventScroll:true});return;
  }
  if(!dialog.contains(event.target))consume(event);
 }
 function keyup(event){
  const key=activationKey(event);if(key)heldKeys.delete(key);
  if(draining){consume(event);finishDrain();return;}
  if(pending&&(openingKeys.delete(key)||!dialog.contains(event.target)))consume(event);
 }
 function pointerdown(event){
  heldPointers.add(event.pointerId);
  if(draining||pending&&!dialog.contains(event.target)){consume(event);return;}
  suppressReleaseClick=false;
 }
 function pointerup(event){
  heldPointers.delete(event.pointerId);
  if(draining){consume(event);finishDrain();return;}
  if(pending&&(openingPointers.delete(event.pointerId)||!dialog.contains(event.target))){suppressReleaseClick=true;consume(event);}
 }
 function guardClick(event){
  if(draining||pending&&!dialog.contains(event.target)||suppressReleaseClick&&event.detail>0)consume(event);
 }
 function clearHeldInput(){heldKeys.clear();heldPointers.clear();openingKeys.clear();openingPointers.clear();finishDrain();}
 function abandonNavigation(){
  pending=null;draining=false;window.clearTimeout(drainTimer);drainTimer=null;clearHeldInput();closeNavigation();
 }
 function beginOverlay(reason){
  if(destroyed||navigating||pending||draining||overlay)return false;
  overlay={reason,origin:document.activeElement};
  onInterrupt({reason});notify();return true;
 }
 // Keep the original interruption/return target while replacing an intro with
 // one of its child dialogs. Closing the old dialog must not resume its parent.
 function transferOverlay(reason){
  if(!overlay||destroyed||navigating||pending||draining)return false;
  overlay.reason=reason;notify();return true;
 }
 function endOverlay(){
  if(!overlay)return;
  const closed=overlay;overlay=null;draining=true;suppressReleaseClick=true;
  returningOverlay=closed;notify();finishDrain();
 }
 function showIntro(){
  if(!seen){if(!destroyed&&!navigating&&!pending)openIntro();return;}
  if(!beginOverlay('intro'))return;
  interrupting=true;
  for(const dialog of document.querySelectorAll('dialog[open]'))if(dialog!==entry)dialog.close();
  openIntro();interrupting=false;notify();
 }
 function begin(){
  if(destroyed||navigating||pending||draining)return;
  const firstStart=!seen;
  remember();closeIntro();
  // Help never routes to another game or restarts the current run.
  if(firstStart)onStart();
  ready();
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
 listen(document,'keydown',keydown,true);listen(document,'keyup',keyup,true);
 listen(document,'pointerdown',pointerdown,true);listen(document,'pointerup',pointerup,true);listen(document,'pointercancel',pointerup,true);
 listen(document,'click',guardClick,true);
 listen(document,'contextmenu',event=>{
  // Suppress gameplay long-press menus, but preserve native editing, copying
  // and the image-save fallback used when system file sharing is unavailable.
  if(!event.target.closest?.('input,textarea,[contenteditable]:not([contenteditable="false"]),[data-allow-selection],#shareFallbackImage,#summaryShareFallbackImage'))event.preventDefault();
 });
 listen(document,'focusin',event=>{if(pending&&dialog.open&&!dialog.contains(event.target))stay.focus({preventScroll:true});});
 listen(window,'blur',clearHeldInput);listen(document,'visibilitychange',()=>{if(document.hidden)clearHeldInput();});
 listen(stay,'click',()=>chooseNavigation(false));listen(leave,'click',()=>chooseNavigation(true));
 listen(dialog,'cancel',event=>{event.preventDefault();chooseNavigation(false);});listen(dialog,'close',()=>{if(pending&&!dialog.open)chooseNavigation(false);});
 listen(document,'click',onClick);
 listen(start,'click',begin);
 listen(close,'click',()=>{if(seen)closeIntro();});
 listen(menu,'click',showIntro);
 listen(entry,'cancel',event=>{if(!seen)event.preventDefault();});
 listen(entry,'close',()=>{if(!entry.open&&overlay?.reason==='intro')endOverlay();notify();});
 listen(window,'pagehide',event=>{
  onInterrupt({reason:'pagehide'});abandonNavigation();
  if(seen)remember();
  if(!event.persisted)destroy();
 });
 listen(window,'pageshow',event=>{
  if(!event.persisted)return;
  const interrupted=overlay||returningOverlay;
  overlay=null;returningOverlay=null;abandonNavigation();
  navigating=false;suppressReleaseClick=false;
  if(interrupted){
   // Controllers dismiss network dialogs silently on pagehide. Recover their
   // return context as well as the input lock, without starting any gameplay.
   for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
   onReturn({reason:'pageshow',interrupted:interrupted.reason});
   restoreFocus(interrupted.origin);
  }else if(seen)closeIntro();
  ready();
 });
 function destroy(){if(destroyed)return;destroyed=true;for(const remove of removers)remove();abandonNavigation();dialog.remove();mounted.delete(document);}
 const api={showIntro,beginOverlay,transferOverlay,endOverlay,requestNavigation,destroy,blocked,navigationPending:()=>Boolean(pending),get seen(){return seen}};
 mounted.set(document,api);
 if(seen&&!forcedIntro){closeIntro();onStart();ready();}else{if(seen)onStart();openIntro();ready();}
 return api;
}
