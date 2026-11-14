// Only roomy touch viewports opt in; phones and pointer-fine desktops keep
// their existing layout. Measure the real menu/status edge, never assume 280px.
export function tabletCueLayout({width,height,coarse,desktop=false,header={},status={}}){
 if(!coarse||desktop||Math.min(width,height)<600)return null;
 const landscape=width>height,left=landscape?Math.max(12,header.right||0,status.right||0)+12:12,available=Math.max(1,width-left-12),cueWidth=Math.min(420,available);
 return{left:landscape?left:left+(available-cueWidth)/2,top:landscape?8:Math.max(header.bottom||0,status.bottom||0)+8,width:cueWidth,height:landscape?180:72};
}
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
 const preference=new LabelPreference(storage),notice={key:null,until:0};let ownsTabletReserve=false;
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
 const shortLandscape=document.defaultView?.matchMedia?.('(orientation:landscape) and (max-height:600px)').matches&&!document.body.classList.contains('desktop-layout');
 const concise=shortLandscape&&focus?.kind==='route'?{...focus,title:'',text:focus.text.replace(' · ','\n')}:shortLandscape&&focus?.kind==='offer'?{...focus,title:'',text:'按 L / R 進入互動；不按繼續彈跳'}:focus;
 cueTitle.textContent=concise?.title||'';cueTitle.hidden=!concise?.title;
 cueText.textContent=concise?.text||'';cueBar.hidden=focus?.ratio==null;if(focus?.ratio!=null)cueBar.value=focus.ratio;
 const win=document.defaultView,coarse=win?.matchMedia?.('(pointer:coarse)').matches===true,desktop=document.body.classList.contains('desktop-layout');
 const eligible=coarse&&!desktop&&Math.min(win.innerWidth,win.innerHeight)>=600;
 const layout=eligible?tabletCueLayout({width:win.innerWidth,height:win.innerHeight,coarse,desktop,header:document.querySelector('.pf-header')?.getBoundingClientRect(),status:document.getElementById('playStatus')?.getBoundingClientRect()}):null;
 document.body.classList.toggle('tablet-touch-cue',!!layout);
 if(layout&&win.innerHeight>=win.innerWidth){const frameTop=document.getElementById('playFrame')?.getBoundingClientRect().top||0,reserve=Math.max(0,layout.top+layout.height+8-frameTop)+'px';if(document.body.style.getPropertyValue('--camera-top-reserve')!==reserve)document.body.style.setProperty('--camera-top-reserve',reserve);ownsTabletReserve=true;}
 else if(ownsTabletReserve){document.body.style.removeProperty('--camera-top-reserve');ownsTabletReserve=false;}

 if(layout)for(const[k,value]of Object.entries(layout)){const prop='--tablet-cue-'+k,v=value+'px';if(cue.style.getPropertyValue(prop)!==v)cue.style.setProperty(prop,v);}


 }};
}
