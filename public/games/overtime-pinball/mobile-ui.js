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
// Read existing authoritative presentation nodes, never introduce another input path.
export function mobileFocus(doc){
 const visible=id=>{const el=doc.getElementById(id);return el&&!el.hidden?el:null;};
 const text=id=>doc.getElementById(id)?.textContent||'';
 const progress=el=>{const p=el?.querySelector('progress');return p&&!p.hidden&&p.max>0?Math.max(0,Math.min(1,p.value/p.max)):null;};
 const work=visible('activityPanel');
 if(work){const match=doc.getElementById('activityBar')?.style.transform.match(/scaleX\(([\d.]+)\)/);return{kind:'work',title:text('activityTitle'),text:text('activityText'),ratio:match?Math.max(0,Math.min(1,Number(match[1]))):null};}
 const route=visible('routeChoice');if(route)return{kind:'route',title:route.querySelector('b')?.textContent||'',text:[route.querySelector('span')?.textContent,route.querySelector('small')?.textContent].filter(Boolean).join(' · '),ratio:progress(route)};
 const offer=visible('interactionOffer');if(offer)return{kind:'offer',title:offer.querySelector('b')?.textContent||'',text:offer.querySelector('small')?.textContent||'',ratio:progress(offer)};
 for(const [id,kind]of[['doorWarning','rescue'],['routeReward','route-reward'],['comboRoute','combo'],['centralPrompt','central'],['bossStatus','boss'],['lotteryStatus','lottery']]){const el=visible(id);if(el?.textContent.trim())return{kind,title:'',text:el.textContent,ratio:null};}
 const pool=visible('overtimeStatus');if(doc.body.dataset.poolNotice==='true'&&pool?.textContent)return{kind:'pool',title:'',text:pool.textContent,ratio:null};
 const comic=visible('comic');if(comic?.classList.contains('pop')&&comic.textContent)return{kind:'reward',title:'',text:comic.textContent,ratio:null};
 const mail=visible('mailStatus');if(mail?.textContent)return{kind:'mail',title:'',text:mail.textContent,ratio:null};
 return null;
}
export function mountMobileUI({document,storage,labels}){
 const preference=new LabelPreference(storage),notice={key:null,until:0};
 const cue=document.createElement('div');cue.id='mobileCue';cue.hidden=true;cue.setAttribute('aria-live','polite');const cueTitle=document.createElement('b'),cueText=document.createElement('span'),cueBar=document.createElement('progress');cueBar.max=1;cueBar.setAttribute('aria-label','目前操作進度或剩餘時間');cue.append(cueTitle,cueText,cueBar);document.body.append(cue);
 const details=document.createElement('p');details.id='poolDetails';document.querySelector('#pauseScreen .pause-settings')?.after(details);
 const choices=[...document.querySelectorAll('.label-names-option')];
 const syncPreference=()=>{labels.setNamesVisible(preference.enabled);for(const el of choices)el.checked=preference.enabled;for(const el of document.querySelectorAll('.label-save-notice')){el.hidden=preference.saved;el.textContent=preference.saved?'':'此裝置無法儲存，設備名稱設定只適用本次遊玩。';}};
 for(const el of choices)el.addEventListener('change',()=>{preference.set(el.checked);syncPreference();});syncPreference();
 return{sync(game){
 document.body.dataset.poolNotice=String(poolNotice(notice,game.overtime,game.playClock||0));
 details.textContent=document.getElementById('overtimeStatus')?.textContent||'';
 const focus=game.round?.ending||game.round?.reentry?null:mobileFocus(document);
 cue.hidden=!focus;cue.dataset.kind=focus?.kind||'';
 cueTitle.textContent=focus?.title||'';cueTitle.hidden=!focus?.title;
 cueText.textContent=focus?.text||'';cueBar.hidden=focus?.ratio==null;if(focus?.ratio!=null)cueBar.value=focus.ratio;

 }};
}
