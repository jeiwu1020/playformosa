// Presentation preferences are separate from round rules and score storage.
const KEY='overtime-pinball-labels-v1';
export class LabelPreference{
 constructor(storage){this.storage=storage;this.enabled=false;this.saved=true;try{this.enabled=JSON.parse(storage?.getItem(KEY)||'null')?.enabled===true;}catch{}}
 set(enabled){this.enabled=enabled===true;try{if(!this.storage)throw Error('storage unavailable');this.storage.setItem(KEY,JSON.stringify({enabled:this.enabled}));this.saved=true;}catch{this.saved=false;}}
}
export function poolNotice(state,event,now){
 const phase=event?.phase||'collecting';
 if(state.key!==phase||now<(state.last??now)){state.key=phase;state.until=now+3;}
 state.last=now;
 // A pending claim is actionable and must never disappear with its deadline.
 return phase==='claim'||phase==='ready'||phase==='frenzy'&&now<state.until;
}
export function mountMobileUI({document,storage,labels}){
 const preference=new LabelPreference(storage),notice={key:null,until:0};
 const cue=document.createElement('div');cue.id='mobileCue';cue.hidden=true;cue.setAttribute('aria-live','polite');document.body.append(cue);
 const details=document.createElement('p');details.id='poolDetails';document.querySelector('#pauseScreen .pause-settings')?.after(details);
 const choices=[...document.querySelectorAll('.label-names-option')];
 const syncPreference=()=>{labels.setNamesVisible(preference.enabled);for(const el of choices)el.checked=preference.enabled;for(const el of document.querySelectorAll('.label-save-notice')){el.hidden=preference.saved;el.textContent=preference.saved?'':'此裝置無法儲存，設備名稱設定只適用本次遊玩。';}};
 for(const el of choices)el.addEventListener('change',()=>{preference.set(el.checked);syncPreference();});syncPreference();
 return{sync(game){
 document.body.dataset.poolNotice=String(poolNotice(notice,game.overtime,game.playClock||0));
 details.textContent=document.getElementById('overtimeStatus')?.textContent||'';
 const ids=game.interaction||game.getInteractionOffer?.()||game.round?.ending||game.round?.reentry?[]:['doorWarning','bossStatus','lotteryStatus'];
 const source=ids.map(id=>document.getElementById(id)).find(el=>el&&!el.hidden&&el.textContent.trim());
 const text=source?.textContent||'';if(cue.textContent!==text)cue.textContent=text;cue.hidden=!text;
 }};
}
